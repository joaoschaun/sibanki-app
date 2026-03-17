import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useFinancialData } from '../hooks/useFinancialData';
import { TrendingUp, TrendingDown, ArrowUpRight, AlertTriangle, Lightbulb } from 'lucide-react';

const CHART_COLORS = ['#4F8CFF', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

function getMonthKey(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

function getMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[m - 1]}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { entries, accounts, score, budgets, loading } = useFinancialData(user?.uid);

  const now = useMemo(() => new Date(), []);
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
  const totalReceita = entries.filter((e) => e.type === 'receita').reduce((s, e) => s + (e.value ?? 0), 0);
  const totalDespesa = entries.filter((e) => e.type === 'despesa').reduce((s, e) => s + (e.value ?? 0), 0);
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

  const alertas = useMemo(() => {
    const list: { type: 'positive' | 'warning' | 'info'; title: string; text: string; link?: string }[] = [];
    if (saldoMes > 0) {
      list.push({
        type: 'positive',
        title: 'Saldo positivo!',
        text: 'Você gasta menos do que ganha. Direcione o excedente para investimentos.',
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
    if (list.length === 0 && entries.length === 0) {
      list.push({
        type: 'info',
        title: 'Comece a registrar',
        text: 'Adicione receitas e despesas em Lançamentos para ver seu resumo aqui.',
        link: '/lancamentos',
      });
    }
    return list;
  }, [saldoMes, catTotals, budgetMap, entries.length]);

  const donutTotal = Object.values(catTotals).reduce((a, b) => a + b, 0);
  const donutSegments = useMemo(() => {
    if (donutTotal <= 0) return [];
    const sorted = Object.entries(catTotals)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    let acc = 0;
    return sorted.map(([name, value], i) => {
      const pct = (value / donutTotal) * 100;
      const start = acc;
      acc += pct;
      return { name, value, pct, start, end: acc, color: CHART_COLORS[i % CHART_COLORS.length] };
    });
  }, [catTotals, donutTotal]);

  const maxVal = useMemo(() => {
    let m = 0;
    for (const row of last6Months) {
      m = Math.max(m, row.receita, row.despesa);
    }
    return m || 1;
  }, [last6Months]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {alertas.length > 0 && (
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

      <div className="flex items-end justify-between">
        <div>
          <p className="text-zinc-500 text-sm mb-1">
            {now.getHours() >= 12 ? (now.getHours() >= 18 ? 'Boa noite' : 'Boa tarde') : 'Bom dia'},{' '}
            {user?.displayName || user?.email?.split('@')[0] || 'Usuário'}
          </p>
          <div className="flex items-center gap-3">
            <h2 className="text-4xl font-bold">{user?.displayName || user?.email?.split('@')[0] || 'Usuário'}</h2>
            <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Score {score}
            </span>
          </div>
          <p className="text-zinc-500 text-xs mt-2">
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
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
        >
          <ArrowUpRight className="w-4 h-4" /> Novo lançamento
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0a0f18] border border-white/5 rounded-2xl p-6">
          <p className="text-zinc-500 text-sm">Receitas (mês)</p>
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
        <div className="bg-[#0a0f18] border border-white/5 rounded-2xl p-6">
          <p className="text-zinc-500 text-sm">Despesas (mês)</p>
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
        <div className="bg-[#0a0f18] border border-white/5 rounded-2xl p-6">
          <p className="text-zinc-500 text-sm">Saldo (mês)</p>
          <p className={`text-2xl font-bold ${saldoMes >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            R$ {saldoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-zinc-500 mt-1">{accounts.length} conta(s)</p>
        </div>
        <div className="bg-[#0a0f18] border border-white/5 rounded-2xl p-6">
          <p className="text-zinc-500 text-sm">Lançamentos</p>
          <p className="text-2xl font-bold text-zinc-100">{entries.length}</p>
          <p className="text-xs text-zinc-500 mt-1">Total geral: R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0a0f18] rounded-2xl border border-white/5 p-6">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">
            Despesas por categoria · {getMonthLabel(currentMonthKey)} {now.getFullYear()}
          </h3>
          {donutTotal > 0 ? (
            <div className="flex flex-col sm:flex-row gap-6 items-center">
              <div
                className="w-40 h-40 rounded-full shrink-0"
                style={{
                  background: `conic-gradient(${donutSegments.map((s) => `${s.color} ${s.start}% ${s.end}%`).join(', ')})`,
                }}
              />
              <ul className="space-y-2">
                {donutSegments.map((s) => (
                  <li key={s.name} className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-zinc-300 truncate">{s.name}</span>
                    <span className="text-zinc-500 ml-auto">{s.pct.toFixed(0)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-zinc-500 text-sm py-8 text-center">Nenhuma despesa no mês para exibir.</p>
          )}
        </div>

        <div className="bg-[#0a0f18] rounded-2xl border border-white/5 p-6">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Evolução · Últimos 6 meses</h3>
          <div className="flex gap-4 mb-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500/80" /> Receita</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-500/80" /> Despesa</span>
          </div>
          {maxVal > 0 ? (
            <div className="h-48 flex items-end gap-2">
              {last6Months.map((row) => (
                <div key={row.monthKey} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex justify-end gap-0.5 items-end" style={{ height: '120px' }}>
                    <div
                      className="w-1/2 bg-rose-500/80 rounded-t min-h-[4px]"
                      style={{ height: `${(row.despesa / maxVal) * 100}%` }}
                      title={`Despesa: R$ ${row.despesa.toLocaleString('pt-BR')}`}
                    />
                    <div
                      className="w-1/2 bg-emerald-500/80 rounded-t min-h-[4px]"
                      style={{ height: `${(row.receita / maxVal) * 100}%` }}
                      title={`Receita: R$ ${row.receita.toLocaleString('pt-BR')}`}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500">{getMonthLabel(row.monthKey)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-sm py-8 text-center">Nenhum dado nos últimos 6 meses.</p>
          )}
        </div>
      </div>
    </div>
  );
}
