import { useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useFinancialData } from '../hooks/useFinancialData';
import { updateBudgets } from '../services/persistUserData';
import { DEFAULT_CATEGORIES } from '../constants/defaults';
import { Modal } from '../components/ui/Modal';
import { Plus } from 'lucide-react';

function getMonthKey(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

export default function Budget() {
  const { user } = useAuth();
  const { entries, budgets: budgetsRaw, loading } = useFinancialData(user?.uid);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
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
      setEditingCat(null);
      setEditValue('');
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
          <p className="text-zinc-500 text-sm">
            Limite por categoria · {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="bg-[#0a0f18] rounded-2xl border border-white/5 overflow-hidden">
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
                    <span className="font-medium text-zinc-100">{cat}</span>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-zinc-400">
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
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          status === 'ok' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  ) : (
                    <p className="text-zinc-500 text-xs">Sem limite definido</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={!!editingCat} onClose={() => setEditingCat(null)} title={editingCat ? `Limite: ${editingCat}` : ''}>
        {editingCat && (
          <form onSubmit={handleSaveLimit} className="space-y-4">
            <div>
              <label htmlFor="budget-limit" className="block text-xs font-medium text-zinc-500 mb-1">
                Limite mensal (R$)
              </label>
              <input
                id="budget-limit"
                type="text"
                inputMode="decimal"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value.replace(/[^0-9,.-]/, ''))}
                placeholder="0,00"
                className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-zinc-500 mt-1">Deixe em branco ou 0 para remover o limite.</p>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={busy}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm"
              >
                {busy ? 'Salvando…' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={() => setEditingCat(null)}
                className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 text-sm"
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
