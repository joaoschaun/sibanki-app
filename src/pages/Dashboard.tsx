import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { TrendingUp, TrendingDown, ArrowUpRight, AlertTriangle, Lightbulb, CreditCard, Shield, Zap } from 'lucide-react';
import { calculateDaysOfFreedom, calculateSpreadGap } from '../utils/sovereigntyEngine';
import { InsightDoDia } from '../components/ui/InsightDoDia';
import { SibcoinWidget } from '../components/sibcoin/SibcoinWidget';
import { SibcoinMissionBanner } from '../components/sibcoin/SibcoinMissionBanner';
import { isTransferEntry, nonTransferEntries } from '../utils/entryUtils';
import { useDashboardMode } from '../hooks/useDashboardMode';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  CHART_COLORS,
  tooltipStyle as CHART_TOOLTIP_STYLE,
  gridStyle as CHART_GRID,
  axisStyle as CHART_AXIS,
  fmtAxis as fmtBRL,
} from '../components/charts/chartConfig';
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
    if (!raw) return { insight: true, passos: true, alertas: true, resumo: true, graficos: true };
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
  const { user, entries, accounts, score, budgets, loading, accountBalances, accountMeta, cards, goals, recurrents, financialProfile, investments, creditObligations } =
    useAppContext();
  const { mode: dashboardMode } = useDashboardMode();

  const now = useMemo(() => new Date(), []);
  const [showEditor, setShowEditor] = useState(false);
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

  const sovereignty = useMemo(() => {
    const freedom = calculateDaysOfFreedom({ entries, accountBalances, accountMeta, investments });
    const spread = calculateSpreadGap({ investments, creditObligations, cards, currentCdiMonthly: 0.0107 });
    return { freedom, spread };
  }, [entries, accountBalances, accountMeta, investments, creditObligations, cards]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setShowEditor((v) => !v)}
          className="px-4 py-2 rounded-xl bg-si-over-2 border border-si-border-md text-sm text-si-3 hover:bg-si-over-3"
        >
          {showEditor ? 'Fechar edição' : 'Editar Dashboard'}
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

      <SibcoinMissionBanner eventType="login_streak" />

      {widgets.insight && (
        <InsightDoDia
          entries={entries}
          cards={cards}
          goals={goals}
          recurrents={recurrents}
          accountBalances={accountBalances}
          accountMeta={accountMeta}
          loading={loading}
        />
      )}

      {widgets.passos && (
      <div className="bg-si-card rounded-2xl border border-si-border p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-si-1">Seus Primeiros Passos</h3>
            <p className="text-si-5 text-sm">Checklist inicial para configurar seu controle financeiro.</p>
          </div>
          <span className="text-sm font-semibold text-blue-400">
            {primeirosPassos.doneCount}/{primeirosPassos.steps.length}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-si-over-3 overflow-hidden mb-4">
          <div
            className="h-full bg-blue-500"
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

      <div className="flex items-end justify-between">
        <div>
          <p className="text-si-5 text-sm mb-1">
            {now.getHours() >= 12 ? (now.getHours() >= 18 ? 'Boa noite' : 'Boa tarde') : 'Bom dia'},{' '}
            {user?.displayName || user?.email?.split('@')[0] || 'Usuário'}
          </p>
          <div className="flex items-center gap-3">
            <h2 className="text-4xl font-bold">{user?.displayName || user?.email?.split('@')[0] || 'Usuário'}</h2>
            <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Score {score}
            </span>
          </div>
          <p className="text-si-5 text-xs mt-2">
            {now.toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <Link
          to="/lancamentos"
          className="bg-blue-600 hover:bg-blue-500 text-si-1 px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
        >
          <ArrowUpRight className="w-4 h-4" /> Novo lançamento
        </Link>
      </div>

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


      {/* Soberania Financeira */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-si-card rounded-2xl border border-si-border p-6">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-bold text-si-4 uppercase tracking-wider">Dias de Liberdade</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-violet-300">{sovereignty.freedom.days}</span>
            <span className="text-si-5 text-sm mb-1">dias</span>
          </div>
          <p className="text-xs text-si-5 mt-1">
            {sovereignty.freedom.coverageMonths.toFixed(1)} meses &middot; queima R$ {sovereignty.freedom.dailyBurnRate.toFixed(0)}/dia
          </p>
          <span className={`mt-3 inline-block px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${
            sovereignty.freedom.status === 'inabalavel'    ? 'bg-violet-500/15 text-violet-300 border-violet-500/30' :
            sovereignty.freedom.status === 'soberano'      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
            sovereignty.freedom.status === 'resiliente'    ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' :
            sovereignty.freedom.status === 'em-construcao' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
            'bg-rose-500/15 text-rose-300 border-rose-500/30'
          }`}>
            {sovereignty.freedom.status === 'inabalavel'    ? 'Inabal\u00e1vel' :
             sovereignty.freedom.status === 'soberano'      ? 'Soberano' :
             sovereignty.freedom.status === 'resiliente'    ? 'Resiliente' :
             sovereignty.freedom.status === 'em-construcao' ? 'Em constru\u00e7\u00e3o' : 'Fr\u00e1gil'}
          </span>
        </div>

        <div className="bg-si-card rounded-2xl border border-si-border p-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-si-4 uppercase tracking-wider">Spread Gap</span>
          </div>
          <div className="flex items-end gap-2">
            <span className={`text-4xl font-bold ${sovereignty.spread.spreadGap >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {sovereignty.spread.spreadGap >= 0 ? '+' : ''}{(sovereignty.spread.spreadGap * 100).toFixed(2)}%
            </span>
            <span className="text-si-5 text-sm mb-1">a.m.</span>
          </div>
          <p className="text-xs text-si-5 mt-1">
            {sovereignty.spread.spreadGap < 0
              ? `Vazamento ~R$ ${Math.abs(sovereignty.spread.monthlyLeakage).toFixed(0)}/m\u00eas`
              : 'Rendimento supera o custo da d\u00edvida'}
          </p>
          <span className={`mt-3 inline-block px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${
            sovereignty.spread.verdict === 'alavancagem-inteligente' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
            sovereignty.spread.verdict === 'zona-neutra'             ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' :
            sovereignty.spread.verdict === 'ineficiencia-moderada'   ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
            'bg-rose-500/15 text-rose-300 border-rose-500/30'
          }`}>
            {sovereignty.spread.verdict === 'alavancagem-inteligente' ? 'Alavancagem inteligente' :
             sovereignty.spread.verdict === 'zona-neutra'             ? 'Zona neutra' :
             sovereignty.spread.verdict === 'ineficiencia-moderada'   ? 'Inefici\u00eancia moderada' : 'Dreno cr\u00edtico'}
          </span>
        </div>
      </div>
      {widgets.graficos && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-si-card rounded-2xl border border-si-border p-6">
          <h3 className="text-sm font-bold text-si-4 uppercase tracking-wider mb-4">
            Despesas por categoria · {getMonthLabel(currentMonthKey)} {now.getFullYear()}
          </h3>
          {donutTotal > 0 ? (
            <div className="flex flex-col sm:flex-row gap-6 items-center">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={donutSegments}
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={72}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {donutSegments.map((s, i) => (
                      <Cell key={s.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => [`R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
                    contentStyle={CHART_TOOLTIP_STYLE}
                  />
                </PieChart>
              </ResponsiveContainer>
              <ul className="space-y-2 flex-1">
                {donutSegments.map((s, i) => (
                  <li key={s.name} className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-si-3 truncate">{s.name}</span>
                    <span className="text-si-5 ml-auto">{s.pct.toFixed(0)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-si-5 text-sm py-8 text-center">Nenhuma despesa no mês para exibir.</p>
          )}
        </div>

        <div className="bg-si-card rounded-2xl border border-si-border p-6">
          <h3 className="text-sm font-bold text-si-4 uppercase tracking-wider mb-4">Evolução · Últimos 6 meses</h3>
          {maxVal > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={last6Months.map((row) => ({
                  mes: getMonthLabel(row.monthKey),
                  Receita: row.receita,
                  Despesa: row.despesa,
                }))}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                barCategoryGap="30%"
                barGap={2}
              >
                <CartesianGrid {...CHART_GRID} vertical={false} />
                <XAxis dataKey="mes" {...CHART_AXIS} />
                <YAxis tickFormatter={fmtBRL} {...CHART_AXIS} width={56} />
                <Tooltip
                  formatter={(v: any) => [`R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
                  contentStyle={CHART_TOOLTIP_STYLE}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
                <Bar dataKey="Receita" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Despesa" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-si-5 text-sm py-8 text-center">Nenhum dado nos últimos 6 meses.</p>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
