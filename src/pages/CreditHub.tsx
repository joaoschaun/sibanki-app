/**
 * CreditHub.tsx — Hub de Crédito do Sibanki
 *
 * Ação 12 (29/03/2026): Tela dedicada /credito conforme HUB-CREDITO-ARQUITETURA.md.
 * Separa visão macro de crédito (empréstimos, exposição, plano) de Cartões (operacional).
 *
 * Estrutura:
 *   1. Visão geral — pressão, vencimentos, ação recomendada
 *   2. Cartões de crédito — fatura e limite (curto prazo)
 *   3. Empréstimos e financiamentos — médio/longo prazo
 *   4. Plano de ação — prioridade inteligente
 *   5. Oportunidades — produtos contextuais por saúde financeira
 *   6. Educação financeira — carrossel contextual
 */
import { useState } from 'react';
import {
  CreditCard, AlertTriangle, CheckCircle,
  ChevronRight, Zap, BookOpen, BarChart2, Clock,
  ArrowUpRight, RefreshCw, ShieldCheck, Target,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { ComingSoonBadge } from '../components/ui/ComingSoonBadge';
import type { CreditAccount, CreditSnapshot } from '../types/userData';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtPct = (v: number) =>
  `${v.toFixed(1)}%`;

function pressureColor(level?: CreditSnapshot['pressureLevel']) {
  switch (level) {
    case 'controlado': return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
    case 'atencao':    return { text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   };
    case 'elevado':    return { text: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20'  };
    case 'critico':    return { text: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20'    };
    default:           return { text: 'text-si-4',    bg: 'bg-si-zinc-8',       border: 'border-si-border'        };
  }
}

// ── Dados demo (substituídos por Firestore real via useAppContext) ─────────────
const DEMO_ACCOUNTS: CreditAccount[] = [
  { id: 'ca1', kind: 'cartao',      label: 'Nubank',   institution: 'Nubank',   limitTotal: 8_000,  balanceUsed: 2_400, dueDay: 10, closeDay: 3,  status: 'ativo', source: 'manual' },
  { id: 'ca2', kind: 'cartao',      label: 'Itaú',     institution: 'Itaú',     limitTotal: 12_000, balanceUsed: 4_800, dueDay: 15, closeDay: 8,  status: 'ativo', source: 'manual' },
  { id: 'ca3', kind: 'emprestimo',  label: 'CDC Itaú', institution: 'Itaú',     limitTotal: 20_000, balanceUsed: 14_500, status: 'ativo', monthlyInstallment: 720, annualInterestPct: 28.4, source: 'manual' },
  { id: 'ca4', kind: 'financiamento', label: 'Financ. Veículo', institution: 'Santander', limitTotal: 45_000, balanceUsed: 28_000, status: 'ativo', monthlyInstallment: 1_150, annualInterestPct: 19.8, source: 'manual' },
];

const DEMO_SNAPSHOT: CreditSnapshot = {
  version: 1, updatedAt: new Date().toISOString(),
  accountsCount: 4, obligationsOpenCount: 3,
  totalLimit: 65_000, totalUsed: 49_700,
  availableLimit: 15_300,
  cardUtilizationPct: 36.3,
  monthlyDebtCommitment: 1_870,
  dueSoonAmount: 7_200, dueSoonCount: 2,
  highUtilizationAccounts: 1,
  pressureLevel: 'atencao',
};

const EDUCATION_CARDS = [
  { emoji: '⚠️', title: 'O custo real do mínimo',     desc: 'Pagar só o mínimo do cartão pode triplicar sua dívida em 2 anos.' },
  { emoji: '📉', title: 'Como melhorar seu crédito',   desc: 'Pague em dia, reduza utilização abaixo de 30% e evite novas consultas.' },
  { emoji: '🔄', title: 'Quando antecipar parcelas',   desc: 'Vale se a taxa do empréstimo superar o rendimento das suas reservas.' },
  { emoji: '🧮', title: 'Renegociar nem sempre ajuda', desc: 'Alongar prazo reduz parcela, mas aumenta o custo total. Calcule antes.' },
];

const TABS = ['Visão Geral', 'Cartões', 'Empréstimos', 'Plano', 'Oportunidades', 'Educação'] as const;
type Tab = typeof TABS[number];

// ── Componente: barra de utilização ──────────────────────────────────────────
function UtilBar({ pct, warn = 70 }: { pct: number; warn?: number }) {
  const color = pct >= 90 ? 'bg-rose-500' : pct >= warn ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="h-1.5 bg-si-zinc-8 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function CreditHub() {
  const { data } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>('Visão Geral');
  const [eduIdx, setEduIdx] = useState(0);

  // Usa dados reais do Firestore se disponíveis, senão demo
  const accounts:  CreditAccount[]  = (data?.creditAccounts  as CreditAccount[]  | undefined) ?? DEMO_ACCOUNTS;
  const snapshot:  CreditSnapshot   = (data?.creditSnapshot  as CreditSnapshot   | undefined) ?? DEMO_SNAPSHOT;
  const isDemo = !data?.creditAccounts;

  const cards  = accounts.filter((a) => a.kind === 'cartao');
  const loans  = accounts.filter((a) => ['emprestimo', 'financiamento', 'consignado'].includes(a.kind));
  const pc = pressureColor(snapshot.pressureLevel);

  const pressureLabel: Record<NonNullable<CreditSnapshot['pressureLevel']>, string> = {
    controlado: 'Controlado', atencao: 'Atenção', elevado: 'Elevado', critico: 'Crítico',
  };

  // Ação recomendada baseada na pressão
  function nextAction() {
    switch (snapshot.pressureLevel) {
      case 'critico':    return 'Busque renegociação imediata — há vencimentos críticos pendentes.';
      case 'elevado':    return 'Priorize quitar o cartão com maior utilização antes do fechamento.';
      case 'atencao':    return 'Reduza utilização do cartão abaixo de 30% para melhorar seu score.';
      case 'controlado': return 'Crédito saudável. Avalie antecipar parcelas de maior juros.';
      default:           return 'Acompanhe seus vencimentos e mantenha pagamentos em dia.';
    }
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-violet-400" />
            Hub de Crédito
          </h2>
          <p className="text-si-5 text-sm mt-1">Visão consolidada do seu passivo financeiro</p>
        </div>
        {isDemo && (
          <span className="text-xs text-si-5 bg-si-zinc-8 border border-si-border px-3 py-1.5 rounded-xl">
            dados demo
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-si-card rounded-xl p-1 border border-si-border overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex-1 py-2 px-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === t ? 'bg-violet-600 text-si-1 shadow' : 'text-si-5 hover:text-si-3'
            }`}
          >{t}</button>
        ))}
      </div>

      {/* ══ VISÃO GERAL ══ */}
      {activeTab === 'Visão Geral' && (
        <div className="space-y-4">

          {/* Pressão de crédito */}
          <div className={`rounded-2xl border p-5 ${pc.bg} ${pc.border}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-si-5 mb-1">Pressão do crédito</p>
                <p className={`text-2xl font-bold ${pc.text}`}>
                  {pressureLabel[snapshot.pressureLevel ?? 'controlado'] ?? '—'}
                </p>
                <p className="text-xs text-si-4 mt-2 max-w-sm">{nextAction()}</p>
              </div>
              <ShieldCheck className={`w-10 h-10 shrink-0 ${pc.text} opacity-60`} />
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Limite total',       value: fmtBRL(snapshot.totalLimit),             sub: 'capacidade de crédito' },
              { label: 'Total utilizado',    value: fmtBRL(snapshot.totalUsed),              sub: fmtPct(snapshot.cardUtilizationPct) + ' utilizado' },
              { label: 'Compromisso mensal', value: fmtBRL(snapshot.monthlyDebtCommitment),  sub: 'em parcelas e faturas' },
              { label: 'Vence em breve',     value: fmtBRL(snapshot.dueSoonAmount),           sub: `${snapshot.dueSoonCount} obrigações` },
            ].map((k) => (
              <div key={k.label} className="bg-si-card rounded-2xl border border-si-border p-4">
                <p className="text-xs text-si-5 mb-1">{k.label}</p>
                <p className="text-xl font-bold text-si-1">{k.value}</p>
                <p className="text-xs text-zinc-600 mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Utilização geral */}
          <div className="bg-si-card rounded-2xl border border-si-border p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-si-3">Utilização do limite</span>
              <span className={`text-sm font-bold ${snapshot.cardUtilizationPct > 70 ? 'text-rose-400' : snapshot.cardUtilizationPct > 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {fmtPct(snapshot.cardUtilizationPct)}
              </span>
            </div>
            <UtilBar pct={snapshot.cardUtilizationPct} />
            <p className="text-xs text-zinc-600 mt-2">
              Ideal: abaixo de 30% para não impactar o score
            </p>
          </div>

          {/* Resumo de contas */}
          <div className="bg-si-card rounded-2xl border border-si-border overflow-hidden">
            <div className="px-5 py-4 border-b border-si-border flex items-center justify-between">
              <span className="text-sm font-semibold text-si-3">{accounts.length} contas de crédito</span>
              <button onClick={() => setActiveTab('Cartões')}
                className="text-xs text-violet-400 hover:underline flex items-center gap-1">
                Ver detalhes <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {accounts.slice(0, 3).map((a) => {
              const used = a.balanceUsed ?? 0;
              const total = a.limitTotal ?? 1;
              const pct = (used / total) * 100;
              return (
                <div key={a.id} className="px-5 py-3 border-b border-si-border last:border-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <span className="text-sm font-medium text-si-2">{a.label}</span>
                      <span className="ml-2 text-xs text-zinc-600">{a.institution}</span>
                    </div>
                    <span className="text-sm font-semibold text-si-1">{fmtBRL(used)}</span>
                  </div>
                  <UtilBar pct={pct} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ CARTÕES ══ */}
      {activeTab === 'Cartões' && (
        <div className="space-y-4">
          {cards.length === 0 ? (
            <div className="text-center py-16 text-si-5">
              <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum cartão cadastrado.</p>
            </div>
          ) : cards.map((c) => {
            const used   = c.balanceUsed  ?? 0;
            const total  = c.limitTotal   ?? 1;
            const avail  = total - used;
            const pct    = (used / total) * 100;
            return (
              <div key={c.id} className="bg-si-card rounded-2xl border border-si-border p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-si-1">{c.label}</p>
                    <p className="text-xs text-si-5">{c.institution} · fecha dia {c.closeDay} · vence dia {c.dueDay}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    pct >= 70 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                  }`}>{fmtPct(pct)} usado</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-si-5">Fatura atual</p>
                    <p className="font-bold text-si-1">{fmtBRL(used)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-si-5">Disponível</p>
                    <p className="font-bold text-emerald-400">{fmtBRL(avail)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-si-5">Limite total</p>
                    <p className="font-bold text-si-4">{fmtBRL(total)}</p>
                  </div>
                </div>
                <UtilBar pct={pct} />
                <div className="flex gap-2">
                  <ComingSoonBadge>
                    <button disabled className="flex-1 py-2 rounded-xl bg-violet-600/20 text-violet-400/50 text-xs font-semibold cursor-not-allowed">
                      Pagar fatura
                    </button>
                  </ComingSoonBadge>
                  <button className="flex-1 py-2 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 text-xs hover:bg-si-over-3 transition-colors">
                    Ver compras
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ EMPRÉSTIMOS ══ */}
      {activeTab === 'Empréstimos' && (
        <div className="space-y-4">
          {loans.length === 0 ? (
            <div className="text-center py-16 text-si-5">
              <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum empréstimo ou financiamento cadastrado.</p>
            </div>
          ) : loans.map((l) => {
            const saldo   = l.balanceUsed ?? 0;
            const parcela = l.monthlyInstallment ?? 0;
            const juros   = l.annualInterestPct ?? 0;
            const pct     = l.limitTotal ? (saldo / l.limitTotal) * 100 : 0;
            return (
              <div key={l.id} className="bg-si-card rounded-2xl border border-si-border p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-si-1">{l.label}</p>
                    <p className="text-xs text-si-5">{l.institution} · {l.kind}</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-amber-500/10 text-amber-400">
                    {juros.toFixed(1)}% a.a.
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-si-5">Saldo devedor</p>
                    <p className="font-bold text-rose-400">{fmtBRL(saldo)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-si-5">Parcela mensal</p>
                    <p className="font-bold text-si-1">{fmtBRL(parcela)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-si-5">Progresso</p>
                    <p className="font-bold text-si-4">{fmtPct(100 - pct)}</p>
                  </div>
                </div>
                <UtilBar pct={pct} warn={90} />
                <div className="flex gap-2">
                  <ComingSoonBadge>
                    <button disabled className="flex-1 py-2 rounded-xl bg-si-over-2 border border-si-border-md text-si-4/50 text-xs cursor-not-allowed">
                      Simular antecipação
                    </button>
                  </ComingSoonBadge>
                  <ComingSoonBadge>
                    <button disabled className="flex-1 py-2 rounded-xl bg-si-over-2 border border-si-border-md text-si-4/50 text-xs cursor-not-allowed">
                      Renegociar
                    </button>
                  </ComingSoonBadge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ PLANO DE AÇÃO ══ */}
      {activeTab === 'Plano' && (
        <div className="space-y-4">
          <div className={`rounded-2xl border p-5 ${pc.bg} ${pc.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <Target className={`w-5 h-5 ${pc.text}`} />
              <p className={`font-bold ${pc.text}`}>Próximo passo recomendado</p>
            </div>
            <p className="text-sm text-si-3">{nextAction()}</p>
          </div>

          {[
            {
              icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10',
              title: 'Prioridade #1 — Quitar',
              body: `${cards.sort((a, b) => ((b.balanceUsed ?? 0) / (b.limitTotal ?? 1)) - ((a.balanceUsed ?? 0) / (a.limitTotal ?? 1)))[0]?.label ?? '—'}: maior utilização relativa. Reduzir fatura melhora score e reduz encargos do rotativo.`,
              action: 'Pagar agora',
            },
            {
              icon: RefreshCw, color: 'text-amber-400', bg: 'bg-amber-500/10',
              title: 'Renegociação pendente',
              body: loans.length > 0
                ? `${loans[0].label} a ${loans[0].annualInterestPct?.toFixed(1) ?? '?'}% a.a. — avalie portabilidade de crédito para reduzir juros.`
                : 'Nenhum empréstimo ativo. Ótimo momento para construir reserva.',
              action: 'Simular',
            },
            {
              icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10',
              title: 'Vencimentos próximos',
              body: `${fmtBRL(snapshot.dueSoonAmount)} em ${snapshot.dueSoonCount} obrigações vencem nos próximos dias. Garanta saldo em conta.`,
              action: 'Ver calendário',
            },
            {
              icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10',
              title: 'Progresso recente',
              body: 'Utilização geral de ' + fmtPct(snapshot.cardUtilizationPct) + ' — ' + (snapshot.cardUtilizationPct < 30 ? 'excelente! Abaixo de 30%.' : snapshot.cardUtilizationPct < 70 ? 'dentro do aceitável. Meta: abaixo de 30%.' : 'acima do ideal. Foque em reduzir.'),
              action: null,
            },
          ].map((item) => (
            <div key={item.title} className="bg-si-card rounded-2xl border border-si-border p-5 flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-si-2 text-sm mb-1">{item.title}</p>
                <p className="text-xs text-si-5 leading-relaxed">{item.body}</p>
              </div>
              {item.action && (
                <ComingSoonBadge>
                  <button disabled className="shrink-0 px-3 py-1.5 rounded-xl bg-violet-600/20 text-violet-400/50 text-xs font-semibold cursor-not-allowed flex items-center gap-1">
                    {item.action} <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </ComingSoonBadge>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ══ OPORTUNIDADES ══ */}
      {activeTab === 'Oportunidades' && (
        <div className="space-y-4">
          {/* Regra: não oferecer produto agressivo se pressão for elevada/critica */}
          {(snapshot.pressureLevel === 'elevado' || snapshot.pressureLevel === 'critico') && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <p className="text-amber-300 text-sm">
                Com pressão de crédito elevada, priorizamos opções de renegociação — não de contratação.
              </p>
            </div>
          )}

          {[
            {
              show: snapshot.pressureLevel !== 'controlado',
              emoji: '🔄', title: 'Portabilidade de crédito',
              desc: 'Transfira seu empréstimo para outra instituição com taxa menor. Processo gratuito e regulamentado pelo Bacen.',
              cta: 'Simular portabilidade',
              color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20',
            },
            {
              show: snapshot.pressureLevel === 'controlado' || snapshot.pressureLevel === 'atencao',
              emoji: '📈', title: 'Aumento de limite',
              desc: 'Seu comportamento de pagamento qualifica para aumento. Utilização sobe, mas score pode melhorar se você manter o uso baixo.',
              cta: 'Solicitar aumento',
              color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20',
            },
            {
              show: true,
              emoji: '🏠', title: 'Consolidação de dívidas',
              desc: 'Unifique cartões e empréstimos em uma única parcela com taxa menor. Parceiros: Creditas, Open Co, Banco Inter.',
              cta: 'Ver simulação',
              color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20',
            },
            {
              show: snapshot.pressureLevel === 'controlado',
              emoji: '🛡️', title: 'Seguro prestamista',
              desc: 'Proteja suas parcelas em caso de desemprego ou incapacidade. A partir de R$ 12/mês.',
              cta: 'Ver planos',
              color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20',
            },
          ].filter((o) => o.show).map((o) => (
            <div key={o.title} className={`rounded-2xl border p-5 ${o.bg} ${o.border}`}>
              <div className="flex items-start gap-4">
                <span className="text-3xl shrink-0">{o.emoji}</span>
                <div className="flex-1">
                  <p className={`font-bold ${o.color} mb-1`}>{o.title}</p>
                  <p className="text-sm text-si-4 mb-3">{o.desc}</p>
                  <ComingSoonBadge>
                    <button disabled className={`px-4 py-2 rounded-xl text-xs font-bold ${o.bg} ${o.color}/50 border ${o.border} cursor-not-allowed flex items-center gap-1.5`}>
                      {o.cta} <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </ComingSoonBadge>
                </div>
              </div>
            </div>
          ))}

          <p className="text-xs text-zinc-600 text-center">
            Oportunidades exibidas conforme sua saúde financeira atual. Nunca oferecemos crédito que piore sua situação.
          </p>
        </div>
      )}

      {/* ══ EDUCAÇÃO FINANCEIRA ══ */}
      {activeTab === 'Educação' && (
        <div className="space-y-4">
          {/* Carrossel */}
          <div className="bg-si-card rounded-2xl border border-si-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-violet-400" />
              <p className="font-semibold text-si-2">Educação financeira contextual</p>
            </div>
            <div className="text-center py-4">
              <span className="text-5xl">{EDUCATION_CARDS[eduIdx].emoji}</span>
              <h3 className="font-bold text-si-1 mt-3 mb-2">{EDUCATION_CARDS[eduIdx].title}</h3>
              <p className="text-sm text-si-4 leading-relaxed">{EDUCATION_CARDS[eduIdx].desc}</p>
            </div>
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setEduIdx((i) => (i - 1 + EDUCATION_CARDS.length) % EDUCATION_CARDS.length)}
                className="px-4 py-2 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 text-xs hover:bg-si-over-3"
              >← Anterior</button>
              <div className="flex gap-1.5">
                {EDUCATION_CARDS.map((_, i) => (
                  <div key={i} onClick={() => setEduIdx(i)}
                    className={`w-2 h-2 rounded-full cursor-pointer transition-colors ${i === eduIdx ? 'bg-violet-400' : 'bg-zinc-700'}`}
                  />
                ))}
              </div>
              <button
                onClick={() => setEduIdx((i) => (i + 1) % EDUCATION_CARDS.length)}
                className="px-4 py-2 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 text-xs hover:bg-si-over-3"
              >Próximo →</button>
            </div>
          </div>

          {/* Glossário rápido */}
          <div className="bg-si-card rounded-2xl border border-si-border p-5">
            <p className="font-semibold text-si-2 mb-3 text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-400" /> Termos importantes
            </p>
            <div className="space-y-3">
              {[
                { term: 'CET',            def: 'Custo Efetivo Total — inclui juros, IOF, tarifas e seguros. É o custo real do crédito.' },
                { term: 'Utilização',     def: 'Quanto do limite está sendo usado. Acima de 30% começa a impactar o score negativamente.' },
                { term: 'Portabilidade',  def: 'Transferência do seu crédito para outra instituição com taxa menor, sem custo.' },
                { term: 'Amortização',    def: 'Pagamento antecipado de parcelas. Reduz o prazo ou o valor das parcelas restantes.' },
              ].map((g) => (
                <div key={g.term} className="flex gap-3">
                  <span className="text-xs font-bold text-violet-400 shrink-0 mt-0.5 w-24">{g.term}</span>
                  <span className="text-xs text-si-5 leading-relaxed">{g.def}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
