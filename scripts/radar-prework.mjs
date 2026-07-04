#!/usr/bin/env node
/**
 * Radar de Vazamento — PRÉ-TRABALHO (validação da hipótese do número)
 * Ref: docs/SPEC-RADAR-DE-VAZAMENTO.md ("Pré-trabalho obrigatório")
 *
 * Roda os detectores D1, D3, D4(informativo) e D6 sobre um backup JSON
 * exportado pelo app (Configurações → Dados e Backup → Backup JSON).
 * D2 (BCB) e anuidades entram por flag manual, pois não estão no export.
 *
 * USO:
 *   node scripts/radar-prework.mjs <backup.json> [--cdi 0.0095] [--bcb 0] [--rendimento-contas 0]
 *
 *   --cdi                taxa CDI MENSAL decimal (padrão 0.01 ≈ 12% a.a. — mesma do sovereigntyEngine)
 *   --bcb                valor encontrado em Valores a Receber do BCB (R$, único; padrão: não informado)
 *   --rendimento-contas  rendimento mensal já obtido sobre o saldo em conta (R$; padrão 0)
 *
 * Sem dependências. Não escreve nada. Cálculo de D1 portado fielmente de
 * src/utils/sovereigntyEngine.ts#calculateSpreadGap (constantes SOV-2/SOV-5/SOV-6).
 */

import { readFileSync } from 'node:fs';

// ── args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
if (!file) {
  console.error('Uso: node scripts/radar-prework.mjs <backup.json> [--cdi 0.0095] [--bcb 0] [--rendimento-contas 0]');
  process.exit(1);
}
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1 || i === args.length - 1) return def;
  const v = Number(args[i + 1]);
  return Number.isFinite(v) ? v : def;
};
const CDI_MENSAL = flag('cdi', 0.01);
const BCB_VALOR = flag('bcb', NaN); // NaN = não informado (locked)
const RENDIMENTO_CONTAS = flag('rendimento-contas', 0);

const raw = JSON.parse(readFileSync(file, 'utf8'));
const entries = raw.entries ?? [];
const investments = raw.investments ?? [];
const accounts = raw.accounts ?? [];
const accountBalances = raw.accountBalances ?? {};
const recurrents = raw.recurrents ?? [];
const cards = raw.cards ?? [];

const fmt = (v) => `R$ ${v.toFixed(2).replace('.', ',')}`;
const leaks = [];

// ── D1 · Dívida cara vs. investimento (porta de calculateSpreadGap) ──────────
{
  const totalInvested = investments.reduce((s, i) => s + (Number(i.atual ?? i.valor) || 0), 0);
  let weightedInvestmentYield = CDI_MENSAL;
  if (totalInvested > 0) {
    const yieldSum = investments.reduce((s, inv) => {
      const value = Number(inv.atual ?? inv.valor) || 0;
      const monthlyRate = inv.taxaAnual
        ? Math.pow(1 + inv.taxaAnual / 100, 1 / 12) - 1
        : CDI_MENSAL * 0.9;
      return s + value * monthlyRate;
    }, 0);
    weightedInvestmentYield = yieldSum / totalInvested;
  }

  // Backup não exporta creditObligations — dívida vem das faturas de cartão.
  const ROTATIVO_CARTAO_PROXY_MENSAL = 0.14; // SOV-6
  const allDebts = [];
  for (const card of cards) {
    const fatura = Number(card.currentBill ?? 0);
    if (fatura > 50) allDebts.push({ amount: fatura, monthlyRate: ROTATIVO_CARTAO_PROXY_MENSAL });
  }
  const totalDebt = allDebts.reduce((s, d) => s + d.amount, 0);
  const avgDebtCost = totalDebt > 0
    ? allDebts.reduce((s, d) => s + d.amount * d.monthlyRate, 0) / totalDebt
    : 0;
  const spreadGap = weightedInvestmentYield - avgDebtCost;
  const monthlyLeakage = spreadGap < 0 && totalDebt > 0 ? Math.abs(spreadGap) * totalDebt : 0;

  leaks.push({
    id: 'D1',
    label: 'Dívida cara vs. investimento (spread)',
    valueMonthly: monthlyLeakage,
    confidence: totalDebt > 0 ? 'media' : 'alta',
    note: totalDebt > 0
      ? `dívida considerada: ${fmt(totalDebt)} em faturas (rotativo proxy 14% a.m.); rendimento médio ${(weightedInvestmentYield * 100).toFixed(2)}% a.m. ATENÇÃO: creditObligations não estão no backup — se houver empréstimos, o vazamento real é MAIOR.`
      : 'nenhuma fatura > R$ 50 no backup',
  });
}

// ── D2 · Dinheiro esquecido BCB (manual) ─────────────────────────────────────
leaks.push(Number.isFinite(BCB_VALOR)
  ? { id: 'D2', label: 'Dinheiro esquecido (BCB Valores a Receber)', valueOneTime: BCB_VALOR, confidence: 'alta', note: 'informado via --bcb' }
  : { id: 'D2', label: 'Dinheiro esquecido (BCB)', locked: true, note: 'consulte valoresareceber.bcb.gov.br e repasse com --bcb <valor>' });

