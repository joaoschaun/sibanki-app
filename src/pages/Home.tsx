/**
 * Home — tela inicial limpa, estilo Pierre Finance.
 *
 * Open Finance como fonte primária:
 * — Faturas confirmadas pelo banco via openFinanceCreditBills
 * — Saldo verificado das contas OF
 * — Alerta se dados estiverem stale (>6h)
 * — Sugestão de conexão se OF não configurado
 *
 * O painel completo fica um clique adiante (/dashboard).
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { calculateDaysOfFreedom } from '../utils/sovereigntyEngine';
import {
  LayoutDashboard, PlusCircle, Bot, Target,
  CreditCard, CalendarDays, TrendingUp, Shield, Send, RefreshCw,
} from 'lucide-react';
import { isTransferEntry } from '../utils/entryUtils';

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function greeting(name: string) {
  const h = new Date().getHours();
  const saudacao = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  return `${saudacao}, ${name}.`;
}

function todayDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function in7DaysStr() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function inNDaysStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── briefing types ───────────────────────────────────────────────────────────
type BriefingItem = {
  emoji: string;
  text: string;
  link?: string;
  /** true = dado confirmado pelo Open Finance */
  verified?: boolean;
  /** 'warn' = item de atenção (stale/desconectado) */
  kind?: 'warn' | 'info' | 'normal';
};

