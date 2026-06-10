import { useEffect, useMemo, useState } from 'react';
import { DashboardSkeleton } from '../components/ui/PageSkeleton';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  AlertTriangle,
  Lightbulb,
  CreditCard,
  Zap,
  LayoutDashboard,
  ArrowLeftRight,
  Layers,
  RefreshCw,
  Tag
} from 'lucide-react';
import { useIntelligence } from '../context/IntelligenceContext';
import { CoachSetup } from '../components/ui/CoachSetup';
import { SovereigntyHero } from '../components/ui/SovereigntyHero';
import { SpreadGapCard } from '../components/ui/SpreadGapCard';
import { InsightDoDia } from '../components/ui/InsightDoDia';
import { SibcoinWidget } from '../components/sibcoin/SibcoinWidget';
import { SibcoinMissionBanner } from '../components/sibcoin/SibcoinMissionBanner';
import { isTransferEntry, nonTransferEntries } from '../utils/entryUtils';
import { useDashboardMode } from '../hooks/useDashboardMode';
import { ExpensesPieChart } from '../components/charts/ExpensesPieChart';
import { FinancialBarChart } from '../components/charts/FinancialBarChart';
import { BalanceAreaChart } from '../components/charts/BalanceAreaChart';
import { PageTransition } from '../components/ui/PageTransition';
import { RoundUpWidget } from '../components/ui/RoundUpWidget';
import { DashboardTransactionsTab } from '../components/dashboard/DashboardTransactionsTab';
import { DashboardParcelamentosTab } from '../components/dashboard/DashboardParcelamentosTab';
import { DashboardAssinaturasTab } from '../components/dashboard/DashboardAssinaturasTab';
import { DashboardCategoriasTab } from '../components/dashboard/DashboardCategoriasTab';
import { DashboardCartoesTab } from '../components/dashboard/DashboardCartoesTab';

const DASHBOARD_WIDGETS_KEY = 'sibanki_dashboard_widgets';

type WidgetConfig = {
  insight: boolean;
  passos: boolean;
  alertas: boolean;
  resumo: boolean;
  graficos: boolean;
};

function readWidgetConfig(): WidgetConfig {
  try {
    const raw = localStorage.getItem(DASHBOARD_WIDGETS_KEY);
    if (!raw) return { insight: true, passos: true, alertas: true, resumo: false, graficos: true };
    const parsed = JSON.parse(raw) as Partial<WidgetConfig>;
    return {
      insight: parsed.insight !== false,
      passos: parsed.passos !== false,
      alertas: parsed.alertas !== false,
      resumo: parsed.resumo !== false,
      graficos: parsed.graficos !== false,
    };
  } catch {
    return { insight: true, passos: true, alertas: true, resumo: true, graficos: true };
  }
}

