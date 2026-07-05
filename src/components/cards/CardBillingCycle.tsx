/**
 * CardBillingCycle.tsx
 * Componente de gestão de ciclo de fatura por cartão.
 *
 * Exibe:
 *   - Fatura atual (em aberto) com total, barra de utilização e compras do ciclo
 *   - Form de nova compra com suporte a parcelas e preview do ciclo destino
 *   - Faturas fechadas não pagas com botão "Marcar como paga"
 *   - Histórico collapsível de faturas pagas
 */
import { useState, useMemo } from 'react';
import {
  CreditCard, ChevronDown, ChevronUp, Check, Plus,
  Calendar, AlertCircle, Clock, History, Layers,
} from 'lucide-react';
import {
  getCurrentCycle,
  getPastCycles,
  sumPurchasesForCycle,
  purchasesForCycle,
  computeCardBillingState,
  expandInstallments,
  formatCycleKey,
  formatDayMonth,
  getCycleKeyForPurchaseDate,
} from '../../utils/cardCycleUtils';
import type { CardPurchaseNew } from '../../utils/cardCycleUtils';

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface CardForCycle {
  id: number;
  name: string;
  limit: number;
  closeDay: number;
  dueDay: number;
  flag?: string;
  /** Compras no novo modelo (com cycleKey) */
  purchasesV2?: CardPurchaseNew[];
  /** Ciclos marcados como pagos */
  paidCycles?: string[];
}

interface Props {
  card: CardForCycle;
  onAddPurchase: (cardId: number, purchases: CardPurchaseNew[]) => Promise<void>;
  onMarkCyclePaid: (cardId: number, cycleKey: string) => Promise<void>;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const TODAY = new Date();

const CATEGORIES = [
  'Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Educação',
  'Moradia', 'Assinaturas', 'Vestuário', 'Eletrônicos', 'Outros',
];

// ── Subcomponente: item de compra ──────────────────────────────────────────────

function PurchaseItem({ p }: { p: CardPurchaseNew }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-800/60 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-200 truncate">{p.desc}</p>
        <p className="text-xs text-zinc-500">{p.date}</p>
        {p.installment && (
          <span className="inline-flex items-center gap-1 text-xs text-indigo-400 mt-0.5">
            <Layers size={10} />
            {p.installment.current}/{p.installment.total} parcelas
          </span>
        )}
      </div>
      <span className="text-sm font-medium text-rose-400 ml-3 shrink-0">
        {fmtBRL(p.value)}
      </span>
    </div>
  );
}

// ── Subcomponente: fatura fechada não paga ─────────────────────────────────────