// ─── briefing builder ─────────────────────────────────────────────────────────
function buildBriefingItems(ctx: ReturnType<typeof useAppContext>): BriefingItem[] {
  const {
    entries, recurrents, cards, goals, budgets,
    accountBalances, accountMeta, investments,
    hasOpenFinance, openFinanceCreditBills, openFinanceSyncedAt,
    dataFreshness,
  } = ctx;

  const items: BriefingItem[] = [];
  const today = todayDateStr();
  const in7 = in7DaysStr();
  const now = new Date();
  const currentMonth = today.slice(0, 7);
  const todayDay = now.getDate();

  // ── 0. Alerta de dados stale ───────────────────────────────────────────────
  if (hasOpenFinance && dataFreshness === 'stale' && openFinanceSyncedAt) {
    const hoursAgo = Math.round(
      (Date.now() - new Date(openFinanceSyncedAt).getTime()) / 3_600_000,
    );
    items.push({
      emoji: '🔄',
      text: `Dados bancários desatualizados — última sincronização há **${hoursAgo}h**. Atualizando em segundo plano…`,
      link: '/configuracoes',
      kind: 'warn',
    });
  }

  // ── 1. Recorrentes vencendo em até 7 dias ──────────────────────────────────
  const recVenc: { name: string; value: number; day: number }[] = [];
  for (const r of recurrents ?? []) {
    if (!(r as any).active && (r as any).active !== undefined) continue;
    const day = Number((r as any).dueDay ?? (r as any).dia ?? (r as any).day ?? 0);
    if (!day) continue;
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), day);
    const dateStr = `${thisMonth.getFullYear()}-${String(thisMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (dateStr >= today && dateStr <= in7) {
      const name = (r as any).desc || (r as any).name || 'Recorrente';
      const value = Number((r as any).value ?? (r as any).valor ?? 0);
      recVenc.push({ name, value, day });
    }
  }
  if (recVenc.length > 0) {
    const total = recVenc.reduce((s, r) => s + r.value, 0);
    if (recVenc.length === 1) {
      const daysLeft = recVenc[0].day - todayDay;
      items.push({
        emoji: '📅',
        text: `**${recVenc[0].name}** vence ${daysLeft <= 0 ? 'hoje' : `em ${daysLeft} dia(s)`} — R$ ${fmtBRL(recVenc[0].value)}.`,
        link: '/recorrentes',
      });
    } else {
      items.push({
        emoji: '📅',
        text: `**${recVenc.length} contas** vencem nos próximos 7 dias — total R$ ${fmtBRL(total)}.`,
        link: '/recorrentes',
      });
    }
  }

  // ── 2. Faturas de cartão — Open Finance tem prioridade ────────────────────
  if (hasOpenFinance && openFinanceCreditBills.length > 0) {
    // Faturas reais confirmadas pelo banco, vencendo em até 5 dias
    const in5 = inNDaysStr(5);
    const urgentBills = openFinanceCreditBills
      .filter((b) => b.dueDate && b.dueDate >= today && b.dueDate <= in5 && b.totalAmount > 0)
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));

    for (const bill of urgentBills) {
      const card = cards?.find((c) => (c as any).pluggyAccountId === bill.pluggyAccountId);
      const cardName = card?.name ?? 'cartão';
      const dueParts = (bill.dueDate ?? '').split('-');
      const dueDate = new Date(
        Number(dueParts[0]), Number(dueParts[1]) - 1, Number(dueParts[2]),
      );
      const daysLeft = Math.ceil((dueDate.getTime() - now.setHours(0, 0, 0, 0)) / 86_400_000);
      items.push({
        emoji: '💳',
        text: `Fatura **${cardName}** de R$ ${fmtBRL(bill.totalAmount)} vence ${daysLeft <= 0 ? 'hoje' : `em ${daysLeft} dia(s)`} — confirmado pelo banco.`,
        link: '/cartoes',
        verified: true,
      });
    }
  } else {
    // Fallback: calcula a partir das compras registradas no cartão
    for (const card of cards ?? []) {
      if (!card.closeDay) continue;
      const daysLeft = card.closeDay - todayDay;
      if (daysLeft >= 0 && daysLeft <= 5) {
        const fat = (card.purchases ?? [])
          .filter((p) => (p.billingMonth ?? '').startsWith(currentMonth))
          .reduce((s, p) => s + (p.value ?? 0), 0);
        if (fat > 0) {
          items.push({
            emoji: '💳',
            text: `Fatura do **${card.name || 'cartão'}** fecha em ${daysLeft === 0 ? 'hoje' : `${daysLeft} dia(s)`} — R$ ${fmtBRL(fat)}.`,
            link: '/cartoes',
          });
        }
      }
    }
  }

  // ── 3. Orçamentos estourados ───────────────────────────────────────────────
  const budgetMap: Record<string, number> = {};
  if (budgets && typeof budgets === 'object') {
    for (const [k, v] of Object.entries(budgets)) {
      const n = Number(v);
      if (!isNaN(n) && n > 0) budgetMap[k] = n;
    }
  }
  const catSpent: Record<string, number> = {};
  for (const e of entries ?? []) {
    if (isTransferEntry(e)) continue;
    if (e.type !== 'despesa') continue;
    if ((e.date ?? '').slice(0, 7) !== currentMonth) continue;
    const cat = e.category || 'Outros';
    catSpent[cat] = (catSpent[cat] ?? 0) + (Number(e.value) || 0);
  }
  const overBudget: { cat: string; pct: number }[] = [];
  for (const [cat, limit] of Object.entries(budgetMap)) {
    const spent = catSpent[cat] ?? 0;
    if (spent > limit) {
      overBudget.push({ cat, pct: Math.round((spent / limit) * 100) });
    }
  }
  if (overBudget.length > 0) {
    overBudget.sort((a, b) => b.pct - a.pct);
    const top = overBudget[0];
    const suffix = hasOpenFinance ? ' (baseado no seu extrato).' : '.';
    if (overBudget.length === 1) {
      items.push({
        emoji: '⚠️',
        text: `**${top.cat}** está ${top.pct}% do orçamento — acima do limite${suffix}`,
        link: '/orcamento',
        verified: hasOpenFinance,
      });
    } else {
      items.push({
        emoji: '⚠️',
        text: `**${overBudget.length} categorias** acima do orçamento — pior: ${top.cat} (${top.pct}%)${suffix}`,
        link: '/orcamento',
        verified: hasOpenFinance,
      });
    }
  }

  // ── 4. Metas próximas do prazo (< 30 dias) ────────────────────────────────
  for (const g of goals ?? []) {
    const deadline = (g as any).deadline || (g as any).endDate;
    if (!deadline) continue;
    const dFim = new Date(deadline);
    const daysLeft = Math.ceil((dFim.getTime() - now.getTime()) / 86_400_000);
    if (daysLeft > 0 && daysLeft <= 30) {
      const pct = g.target > 0 ? Math.round(((g.current ?? 0) / g.target) * 100) : 0;
      if (pct < 100) {
        const falta = g.target - (g.current ?? 0);
        items.push({
          emoji: '🎯',
          text: `Meta **${(g as any).name || g.title}** vence em ${daysLeft} dias — faltam R$ ${fmtBRL(falta)} (${pct}% concluída).`,
          link: '/planejamento',
        });
      }
    }
  }

  // ── 5. Investimentos ──────────────────────────────────────────────────────
  const invList = investments ?? [];
  if (invList.length > 0) {
    const totalInv = invList.reduce((s, i) => s + Number((i as any).atual ?? (i as any).currentValue ?? (i as any).value ?? 0), 0);
    if (totalInv > 0) {
      const cdiMes = 0.0107;
      const totalYield = invList.reduce((s, i) => {
        const rate = Number((i as any).monthlyRate ?? (i as any).rate ?? 0);
        const val = Number((i as any).atual ?? (i as any).currentValue ?? (i as any).value ?? 0);
        return s + val * (rate || cdiMes);
      }, 0);
      const rendMes = totalInv > 0 ? (totalYield / totalInv) * 100 : 0;
      const verifiedCount = invList.filter((i) => (i as any).source === 'open-finance').length;
      const verifiedSuffix = verifiedCount > 0 ? ` (${verifiedCount} confirmado${verifiedCount > 1 ? 's' : ''} pelo banco)` : '';
      items.push({
        emoji: '📈',
        text: `Carteira de **R$ ${fmtBRL(totalInv)}** rendendo ~${rendMes.toFixed(2)}% a.m.${verifiedSuffix} — ${rendMes >= cdiMes * 100 * 0.9 ? 'acima' : 'abaixo'} do CDI.`,
        link: '/crescimento',
        verified: verifiedCount > 0,
      });
    }
  }

  // ── 6. Saldo disponível ───────────────────────────────────────────────────
  let saldoContas = 0;
  let saldoVerified = false;
  for (const [acc, bal] of Object.entries(accountBalances ?? {})) {
    if ((accountMeta as any)?.[acc]?.incluirNaSoma === false) continue;
    saldoContas += Number(bal) || 0;
    if ((accountMeta as any)?.[acc]?.source === 'open-finance') saldoVerified = true;
  }
  if (saldoContas > 0 && items.filter((i) => i.kind !== 'warn').length === 0) {
    // mostra saldo apenas se não há outros alertas mais urgentes
    const suffix = saldoVerified
      ? ' — saldo verificado pelo Open Finance.'
      : ' em contas registradas.';
    items.push({
      emoji: '💰',
      text: `Saldo disponível: **R$ ${fmtBRL(saldoContas)}**${suffix}`,
      verified: saldoVerified,
    });
  }

  // ── 7. Sugestão de conectar Open Finance ─────────────────────────────────
  if (!hasOpenFinance && items.filter((i) => i.kind !== 'warn').length === 0) {
    items.push({
      emoji: '🏦',
      text: `Conecte seu banco via **Open Finance** para que eu veja seu extrato real e possa te orientar com dados verificados.`,
      link: '/configuracoes#open-finance',
      kind: 'info',
    });
  }

  return items;
}

// ─── quick actions ────────────────────────────────────────────────────────────
const ACTIONS = [
  { icon: PlusCircle,      label: 'Registrar gasto',   to: '/lancamentos',  color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20' },
  { icon: LayoutDashboard, label: 'Ver painel',         to: '/dashboard',    color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20' },
  { icon: Bot,             label: 'Consultor IA',       to: '/consultor-ia', color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/20 hover:bg-violet-500/20' },
  { icon: Target,          label: 'Metas',              to: '/planejamento', color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20' },
  { icon: CreditCard,      label: 'Cartões',            to: '/cartoes',      color: 'text-rose-400',    bg: 'bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20' },
  { icon: CalendarDays,    label: 'Calendário',         to: '/calendario',   color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20' },
];

// ─── bold renderer (simple **text** → <strong>) ───────────────────────────────
function BoldText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="text-si-1 font-semibold">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

// ─── sync freshness badge ─────────────────────────────────────────────────────
function SyncBadge({
  syncedAt, isSyncing, onSync,
}: {
  syncedAt: string | null;
  isSyncing: boolean;
  onSync: () => void;
}) {
  if (!syncedAt) return null;
  const minutesAgo = Math.round((Date.now() - new Date(syncedAt).getTime()) / 60_000);
  const label =
    minutesAgo < 60
      ? `há ${minutesAgo} min`
      : `há ${Math.round(minutesAgo / 60)}h`;

  return (
    <button
      type="button"
      onClick={onSync}
      disabled={isSyncing}
      className="flex items-center gap-1.5 text-xs text-si-5 hover:text-si-3 transition-colors disabled:opacity-50"
      title="Sincronizar com o banco"
    >
      <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
      {isSyncing ? 'Sincronizando…' : `Open Finance · ${label}`}
    </button>
  );
}

// ─── component ────────────────────────────────────────────────────────────────
export default function Home() {
  const ctx = useAppContext();
  const navigate = useNavigate();
  const {
    user, score, entries, accountBalances, accountMeta, investments, loading,
    hasOpenFinance, openFinanceSyncedAt, dataFreshness, isSyncing, syncOpenFinance,
  } = ctx;
  const [architectReply, setArchitectReply] = useState('');

  const userName = user?.displayName || user?.email?.split('@')[0] || 'você';

  const sendToConsultant = () => {
    const t = architectReply.trim();
    if (!t) return;
    setArchitectReply('');
    navigate('/consultor-ia', { state: { initialMessage: t } });
  };

  const freedom = useMemo(
    () => calculateDaysOfFreedom({ entries, accountBalances, accountMeta, investments }),
    [entries, accountBalances, accountMeta, investments],
  );

  const briefingItems = useMemo(
    () => (loading ? [] : buildBriefingItems(ctx)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      loading,
      ctx.entries, ctx.recurrents, ctx.cards, ctx.goals, ctx.budgets,
      ctx.investments, ctx.accountBalances,
      ctx.openFinanceCreditBills, ctx.dataFreshness, ctx.openFinanceSyncedAt,
    ],
  );

  const dateStr = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div className="w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[90rem] mx-auto flex flex-col gap-10 lg:gap-12 xl:gap-14 py-2 lg:py-4">

      {/* ── top: greeting + date ── */}
      <div>
        <p className="text-si-3 text-xl lg:text-2xl font-semibold capitalize tracking-tight">{dateStr}</p>
      </div>

      {/* ── chat bubble: briefing ── */}
      <div className="flex gap-4 lg:gap-6 items-start">
        {/* Avatar */}
        <div
          className="w-12 h-12 lg:w-14 lg:h-14 rounded-full shrink-0 flex items-center justify-center text-white text-sm lg:text-base font-black shadow-xl shadow-emerald-500/20"
          style={{ background: 'linear-gradient(135deg,#10b981,#7c3aed)' }}
        >
          AS
        </div>

        {/* Bubble */}
        <div className="flex-1 min-w-0">
          {/* Header: nome + badge OF */}
          <div className="flex items-center justify-between mb-2 gap-3">
            <p className="text-xs lg:text-sm font-bold text-emerald-400">Arquiteto Soberano</p>
            {hasOpenFinance && (
              <SyncBadge
                syncedAt={openFinanceSyncedAt}
                isSyncing={isSyncing}
                onSync={syncOpenFinance}
              />
            )}
          </div>

          <div className="bg-si-card border border-si-border-md rounded-2xl rounded-tl-sm p-5 sm:p-6 lg:p-8 space-y-3 lg:space-y-4">

            {/* greeting line */}
            <p className="text-si-1 font-semibold text-base lg:text-lg">
              {greeting(userName)}
            </p>

            {loading ? (
              <div className="flex items-center gap-2 text-si-4 text-sm">
                <div className="w-4 h-4 border-2 border-emerald-500/40 border-t-emerald-400 rounded-full animate-spin" />
                Preparando seu briefing…
              </div>
            ) : briefingItems.length === 0 ? (
              <p className="text-si-3 text-sm lg:text-base leading-relaxed max-w-3xl">
                Tudo tranquilo hoje — nenhuma ação urgente no radar.
                {!hasOpenFinance && (
                  <>{' '}
                    <Link to="/configuracoes#open-finance" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
                      Conecte seu banco
                    </Link>
                    {' '}para eu acompanhar seu extrato automaticamente.
                  </>
                )}
              </p>
            ) : (
              <>
                <p className="text-si-4 text-sm lg:text-base">
                  {briefingItems.filter((i) => i.kind !== 'warn').length === 0
                    ? 'Uma atualização sobre seus dados:'
                    : briefingItems.filter((i) => i.kind !== 'warn').length === 1
                    ? 'Tenho uma coisa para você hoje:'
                    : `Tenho ${briefingItems.filter((i) => i.kind !== 'warn').length} itens para você hoje:`}
                </p>
                <ul className="space-y-2 lg:space-y-3">
                  {briefingItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 lg:gap-3">
                      <span className="text-lg lg:text-xl leading-snug shrink-0">{item.emoji}</span>
                      <span className={`text-sm lg:text-base leading-relaxed ${
                        item.kind === 'warn' ? 'text-amber-300/90' : 'text-si-2'
                      }`}>
                        <BoldText text={item.text} />
                        {item.verified && (
                          <span className="ml-1.5 inline-flex items-center text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 rounded px-1 py-0.5 align-middle">
                            ✓ OF
                          </span>
                        )}
                        {item.link && (
                          <Link
                            to={item.link}
                            className="ml-2 text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                          >
                            ver →
                          </Link>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
                {/* Connect bank CTA when no OF */}
                {!hasOpenFinance && (
                  <p className="text-xs text-si-5 pt-1 border-t border-si-border">
                    Conecte seu{' '}
                    <Link to="/configuracoes#open-finance" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
                      banco via Open Finance
                    </Link>
                    {' '}para que esses dados sejam verificados automaticamente.
                  </p>
                )}
                <p className="text-si-5 text-xs pt-1">
                  Como posso ajudar?
                </p>
              </>
            )}

            {!loading && (
              <div className="border-t border-si-border pt-4 mt-2 space-y-2">
                <label htmlFor="home-architect-reply" className="text-xs font-medium text-si-5">
                  Responder ao Arquiteto
                </label>
                <div className="flex gap-2 items-end">
                  <textarea
                    id="home-architect-reply"
                    rows={3}
                    value={architectReply}
                    onChange={(e) => setArchitectReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendToConsultant();
                      }
                    }}
                    placeholder="Digite sua mensagem… (Enter envia, Shift+Enter quebra linha)"
                    className="flex-1 min-w-0 rounded-xl bg-si-bg border border-si-border-md px-3 py-2.5 text-sm text-si-2 placeholder:text-si-5 focus:outline-none focus:border-emerald-500/50 resize-y min-h-[5rem]"
                    aria-label="Mensagem para o Arquiteto Soberano"
                  />
                  <button
                    type="button"
                    onClick={sendToConsultant}
                    disabled={!architectReply.trim()}
                    className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 text-sm font-semibold disabled:opacity-40 disabled:pointer-events-none"
                    aria-label="Enviar ao Consultor IA"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Enviar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── quick actions grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 lg:gap-4 xl:gap-5">
        {ACTIONS.map(({ icon: Icon, label, to, color, bg }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-3 lg:gap-4 p-4 sm:p-5 lg:p-6 rounded-2xl border transition-colors min-h-[4.5rem] sm:min-h-[5rem] ${bg}`}
          >
            <Icon className={`w-5 h-5 sm:w-6 sm:h-6 shrink-0 ${color}`} />
            <span className="text-si-2 text-sm sm:text-base font-semibold leading-tight">{label}</span>
          </Link>
        ))}
      </div>

      {/* ── footer: dias de liberdade + score ── */}
      {!loading && (
        <div className="flex items-center justify-center gap-4 lg:gap-6 text-xs sm:text-sm text-si-5 pt-4 lg:pt-6">
          <span className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-violet-400" />
            {freedom.days} dias de liberdade
          </span>
          <span className="w-px h-3 bg-si-border" />
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            Score {score}
          </span>
          {hasOpenFinance && dataFreshness === 'fresh' && (
            <>
              <span className="w-px h-3 bg-si-border" />
              <span className="text-emerald-400/70">● dados verificados</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