function getMonthKey(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

function getMonthLabel(monthKey: string): string {
  const [, m] = monthKey.split('-').map(Number);
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[m - 1]}`;
}

export default function Dashboard() {
  const {
    user, entries, accounts, score, budgets, loading,
    accountBalances, accountMeta, cards, goals, recurrents,
    financialProfile, investments, creditObligations,
    hasOpenFinance, verifiedEntries, openFinanceIdentityByItem, dataFreshness,
  } = useAppContext();
  const { mode: dashboardMode } = useDashboardMode();

  const now = useMemo(() => new Date(), []);
  const [showEditor, setShowEditor] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'visao_geral' | 'transacoes' | 'parcelamentos' | 'assinaturas' | 'categorias' | 'cartoes'>('visao_geral');
  const [widgets, setWidgets] = useState<WidgetConfig>(() => readWidgetConfig());
  const currentMonthKey = getMonthKey(now);
  const prevMonthDate = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d;
  }, [now]);
  const prevMonthKey = getMonthKey(prevMonthDate);

  const { receitaMes, despesaMes, receitaMesAnt, despesaMesAnt, catTotals, last6Months } = useMemo(() => {
    let rec = 0,
      desp = 0,
      recAnt = 0,
      despAnt = 0;
    const byCat: Record<string, number> = {};
    const monthKeys: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthKeys.push(getMonthKey(d));
    }
    const byMonthMap: Record<string, { receita: number; despesa: number }> = {};
    for (const mk of monthKeys) byMonthMap[mk] = { receita: 0, despesa: 0 };

    for (const e of entries) {
      if (isTransferEntry(e)) continue;
      const date = e.date ?? '';
      const monthKey = date.slice(0, 7);
      const val = Number(e.value) || 0;
      if (monthKey === currentMonthKey) {
        if (e.type === 'receita') rec += val;
        else if (e.type === 'despesa') {
          desp += val;
          const cat = e.category || 'Outros';
          byCat[cat] = (byCat[cat] ?? 0) + val;
        }
      } else if (monthKey === prevMonthKey) {
        if (e.type === 'receita') recAnt += val;
        else if (e.type === 'despesa') despAnt += val;
      }
      if (byMonthMap[monthKey]) {
        if (e.type === 'receita') byMonthMap[monthKey].receita += val;
        else if (e.type === 'despesa') byMonthMap[monthKey].despesa += val;
      }
    }

    const last6Months = monthKeys.map((mk) => ({ monthKey: mk, ...byMonthMap[mk] }));

    return {
      receitaMes: rec,
      despesaMes: desp,
      receitaMesAnt: recAnt,
      despesaMesAnt: despAnt,
      catTotals: byCat,
      last6Months,
    };
  }, [entries, currentMonthKey, prevMonthKey, now]);

  const saldoMes = receitaMes - despesaMes;
  const entriesNoTransfer = nonTransferEntries(entries);
  const totalReceita = entriesNoTransfer.filter((e) => e.type === 'receita').reduce((s, e) => s + (e.value ?? 0), 0);
  const totalDespesa = entriesNoTransfer.filter((e) => e.type === 'despesa').reduce((s, e) => s + (e.value ?? 0), 0);
  const saldo = totalReceita - totalDespesa;

  const varReceita =
    receitaMesAnt > 0 ? ((receitaMes - receitaMesAnt) / receitaMesAnt) * 100 : receitaMes > 0 ? 100 : 0;
  const varDespesa =
    despesaMesAnt > 0 ? ((despesaMes - despesaMesAnt) / despesaMesAnt) * 100 : despesaMes > 0 ? 100 : 0;

  const budgetMap = useMemo(() => {
    const b: Record<string, number> = {};
    if (budgets && typeof budgets === 'object') {
      for (const [k, v] of Object.entries(budgets)) {
        const n = typeof v === 'number' ? v : Number(v);
        if (!Number.isNaN(n)) b[k] = n;
      }
    }
    return b;
  }, [budgets]);

  // Dados de soberania via IntelligenceContext — calculados uma vez, compartilhados por todo o app
  const { freedom, spread, healthLevel, nextBestActions, journeyStage } = useIntelligence();

  const ACTION_MAP: Record<string, { label: string; to: string; description: string }> = {
    'conectar-open-finance': { label: 'Conectar banco',        to: '/configuracoes',  description: 'Ative o Open Finance para dados reais' },
    'revisar-credito':       { label: 'Revisar crédito',       to: '/cartoes',        description: 'Uso de limite elevado detectado' },
    'organizar-dividas':     { label: 'Organizar dívidas',     to: '/consultor-ia',   description: 'Estratégia de quitação otimizada' },
    'ajustar-orcamento':     { label: 'Ajustar orçamento',     to: '/orcamento',      description: 'Categorias acima do limite' },
    'criar-meta':            { label: 'Criar uma meta',        to: '/planejamento',   description: 'Defina objetivos financeiros claros' },
    'avaliar-investimentos': { label: 'Avaliar investimentos', to: '/crescimento',    description: 'Momento certo para investir' },
    'aprofundar-consultoria':{ label: 'Falar com consultor',   to: '/consultor-ia',   description: 'Análise aprofundada da sua situação' },
  };

  const HEALTH_COLORS: Record<string, string> = {
    'critico': 'text-rose-400 bg-rose-500/10 border-rose-500/25',
    'pressao': 'text-amber-400 bg-amber-500/10 border-amber-500/25',
    'atencao': 'text-blue-300 bg-blue-500/10 border-blue-500/25',
    'saudavel': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  };

  const JOURNEY_LABELS: Record<string, string> = {
    'primeiros-passos':    'Começando a jornada',
    'pressionado':         'Sob pressão financeira',
    'organizando-base':    'Organizando a base',
    'estabilizando':       'Estabilizando as finanças',
    'pronto-para-crescer': 'Pronto para crescer',
  };


  const alertas = useMemo(() => {
    const list: { type: 'positive' | 'warning' | 'info'; title: string; text: string; link?: string }[] = [];
    if (saldoMes > 0) {
      list.push({
        type: 'positive',
        title: 'Saldo positivo!',
        text: 'Você gasta menos do que ganha. Direcione o excedente para investimentos.',
      });
    } else if (saldoMes < 0 && despesaMes > 0 && !widgets.insight) {
      list.push({
        type: 'warning',
        title: 'Déficit no mês',
        text: 'Despesas superam receitas. Reveja gastos e orçamento.',
        link: '/orcamento',
      });
    }
    for (const [cat, gasto] of Object.entries(catTotals)) {
      const limite = budgetMap[cat];
      if (limite != null && limite > 0 && gasto > limite) {
        const pct = Math.round((gasto / limite) * 100);
        list.push({
          type: 'warning',
          title: 'Gastos altos',
          text: `${cat}: ${pct}% acima do orçado`,
          link: '/planejamento',
        });
      }
    }
    if (list.length === 0 && entriesNoTransfer.length === 0) {
      list.push({
        type: 'info',
        title: 'Comece a registrar',
        text: 'Adicione receitas e despesas em Lançamentos para ver seu resumo aqui.',
        link: '/lancamentos',
      });
    }
    return list;
  }, [saldoMes, despesaMes, catTotals, budgetMap, entriesNoTransfer.length, widgets.insight]);

  const donutTotal = Object.values(catTotals).reduce((a, b) => a + b, 0);
  const donutSegments = useMemo(() => {
    if (donutTotal <= 0) return [];
    return Object.entries(catTotals)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => {
        const pct = (value / donutTotal) * 100;
        return { name, value, pct };
      });
  }, [catTotals, donutTotal]);

  const maxVal = useMemo(() => {
    let m = 0;
    for (const row of last6Months) m = Math.max(m, row.receita, row.despesa);
    return m || 1;
  }, [last6Months]);

  const primeirosPassos = useMemo(() => {
    const hasEntry = entriesNoTransfer.length > 0;
    const hasAccount = accounts.length > 0;
    const hasGoal = goals.length > 0;
    const hasBudget = Object.keys(budgetMap).length > 0;
    const hasCard = cards.length > 0;
    const steps = [
      { done: hasAccount, label: 'Cadastrar uma conta', link: '/contas' },
      { done: hasEntry, label: 'Registrar um lançamento', link: '/lancamentos' },
      { done: hasGoal, label: 'Criar uma meta financeira', link: '/planejamento' },
      { done: hasBudget, label: 'Definir um orçamento por categoria', link: '/orcamento' },
      { done: hasCard, label: 'Adicionar um cartão', link: '/cartoes' },
    ];
    const doneCount = steps.filter((s) => s.done).length;
    return { steps, doneCount };
  }, [entriesNoTransfer.length, accounts.length, goals.length, budgetMap, cards.length]);
  const cardClass = dashboardMode === 'caixa'
    ? 'bg-si-bg border border-blue-500/25 rounded-xl p-5 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.12)]'
    : 'bg-si-card border border-si-border rounded-2xl p-6';
  const creditTone = useMemo(() => {
    switch (financialProfile.credit.pressureLevel) {
      case 'critico':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'elevado':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'atencao':
        return 'text-blue-300 bg-blue-500/10 border-blue-500/20';
      default:
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    }
  }, [financialProfile.credit.pressureLevel]);

  useEffect(() => {
    try {
      localStorage.setItem(DASHBOARD_WIDGETS_KEY, JSON.stringify(widgets));
    } catch {
      // Ignora erro de persistência local.
    }
  }, [widgets]);

  if (loading) return <DashboardSkeleton />;

  return (
    <PageTransition className="space-y-8">
      {/* Sub-navegação do cockpit */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-si-border pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'visao_geral', label: 'Visão geral', icon: LayoutDashboard },
              { id: 'transacoes', label: 'Transações', icon: ArrowLeftRight },
              { id: 'parcelamentos', label: 'Parcelamentos', icon: Layers },
              { id: 'assinaturas', label: 'Assinaturas', icon: RefreshCw },
              { id: 'categorias', label: 'Categorias', icon: Tag },
              { id: 'cartoes', label: 'Cartões', icon: CreditCard },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-[11px] font-bold tracking-[0.1em] uppercase border transition-all ${
                  active
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-si-over-1 text-si-4 hover:bg-si-over-2 hover:text-si-2 border-si-border'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setShowEditor((v) => !v)}
          className="self-end sm:self-auto px-3 py-1.5 rounded-md bg-si-over-1 border border-si-border text-[11px] font-bold text-si-5 hover:bg-si-over-2 hover:text-si-3 uppercase tracking-[0.1em] transition-colors"
        >
          {showEditor ? 'Fechar' : 'Editar'}
        </button>
      </div>

      {showEditor && (
        <div className="bg-si-card rounded-2xl border border-si-border p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {([
            ['insight', 'Insight do dia'],
            ['passos', 'Primeiros passos'],
            ['alertas', 'Alertas'],
            ['resumo', 'Resumo financeiro'],
            ['graficos', 'Gráficos'],
          ] as const).map(([key, label]) => (
            <label key={key} className="inline-flex items-center gap-2 text-sm text-si-3">
              <input
                type="checkbox"
                checked={widgets[key]}
                onChange={(e) => setWidgets((w) => ({ ...w, [key]: e.target.checked }))}
                className="rounded border-si-border-xl bg-si-bg"
              />
              {label}
            </label>
          ))}
        </div>
      )}

      {/* ── Empty state: usuário sem nenhum dado ainda ── */}
      {accounts.length === 0 && entriesNoTransfer.length === 0 && (
        <div className="bg-si-card border border-si-border rounded-2xl p-6 space-y-4">
          <div>
            <p className="text-si-1 font-bold text-lg">Bem-vindo ao Sibanki 👋</p>
            <p className="text-si-4 text-sm mt-1">Veja seu Ld (Dias de Liberdade) em 3 minutos. Siga os passos abaixo:</p>
          </div>
          <div className="space-y-2">
            {[
              { num: '1', label: 'Adicione uma conta', sub: 'Conta corrente, poupança ou carteira', link: '/contas' },
              { num: '2', label: 'Registre uma receita', sub: 'Seu salário ou principal renda', link: '/lancamentos' },
              { num: '3', label: 'Volte ao painel', sub: 'Seu Ld aparece automaticamente', link: null },
            ].map((s) => (
              <div key={s.num} className="flex items-center gap-3 p-3 rounded-xl bg-si-over-1 border border-si-border">
                <span className="w-7 h-7 rounded-full bg-si-over-2 border border-si-border text-si-3 text-xs font-bold flex items-center justify-center shrink-0">{s.num}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-si-2">{s.label}</p>
                  <p className="text-xs text-si-5">{s.sub}</p>
                </div>
                {s.link && (
                  <Link to={s.link} className="text-xs font-bold text-si-3 hover:text-si-1 underline underline-offset-2 shrink-0">
                    Ir →
                  </Link>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-si-5">Ou conecte seu banco via <Link to="/configuracoes#open-finance" className="underline underline-offset-2 hover:text-si-3">Open Finance</Link> para importar tudo automaticamente.</p>
        </div>
      )}

      {activeSubTab === 'visao_geral' && (
        <>
          <CoachSetup
            entries={entries}
            accountBalances={accountBalances}
            goals={goals}
            creditObligations={creditObligations}
            investments={investments}
            financialProfile={financialProfile as unknown as Record<string, unknown> | null}
          />

          <SovereigntyHero
            userName={user?.displayName || user?.email?.split('@')[0] || 'Usuário'}
            score={score}
            freedom={freedom}
            spread={spread}
            receitaMes={receitaMes}
            despesaMes={despesaMes}
            saldoMes={saldoMes}
            varReceita={varReceita}
            varDespesa={varDespesa}
          />

          <SibcoinMissionBanner eventType="login_streak" />

          {/* ── Intelligence Summary ── healthLevel + nextBestActions ── */}
          {nextBestActions.length > 0 && (
            <section className="bg-si-card rounded-2xl border border-si-border p-6 space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <Zap className="w-3.5 h-3.5 text-si-5" />
                  <h3 className="text-[11px] font-bold text-si-5 uppercase tracking-[0.18em]">Próximas Ações</h3>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wide ${HEALTH_COLORS[healthLevel] ?? 'text-si-4 bg-si-over-1 border-si-border'}`}>
                  <span>{healthLevel}</span>
                  <span className="opacity-60">·</span>
                  <span className="font-normal normal-case opacity-80">{JOURNEY_LABELS[journeyStage] ?? journeyStage}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {nextBestActions.map((action) => {
                  const info = ACTION_MAP[action];
                  if (!info) return null;
                  return (
                    <Link
                      key={action}
                      to={info.to}
                      className="flex items-start gap-3 p-4 rounded-xl bg-si-over-1 border border-si-border hover:bg-si-over-2 hover:border-emerald-500/20 transition-all group"
                    >
                      <div className="w-7 h-7 rounded-md bg-si-over-2 flex items-center justify-center shrink-0 group-hover:bg-si-over-3 transition-colors mt-0.5">
                        <ArrowUpRight className="w-3.5 h-3.5 text-si-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-si-1 leading-tight">{info.label}</p>
                        <p className="text-xs text-si-5 mt-0.5 leading-snug">{info.description}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {widgets.insight && (
            <InsightDoDia
              entries={entries}
              cards={cards}
              goals={goals}
              recurrents={recurrents}
              accountBalances={accountBalances}
              accountMeta={accountMeta}
              loading={loading}
              hasOpenFinance={hasOpenFinance}
              verifiedEntries={verifiedEntries}
              openFinanceIdentityByItem={openFinanceIdentityByItem}
              dataFreshness={dataFreshness}
            />
          )}

          {widgets.passos && primeirosPassos.doneCount < primeirosPassos.steps.length && (
            <div className="bg-si-card rounded-2xl border border-si-border p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-[11px] font-bold text-si-5 uppercase tracking-[0.18em]">Primeiros Passos</h3>
                  <p className="text-si-5 text-xs mt-0.5">Configure seu controle financeiro.</p>
                </div>
                <span className="text-[11px] font-bold text-si-4 uppercase tracking-wide">
                  {primeirosPassos.doneCount}/{primeirosPassos.steps.length}
                </span>
              </div>
              <div className="w-full h-px rounded-full bg-si-border overflow-hidden mb-4">
                <div
                  className="h-full bg-si-3"
                  style={{ width: `${(primeirosPassos.doneCount / primeirosPassos.steps.length) * 100}%` }}
                />
              </div>
              <ul className="space-y-2">
                {primeirosPassos.steps.map((step) => (
                  <li key={step.label} className="flex items-center justify-between gap-2 text-sm">
                    <span className={step.done ? 'text-emerald-400' : 'text-si-3'}>
                      {step.done ? '✓' : '○'} {step.label}
                    </span>
                    {!step.done && (
                      <Link to={step.link} className="text-blue-400 hover:text-blue-300">
                        Ir
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {widgets.alertas && alertas.length > 0 && (
            <div className="space-y-3">
              {alertas.map((a, i) => (
                <div
                  key={i}
                  className={`rounded-xl border-l-4 p-4 flex items-start gap-3 ${
                    a.type === 'positive'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-100'
                      : a.type === 'warning'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-100'
                        : 'bg-blue-500/10 border-blue-500 text-blue-100'
                  }`}
                >
                  {a.type === 'positive' ? (
                    <Lightbulb className="w-5 h-5 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{a.title}</p>
                    <p className="text-sm opacity-90">{a.text}</p>
                    {a.link && (
                      <Link to={a.link} className="text-sm font-medium underline mt-1 inline-block">
                        Revisar orçamento
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {(financialProfile.credit.activeCards > 0 || financialProfile.credit.monthlyDebtCommitment > 0) && (
            <section className="bg-si-card rounded-2xl border border-si-border p-6 space-y-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-bold text-si-1">Macro de crédito</h3>
                  </div>
                  <p className="text-si-5 text-sm mt-1">
                    Visão consolidada do uso de limite, pressão mensal e próximas obrigações.
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wide ${creditTone}`}>
                  {financialProfile.credit.pressureLevel}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className={cardClass}>
                  <p className="text-si-5 text-sm">Limite total</p>
                  <p className="text-2xl font-bold text-blue-400">
                    R$ {financialProfile.credit.totalCardLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-si-5 mt-1">{financialProfile.credit.activeCards} cartão(ões) ativos</p>
                </div>
                <div className={cardClass}>
                  <p className="text-si-5 text-sm">Uso estimado</p>
                  <p className="text-2xl font-bold text-si-1">
                    {financialProfile.credit.cardUtilizationPct.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}%
                  </p>
                  <p className="text-xs text-si-5 mt-1">
                    R$ {financialProfile.credit.estimatedCardUsage.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} na fatura atual
                  </p>
                </div>
                <div className={cardClass}>
                  <p className="text-si-5 text-sm">Faturas em 7 dias</p>
                  <p className="text-2xl font-bold text-amber-400">
                    R$ {financialProfile.credit.dueSoonAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-si-5 mt-1">{financialProfile.credit.dueSoonCount} vencimento(s) próximo(s)</p>
                </div>
                <div className={cardClass}>
                  <p className="text-si-5 text-sm">Compromisso mensal</p>
                  <p className="text-2xl font-bold text-si-1">
                    R$ {financialProfile.credit.monthlyDebtCommitment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-si-5 mt-1">
                    Disponível: R$ {financialProfile.credit.availableLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Link
                  to="/cartoes"
                  className="bg-si-over-2 hover:bg-si-over-3 text-si-1 px-4 py-2 rounded-xl text-sm font-semibold border border-si-border-md"
                >
                  Revisar cartões
                </Link>
                <Link
                  to="/consultor-ia"
                  className="bg-blue-600 hover:bg-blue-500 text-si-1 px-4 py-2 rounded-xl text-sm font-semibold"
                >
                  Pedir orientação ao consultor
                </Link>
                <Link
                  to="/solucoes/credito"
                  className="text-sm text-si-4 hover:text-si-2 underline"
                >
                  Ver soluções de crédito
                </Link>
              </div>
            </section>
          )}

          {/* ── Spread Gap — card dedicado ───────────────────────────────── */}
          <SpreadGapCard spread={spread} />

          {/* ── Round-up Cofre ────────────────────────────────────────────── */}
          <RoundUpWidget />

          {/* ── SibCoin Widget ───────────────────────────────────────────── */}
          <SibcoinWidget />

          {widgets.resumo && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={cardClass}>
                <p className="text-si-5 text-sm">Receitas (mês)</p>
                <p className="text-2xl font-bold text-emerald-400">
                  R$ {receitaMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                {receitaMesAnt > 0 && (
                  <p className={`text-xs mt-1 flex items-center gap-1 ${varReceita >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {varReceita >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {varReceita >= 0 ? '+' : ''}{varReceita.toFixed(1)}% vs mês anterior
                  </p>
                )}
              </div>
              <div className={cardClass}>
                <p className="text-si-5 text-sm">Despesas (mês)</p>
                <p className="text-2xl font-bold text-rose-400">
                  R$ {despesaMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                {despesaMesAnt > 0 && (
                  <p className={`text-xs mt-1 flex items-center gap-1 ${varDespesa <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {varDespesa <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                    {varDespesa >= 0 ? '+' : ''}{varDespesa.toFixed(1)}% vs mês anterior
                  </p>
                )}
              </div>
              <div className={cardClass}>
                <p className="text-si-5 text-sm">Saldo (mês)</p>
                <p className={`text-2xl font-bold ${saldoMes >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  R$ {saldoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-si-5 mt-1">{accounts.length} conta(s)</p>
              </div>
              <div className={cardClass}>
                <p className="text-si-5 text-sm">Lançamentos</p>
                <p className="text-2xl font-bold text-si-1">{entries.length}</p>
                <p className="text-xs text-si-5 mt-1">Total geral: R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          )}

          {widgets.graficos && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-si-card rounded-2xl border border-si-border p-6">
                  <h3 className="text-sm font-bold text-si-4 uppercase tracking-wider mb-4">
                    Despesas por categoria · {getMonthLabel(currentMonthKey)} {now.getFullYear()}
                  </h3>
                  {donutTotal > 0 ? (
                    <ExpensesPieChart data={donutSegments} height={200} innerRadius={46} outerRadius={72} />
                  ) : (
                    <p className="text-si-5 text-sm py-8 text-center">Nenhuma despesa no mês para exibir.</p>
                  )}
                </div>

                <div className="bg-si-card rounded-2xl border border-si-border p-6">
                  <h3 className="text-sm font-bold text-si-4 uppercase tracking-wider mb-4">Evolução · Últimos 6 meses</h3>
                  {maxVal > 0 ? (
                    <FinancialBarChart data={last6Months.map((row) => ({
                      monthKey: row.monthKey,
                      label: getMonthLabel(row.monthKey),
                      receita: row.receita,
                      despesa: row.despesa,
                    }))} height={200} />
                  ) : (
                    <p className="text-si-5 text-sm py-8 text-center">Nenhum dado nos últimos 6 meses.</p>
                  )}
                </div>
              </div>

              {last6Months.some((m) => m.receita > 0 || m.despesa > 0) && (
                <div className="bg-si-card rounded-2xl border border-si-border p-6">
                  <h3 className="text-sm font-bold text-si-4 uppercase tracking-wider mb-4">Saldo acumulado · Últimos 6 meses</h3>
                  <BalanceAreaChart data={(() => {
                    let acc = 0;
                    return last6Months.map((row) => {
                      acc += row.receita - row.despesa;
                      return { label: getMonthLabel(row.monthKey), saldo: +acc.toFixed(2) };
                    });
                  })()} height={180} />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Sub-views extraídas (Ação #8 — Análise 360) ── */}
      {activeSubTab === 'transacoes' && <DashboardTransactionsTab />}
      {activeSubTab === 'parcelamentos' && <DashboardParcelamentosTab />}
      {activeSubTab === 'assinaturas' && <DashboardAssinaturasTab />}
      {activeSubTab === 'categorias' && (
        <DashboardCategoriasTab
          catTotals={catTotals}
          budgetMap={budgetMap}
          donutSegments={donutSegments}
          donutTotal={donutTotal}
        />
      )}
      {activeSubTab === 'cartoes' && <DashboardCartoesTab catTotals={catTotals} budgetMap={budgetMap} />}
        </PageTransition>
  );
}
