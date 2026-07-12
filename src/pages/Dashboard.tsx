import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DashboardSkeleton } from '../components/ui/PageSkeleton';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Lightbulb,
  AlertTriangle,
  Zap,
  LayoutDashboard,
  ArrowLeftRight,
  Tag,
  CreditCard,
  Lock
} from 'lucide-react';
import { useIntelligence } from '../context/IntelligenceContext';
import { useCoachActive } from '../hooks/useCoachActive';
import { useDashboardData, getMonthLabel } from '../hooks/useDashboardData';
import { CoachSetup } from '../components/ui/CoachSetup';
import { SovereigntyHero } from '../components/ui/SovereigntyHero';
import { RadarCard } from '../components/ui/RadarCard';
import { HorizonStrip } from '../components/ui/HorizonStrip';
import { useHorizonTop } from '../hooks/useHorizonTop';
import { SpreadGapCard } from '../components/ui/SpreadGapCard';
import { InsightDoDia } from '../components/ui/InsightDoDia';
import { SibcoinWidget } from '../components/sibcoin/SibcoinWidget';
import { SibcoinMissionBanner } from '../components/sibcoin/SibcoinMissionBanner';
import { useDashboardMode } from '../hooks/useDashboardMode';
import { ExpensesPieChart } from '../components/charts/ExpensesPieChart';
import { FinancialBarChart } from '../components/charts/FinancialBarChart';
import { BalanceAreaChart } from '../components/charts/BalanceAreaChart';
import { PageTransition } from '../components/ui/PageTransition';
import { RoundUpWidget } from '../components/ui/RoundUpWidget';
import { DashboardTransactionsTab } from '../components/dashboard/DashboardTransactionsTab';
import { DashboardCategoriasTab } from '../components/dashboard/DashboardCategoriasTab';
import { DashboardCartoesTab } from '../components/dashboard/DashboardCartoesTab';
import { DashboardCreditSection } from '../components/dashboard/DashboardCreditSection';
import { buildDashboardBlueprint, type DashboardWidgetId } from '../utils/dashboardBlueprint';
import { WidgetAlertaCritico } from '../components/ui/WidgetAlertaCritico';
import { AccountSummaryStrip } from '../components/ui/AccountSummaryStrip';
import { InvestmentInsights } from '../components/ui/InvestmentInsights';

// ─── Widget config (persisted in localStorage) ─────────────────────────────────

const DASHBOARD_WIDGETS_KEY = 'sibanki_dashboard_widgets';

type WidgetConfig = {
  insight: boolean;
  alertas: boolean;
  resumo: boolean;
  graficos: boolean;
};

function readWidgetConfig(): WidgetConfig {
  try {
    const raw = localStorage.getItem(DASHBOARD_WIDGETS_KEY);
    if (!raw) return { insight: true, alertas: true, resumo: false, graficos: true };
    const parsed = JSON.parse(raw) as Partial<WidgetConfig>;
    return {
      insight: parsed.insight !== false,
      alertas: parsed.alertas !== false,
      resumo: parsed.resumo !== false,
      graficos: parsed.graficos !== false,
    };
  } catch {
    return { insight: true, alertas: true, resumo: true, graficos: true };
  }
}

// ─── Constants ──────────────────────────────────────────────────────────────────

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
  'atencao': 'text-amber-300 bg-amber-500/10 border-amber-500/25',
  'saudavel': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
};

const JOURNEY_LABELS: Record<string, string> = {
  'primeiros-passos':    'Começando a jornada',
  'pressionado':         'Sob pressão financeira',
  'organizando-base':    'Organizando a base',
  'estabilizando':       'Estabilizando as finanças',
  'pronto-para-crescer': 'Pronto para crescer',
};

// ─── Sub-tab definitions ────────────────────────────────────────────────────────

type SubTabId = 'visao_geral' | 'transacoes' | 'categorias' | 'cartoes';