function UnpaidCycleCard({
  cycleKey, purchases, onPay, paying,
}: {
  cycleKey: string;
  purchases: CardPurchaseNew[];
  onPay: () => void;
  paying: boolean;
}) {
  const [open, setOpen] = useState(false);
  const total = purchases.reduce((s, p) => s + p.value, 0);

  return (
    <div className="rounded-xl bg-amber-500/8 border border-amber-500/25 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertCircle size={15} className="text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-300">{formatCycleKey(cycleKey)}</p>
            <p className="text-xs text-amber-400/70">Fatura fechada — aguardando pagamento</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-amber-300">{fmtBRL(total)}</span>
          <button
            onClick={onPay}
            disabled={paying}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white transition-colors disabled:opacity-50"
          >
            <Check size={12} /> Pagar
          </button>
          <button
            onClick={() => setOpen(v => !v)}
            className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/60 transition-colors"
          >
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="px-4 pb-3 border-t border-amber-500/15">
          {purchases.map(p => <PurchaseItem key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}

// ── Formulário de nova compra ──────────────────────────────────────────────────

interface NewPurchaseForm {
  desc: string; value: string; date: string; category: string; parcelas: string;
}

const DEFAULT_FORM: NewPurchaseForm = {
  desc: '', value: '', date: new Date().toISOString().slice(0, 10),
  category: 'Outros', parcelas: '1',
};

function NewPurchasePanel({
  card, onAdd, onClose,
}: { card: CardForCycle; onAdd: (ps: CardPurchaseNew[]) => Promise<void>; onClose: () => void; }) {
  const [form, setForm] = useState<NewPurchaseForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof NewPurchaseForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const preview = useMemo(() => {
    const val = parseFloat(form.value.replace(',', '.'));
    const n = parseInt(form.parcelas) || 1;
    if (!val || !form.date) return null;
    return {
      cycleKey: getCycleKeyForPurchaseDate(form.date, card.closeDay, card.dueDay),
      monthlyValue: Math.round((val / n) * 100) / 100,
    };
  }, [form.value, form.date, form.parcelas, card.closeDay, card.dueDay]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const val = parseFloat(form.value.replace(',', '.'));
    const n = parseInt(form.parcelas) || 1;
    if (!form.desc.trim()) return setError('Informe a descrição.');
    if (!val || val <= 0) return setError('Valor inválido.');
    if (!form.date) return setError('Informe a data.');

    setSaving(true);
    try {
      const baseId = `${card.id}_${Date.now()}`;
      const purchases: CardPurchaseNew[] = n === 1
        ? [{
            id: baseId,
            desc: form.desc.trim(),
            value: val,
            date: form.date,
            category: form.category,
            cycleKey: getCycleKeyForPurchaseDate(form.date, card.closeDay, card.dueDay),
          }]
        : expandInstallments(
            form.desc.trim(), val, n, form.date, card.closeDay, card.dueDay, baseId,
          ).map(p => ({ ...p, category: form.category }));

      await onAdd(purchases);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-3 border-t border-zinc-700/50">
      <p className="text-sm font-medium text-zinc-300">Nova compra</p>
      <div className="grid grid-cols-2 gap-2">
        <input placeholder="Descrição" value={form.desc}
          onChange={e => set('desc', e.target.value)}
          className="col-span-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 px-3 py-2 text-sm focus:outline-none focus:border-si-border-lg" />
        <input type="number" min="0.01" step="0.01" placeholder="Valor (R$)" value={form.value}
          onChange={e => set('value', e.target.value)}
          className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 px-3 py-2 text-sm focus:outline-none focus:border-si-border-lg" />
        <input type="date" value={form.date}
          onChange={e => set('date', e.target.value)}
          className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 px-3 py-2 text-sm focus:outline-none focus:border-si-border-lg" />
        <select value={form.category} onChange={e => set('category', e.target.value)}
          className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 px-3 py-2 text-sm focus:outline-none focus:border-si-border-lg">
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-400 shrink-0">Parcelas:</label>
          <input type="number" min="1" max="48" value={form.parcelas}
            onChange={e => set('parcelas', e.target.value)}
            className="w-full rounded-lg bg-zinc-800/60 border border-zinc-700/50 px-3 py-2 text-sm focus:outline-none focus:border-si-border-lg" />
        </div>
      </div>
      {preview && (
        <div className="rounded-lg bg-indigo-500/8 border border-indigo-500/20 px-3 py-2 text-xs text-indigo-300 flex items-center gap-2">
          <Calendar size={12} className="shrink-0" />
          Ciclo <strong className="ml-1">{formatCycleKey(preview.cycleKey)}</strong>
          {parseInt(form.parcelas) > 1 && (
            <span className="ml-2 text-indigo-400/70">
              · {form.parcelas}x de {fmtBRL(preview.monthlyValue)}
            </span>
          )}
        </div>
      )}
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving}
          className="flex-1 py-2 rounded-lg bg-white hover:bg-zinc-100 text-sm font-medium transition-colors disabled:opacity-50">
          {saving ? 'Salvando…' : 'Adicionar'}
        </button>
        <button type="button" onClick={onClose}
          className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function CardBillingCycle({ card, onAddPurchase, onMarkCyclePaid }: Props) {
  const [showHistory, setShowHistory] = useState(false);
  const [showNewPurchase, setShowNewPurchase] = useState(false);
  const [payingCycle, setPayingCycle] = useState<string | null>(null);

  const purchases  = card.purchasesV2 ?? [];
  const paidCycles = card.paidCycles ?? [];
  const closeDay   = card.closeDay ?? 1;
  const dueDay     = card.dueDay ?? 10;

  const currentCycle = useMemo(() => getCurrentCycle(closeDay, dueDay, TODAY), [closeDay, dueDay]);
  const pastCycles   = useMemo(() => getPastCycles(closeDay, dueDay, 12, TODAY), [closeDay, dueDay]);
  const billingState = useMemo(
    () => computeCardBillingState(purchases, paidCycles, closeDay, dueDay, TODAY),
    [purchases, paidCycles, closeDay, dueDay],
  );

  const currentPurchases = purchasesForCycle(purchases, currentCycle.key);
  const currentTotal     = sumPurchasesForCycle(purchases, currentCycle.key);
  const utilization      = card.limit > 0 ? Math.round((currentTotal / card.limit) * 100) : 0;

  async function handlePay(cycleKey: string) {
    setPayingCycle(cycleKey);
    try { await onMarkCyclePaid(card.id, cycleKey); }
    finally { setPayingCycle(null); }
  }

  const paidHistory = pastCycles.filter(c => paidCycles.includes(c.key));

  return (
    <div className="space-y-3">

      {/* ── Fatura atual ── */}
      <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-indigo-400" />
            <div>
              <p className="text-sm font-medium text-zinc-100">{card.name}</p>
              <p className="text-xs text-zinc-500">
                Fecha {formatDayMonth(currentCycle.closeDate)} · Vence {formatDayMonth(currentCycle.dueDate)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-base font-semibold text-zinc-100">{fmtBRL(currentTotal)}</p>
            <p className="text-xs text-zinc-500">{utilization}% do limite</p>
          </div>
        </div>

        {/* Barra de utilização */}
        <div className="w-full h-1.5 rounded-full bg-zinc-700/60 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              utilization > 80 ? 'bg-rose-500' : utilization > 50 ? 'bg-amber-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${Math.min(utilization, 100)}%` }}
          />
        </div>

        {/* Compras do ciclo atual */}
        {currentPurchases.length > 0 ? (
          <div>
            {currentPurchases.slice(0, 5).map(p => <PurchaseItem key={p.id} p={p} />)}
            {currentPurchases.length > 5 && (
              <p className="text-xs text-zinc-500 pt-1">+{currentPurchases.length - 5} compras</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 text-center py-2">Nenhuma compra neste ciclo.</p>
        )}

        {/* Nova compra */}
        {showNewPurchase ? (
          <NewPurchasePanel
            card={card}
            onAdd={ps => onAddPurchase(card.id, ps)}
            onClose={() => setShowNewPurchase(false)}
          />
        ) : (
          <button
            onClick={() => setShowNewPurchase(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-zinc-600/50 hover:border-indigo-500/40 hover:bg-indigo-500/5 text-xs text-zinc-400 hover:text-indigo-400 transition-all"
          >
            <Plus size={13} /> Adicionar compra
          </button>
        )}
      </div>

      {/* ── Faturas não pagas ── */}
      {billingState.unpaidCycles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-amber-400/80 flex items-center gap-1.5">
            <Clock size={12} />
            {billingState.unpaidCycles.length} fatura(s) aguardando pagamento
          </p>
          {billingState.unpaidCycles.map(key => (
            <UnpaidCycleCard
              key={key}
              cycleKey={key}
              purchases={purchasesForCycle(purchases, key)}
              onPay={() => handlePay(key)}
              paying={payingCycle === key}
            />
          ))}
        </div>
      )}

      {/* ── Histórico de faturas pagas ── */}
      {paidHistory.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(v => !v)}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            <History size={12} />
            Histórico ({paidHistory.length} fatura{paidHistory.length > 1 ? 's' : ''} paga{paidHistory.length > 1 ? 's' : ''})
            {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {showHistory && (
            <div className="mt-2 space-y-1.5">
              {paidHistory.map(c => (
                <div key={c.key} className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/30 border border-zinc-700/30">
                  <div className="flex items-center gap-2">
                    <Check size={12} className="text-emerald-500" />
                    <span className="text-xs text-zinc-400">{formatCycleKey(c.key)}</span>
                  </div>
                  <span className="text-xs text-zinc-400">
                    {fmtBRL(sumPurchasesForCycle(purchases, c.key))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
