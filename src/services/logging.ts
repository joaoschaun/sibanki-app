/**
 * logging.ts — Logging centralizado de erros para o Firestore.
 *
 * Problema resolvido: erros em persistUserData eram silenciados ou exibidos
 * apenas no console, impossibilitando análise pós-mortem em produção.
 *
 * Estratégia:
 *   - DEV: console.error sempre (visibilidade imediata)
 *   - PROD: tenta gravar em /errorLogs/{uid}/{auto-id}; se falhar, console.error
 *   - Fire-and-forget: nunca bloqueia a UI — o usuário não fica esperando por log
 *   - Rate limiting: no máximo 10 logs por minuto por sessão (evita flood)
 *   - Sanitização: stack traces truncados em 2.000 chars; dados do usuário nunca logados
 */
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITER — evita flood de logs
// ─────────────────────────────────────────────────────────────────────────────

const LOG_RATE_WINDOW_MS = 60_000; // 1 minuto
const LOG_RATE_MAX = 10;           // máx 10 logs/min

let _logCount = 0;
let _logWindowStart = Date.now();

function isRateLimited(): boolean {
  const now = Date.now();
  if (now - _logWindowStart > LOG_RATE_WINDOW_MS) {
    _logCount = 0;
    _logWindowStart = now;
  }
  if (_logCount >= LOG_RATE_MAX) return true;
  _logCount++;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export type LogSeverity = 'error' | 'warn' | 'info';

export interface LogEntry {
  /** Módulo ou função que gerou o erro (ex: "persistUserData.addEntry") */
  source: string;
  /** Mensagem legível */
  message: string;
  /** Stack trace truncado (apenas em 'error') */
  stack?: string;
  /** Contexto adicional livre — nunca inclua dados financeiros do usuário */
  context?: Record<string, unknown>;
  severity: LogSeverity;
  /** URL da página onde ocorreu o erro */
  url?: string;
  /** ISO timestamp gerado no cliente */
  clientTimestamp: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loga um erro/aviso/info.
 * Fire-and-forget — nunca rejeita. Use sem await.
 *
 * @param source   Identificador do caller (ex: "addEntry", "syncOpenFinance")
 * @param error    O erro capturado (Error | unknown)
 * @param uid      UID do usuário autenticado (para rota Firestore). Se null, só console.
 * @param context  Dados livres de contexto (ex: { entryDesc, action }). Nunca valores financeiros.
 * @param severity Padrão: 'error'
 */
export function logClientError(
  source: string,
  error: unknown,
  uid: string | null,
  context?: Record<string, unknown>,
  severity: LogSeverity = 'error',
): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = severity === 'error' && error instanceof Error
    ? (error.stack ?? '').slice(0, 2_000)
    : undefined;

  const entry: LogEntry = {
    source,
    message,
    stack,
    context,
    severity,
    url: typeof window !== 'undefined' ? window.location.pathname : undefined,
    clientTimestamp: new Date().toISOString(),
  };

  // Sempre loga no console em DEV, nunca em PROD para não poluir
  if (import.meta.env.DEV) {
    const fn = severity === 'error' ? console.error : severity === 'warn' ? console.warn : console.info;
    fn(`[${severity.toUpperCase()}] ${source}:`, message, context ?? '');
  }

  // Sem uid → só console (usuário não autenticado ou pré-login)
  if (!uid) return;

  // Rate limiting
  if (isRateLimited()) return;

  // Grava no Firestore fire-and-forget
  const col = collection(db, 'users', uid, 'errorLogs');
  addDoc(col, {
    ...entry,
    serverTimestamp: serverTimestamp(),
  }).catch(() => {
    // Se o log falhar, apenas loga no console — nunca quebra a UI
    console.error(`[logging.ts] Falha ao gravar log no Firestore (source: ${source})`);
  });
}

/**
 * Versão abreviada para warnings (não críticos).
 */
export function logClientWarn(
  source: string,
  message: string,
  uid: string | null,
  context?: Record<string, unknown>,
): void {
  logClientError(source, new Error(message), uid, context, 'warn');
}

/**
 * Wrapper para try/catch em operações assíncronas.
 * Executa `fn`, captura erros, loga e re-lança se `rethrow=true`.
 *
 * Uso:
 * ```typescript
 * const result = await withErrorLogging('addEntry', uid, async () => {
 *   return await persistUserData.addEntry(uid, entry);
 * });
 * ```
 */
export async function withErrorLogging<T>(
  source: string,
  uid: string | null,
  fn: () => Promise<T>,
  context?: Record<string, unknown>,
  rethrow = true,
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (e) {
    logClientError(source, e, uid, context);
    if (rethrow) throw e;
    return undefined;
  }
}
