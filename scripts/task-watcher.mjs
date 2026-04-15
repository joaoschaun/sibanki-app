/**
 * Sibanki AI Pipeline — Task Watcher
 * ====================================
 * Monitora docs/TASK_QUEUE.md e orquestra o pipeline Claude↔Cursor.
 *
 * Comportamento:
 *  - WAITING_CURSOR  → notificação Windows + abre Cursor automaticamente
 *  - CURSOR_DONE     → escreve .pipeline/verification_needed.flag (dispara tarefa agendada do Claude)
 *  - NEEDS_REVISION  → notificação Windows + abre Cursor novamente
 *
 * Uso: node scripts/task-watcher.mjs
 * (ou via scripts/start-pipeline.bat para rodar em background)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, exec } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TASK_FILE = path.join(ROOT, 'docs', 'TASK_QUEUE.md');
const HANDOFF_FILE = path.join(ROOT, 'docs', 'SESSION_HANDOFF.md');
const PIPELINE_DIR = path.join(ROOT, '.pipeline');
const FLAG_FILE = path.join(PIPELINE_DIR, 'verification_needed.flag');
const LOG_FILE = path.join(PIPELINE_DIR, 'watcher.log');

// ─── Setup ────────────────────────────────────────────────────────────────────
if (!fs.existsSync(PIPELINE_DIR)) fs.mkdirSync(PIPELINE_DIR, { recursive: true });

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

// ─── Atualiza bloco de status no SESSION_HANDOFF.md ──────────────────────────
/**
 * Substitui (ou insere) o bloco "Pipeline — status no momento do handoff"
 * no SESSION_HANDOFF.md sempre que o status do TASK_QUEUE muda.
 * Isso garante que Antigravity sempre encontra o estado atual mesmo que
 * Cowork esqueça de atualizar o arquivo antes dos tokens acabarem.
 */
function updateHandoffStatus(status, taskId) {
  if (!fs.existsSync(HANDOFF_FILE)) return;
  try {
    let content = fs.readFileSync(HANDOFF_FILE, 'utf-8');
    const now = new Date().toISOString();
    const newBlock = [
      '## 🔧 Pipeline — status no momento do handoff',
      '',
      '```yaml',
      `# Auto-atualizado pelo task-watcher em ${now}`,
      `status: ${status}`,
      `task_id: "${taskId || ''}"`,
      '```',
    ].join('\n');

    const sectionRe = /## 🔧 Pipeline — status no momento do handoff[\s\S]*?```\n/;
    if (sectionRe.test(content)) {
      content = content.replace(sectionRe, newBlock + '\n');
    } else {
      content += '\n\n' + newBlock + '\n';
    }
    fs.writeFileSync(HANDOFF_FILE, content, 'utf-8');
    log(`  SESSION_HANDOFF.md atualizado: status=${status}, task=${taskId || 'none'}`);
  } catch (e) {
    log(`  AVISO: falha ao atualizar SESSION_HANDOFF.md: ${e.message}`);
  }
}

// ─── Parser de frontmatter YAML simples ──────────────────────────────────────
function parseStatus(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm = match[1];
  const statusMatch = fm.match(/^status:\s*(.+)$/m);
  const taskIdMatch = fm.match(/^task_id:\s*"?([^"\n]*)"?$/m);
  return {
    status: statusMatch ? statusMatch[1].trim() : null,
    taskId: taskIdMatch ? taskIdMatch[1].trim() : '',
  };
}

// ─── Notificação Windows (sem dependências npm) ───────────────────────────────
function notify(title, message) {
  const script = `
    Add-Type -AssemblyName System.Windows.Forms
    $balloon = New-Object System.Windows.Forms.NotifyIcon
    $balloon.Icon = [System.Drawing.SystemIcons]::Information
    $balloon.BalloonTipIcon = 'Info'
    $balloon.BalloonTipTitle = '${title.replace(/'/g, "''")}'
    $balloon.BalloonTipText = '${message.replace(/'/g, "''")}'
    $balloon.Visible = $true
    $balloon.ShowBalloonTip(8000)
    Start-Sleep -Milliseconds 8500
    $balloon.Dispose()
  `.trim();

  exec(
    `powershell -WindowStyle Hidden -Command "${script.replace(/\n/g, '; ')}"`,
    { timeout: 12000 },
    (err) => {
      if (err) {
        // Fallback: msg command
        exec(`msg * /TIME:8 "Sibanki Pipeline: ${message}"`, { timeout: 5000 });
      }
    }
  );
}

// ─── Abrir Cursor na raiz do projeto ──────────────────────────────────────────
function openCursor() {
  exec(`cursor "${ROOT}"`, { timeout: 5000 }, (err) => {
    if (err) {
      // Fallback: tentar via cmd
      exec(`start "" cursor "${ROOT}"`, { timeout: 5000 });
    }
  });
}

// ─── Flag de verificação Antigravity ─────────────────────────────────────────
const ANTIGRAVITY_FLAG = path.join(PIPELINE_DIR, 'antigravity_review_needed.flag');

// ─── Ações por status ─────────────────────────────────────────────────────────
let lastStatus = null;
let lastTaskId = null;

