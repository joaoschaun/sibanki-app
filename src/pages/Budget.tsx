/**
 * Budget.tsx — Orçamento unificado (Simples + Envelope/ZBB)
 *
 * Modo Simples: limites por categoria com semáforo de gasto.
 * Modo Envelope: Zero-Based Budgeting — toda renda tem destino antes de gastar.
 *
 * Ambos os modos compartilham o mesmo campo `budgets` no Firestore.
 * O modo escolhido é salvo em `userData.budgetMode`.
 */
import { useMemo, useState } from 'react';
import { GenericPageSkeleton } from '../components/ui/PageSkeleton';
import { useAppContext } from '../context/AppContext';
import { useSibcoinToast } from '../hooks/useSibcoinToast';
import { updateBudgets, updateUserDoc } from '../services/persistUserData';
import { DEFAULT_CATEGORIES } from '../constants/defaults';
import { Modal } from '../components/ui/Modal';
import { SibcoinMissionBanner } from '../components/sibcoin/SibcoinMissionBanner';
import { BudgetBarChart } from '../components/charts/BudgetBarChart';
import type { BudgetRow } from '../components/charts/BudgetBarChart';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  tooltipStyle as CHART_TOOLTIP_STYLE,
  gridStyle as CHART_GRID,
  axisStyle as CHART_AXIS,
  fmtAxis as fmtBRLAxis,
} from '../components/charts/chartConfig';
import {
  Plus, Package, AlertTriangle, CheckCircle,
  ArrowRightLeft, Info, LayoutList, Shield, Sparkles, Zap
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────────
const CHART_LEGEND_STYLE = { fontSize: 12, color: '#a1a1aa' };

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function getMonthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

type BudgetMode = 'simples' | 'envelope';

interface MoveModalState { from: string; to: string; valor: string; }

// ── Subcomponente: input inline de envelope ────────────────────────────────────
function EnvelopeInput({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [str, setStr] = useState('');
  if (editing) {
    return (
      <input
        autoFocus type="text" inputMode="decimal" value={str}
        onChange={e => setStr(e.target.value)}
        onBlur={() => { onSave(parseFloat(str.replace(',', '.')) || 0); setEditing(false); }}
        onKeyDown={e => {
          if (e.key === 'Enter') { onSave(parseFloat(str.replace(',', '.')) || 0); setEditing(false); }
        }}
        className="bg-si-bg border border-blue-500 rounded px-1.5 py-0.5 text-[11px] w-24 text-si-1"
      />
    );
  }
  return (
    <button
      onClick={() => { setStr(String(value)); setEditing(true); }}
      className="text-[11px] text-si-5 hover:text-blue-400"
    >
      Envelope: {value > 0 ? fmtBRL(value) : '— definir'}
    </button>
  );
}

// ── Componente principal ────────────────────────────────────────────────────────
export default function Budget() {
  const { user, entries, budgets: budgetsRaw, loading, data, financialProfile } = useAppContext();
  const { triggerWithToast } = useSibcoinToast();

  // ── Modo (simples | envelope) — persiste no doc do usuário ──────────────────
  const savedMode = ((data as Record<string, unknown>)?.budgetMode as BudgetMode) ?? 'simples';
  const [mode, setModeLocal] = useState<BudgetMode>(savedMode);

  async function setMode(m: BudgetMode) {
    setModeLocal(m);
    if (user?.uid) await updateUserDoc(user.uid, { budgetMode: m } as Record<string, unknown>);
  }

  // ── Dados compartilhados ────────────────────────────────────────────────────
  const currentMonthKey = useMemo(() => getMonthKey(), []);

  // ── Histórico de orçamentos mensais ──
  const budgetHistory = useMemo<Record<string, Record<string, number>>>(() => {
    const hist = (data as any)?.budgetHistory || {};
    const currentKey = currentMonthKey;
    if (Object.keys(hist).length === 0 && budgetsRaw && typeof budgetsRaw === 'object') {
      const b: Record<string, number> = {};
      for (const [k, v] of Object.entries(budgetsRaw)) {
        const n = Number(v);
        if (!isNaN(n) && n >= 0) b[k] = n;
      }
      return { [currentKey]: b };
    }
    return hist;
  }, [data, budgetsRaw, currentMonthKey]);

  // Orçamento ativo do mês selecionado/atual
  const budgets = useMemo<Record<string, number>>(() => {
    if (budgetHistory[currentMonthKey]) {
      return budgetHistory[currentMonthKey];
    }
    const keys = Object.keys(budgetHistory).sort();
    if (keys.length > 0) {
      const lastKey = keys[keys.length - 1];
      return budgetHistory[lastKey] || {};
    }
    return {};
  }, [budgetHistory, currentMonthKey]);

  // Agrupar gastos históricos por mês e por categoria
  const gastosByMonthAndCat = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const e of entries) {
      if (e.type !== 'despesa') continue;
      const mKey = e.date?.substring(0, 7) || 'unknown';
      const cat = e.category || 'Outros';
      if (!map[mKey]) map[mKey] = {};
      map[mKey][cat] = (map[mKey][cat] ?? 0) + (Number(e.value) || 0);
    }
    return map;
  }, [entries]);

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
    const cats = new Set<string>([
      ...Object.keys(budgets),
      ...Object.keys(gastosByCat),
      ...DEFAULT_CATEGORIES,
    ]);
    return Array.from(cats).filter(c => c !== 'Transferencia').sort();
  }, [budgets, gastosByCat]);

  // Cálculos de Rollover Cronológico
  const rolloverAndBalances = useMemo(() => {
    const monthKeys = new Set([...Object.keys(budgetHistory), currentMonthKey]);
    const sortedMonths = Array.from(monthKeys).sort();

    const rollovers: Record<string, Record<string, number>> = {};
    const balances: Record<string, Record<string, number>> = {};

    let runningRollover: Record<string, number> = {};

    for (const mKey of sortedMonths) {
      rollovers[mKey] = { ...runningRollover };
      balances[mKey] = {};

      const monthBudget = budgetHistory[mKey] || budgets;
      const monthExpenses = gastosByMonthAndCat[mKey] || {};
      const allCats = new Set([...Object.keys(monthBudget), ...Object.keys(monthExpenses)]);

      for (const cat of allCats) {
        const alocado = monthBudget[cat] || 0;
        const gasto = monthExpenses[cat] || 0;
        const prevRollover = rollovers[mKey][cat] || 0;

        const restante = mode === 'envelope'
          ? alocado + prevRollover - gasto
          : alocado - gasto;

        balances[mKey][cat] = restante;
        runningRollover[cat] = mode === 'envelope' ? restante : 0;
      }
    }

    return { rollovers, balances };
  }, [budgetHistory, budgets, gastosByMonthAndCat, currentMonthKey, mode]);

  // Alertas Proativos de Velocidade de Queima (Burn Rate)
  const proactiveAlerts = useMemo(() => {
    const alerts: string[] = [];
    const today = new Date();
    const day = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const monthProgressPct = (day / daysInMonth) * 100;

    for (const cat of categorias) {
      const limite = budgets[cat];
      const gasto = gastosByCat[cat] ?? 0;
      if (limite && limite > 0) {
        const gastoPct = (gasto / limite) * 100;
        if (gastoPct > monthProgressPct + 20 && monthProgressPct < 90) {
          alerts.push(`Consumo Acelerado: Você já gastou ${gastoPct.toFixed(0)}% do envelope de ${cat} no dia ${day} do mês.`);
        }
      }
    }
    return alerts;
  }, [categorias, budgets, gastosByCat]);

  // IA Balanceadora — Sugestão de remanejamento
  const balanceadoraSugestao = useMemo(() => {
    if (mode !== 'envelope') return null;
    const currentBalances = rolloverAndBalances.balances[currentMonthKey] || {};
    
    const deficits = Object.entries(currentBalances)
      .filter(([, bal]) => bal < 0)
      .map(([cat, bal]) => ({ cat, value: Math.abs(bal) }));
      
    const surpluses = Object.entries(currentBalances)
      .filter(([, bal]) => bal > 0)
      .map(([cat, bal]) => ({ cat, value: bal }))
      .sort((a, b) => b.value - a.value);
      
    if (deficits.length > 0 && surpluses.length > 0) {
      return {
        from: surpluses[0].cat,
        to: deficits[0].cat,
        amount: Math.min(deficits[0].value, surpluses[0].value),
      };
    }
    return null;
  }, [rolloverAndBalances, currentMonthKey, mode]);

  const receitaMes = useMemo(() =>
    entries.reduce((s, e) =>
      e.type === 'receita' && e.date?.startsWith(currentMonthKey) ? s + (Number(e.value) || 0) : s, 0),
    [entries, currentMonthKey]);

  const totalGasto = useMemo(() =>
    Object.values(gastosByCat).reduce((s, v) => s + v, 0),
    [gastosByCat]);

  const economia = useMemo(() =>
    Math.max(0, receitaMes - totalGasto),
    [receitaMes, totalGasto]);

  const ldDiasGanhos = useMemo(() => {
    const expensesMonthly = financialProfile?.cashflow?.expenses || parseFloat((data as any)?.cadastroCompleto?.gastosEstimados) || 3000;
    const burnRateDiario = expensesMonthly / 30;
    return burnRateDiario > 0 ? economia / burnRateDiario : 0;
  }, [financialProfile, data, economia]);

  // ── Estado modo Simples ─────────────────────────────────────────────────────
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [planIncome, setPlanIncome] = useState('');
  const [planSavePct, setPlanSavePct] = useState('20');
  const [busy, setBusy] = useState(false);

  const valorRendaPlanejada = parseFloat(planIncome.replace(',', '.')) || receitaMes || 0;
  const valorPouparPct = Math.max(0, Math.min(100, parseFloat(planSavePct.replace(',', '.')) || 0));
  const valorParaGastar = Math.max(0, valorRendaPlanejada * (1 - valorPouparPct / 100));

  const budgetChartData: BudgetRow[] = useMemo(() =>
    Object.entries(budgets)
      .map(([category, limite]) => ({
        category,
        gasto: +(gastosByCat[category] ?? 0).toFixed(2),
        limite,
        over: (gastosByCat[category] ?? 0) > limite,
      }))
      .sort((a, b) => b.gasto - a.gasto)
      .slice(0, 10),
    [budgets, gastosByCat]);

  const ultimos6Meses = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = getMonthKey(d);
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      const gasto = entries.reduce((s, e) =>
        e.type === 'despesa' && e.date?.startsWith(key) ? s + (Number(e.value) || 0) : s, 0);
      const orcado = Object.values(budgets).reduce((s, v) => s + v, 0);
      return { label, gasto, orcado };
    });
  }, [entries, budgets]);

  async function handleSaveLimit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.uid || !editingCat) return;
    const val = parseFloat(editValue.replace(',', '.')) || 0;
    setBusy(true);
    try {
      const next = { ...budgets };
      if (val <= 0) delete next[editingCat];
      else next[editingCat] = Math.round(val * 100) / 100;
      await updateBudgets(user.uid, next, currentMonthKey);
      if (val > 0) triggerWithToast('budget_created');
      setEditingCat(null); setEditValue('');
    } finally { setBusy(false); }
  }

  async function handleDistribuir() {
    if (!user?.uid || valorRendaPlanejada <= 0) return;
    const totalDist = Math.round(valorRendaPlanejada * (1 - valorPouparPct / 100) * 100) / 100;
    const hist = Object.entries(gastosByCat).filter(([, v]) => v > 0);
    const baseCats = hist.length > 0 ? hist.map(([c]) => c) : DEFAULT_CATEGORIES.slice(0, 6);
    const pesos = hist.length > 0 ? hist.map(([, v]) => v) : baseCats.map(() => 1);
    const soma = pesos.reduce((s, v) => s + v, 0) || 1;
    const next = { ...budgets } as Record<string, number>;
    baseCats.forEach((cat, i) => { next[cat] = Math.round(totalDist * (pesos[i] / soma) * 100) / 100; });
    setBusy(true);
    try { await updateBudgets(user.uid, next, currentMonthKey); triggerWithToast('budget_created'); }
    finally { setBusy(false); }
  }

  // ── Estado modo Envelope ────────────────────────────────────────────────────
  const rendaFallback = receitaMes;
  const savedRenda = Number((data as Record<string, unknown>)?.envelopeMensal ?? 0) || rendaFallback;
  const [rendaStr, setRendaStr] = useState(String(Math.round(savedRenda)));
  const [moveModal, setMoveModal] = useState<MoveModalState | null>(null);

  const renda = parseFloat(rendaStr.replace(',', '.')) || 0;
  const totalAlocado = Object.values(budgets).reduce((s, v) => s + v, 0);
  const naoAlocado = Math.max(0, renda - totalAlocado);
  const zeroado = Math.abs(naoAlocado) < 0.01;

  async function handleSaveRenda() {
    if (!user?.uid) return;
    await updateUserDoc(user.uid, { envelopeMensal: renda } as Record<string, unknown>);
  }

  async function handleSaveEnvelope(cat: string, valor: number) {
    if (!user?.uid) return;
    const next = { ...budgets };
    if (valor <= 0) delete next[cat];
    else next[cat] = Math.round(valor * 100) / 100;
    await updateBudgets(user.uid, next, currentMonthKey);
  }

  async function handleAlocarTudo() {
    if (!user?.uid || naoAlocado <= 0) return;
    setBusy(true);
    try {
      const totalSpent = Object.values(gastosByCat).reduce((s, v) => s + v, 0) || 1;
      const catComGasto = Object.entries(gastosByCat).filter(([, v]) => v > 0);
      const next = { ...budgets };
      if (catComGasto.length > 0) {
        for (const [cat, s] of catComGasto)
          next[cat] = Math.round(((next[cat] ?? 0) + naoAlocado * (s / totalSpent)) * 100) / 100;
      } else {
        const activeCats = categorias.slice(0, 6);
        const share = Math.round((naoAlocado / activeCats.length) * 100) / 100;
        for (const cat of activeCats) next[cat] = (next[cat] ?? 0) + share;
      }
      await updateBudgets(user.uid, next, currentMonthKey);
    } finally { setBusy(false); }
  }

  async function handleMove() {
    if (!moveModal || !user?.uid) return;
    const val = parseFloat(moveModal.valor.replace(',', '.')) || 0;
    if (val <= 0) return;
    const next = { ...budgets };
    next[moveModal.from] = Math.max(0, Math.round(((next[moveModal.from] ?? 0) - val) * 100) / 100);
    next[moveModal.to]   = Math.round(((next[moveModal.to] ?? 0) + val) * 100) / 100;
    setBusy(true);
    try { await updateBudgets(user.uid, next, currentMonthKey); setMoveModal(null); }
    finally { setBusy(false); }
  }

  async function handleApplyBalanceadora() {
    if (!balanceadoraSugestao || !user?.uid) return;
    const { from, to, amount } = balanceadoraSugestao;
    setBusy(true);
    try {
      const next = { ...budgets };
      next[from] = Math.max(0, Math.round(((next[from] ?? 0) - amount) * 100) / 100);
      next[to] = Math.round(((next[to] ?? 0) + amount) * 100) / 100;
      await updateBudgets(user.uid, next, currentMonthKey);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <GenericPageSkeleton rows={6} />;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header com toggle de modo ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            {mode === 'envelope'
              ? <><Package className="w-7 h-7 text-blue-400" /> Orçamento</>
              : <><LayoutList className="w-7 h-7 text-blue-400" /> Orçamento</>
            }
          </h2>
          <p className="text-si-5 text-sm mt-1">
            {mode === 'envelope'
              ? 'Dê um destino para cada real antes de gastar — método Zero-Based Budgeting.'
              : `Limite por categoria · ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`}
          </p>
        </div>

        {/* Toggle Simples / Envelope */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-si-over-1 border border-si-border text-xs font-semibold shrink-0">
          <button
            onClick={() => setMode('simples')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              mode === 'simples'
                ? 'bg-white text-zinc-900 shadow'
                : 'text-si-5 hover:text-si-3'
            }`}
          >
            Simples
          </button>
          <button
            onClick={() => setMode('envelope')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              mode === 'envelope'
                ? 'bg-white text-zinc-900 shadow'
                : 'text-si-5 hover:text-si-3'
            }`}
          >
            Envelope (ZBB)
          </button>
        </div>
      </div>

      <SibcoinMissionBanner eventType="budget_created" />

      {/* ── Bloco de Inteligência Financeira ── */}
      {(ldDiasGanhos > 0 || (mode === 'envelope' && balanceadoraSugestao) || proactiveAlerts.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sync de Soberania */}
          {ldDiasGanhos > 0 && (
            <div className="bg-emerald-950/10 border border-emerald-500/20 rounded-2xl p-5 flex items-start gap-4 hover:border-emerald-500/40 transition-colors">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-emerald-300">Sync de Soberania</h4>
                <p className="text-xs text-emerald-200/80 leading-relaxed">
                  Sua economia de <strong className="text-emerald-400">{fmtBRL(economia)}</strong> neste mês equivale a <strong className="text-emerald-400">+{ldDiasGanhos.toFixed(1)} dias</strong> de autonomia real adicionados à sua Liberdade Financeira (Ld).
                </p>
              </div>
            </div>
          )}

          {/* IA Balanceadora */}
          {mode === 'envelope' && balanceadoraSugestao && (
            <div className="bg-violet-950/10 border border-violet-500/20 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-violet-500/40 transition-colors">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-violet-300">IA Balanceadora</h4>
                  <p className="text-xs text-violet-200/80 leading-relaxed">
                    Detectamos um estouro em <strong className="text-violet-400">{balanceadoraSugestao.to}</strong>. Que tal cobrir com o saldo de <strong className="text-violet-400">{balanceadoraSugestao.from}</strong>?
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={handleApplyBalanceadora}
                className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-100 disabled:opacity-50 text-zinc-900 text-xs font-bold shrink-0 transition-colors cursor-pointer"
              >
                {busy ? 'Balanceando...' : 'Cobrir Furo'}
              </button>
            </div>
          )}

          {/* Alertas Proativos */}
          {proactiveAlerts.length > 0 && (
            <div className="bg-amber-950/10 border border-amber-500/20 rounded-2xl p-5 flex items-start gap-4 hover:border-amber-500/40 transition-colors md:col-span-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div className="space-y-2 w-full">
                <h4 className="text-sm font-semibold text-amber-300">Alertas de Velocidade de Gasto</h4>
                <ul className="space-y-1">
                  {proactiveAlerts.map((alert, idx) => (
                    <li key={idx} className="text-xs text-amber-200/85 list-disc list-inside">
                      {alert}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODO SIMPLES
      ══════════════════════════════════════════════════════════════════════ */}
      {mode === 'simples' && (
        <>
          {budgetChartData.length > 0 && (
            <section className="bg-si-card rounded-2xl border border-si-border p-6">
              <h3 className="font-semibold text-si-1 mb-2">Visão geral do mês</h3>
              <p className="text-si-5 text-sm mb-4">Gasto realizado vs limite definido por categoria.</p>
              <BudgetBarChart data={budgetChartData} />
            </section>
          )}

          <div className="bg-si-card rounded-2xl border border-si-border overflow-hidden">
            <div className="divide-y divide-white/5">
              {categorias.map(cat => {
                const gasto  = gastosByCat[cat] ?? 0;
                const limite = budgets[cat];
                const pct    = limite && limite > 0
                  ? Math.min(150, (gasto / limite) * 100)
                  : (gasto > 0 ? 100 : 0);
                const ok = !limite || pct <= 100;
                return (
                  <div key={cat} className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-medium text-si-1">{cat}</span>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-si-4">
                            {fmtBRL(gasto)}
                            {limite != null && limite > 0 && <> / {fmtBRL(limite)}</>}
                          </span>
                          <button
                            type="button"
                            onClick={() => { setEditingCat(cat); setEditValue(limite != null ? String(limite) : ''); }}
                            className="text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <Plus className="w-4 h-4" /> {limite != null ? 'Alterar' : 'Definir'}
                          </button>
                        </div>
                      </div>
                      {limite != null && limite > 0 ? (
                        <div className="h-2 rounded-full bg-si-over-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${ok ? 'bg-emerald-500' : 'bg-rose-500'}`}
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

          {/* Fluxo de planejamento */}
          <section className="bg-si-card rounded-2xl border border-si-border p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-si-1">Fluxo de planejamento</h3>
              <p className="text-si-5 text-sm">Defina renda e % para poupar — distribuímos o restante automaticamente.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-si-5 mb-1">Renda mensal (R$)</label>
                <input type="text" inputMode="decimal" value={planIncome}
                  onChange={e => setPlanIncome(e.target.value.replace(/[^0-9,.-]/, ''))}
                  placeholder={receitaMes > 0 ? fmtBRL(receitaMes) : '0,00'}
                  className="w-full px-4 py-2.5 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-si-5 mb-1">% para poupar</label>
                <input type="text" inputMode="decimal" value={planSavePct}
                  onChange={e => setPlanSavePct(e.target.value.replace(/[^0-9,.-]/, ''))}
                  className="w-full px-4 py-2.5 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500 text-sm" />
              </div>
              <div className="rounded-xl border border-si-border-md bg-si-bg px-4 py-2.5">
                <p className="text-xs text-si-5">Para distribuir</p>
                <p className="text-sm font-semibold text-si-1">{fmtBRL(valorParaGastar)}</p>
              </div>
            </div>
            <button type="button" onClick={handleDistribuir} disabled={busy || valorRendaPlanejada <= 0}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-100 disabled:opacity-50 text-zinc-900 text-sm font-bold">
              {busy ? 'Aplicando…' : 'Distribuir automaticamente'}
            </button>
          </section>

          {/* Histórico 6 meses */}
          <section className="bg-si-card rounded-2xl border border-si-border p-6">
            <h3 className="font-semibold text-si-1 mb-2">Últimos 6 meses</h3>
            <p className="text-si-5 text-sm mb-4">Gasto realizado vs orçamento total configurado.</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={ultimos6Meses.map(m => ({ mes: m.label, Gasto: +m.gasto.toFixed(2), Orçado: +m.orcado.toFixed(2) }))}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%" barGap={2}
              >
                <CartesianGrid {...CHART_GRID} vertical={false} />
                <XAxis dataKey="mes" {...CHART_AXIS} />
                <YAxis tickFormatter={fmtBRLAxis} {...CHART_AXIS} width={56} />
                <Tooltip formatter={(v: unknown) => [`R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']} contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={CHART_LEGEND_STYLE} />
                <Bar dataKey="Gasto"  fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Orçado" fill="#4F8CFF" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </section>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODO ENVELOPE (Zero-Based Budgeting)
      ══════════════════════════════════════════════════════════════════════ */}
      {mode === 'envelope' && (
        <>
          {/* KPIs de alocação */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-si-card border border-si-border rounded-2xl p-6">
              <p className="text-xs text-si-5 mb-2">Renda mensal (R$)</p>
              <input type="text" inputMode="decimal" value={rendaStr}
                onChange={e => setRendaStr(e.target.value)} onBlur={handleSaveRenda}
                className="w-full bg-si-bg border border-si-border-md rounded-xl px-3 py-2 text-si-1 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div className="bg-si-card border border-si-border rounded-2xl p-6 text-center">
              <p className="text-xs text-si-5 mb-1">Alocado</p>
              <p className="text-xl font-bold text-blue-400">{fmtBRL(totalAlocado)}</p>
              <p className="text-[11px] text-si-5 mt-0.5">
                {renda > 0 ? ((totalAlocado / renda) * 100).toFixed(0) : 0}% da renda
              </p>
            </div>
            <div className={`rounded-2xl border p-6 text-center ${zeroado ? 'bg-emerald-500/8 border-emerald-500/25' : 'bg-amber-500/8 border-amber-500/25'}`}>
              <p className="text-xs text-si-5 mb-1">{zeroado ? 'Zerado ✓' : 'Não alocado'}</p>
              <p className={`text-xl font-bold ${zeroado ? 'text-emerald-400' : 'text-amber-400'}`}>{fmtBRL(naoAlocado)}</p>
              {!zeroado && (
                <button onClick={handleAlocarTudo} disabled={busy}
                  className="mt-1 text-[11px] text-blue-400 hover:underline disabled:opacity-50">
                  Alocar tudo
                </button>
              )}
              {zeroado && (
                <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center justify-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Todo real tem destino
                </p>
              )}
            </div>
          </div>

          {/* Lista de envelopes */}
          <div className="space-y-2">
            {categorias.map(cat => {
              const alocado  = budgets[cat] ?? 0;
              const gasto    = gastosByCat[cat] ?? 0;
              const rollover = rolloverAndBalances.rollovers[currentMonthKey]?.[cat] || 0;
              const restante = rolloverAndBalances.balances[currentMonthKey]?.[cat] || 0;
              const totalDisponivel = alocado + rollover;
              const pct      = totalDisponivel > 0 ? Math.min(100, (gasto / totalDisponivel) * 100) : (gasto > 0 ? 100 : 0);
              const over     = restante < 0;
              return (
                <div key={cat} className="bg-si-card border border-si-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-si-1">{cat}</span>
                    <div className="flex items-center gap-3 flex-wrap justify-end">
                      {rollover !== 0 && (
                        <span className="text-[11px] text-si-5 bg-si-over-2 px-1.5 py-0.5 rounded border border-si-border">
                          {rollover > 0 ? `+${fmtBRL(rollover)} rollover` : `${fmtBRL(rollover)} rollover`}
                        </span>
                      )}
                      {over && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                      <span className={`text-xs font-bold ${restante < 0 ? 'text-rose-400' : restante === 0 && alocado > 0 ? 'text-amber-400' : 'text-si-3'}`}>
                        {fmtBRL(restante)} restante
                      </span>
                      <button onClick={() => setMoveModal({ from: cat, to: '', valor: '' })}
                        className="p-1 rounded hover:bg-si-over-3 text-si-5" title="Mover dinheiro">
                        <ArrowRightLeft className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="h-1.5 bg-si-over-2 rounded-full overflow-hidden mb-1.5">
                    <div
                      className={`h-full rounded-full transition-all ${over ? 'bg-rose-400' : pct >= 80 ? 'bg-amber-400' : 'bg-blue-400'}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-si-5">
                    <span>Gasto: {fmtBRL(gasto)} de {fmtBRL(totalDisponivel)} disponíveis</span>
                    <EnvelopeInput value={alocado} onSave={v => handleSaveEnvelope(cat, v)} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Nota ZBB */}
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-si-over-1 border border-si-border text-xs text-si-5">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong className="text-si-3">Zero-Based Budgeting:</strong> todo real da sua renda é alocado em um envelope antes de ser gasto.
              Quando um envelope zera, pare de gastar naquela categoria — ou mova dinheiro de outro envelope.
              Método popularizado pelo YNAB.
            </span>
          </div>

          {/* Modal mover dinheiro */}
          {moveModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
              <div className="bg-[#0d1421] border border-blue-500/30 rounded-2xl w-full max-w-sm p-6 space-y-4">
                <h3 className="font-bold text-si-1 flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-blue-400" /> Mover dinheiro
                </h3>
                <div>
                  <label className="text-xs text-si-5 mb-1 block">De: <span className="text-si-2">{moveModal.from}</span></label>
                  <label className="text-xs text-si-5 mb-1 block">Para:</label>
                  <select value={moveModal.to}
                    onChange={e => setMoveModal(m => m ? { ...m, to: e.target.value } : m)}
                    className="w-full bg-si-bg border border-si-border-md rounded-xl px-3 py-2 text-sm text-si-1">
                    <option value="">Selecione...</option>
                    {categorias.filter(c => c !== moveModal.from).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-si-5 mb-1 block">Valor (R$)</label>
                  <input type="text" inputMode="decimal" value={moveModal.valor}
                    onChange={e => setMoveModal(m => m ? { ...m, valor: e.target.value } : m)}
                    className="w-full bg-si-bg border border-si-border-md rounded-xl px-3 py-2 text-sm text-si-1" />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleMove} disabled={busy || !moveModal.to}
                    className="flex-1 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-sm disabled:opacity-50">
                    Mover
                  </button>
                  <button onClick={() => setMoveModal(null)} className="px-4 py-2.5 rounded-xl bg-si-over-2 text-si-4 text-sm">
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Modal editar limite (modo Simples) ─────────────────────────────── */}
      <Modal open={!!editingCat} onClose={() => setEditingCat(null)} title={editingCat ? `Limite: ${editingCat}` : ''}>
        {editingCat && (
          <form onSubmit={handleSaveLimit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-si-5 mb-1">Limite mensal (R$)</label>
              <input type="text" inputMode="decimal" value={editValue}
                onChange={e => setEditValue(e.target.value.replace(/[^0-9,.-]/, ''))}
                placeholder="0,00"
                className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500" />
              <p className="text-xs text-si-5 mt-1">Deixe em branco ou 0 para remover o limite.</p>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={busy}
                className="flex-1 py-3 rounded-xl bg-white hover:bg-zinc-100 disabled:opacity-50 text-zinc-900 font-bold text-sm">
                {busy ? 'Salvando…' : 'Salvar'}
              </button>
              <button type="button" onClick={() => setEditingCat(null)}
                className="px-6 py-3 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 text-sm">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
