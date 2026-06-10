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
  Navigation,
  X,
  LayoutDashboard,
  ArrowLeftRight,
  Layers,
  RefreshCw,
  Tag,
  Search,
  AlertCircle
} from 'lucide-react';
import { useIntelligence } from '../context/IntelligenceContext';
import { useSentinelaGeo, SCENARIO_LABELS } from '../hooks/useSentinelaGeo';
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
import { SovereigntyBadge } from '../components/ui/SovereigntyBadge';
import { calculateSovereigntyScore } from '../utils/sovereigntyEngine';
import { MerchantLogo } from '../components/transactions/MerchantLogo';

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
  const [txSearch, setTxSearch] = useState('');
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

  // ─── 1. Transações Sub-tab Memoized Data ───────────────────────────────────
  const sovereigntyBase = useMemo(() => {
    const liquidity = freedom.totalLiquidity ?? 0;
    const dailyBurnRate = freedom.dailyBurnRate > 0 ? freedom.dailyBurnRate : 50;

    const budgetMapLocal: Record<string, number> = {};
    if (budgets && typeof budgets === 'object') {
      for (const [k, v] of Object.entries(budgets as Record<string, unknown>)) {
        const n = Number(v);
        if (!isNaN(n)) budgetMapLocal[k] = n;
      }
    }

    const nowMonth = now.toISOString().slice(0, 7);
    const catSpent: Record<string, number> = {};
    for (const e of entries) {
      if (e.type === 'despesa' && !isTransferEntry(e) && (e.date || '').startsWith(nowMonth)) {
        const cat = e.category || 'Outros';
        catSpent[cat] = (catSpent[cat] || 0) + (Number(e.value) || 0);
      }
    }

    const ESSENTIAL_CATS = new Set(['Moradia', 'Saúde', 'Educação', 'Transporte', 'Alimentação', 'Utilidades', 'Serviços essenciais']);

    return { liquidity, dailyBurnRate, budgetMap: budgetMapLocal, catSpent, ESSENTIAL_CATS };
  }, [freedom, entries, budgets, now]);

  const scoreMap = useMemo(() => {
    const map = new Map<number, ReturnType<typeof calculateSovereigntyScore>>();
    const { liquidity, dailyBurnRate, budgetMap: localBMap, catSpent, ESSENTIAL_CATS } = sovereigntyBase;

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoff30 = thirtyDaysAgo.toISOString().slice(0, 10);

    const recentExpenses = entries.filter(
      (e) => e.type === 'despesa' && !isTransferEntry(e) && (e.date || '') >= cutoff30
    );

    const streakMap = new Map<string, number>();
    for (const e of recentExpenses) {
      const key = `${e.category || 'Outros'}|${new Date(e.date || '').getDay()}`;
      streakMap.set(key, (streakMap.get(key) || 0) + 1);
    }

    for (const e of entries) {
      if (e.type !== 'despesa') continue;
      const cat = e.category || 'Outros';
      const limit = localBMap[cat];
      const spent = catSpent[cat] || 0;
      const budgetRemaining = limit != null ? limit - spent : undefined;
      const dayOfWeek = new Date(e.date || '').getDay();
      const streakKey = `${cat}|${dayOfWeek}`;
      const impulseStreakCount = Math.max(0, (streakMap.get(streakKey) || 0) - 1);

      map.set(e.id, calculateSovereigntyScore({
        value: Number(e.value) || 0,
        category: cat,
        isEssential: ESSENTIAL_CATS.has(cat),
        liquidity,
        dailyBurnRate,
        budgetRemaining,
        impulseStreakCount,
      }));
    }
    return map;
  }, [entries, sovereigntyBase, now]);

  const filteredTx = useMemo(() => {
    const base = entries.filter((e) => !isTransferEntry(e));
    return base
      .filter((e) =>
        !txSearch || [e.desc, e.category, e.account].some((s) =>
          String(s ?? '').toLowerCase().includes(txSearch.toLowerCase())
        )
      )
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 15);
  }, [entries, txSearch]);

  // ─── 2. Assinaturas Sub-tab Memoized Data ───────────────────────────────────
  const subscriptions = useMemo(() => {
    const termsRx = /netflix|spotify|amazon|prime|disney|hbo|apple|google|icloud|dropbox|youtube|gym|academia|crunchyroll|adobe|canva|microsoft|office|mensalidade|plano|internet|telef|celular/i;
    
    return recurrents
      .filter(r => r.active && r.type === 'despesa' && (
        r.category === 'Assinaturas' || 
        termsRx.test(r.desc || '')
      ))
      .map(r => ({
        id: r.id,
        desc: r.desc,
        category: r.category || 'Assinaturas',
        value: r.value,
        day: r.day,
        freq: r.freq || 'mensal',
        account: r.account,
      }));
  }, [recurrents]);

  const totalSubscriptionsMonthly = useMemo(() => {
    return subscriptions.reduce((s, r) => s + (Number(r.value) || 0), 0);
  }, [subscriptions]);

  const subscriptionLeaks = useMemo(() => {
    const leaks: string[] = [];
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const cutoff = sixtyDaysAgo.toISOString().slice(0, 10);

    const recentEntries = entries.filter(e => e.date >= cutoff && e.type === 'despesa');

    for (const sub of subscriptions) {
      const hasMatch = recentEntries.some(e => {
        const descMatch = (e.desc || '').toLowerCase().includes(sub.desc.toLowerCase()) ||
                          sub.desc.toLowerCase().includes((e.desc || '').toLowerCase());
        return descMatch;
      });

      if (!hasMatch) {
        leaks.push(sub.desc);
      }
    }
    return leaks;
  }, [subscriptions, entries, now]);

  // ─── 3. Parcelamentos Sub-tab Memoized Data ─────────────────────────────────
  const cardInstallments = useMemo(() => {
    const list: {
      id: string;
      cardName: string;
      desc: string;
      current: number;
      total: number;
      value: number;
      remaining: number;
      originalDesc: string;
    }[] = [];

    for (const card of cards) {
      if (!card.purchasesV2) continue;
      const grouped = new Map<string, typeof card.purchasesV2>();
      for (const p of card.purchasesV2) {
        if (p.installment) {
          const gid = p.installment.groupId;
          if (!grouped.has(gid)) grouped.set(gid, []);
          grouped.get(gid)!.push(p);
        }
      }

      for (const [gid, purchases] of grouped.entries()) {
        const sortedPurchases = [...purchases].sort((a, b) => (a.installment?.current ?? 0) - (b.installment?.current ?? 0));
        const first = sortedPurchases[0];
        const total = first.installment?.total ?? 1;
        const val = first.installment?.installmentValue ?? first.value;
        const originalDesc = first.installment?.originalDesc ?? first.desc;

        const currentInst = sortedPurchases.find(p => p.cycleKey === currentMonthKey)?.installment?.current ?? total;
        const remainingInst = total - currentInst;
        const remainingValue = remainingInst * val;

        list.push({
          id: gid,
          cardName: card.name,
          desc: originalDesc,
          current: currentInst,
          total,
          value: val,
          remaining: remainingValue,
          originalDesc,
        });
      }
    }
    return list;
  }, [cards, currentMonthKey]);

  const loanInstallments = useMemo(() => {
    return (creditObligations ?? [])
      .filter(o => o.kind === 'emprestimo' || o.kind === 'financiamento' || o.kind === 'parcela')
      .map(o => ({
        id: o.id,
        institution: o.institution || 'Crédito',
        desc: o.label,
        current: o.installmentNumber ?? 1,
        total: o.installmentTotal ?? 1,
        value: o.amount,
        remaining: ((o.installmentTotal ?? 1) - (o.installmentNumber ?? 1)) * o.amount,
        dueDate: o.dueDate,
        status: o.status,
      }));
  }, [creditObligations]);

  const totalInstallmentsMonthly = useMemo(() => {
    const cardSum = cardInstallments.reduce((sum, item) => sum + item.value, 0);
    const loanSum = loanInstallments.reduce((sum, item) => sum + item.value, 0);
    return cardSum + loanSum;
  }, [cardInstallments, loanInstallments]);

  const totalRemainingDebt = useMemo(() => {
    const cardSum = cardInstallments.reduce((sum, item) => sum + item.remaining, 0);
    const loanSum = loanInstallments.reduce((sum, item) => sum + item.remaining, 0);
    return cardSum + loanSum;
  }, [cardInstallments, loanInstallments]);

  // ─── 4. Categorias Sub-tab Memoized Data ────────────────────────────────────
  const categoryBudgets = useMemo(() => {
    const list: {
      category: string;
      spent: number;
      limit: number;
      percent: number;
    }[] = [];

    const allCats = new Set([...Object.keys(budgetMap), ...Object.keys(catTotals)]);

    for (const cat of allCats) {
      if (cat === 'Transferência') continue;
      const spent = catTotals[cat] ?? 0;
      const limit = budgetMap[cat] ?? 0;
      const percent = limit > 0 ? (spent / limit) * 100 : 0;
      list.push({ category: cat, spent, limit, percent });
    }

    return list.sort((a, b) => b.spent - a.spent);
  }, [budgetMap, catTotals]);

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

  // Sentinela GPS — snapshot de soberania passado para a Cloud Function
  const sentinelaSnapshot = useMemo(() => ({
    daysOfFreedom: freedom.days,
    spreadGap: spread.spreadGap,
    monthlyBurn: freedom.dailyBurnRate * 30,
    categoryBudgets: Object.fromEntries(
      Object.entries(catTotals).map(([cat, spent]) => {
        const limit = budgetMap[cat] ?? 0;
        return [cat, { spent, limit, pct: limit > 0 ? Math.round((spent / limit) * 100) : 0 }];
      })
    ),
  }), [freedom, spread, catTotals, budgetMap]);

  const userPhone = (financialProfile as unknown as Record<string, unknown>)?.whatsappPhone as string | undefined;
  const sentinela = useSentinelaGeo(sentinelaSnapshot, userPhone);

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
                onClick={() => {
                  setActiveSubTab(tab.id);
                  if (tab.id !== 'transacoes') {
                    setTxSearch('');
                  }
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-[10px] font-bold tracking-[0.1em] uppercase border transition-all ${
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
          className="self-end sm:self-auto px-3 py-1.5 rounded-md bg-si-over-1 border border-si-border text-[10px] font-bold text-si-5 hover:bg-si-over-2 hover:text-si-3 uppercase tracking-[0.1em] transition-colors"
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
                  <h3 className="text-[10px] font-bold text-si-5 uppercase tracking-[0.18em]">Próximas Ações</h3>
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
                  <h3 className="text-[10px] font-bold text-si-5 uppercase tracking-[0.18em]">Primeiros Passos</h3>
                  <p className="text-si-5 text-xs mt-0.5">Configure seu controle financeiro.</p>
                </div>
                <span className="text-[10px] font-bold text-si-4 uppercase tracking-wide">
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

      {/* ── Transações Sub-view ── */}
      {activeSubTab === 'transacoes' && (
        <div className="space-y-6">
          <div className="bg-si-card border border-si-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-[10px] font-bold text-si-5 uppercase tracking-[0.18em]">Transações Recentes</h3>
                <p className="text-si-5 text-xs mt-0.5">Últimos lançamentos e impacto Sv em tempo real.</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-si-5" />
                <input
                  type="text"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  placeholder="Buscar transações..."
                  className="w-full bg-si-bg border border-si-border rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
            </div>

            <div className="divide-y divide-si-border">
              {filteredTx.length === 0 ? (
                <p className="text-si-5 text-sm py-8 text-center">Nenhum lançamento encontrado.</p>
              ) : (
                filteredTx.map((e) => {
                  const dateObj = e.date ? new Date(e.date + 'T12:00:00') : null;
                  const dateFormatted = dateObj
                    ? dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                    : '';
                  return (
                    <div key={e.id} className="flex items-center justify-between gap-4 py-3 hover:bg-si-over-1/3 transition-colors px-2 rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        <MerchantLogo
                          description={e.desc}
                          category={e.category}
                          type={e.type}
                          size={28}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-si-1 truncate">{e.desc || e.category || '—'}</p>
                          <p className="text-xs text-si-5 mt-0.5">
                            {dateFormatted} · {e.category} {e.account ? `· ${e.account}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-3">
                        <span className={`text-sm font-bold ${e.type === 'receita' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {e.type === 'receita' ? '+' : '-'} R$ {e.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        {e.type === 'despesa' && scoreMap.has(e.id) && (
                          <SovereigntyBadge
                            score={scoreMap.get(e.id)!.score}
                            daysLost={scoreMap.get(e.id)!.daysLost}
                            opportunityCost10y={scoreMap.get(e.id)!.opportunityCost10y}
                            compact
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between border-t border-si-border pt-4 text-xs text-si-5">
              <span>Exibindo até 15 lançamentos recentes</span>
              <Link to="/lancamentos" className="text-blue-400 hover:underline">Ver todos →</Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Parcelamentos Sub-view ── */}
      {activeSubTab === 'parcelamentos' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={cardClass}>
              <p className="text-si-5 text-sm">Compromisso no mês (Parcelas)</p>
              <p className="text-2xl font-bold text-amber-400">
                R$ {totalInstallmentsMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-si-5 mt-1">Soma de cartões e obrigações de crédito vigentes</p>
            </div>
            <div className={cardClass}>
              <p className="text-si-5 text-sm">Saldo devedor total (Futuro)</p>
              <p className="text-2xl font-bold text-si-1">
                R$ {totalRemainingDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-si-5 mt-1">Total a amortizar nos próximos meses</p>
            </div>
          </div>

          <div className="bg-si-card border border-si-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-bold text-si-1">Carteira de parcelamentos ativos</h3>
            </div>
            
            {cardInstallments.length === 0 && loanInstallments.length === 0 ? (
              <p className="text-si-5 text-sm py-8 text-center">Nenhum parcelamento ativo encontrado.</p>
            ) : (
              <div className="space-y-4">
                {cardInstallments.map((item) => {
                  const pct = Math.min(100, Math.round((item.current / item.total) * 100));
                  return (
                    <div key={item.id} className="p-4 rounded-xl bg-si-over-1 border border-si-border space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-bold text-si-1">{item.desc}</p>
                          <p className="text-xs text-si-5 mt-0.5">Cartão: {item.cardName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-si-1">
                            R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                          </p>
                          <p className="text-xs text-si-5 mt-0.5">Restam: R$ {item.remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-si-5">
                          <span>Progresso: {item.current}/{item.total} parcelas</span>
                          <span>{pct}% quitado</span>
                        </div>
                        <div className="h-1.5 w-full bg-si-over-3 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {loanInstallments.map((item) => {
                  const pct = Math.min(100, Math.round((item.current / item.total) * 100));
                  return (
                    <div key={item.id} className="p-4 rounded-xl bg-si-over-1 border border-si-border space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-bold text-si-1">{item.desc}</p>
                          <p className="text-xs text-si-5 mt-0.5">Origem: {item.institution}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-si-1">
                            R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                          </p>
                          <p className="text-xs text-si-5 mt-0.5">Restam: R$ {item.remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-si-5">
                          <span>Progresso: {item.current}/{item.total} parcelas</span>
                          <span>{pct}% quitado</span>
                        </div>
                        <div className="h-1.5 w-full bg-si-over-3 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-si-4 leading-relaxed">
              <span className="font-bold text-blue-300">Vale a pena antecipar? </span>
              Se o seu **Spread Gap (Sg)** estiver positivo (investimentos rendendo acima das taxas de juros de suas obrigações), 
              pode ser mais eficiente manter o capital rendendo. Caso o Spread Gap esteja negativo, amortizar ou antecipar parcelas com desconto 
              é o investimento de menor risco e maior retorno livre de impostos.
            </div>
          </div>
        </div>
      )}

      {/* ── Assinaturas Sub-view ── */}
      {activeSubTab === 'assinaturas' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={cardClass}>
              <p className="text-si-5 text-sm">Gasto mensal com Assinaturas</p>
              <p className="text-2xl font-bold text-violet-400">
                R$ {totalSubscriptionsMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-si-5 mt-1">Serviços recorrentes e contratos de SaaS ativos</p>
            </div>
            <div className={cardClass}>
              <p className="text-si-5 text-sm">Assinaturas identificadas</p>
              <p className="text-2xl font-bold text-si-1">
                {subscriptions.length}
              </p>
              <p className="text-xs text-si-5 mt-1">Mapeados via categoria ou palavras-chave estratégicas</p>
            </div>
          </div>

          {subscriptionLeaks.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-2">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider">Potencial Vazamento Invisível</span>
              </div>
              <p className="text-xs text-si-3 leading-relaxed">
                Detectamos que as seguintes assinaturas estão cadastradas ou ativas, mas **não registramos despesas para elas nos últimos 60 dias**. 
                Verifique se você cancelou ou se está pagando por um serviço esquecido:
              </p>
              <ul className="list-disc list-inside text-xs font-semibold text-rose-300 space-y-1 pl-1">
                {subscriptionLeaks.map((leak, idx) => (
                  <li key={idx}>{leak}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-si-card border border-si-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-violet-400" />
              <h3 className="text-lg font-bold text-si-1">Detalhamento de Assinaturas</h3>
            </div>

            {subscriptions.length === 0 ? (
              <p className="text-si-5 text-sm py-8 text-center">Nenhuma assinatura ativa encontrada no momento.</p>
            ) : (
              <div className="divide-y divide-si-border">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between gap-4 py-3 hover:bg-si-over-1/3 transition-colors px-2 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <MerchantLogo
                        description={sub.desc}
                        category={sub.category}
                        type="despesa"
                        size={28}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-si-1 truncate">{sub.desc}</p>
                        <p className="text-xs text-si-5 mt-0.5">
                          Todo dia {sub.day} · Freq: {sub.freq} {sub.account ? `· ${sub.account}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-si-1">
                        R$ {sub.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Categorias Sub-view ── */}
      {activeSubTab === 'categorias' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico de pizza */}
            <div className="lg:col-span-1 bg-si-card rounded-2xl border border-si-border p-6 flex flex-col justify-center">
              <h3 className="text-sm font-bold text-si-4 uppercase tracking-wider mb-4 text-center">
                Distribuição de Despesas
              </h3>
              {donutTotal > 0 ? (
                <ExpensesPieChart data={donutSegments} height={200} innerRadius={46} outerRadius={72} />
              ) : (
                <p className="text-si-5 text-sm py-8 text-center">Nenhuma despesa para exibir.</p>
              )}
            </div>

            {/* Listagem de orçamentos */}
            <div className="lg:col-span-2 bg-si-card rounded-2xl border border-si-border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-si-4 uppercase tracking-wider">
                  Consumo por Categoria vs Orçamento
                </h3>
                <Link to="/orcamento" className="text-xs text-blue-400 hover:underline">Configurar Limites</Link>
              </div>

              {categoryBudgets.length === 0 ? (
                <p className="text-si-5 text-sm py-8 text-center">Nenhum lançamento no mês para exibir.</p>
              ) : (
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                  {categoryBudgets.map((item) => {
                    const overBudget = item.limit > 0 && item.spent > item.limit;
                    const warning = item.limit > 0 && item.spent > item.limit * 0.8;
                    const progressVal = item.limit > 0 ? Math.min(100, item.percent) : 100;
                    return (
                      <div key={item.category} className="space-y-1 text-xs">
                        <div className="flex justify-between items-center text-si-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-si-1">{item.category}</span>
                            {overBudget ? (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold text-[9px] uppercase">Estourado</span>
                            ) : warning ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold text-[9px] uppercase">Atenção</span>
                            ) : null}
                          </div>
                          <span className="text-si-4">
                            R$ {item.spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{' '}
                            {item.limit > 0 ? `de R$ ${item.limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '(Sem Limite)'}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-si-over-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              overBudget ? 'bg-rose-500' : warning ? 'bg-amber-400' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${progressVal}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Cartões Sub-view ── */}
      {activeSubTab === 'cartoes' && (
        <div className="space-y-6">
          <div className="bg-si-card border border-si-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-bold text-si-1">Macro de Crédito</h3>
            </div>
            
            {cards.length === 0 ? (
              <p className="text-si-5 text-sm py-8 text-center">Nenhum cartão cadastrado no momento.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cards.map((card) => {
                  const limit = card.limit ?? 0;
                  const bill = card.currentBill ?? 0;
                  const utilization = limit > 0 ? Math.min(100, Math.round((bill / limit) * 100)) : 0;
                  return (
                    <div key={card.id} className="p-4 rounded-xl bg-si-over-1 border border-si-border space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-bold text-si-1">{card.name}</p>
                          <p className="text-xs text-si-5 mt-0.5">Bandeira: {card.flag || '—'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-si-1">R$ {bill.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <p className="text-xs text-si-5 mt-0.5">Limite: R$ {limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-si-5">
                          <span>Uso de limite</span>
                          <span>{utilization}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-si-over-3 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              utilization >= 80 ? 'bg-rose-500' : utilization >= 50 ? 'bg-amber-400' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${utilization}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs text-si-5 pt-1 border-t border-white/5">
                        <span>Fechamento: dia {card.closeDay}</span>
                        <span>Vencimento: dia {card.dueDay}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sentinela GPS — Geofencing Financeiro */}
          <div className="bg-si-card rounded-2xl border border-si-border p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-si-4 uppercase tracking-wider">Sentinela GPS</span>
                <span className="text-xs text-si-5 ml-1">— alerta financeiro por localização</span>
              </div>
              <button
                onClick={() => sentinela.check()}
                disabled={sentinela.loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs font-bold hover:bg-cyan-500/20 transition-colors disabled:opacity-50 disabled:cursor-wait"
              >
                <Navigation className={`w-3.5 h-3.5 ${sentinela.loading ? 'animate-pulse' : ''}`} />
                {sentinela.loading ? 'Localizando...' : 'Verificar local'}
              </button>
            </div>

            {sentinela.error && (
              <div className="mt-3 flex items-start gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{sentinela.error}</span>
              </div>
            )}

            {sentinela.result && sentinela.result.scenario && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-si-2">
                    {SCENARIO_LABELS[sentinela.result.scenario]}
                    {sentinela.result.placeName ? ` — ${sentinela.result.placeName}` : ''}
                  </span>
                  <button onClick={() => sentinela.reset()} className="ml-auto text-si-5 hover:text-si-3" title="Fechar alerta">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {sentinela.result.message && (
                  <pre className="whitespace-pre-wrap text-xs text-si-3 bg-si-bg rounded-xl p-3 border border-si-border leading-relaxed font-sans">
                    {sentinela.result.message}
                  </pre>
                )}
                {sentinela.result.sent && (
                  <p className="text-xs text-emerald-400">✓ Alerta enviado via WhatsApp</p>
                )}
              </div>
            )}

            {sentinela.result && !sentinela.result.scenario && !sentinela.loading && (
              <p className="mt-3 text-xs text-si-5">
                Nenhum local financeiramente relevante detectado no raio de 100m.
              </p>
            )}

            {!sentinela.result && !sentinela.loading && !sentinela.error && (
              <p className="mt-2 text-xs text-si-5">
                Pressione "Verificar local" ao entrar em shoppings, concessionárias, bancos e lojas — o Arquiteto avisa o que importa.
              </p>
            )}

            {sentinela.lastChecked && (
              <p className="mt-2 text-xs text-si-5">
                Última verificação: {sentinela.lastChecked.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>
      )}
    </PageTransition>
  );
}
