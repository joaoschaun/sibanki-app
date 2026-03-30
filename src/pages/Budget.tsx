import { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useSibcoinToast } from '../hooks/useSibcoinToast';
import { updateBudgets } from '../services/persistUserData';
import { DEFAULT_CATEGORIES } from '../constants/defaults';
import { Modal } from '../components/ui/Modal';
import { Plus } from 'lucide-react';
import { SibcoinMissionBanner } from '../components/sibcoin/SibcoinMissionBanner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  tooltipStyle as CHART_TOOLTIP_STYLE,
  gridStyle as CHART_GRID,
  axisStyle as CHART_AXIS,
  fmtAxis as fmtBRL,
} from '../components/charts/chartConfig';

const CHART_LEGEND_STYLE = { fontSize: 12, color: '#a1a1aa' };

function getMonthKey(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

export default function Budget() {
  const { user, entries, budgets: budgetsRaw, loading } = useAppContext();
  const { triggerWithToast } = useSibcoinToast();
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [planIncome, setPlanIncome] = useState('');
  const [planSavePct, setPlanSavePct] = useState('20');
  const [busy, setBusy] = useState(false);

  const currentMonthKey = useMemo(() => getMonthKey(new Date()), []);

  const budgets = useMemo(() => {
    const b: Record<string, number> = {};
    if (budgetsRaw && typeof budgetsRaw === 'object') {
      for (const [k, v] of Object.entries(budgetsRaw)) {
        const n = typeof v === 'number' ? v : Number(v);
        if (!Number.isNaN(n) && n > 0) b[k] = n;
      }
    }
    return b;
  }, [budgetsRaw]);

  const gastosByCat = useMemo(() => {
    const g: Record<string, number> = {};
    for (const e of entries) {
      if (e.type !== 'despesa' || !e.date?.startsWith(currentMonthKey)) continue;
      const cat = e.category || 'Outros';
      g[cat] = (g[cat] ?? 0) + (Number(e.value) || 0);
    }
    return g;
  }, [entries, currentMonthKey]);

  const categorias = useMemo(() => {
    const cats = new Set<string>([...Object.keys(budgets), ...Object.keys(gastosByCat), ...DEFAULT_CATEGORIES]);
    return Array.from(cats).sort();
  }, [budgets, gastosByCat]);

  const receitaMes = useMemo(() => {
    return entries.reduce((sum, e) => {
      if (e.type !== 'receita' || !e.date?.startsWith(currentMonthKey)) return sum;
      return sum + (Number(e.value) || 0);
    }, 0);
  }, [entries, currentMonthKey]);

  const ultimos6Meses = useMemo(() => {
    const out: { key: string; label: string; gasto: number; orcado: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = getMonthKey(d);
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      const gasto = entries.reduce((sum, e) => {
        if (e.type !== 'despesa' || !e.date?.startsWith(key)) return sum;
        return sum + (Number(e.value) || 0);
      }, 0);
      const orcado = Object.values(budgets).reduce((s, v) => s + (Number(v) || 0), 0);
      out.push({ key, label, gasto, orcado });
    }
    return out;
  }, [entries, budgets]);

  const valorRendaPlanejada = (parseFloat(planIncome.replace(',', '.')) || receitaMes || 0);
  const valorPouparPct = Math.max(0, Math.min(100, parseFloat(planSavePct.replace(',', '.')) || 0));
  const valorParaGastar = Math.max(0, valorRendaPlanejada * (1 - valorPouparPct / 100));

  const handleSaveLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !editingCat) return;
    const val = parseFloat(editValue.replace(',', '.')) || 0;
    setBusy(true);
    try {
      const next = { ...budgets };
      if (val <= 0) delete next[editingCat];
      else next[editingCat] = Math.round(val * 100) / 100;
      await updateBudgets(user.uid, next);
      if (val > 0) triggerWithToast('budget_created'); // fire-and-forget SibCoin
      setEditingCat(null);
      setEditValue('');
    } finally {
      setBusy(false);
    }
  };

  const handleApplyPlanningFlow = async () => {
    if (!user?.uid) return;
    const renda = valorRendaPlanejada;
    const pctPoupar = valorPouparPct;
    if (renda <= 0) return;

    const totalDistribuir = Math.round(renda * (1 - pctPoupar / 100) * 100) / 100;
    const historico = Object.entries(gastosByCat).filter(([, v]) => v > 0);
    const baseCats = historico.length > 0 ? historico.map(([cat]) => cat) : DEFAULT_CATEGORIES.slice(0, 6);
    const pesos = historico.length > 0
      ? historico.map(([, v]) => v)
      : baseCats.map(() => 1);
    const somaPesos = pesos.reduce((s, v) => s + v, 0) || 1;

    const next = { ...budgets } as Record<string, number>;
    baseCats.forEach((cat, i) => {
      const val = Math.round((totalDistribuir * (pesos[i] / somaPesos)) * 100) / 100;
      next[cat] = val;
    });

    setBusy(true);
    try {
      await updateBudgets(user.uid, next);
      triggerWithToast('budget_created'); // fire-and-forget SibCoin
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Orçamento</h2>
          <p className="text-si-5 text-sm">
            Limite por categoria · {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      <SibcoinMissionBanner eventType="budget_created" />

      <div className="bg-si-card rounded-2xl border border-si-border overflow-hidden">
        <div className="divide-y divide-white/5">
          {categorias.map((cat) => {
            const gasto = gastosByCat[cat] ?? 0;
            const limite = budgets[cat];
            const pct = limite && limite > 0 ? Math.min(150, (gasto / limite) * 100) : (gasto > 0 ? 100 : 0);
            const status = !limite ? 'sem' : pct <= 100 ? 'ok' : 'estouro';
            return (
              <div key={cat} className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-medium text-si-1">{cat}</span>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-si-4">
                        R$ {gasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        {limite != null && limite > 0 && (
                          <> / R$ {limite.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCat(cat);
                          setEditValue(limite != null ? String(limite) : '');
                        }}
                        className="text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" /> {limite != null ? 'Alterar' : 'Definir'}
                      </button>
                    </div>
                  </div>
                  {limite != null && limite > 0 ? (
                    <div className="h-2 rounded-full bg-si-over-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          status === 'ok' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  ) : (
                    <p className="text-si-5 text-xs">Sem limite definido</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <section className="bg-si-card rounded-2xl border border-si-border p-6">
        <h3 className="font-semibold text-si-1 mb-2">Fluxo de planejamento</h3>
        <p className="text-si-5 text-sm mb-4">
          Defina renda mensal, percentual para poupar e distribua automaticamente o orçamento por categoria.
        </p>
        <div className="grid gap-4 sm:grid-cols-3 mb-4">
          <div>
            <label htmlFor="plan-income" className="block text-xs font-medium text-si-5 mb-1">Renda mensal (R$)</label>
            <input
              id="plan-income"
              type="text"
              inputMode="decimal"
              value={planIncome}
              onChange={(e) => setPlanIncome(e.target.value.replace(/[^0-9,.-]/, ''))}
              placeholder={receitaMes > 0 ? receitaMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
              className="w-full px-4 py-2.5 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
          <div>
            <label htmlFor="plan-save" className="block text-xs font-medium text-si-5 mb-1">% para poupar</label>
            <input
              id="plan-save"
              type="text"
              inputMode="decimal"
              value={planSavePct}
              onChange={(e) => setPlanSavePct(e.target.value.replace(/[^0-9,.-]/, ''))}
              className="w-full px-4 py-2.5 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
          <div className="rounded-xl border border-si-border-md bg-si-bg px-4 py-2.5">
            <p className="text-xs text-si-5">Valor para distribuir</p>
            <p className="text-sm font-semibold text-si-1">
              R$ {valorParaGastar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleApplyPlanningFlow}
          disabled={busy || valorRendaPlanejada <= 0}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-si-1 text-sm font-bold"
        >
          {busy ? 'Aplicando…' : 'Distribuir orçamento automaticamente'}
        </button>
      </section>

      <section className="bg-si-card rounded-2xl border border-si-border p-6">
        <h3 className="font-semibold text-si-1 mb-2">Últimos 6 meses</h3>
        <p className="text-si-5 text-sm mb-4">Comparativo entre gasto realizado e orçamento total configurado.</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={ultimos6Meses.map((m) => ({
              mes: m.label,
              Gasto: +m.gasto.toFixed(2),
              Orçado: +m.orcado.toFixed(2),
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
            <Legend iconType="circle" iconSize={8} wrapperStyle={CHART_LEGEND_STYLE} />
            <Bar dataKey="Gasto" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="Orçado" fill="#4F8CFF" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <Modal open={!!editingCat} onClose={() => setEditingCat(null)} title={editingCat ? `Limite: ${editingCat}` : ''}>
        {editingCat && (
          <form onSubmit={handleSaveLimit} className="space-y-4">
            <div>
              <label htmlFor="budget-limit" className="block text-xs font-medium text-si-5 mb-1">
                Limite mensal (R$)
              </label>
              <input
                id="budget-limit"
                type="text"
                inputMode="decimal"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value.replace(/[^0-9,.-]/, ''))}
                placeholder="0,00"
                className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-si-5 mt-1">Deixe em branco ou 0 para remover o limite.</p>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={busy}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-si-1 font-bold text-sm"
              >
                {busy ? 'Salvando…' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={() => setEditingCat(null)}
                className="px-6 py-3 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