const SUB_TABS: { id: SubTabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'visao_geral', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'transacoes', label: 'Transações', icon: ArrowLeftRight },
  { id: 'categorias', label: 'Categorias', icon: Tag },
  { id: 'cartoes', label: 'Cartões', icon: CreditCard },
];

// ─── Component ──────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const {
    user, entries, investments, accounts, score, loading,
    accountBalances, accountMeta, cards, goals, recurrents,
    hasOpenFinance, verifiedEntries, openFinanceIdentityByItem, dataFreshness,
  } = useAppContext();
  const { mode: dashboardMode } = useDashboardMode();
  const { isCoachActive, dismiss: dismissCoach, stepStatus } = useCoachActive();
  const navigate = useNavigate();
  const horizon = useHorizonTop();

  const [showEditor, setShowEditor] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('visao_geral');
  const [activeChartTab, setActiveChartTab] = useState<'categorias' | 'evolucao' | 'saldo'>('categorias');
  const [widgets, setWidgets] = useState<WidgetConfig>(() => readWidgetConfig());

  // ── Derived financial data (extracted to hook) ────────────────────────────────
  const {
    now, currentMonthKey,
    receitaMes, despesaMes, saldoMes,
    receitaMesAnt, despesaMesAnt,
    varReceita, varDespesa,
    catTotals, last6Months,
    hasOnboardingData, saldo,
    budgetMap, alertas,
    donutTotal, donutSegments, maxVal,
  } = useDashboardData(widgets.insight);

  // ── Intelligence Context ──────────────────────────────────────────────────────
  const intel = useIntelligence();
  const { freedom, spread, healthLevel, nextBestActions, journeyStage, topSignals } = intel;

  const blueprint = buildDashboardBlueprint({
    journeyStage,
    healthLevel,
    hasOpenFinance,
    hasInvestments: intel.hasPortfolio,
    hasDebts: spread.avgDebtCostMonthly > 0,
    balanceNegative: saldoMes < 0,
    spreadLeakage: spread.monthlyLeakage > 0,
    overBudget: topSignals.includes('orcamento-sob-pressao'),
  });

  const cardClass = dashboardMode === 'caixa'
    ? 'bg-si-bg border border-blue-500/25 rounded-xl p-5 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.12)]'
    : 'bg-si-card rounded-2xl p-6';

  useEffect(() => {
    try {
      localStorage.setItem(DASHBOARD_WIDGETS_KEY, JSON.stringify(widgets));
    } catch {
      // Ignora erro de persistência local.
    }
  }, [widgets]);

  const WIDGET_MAP: Record<DashboardWidgetId, React.ReactNode> = {
    'alerta-critico': (
      <WidgetAlertaCritico spread={spread} monthlyBalance={saldoMes} />
    ),
    'onboarding-ativacao': (
      <AccountSummaryStrip />
    ),
    'sovereignty-hero': (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
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
          <RadarCard
            item={horizon.item}
            onMontarPlano={(it) => navigate('/consultor-ia', { state: { initialMessage: `Me ajuda a montar um plano para: ${it.label}` } })}
            onSnooze={(it) => horizon.snooze(it.id)}
          />
        </div>
        <HorizonStrip item={horizon.item} incomeDate={horizon.incomeDate} />
      </div>
    ),
    'spread-gap': (
      <SpreadGapCard spread={spread} />
    ),
    'credit-section': (
      <DashboardCreditSection />
    ),
    'budgets': (
      widgets.resumo ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      ) : null
    ),
    'portfolio': (
      widgets.graficos ? (
        <div className="bg-si-card rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-si-border pb-3">
            <h3 className="text-[11px] font-bold text-si-4 uppercase tracking-[0.18em]">Análise Visual</h3>
            <div className="flex flex-wrap items-center gap-1.5">
              {([
                { id: 'categorias', label: 'Categorias' },
                { id: 'evolucao', label: 'Evolução (6m)' },
                { id: 'saldo', label: 'Saldo Acumulado' },
              ] as const).map((tab) => {
                const active = activeChartTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveChartTab(tab.id)}
                    className={`relative px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      active
                        ? 'text-zinc-900'
                        : 'bg-si-over-1 text-si-4 hover:bg-si-over-2 hover:text-si-2 border border-transparent hover:border-si-border'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="activeChartTabPill"
                        className="absolute inset-0 bg-white rounded-md"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        style={{ zIndex: 0 }}
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            {activeChartTab === 'categorias' && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-si-4 uppercase tracking-wider">
                  Despesas por categoria · {getMonthLabel(currentMonthKey)} {now.getFullYear()}
                </h4>
                {donutTotal > 0 ? (
                  <ExpensesPieChart data={donutSegments} height={200} innerRadius={46} outerRadius={72} />
                ) : (
                  <p className="text-si-5 text-xs py-8 text-center">Nenhuma despesa no mês para exibir.</p>
                )}
              </div>
            )}

            {activeChartTab === 'evolucao' && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-si-4 uppercase tracking-wider">Evolução · Últimos 6 meses</h4>
                {maxVal > 0 ? (
                  <FinancialBarChart data={last6Months.map((row) => ({
                    monthKey: row.monthKey,
                    label: getMonthLabel(row.monthKey),
                    receita: row.receita,
                    despesa: row.despesa,
                  }))} height={200} />
                ) : (
                  <p className="text-si-5 text-xs py-8 text-center">Nenhum dado nos últimos 6 meses.</p>
                )}
              </div>
            )}

            {activeChartTab === 'saldo' && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-si-4 uppercase tracking-wider">Saldo acumulado · Últimos 6 meses</h4>
                {last6Months.some((m) => m.receita > 0 || m.despesa > 0) ? (
                  <BalanceAreaChart data={(() => {
                    let acc = 0;
                    return last6Months.map((row) => {
                      acc += row.receita - row.despesa;
                      return { label: getMonthLabel(row.monthKey), saldo: +acc.toFixed(2) };
                    });
                  })()} height={180} />
                ) : (
                  <p className="text-si-5 text-xs py-8 text-center">Nenhum dado nos últimos 6 meses.</p>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null
    ),
    'investment-insights': (
      <InvestmentInsights investments={investments} entries={entries} />
    )
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <PageTransition className="space-y-8">
      {!hasOnboardingData ? (
        /* ── Empty state premium com animação: usuário sem nenhum dado ainda ── */
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 py-12">
          <div className="bg-si-card rounded-2xl p-8 max-w-4xl mx-auto text-center space-y-6">
            <div className="max-w-xl mx-auto space-y-2">
              <p className="text-si-1 font-bold text-2xl uppercase tracking-wider">Ative seu OS Financeiro</p>
              <p className="text-si-4 text-xs leading-relaxed">
                Para calcular seus Dias de Liberdade (Ld) e Spread Gap (Sg), precisamos de dados financeiros. 
                Conecte sua conta bancária via Open Finance de forma 100% segura ou inicie manualmente.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                to="/configuracoes#open-finance" 
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-sm text-center transition-colors shadow-sm"
              >
                Conectar banco via Open Finance
              </Link>
              <Link 
                to="/lancamentos" 
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-si-over-2 hover:bg-si-over-3 border border-si-border text-si-2 font-bold text-sm text-center transition-colors"
              >
                Adicionar Lançamento Manual
              </Link>
            </div>

            <div className="pt-4 border-t border-si-border">
              <p className="text-[10px] font-bold text-si-4 uppercase tracking-widest mb-3">Ou siga o passo a passo manual:</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                {[
                  { num: '1', label: 'Crie uma conta', sub: 'Corrente ou investimentos', link: '/contas' },
                  { num: '2', label: 'Registre despesas', sub: 'Informe seus gastos do mês', link: '/lancamentos' },
                  { num: '3', label: 'Veja o Ld surgir', sub: 'Atualização em tempo real', link: null }
                ].map((s) => (
                  <div key={s.num} className="p-4 rounded-xl bg-si-over-1 border border-si-border space-y-2 flex flex-col justify-between">
                    <div className="space-y-2">
                      <span className="w-6 h-6 rounded-full bg-si-over-2 border border-si-border text-si-3 text-xs font-bold flex items-center justify-center">{s.num}</span>
                      <div>
                        <p className="text-xs font-bold text-si-2 uppercase tracking-wide">{s.label}</p>
                        <p className="text-[11px] text-si-5 leading-normal mt-0.5">{s.sub}</p>
                      </div>
                    </div>
                    {s.link && (
                      <Link to={s.link} className="inline-block text-[11px] font-bold text-si-4 hover:text-si-2 underline underline-offset-2 mt-2">
                        Configurar →
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ── Sub-navegação do cockpit ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-si-border pb-4">
            <div className="flex flex-wrap items-center gap-2">
              {SUB_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeSubTab === tab.id;
                const isSecondary = tab.id !== 'visao_geral';
                const isDisabled = isSecondary && isCoachActive;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => setActiveSubTab(tab.id)}
                    className={`relative flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold tracking-wide border transition-all ${
                      isDisabled
                        ? 'opacity-40 cursor-not-allowed text-si-5 border-si-border/30 bg-transparent'
                        : active
                          ? 'text-zinc-900 border-white'
                          : 'bg-si-over-1 text-si-4 hover:bg-si-over-2 hover:text-si-2 border-si-border'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="activeCockpitSubTabPill"
                        className="absolute inset-0 bg-white rounded-full"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        style={{ zIndex: 0 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
              <SibcoinMissionBanner eventType="login_streak" />
              <button
                type="button"
                onClick={() => setShowEditor((v) => !v)}
                className="px-3 py-1.5 rounded-lg bg-si-over-2 border border-si-border text-[10px] font-bold text-si-4 hover:text-si-2 hover:bg-si-over-3 uppercase tracking-wider transition-colors"
              >
                {showEditor ? 'Fechar' : 'Editar'}
              </button>
            </div>
          </div>

          {showEditor && (
            <div className="bg-si-card rounded-2xl border border-si-border p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {([
                ['insight', 'Insight do dia'],
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

          {activeSubTab === 'visao_geral' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* ── Coluna Principal (Esquerda) ── */}
              <div className="lg:col-span-8 space-y-6">
                {isCoachActive && (
                  <CoachSetup
                    stepStatus={stepStatus}
                    onDismiss={dismissCoach}
                  />
                )}

                {!isCoachActive ? (
                  <div className="space-y-6 animate-in fade-in duration-500">
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

                    {blueprint.map((w) => {
                      const element = WIDGET_MAP[w.id];
                      if (!element) return null;
                      return <div key={w.id}>{element}</div>;
                    })}
                  </div>
                ) : (
                  /* ── Teaser Glassmorphism — Coach pendente ── */
                  <div className="relative rounded-2xl overflow-hidden border border-si-border bg-si-card p-1 min-h-[320px] flex items-center justify-center animate-in fade-in duration-500">
                    {/* Silhueta / Mockup falso dos gráficos ao fundo */}
                    <div className="absolute inset-0 p-6 grid grid-cols-1 md:grid-cols-2 gap-6 opacity-[0.07] pointer-events-none select-none blur-[3px]">
                      <div className="md:col-span-2 h-36 rounded-xl bg-si-over-2 border border-si-border-md p-4 space-y-3">
                        <div className="h-4 w-32 rounded bg-si-5" />
                        <div className="h-8 w-24 rounded bg-si-4" />
                        <div className="h-3 w-48 rounded bg-si-5" />
                      </div>
                      <div className="h-44 rounded-xl bg-si-over-2 border border-si-border-md p-4 space-y-4">
                        <div className="h-3 w-24 rounded bg-si-5" />
                        <div className="flex items-end justify-between h-24 pt-4 px-2">
                          <div className="h-12 w-6 rounded bg-si-5" />
                          <div className="h-20 w-6 rounded bg-si-4" />
                          <div className="h-16 w-6 rounded bg-si-5" />
                          <div className="h-24 w-6 rounded bg-si-4" />
                        </div>
                      </div>
                      <div className="h-44 rounded-xl bg-si-over-2 border border-si-border-md p-4 flex items-center justify-center">
                        <div className="relative w-24 h-24 rounded-full border-8 border-si-over-3 flex items-center justify-center">
                          <div className="absolute inset-2 rounded-full border-8 border-si-5" />
                        </div>
                      </div>
                    </div>

                    {/* Glassmorphism Overlay */}
                    <div className="absolute inset-0 bg-si-bg/50 backdrop-blur-[7px] flex flex-col items-center justify-center p-8 text-center z-10">
                      <div className="w-12 h-12 rounded-full bg-si-over-2 border border-si-border-md flex items-center justify-center mb-4 text-amber-500/80 animate-pulse">
                        <Lock className="w-5 h-5 text-amber-400" />
                      </div>
                      <h4 className="text-sm font-bold text-si-1 mb-2">Painel de Inteligência Financeira</h4>
                      <p className="text-xs text-si-4 max-w-sm leading-relaxed">
                        Complete as etapas do seu <strong className="text-si-2">Modo Coach</strong> acima para destravar as visões de Dias de Liberdade, análises gráficas e limites de crédito.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Coluna Lateral (Direita) — sticky para eliminar vazio ── */}
              <div className="lg:col-span-4 lg:sticky lg:top-8 space-y-6">

                {/* Próximas Ações */}
                {!isCoachActive && hasOnboardingData && nextBestActions.length > 0 && (
                  <section className="bg-si-card rounded-2xl p-6 space-y-4 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <Zap className="w-3.5 h-3.5 text-si-5" />
                        <h3 className="text-[11px] font-bold text-si-4 uppercase tracking-[0.18em]">Próximas Ações</h3>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wide ${HEALTH_COLORS[healthLevel] ?? 'text-si-4 bg-si-over-1 border-si-border'}`}>
                        <span>{healthLevel}</span>
                        <span className="opacity-60">·</span>
                        <span className="font-normal normal-case opacity-80">{JOURNEY_LABELS[journeyStage] ?? journeyStage}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      {nextBestActions.map((action) => {
                        const info = ACTION_MAP[action];
                        if (!info) return null;
                        return (
                          <Link
                            key={action}
                            to={info.to}
                            className="flex items-start gap-3 p-4 rounded-xl bg-si-over-1 hover:bg-si-over-2 hover:scale-[1.01] transition-all group"
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

                {/* ── Alertas — estilo inline sutil (P1: sem border-l-4) ── */}
                {!isCoachActive && widgets.alertas && hasOnboardingData && alertas.length > 0 && (
                  <div className="space-y-3 animate-in fade-in duration-500">
                    {alertas.map((a, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 px-4 py-3 rounded-xl"
                      >
                        {a.type === 'positive' ? (
                          <Lightbulb className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${
                            a.type === 'positive' ? 'text-emerald-400' : a.type === 'warning' ? 'text-amber-400' : 'text-blue-400'
                          }`}>{a.title}</p>
                          <p className="text-xs text-si-4 mt-0.5">{a.text}</p>
                          {a.link && (
                            <Link to={a.link} className="text-xs font-medium text-si-3 hover:text-si-1 underline mt-1 inline-block transition-colors">
                              Revisar →
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <RoundUpWidget />

                <SibcoinWidget isCoachActive={isCoachActive} />
              </div>
            </div>
          )}

          {/* ── Sub-views ── */}
          {activeSubTab === 'transacoes' && <DashboardTransactionsTab />}
          {activeSubTab === 'categorias' && (
            <DashboardCategoriasTab
              catTotals={catTotals}
              budgetMap={budgetMap}
              donutSegments={donutSegments}
              donutTotal={donutTotal}
            />
          )}
          {activeSubTab === 'cartoes' && <DashboardCartoesTab catTotals={catTotals} budgetMap={budgetMap} />}
        </>
      )}
    </PageTransition>
  );
}