function handleStatusChange(status, taskId) {
  if (status === lastStatus && taskId === lastTaskId) return;
  lastStatus = status;
  lastTaskId = taskId;

  // Mantém SESSION_HANDOFF.md sempre atualizado — facilita handoff entre agentes
  updateHandoffStatus(status, taskId);

  const taskLabel = taskId ? ` [${taskId}]` : '';

  switch (status) {
    case 'WAITING_CURSOR':
      log(`→ Nova tarefa${taskLabel}: notificando Cursor...`);
      notify('🤖 Sibanki Pipeline', `Nova tarefa${taskLabel} aguardando. Abra o chat no Cursor e digite: execute`);
      openCursor();
      // Remover flags antigas se existirem
      if (fs.existsSync(FLAG_FILE)) fs.unlinkSync(FLAG_FILE);
      if (fs.existsSync(ANTIGRAVITY_FLAG)) fs.unlinkSync(ANTIGRAVITY_FLAG);
      // Instrução clara no terminal
      console.log('');
      console.log('  ┌─────────────────────────────────────────────────────┐');
      console.log('  │  ✅ Cursor aberto com a tarefa ' + (taskId || '').padEnd(18) + '  │');
      console.log('  │                                                     │');
      console.log('  │  No Cursor:                                         │');
      console.log('  │   1. Pressione Ctrl+L  (abre o chat do Agent)       │');
      console.log('  │   2. Selecione modo "Agent"                         │');
      console.log('  │   3. Digite:  execute                               │');
      console.log('  │                                                     │');
      console.log('  │  O pipeline.mdc injetará o contexto automaticamente │');
      console.log('  └─────────────────────────────────────────────────────┘');
      console.log('');
      break;

    case 'CURSOR_DONE':
      log(`→ Cursor concluiu${taskLabel}: criando flag de verificação...`);
      // Escreve flag para o Antigravity/Claude Cowork verificar
      fs.writeFileSync(FLAG_FILE, JSON.stringify({
        task_id: taskId,
        cursor_done_at: new Date().toISOString(),
        task_file: TASK_FILE,
      }, null, 2));
      log(`  Flag criada em: ${FLAG_FILE}`);
      notify('✅ Sibanki Pipeline', `Cursor concluiu${taskLabel}. Antigravity/Claude verificará em instantes.`);
      break;

    case 'WAITING_ANTIGRAVITY':
      log(`→ Tarefa${taskLabel} aguardando verificação do Antigravity...`);
      // Flag para o Antigravity saber que há tarefa para verificar
      fs.writeFileSync(ANTIGRAVITY_FLAG, JSON.stringify({
        task_id: taskId,
        waiting_since: new Date().toISOString(),
        task_file: TASK_FILE,
        action: 'verify_cursor_result',
      }, null, 2));
      log(`  Flag Antigravity criada em: ${ANTIGRAVITY_FLAG}`);
      notify('🔎 Sibanki Pipeline', `Cursor concluiu${taskLabel}. Antigravity: verifique TASK_QUEUE.md.`);
      console.log('');
      console.log('  ┌─────────────────────────────────────────────────────┐');
      console.log('  │  🔎 Antigravity: verificação necessária             │');
      console.log('  │                                                     │');
      console.log('  │  Leia docs/TASK_QUEUE.md → seção RESULTADO CURSOR   │');
      console.log('  │  Verifique critérios de aceitação                   │');
      console.log('  │  Mude status para COMPLETED ou NEEDS_REVISION       │');
      console.log('  └─────────────────────────────────────────────────────┘');
      console.log('');
      break;

    case 'NEEDS_REVISION':
      log(`→ Revisão necessária${taskLabel}: notificando Cursor...`);
      notify('🔄 Sibanki Pipeline', `Revisão pedida${taskLabel}. Verifique TASK_QUEUE.md.`);
      openCursor();
      break;

    case 'COMPLETED':
      log(`→ Tarefa${taskLabel} concluída e verificada. ✓`);
      if (fs.existsSync(FLAG_FILE)) fs.unlinkSync(FLAG_FILE);
      if (fs.existsSync(ANTIGRAVITY_FLAG)) fs.unlinkSync(ANTIGRAVITY_FLAG);
      break;

    case 'IDLE':
      log(`→ Pipeline ocioso. Aguardando próxima tarefa.`);
      break;

    default:
      // CLAUDE_REVIEWING, CURSOR_IN_PROGRESS, ANTIGRAVITY_OK — apenas log
      log(`→ Status: ${status}${taskLabel}`);
  }
}

// ─── Leitura e polling ────────────────────────────────────────────────────────
function checkFile() {
  if (!fs.existsSync(TASK_FILE)) {
    log(`AVISO: ${TASK_FILE} não encontrado. Aguardando...`);
    return;
  }
  const content = fs.readFileSync(TASK_FILE, 'utf-8');
  const parsed = parseStatus(content);
  if (parsed?.status) {
    handleStatusChange(parsed.status, parsed.taskId);
  }
}

// ─── Watch + polling fallback ─────────────────────────────────────────────────
log('╔══════════════════════════════════════╗');
log('║   Sibanki AI Pipeline — Watcher      ║');
log('╚══════════════════════════════════════╝');
log(`Monitorando: ${TASK_FILE}`);
log(`Flag dir:    ${PIPELINE_DIR}`);
log('Pressione Ctrl+C para parar.\n');

// Verificação inicial
checkFile();

// Watch por mudanças
fs.watch(TASK_FILE, { persistent: true }, (eventType) => {
  if (eventType === 'change') {
    setTimeout(checkFile, 300); // debounce 300ms
  }
});

// Polling a cada 30s como fallback (fs.watch pode falhar em algumas configs)
setInterval(checkFile, 30_000);

log('Watcher ativo. Aguardando mudanças em TASK_QUEUE.md...\n');