// ── D3 · Assinaturas / recorrentes suspeitas ─────────────────────────────────
{
  const ativos = recurrents.filter((r) => r.type === 'despesa' && r.active !== false);
  const totalRec = ativos.reduce((s, r) => s + (Number(r.value) || 0), 0);

  // padrão em entries: mesma descrição normalizada em ≥3 meses distintos (últimos 4)
  const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 4);
  const byDesc = new Map();
  for (const e of entries) {
    if (e.type !== 'despesa' || !e.date) continue;
    const d = new Date(e.date);
    if (isNaN(d) || d < cutoff) continue;
    const key = String(e.desc ?? '').trim().toLowerCase().replace(/\d+/g, '').slice(0, 24);
    if (key.length < 4) continue;
    const rec = byDesc.get(key) ?? { months: new Set(), total: 0, n: 0, sample: e.desc };
    rec.months.add(`${d.getFullYear()}-${d.getMonth()}`);
    rec.total += Number(e.value) || 0; rec.n++;
    byDesc.set(key, rec);
  }
  const recDescs = new Set(ativos.map((r) => String(r.desc ?? '').trim().toLowerCase().replace(/\d+/g, '').slice(0, 24)));
  const suspects = [...byDesc.entries()]
    .filter(([k, v]) => v.months.size >= 3 && !recDescs.has(k))
    .map(([, v]) => ({ desc: v.sample, avgMonthly: v.total / v.months.size }))
    .sort((a, b) => b.avgMonthly - a.avgMonthly)
    .slice(0, 10);
  const suspectsTotal = suspects.reduce((s, x) => s + x.avgMonthly, 0);

  leaks.push({
    id: 'D3',
    label: 'Assinaturas e recorrentes a revisar',
    valueMonthly: totalRec + suspectsTotal,
    confidence: 'estimada',
    note: `${ativos.length} recorrentes cadastradas (${fmt(totalRec)}/mês) + ${suspects.length} padrões recorrentes não cadastrados detectados nos lançamentos (${fmt(suspectsTotal)}/mês). Valor = teto a revisar, não corte certo.`,
    detail: suspects.map((s) => `    · ${s.desc}: ~${fmt(s.avgMonthly)}/mês`).join('\n'),
  });
}

// ── D4 · Benefícios de cartão (informativo v1 — sem campo de anuidade) ───────
{
  const comBeneficio = cards.filter((c) => c.cardBenefits && Object.values(c.cardBenefits).some(Boolean));
  const vip = comBeneficio.filter((c) => c.cardBenefits?.vipLounge);
  leaks.push({
    id: 'D4',
    label: 'Benefícios de cartão possivelmente não usados',
    locked: true,
    note: `${comBeneficio.length} cartão(ões) com benefícios cadastrados${vip.length ? `, ${vip.length} com sala VIP` : ''}. Sem campo de anuidade no app ainda — quantificação em R$ entra no v1 do Radar.`,
  });
}

// ── D6 · Dinheiro parado perdendo do CDI ─────────────────────────────────────
{
  const saldoTotal = Object.values(accountBalances).reduce((s, v) => s + Math.max(0, Number(v) || 0), 0);
  const perdaMensal = Math.max(0, saldoTotal * CDI_MENSAL - RENDIMENTO_CONTAS);
  leaks.push({
    id: 'D6',
    label: 'Dinheiro parado perdendo do CDI',
    valueMonthly: perdaMensal,
    confidence: 'estimada',
    note: `${fmt(saldoTotal)} em ${accounts.length || Object.keys(accountBalances).length} conta(s) × CDI ${(CDI_MENSAL * 100).toFixed(2)}% a.m. − rendimento informado ${fmt(RENDIMENTO_CONTAS)}. Se parte já rende, informe com --rendimento-contas.`,
  });
}

// ── resultado ────────────────────────────────────────────────────────────────
const totalMonthly = leaks.reduce((s, l) => s + (l.valueMonthly ?? 0), 0);
const totalOneTime = leaks.reduce((s, l) => s + (l.valueOneTime ?? 0), 0);

console.log('\n══════════════════════════════════════════════════');
console.log('  RADAR DE VAZAMENTO — pré-trabalho (dados do backup)');
console.log('══════════════════════════════════════════════════\n');
for (const l of leaks) {
  const head = l.locked
    ? `🔒 ${l.id} · ${l.label}`
    : `• ${l.id} · ${l.label}: ${l.valueMonthly != null ? fmt(l.valueMonthly) + '/mês' : fmt(l.valueOneTime) + ' (único)'} [confiança: ${l.confidence}]`;
  console.log(head);
  if (l.note) console.log(`    ${l.note}`);
  if (l.detail) console.log(l.detail);
  console.log('');
}
console.log('──────────────────────────────────────────────────');
console.log(`  TOTAL RECORRENTE:  ${fmt(totalMonthly)}/mês`);
if (totalOneTime > 0) console.log(`  TOTAL ÚNICO (BCB): ${fmt(totalOneTime)}`);
console.log('──────────────────────────────────────────────────');
console.log(`\n  Critério da spec: mediana dos testados ≥ R$ 30/mês.`);
console.log(`  Este usuário: ${totalMonthly >= 30 ? '✅ PASSA' : '❌ ABAIXO'} (${fmt(totalMonthly)}/mês)\n`);
