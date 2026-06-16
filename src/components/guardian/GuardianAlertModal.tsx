/**
 * GuardianAlertModal — F0 Guardião Financeiro.
 *
 * Modal que aparece ao abrir o app quando uma regra de orçamento é disparada.
 * Framing: "Você me pediu para te guardar" — aliado, não vigilante.
 * Design: Pierre Finance (si-bg, si-card, UPPERCASE labels, Inter).
 */
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, X, TrendingDown, ArrowRight } from 'lucide-react';
import type { GuardianAlert } from '../../hooks/useGuardian';

interface Props {
  alert: GuardianAlert;
  onDismiss: () => void;
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(pct, 100);
  const color =
    pct >= 100
      ? 'bg-rose-500'
      : pct >= 90
        ? 'bg-rose-400'
        : pct >= 80
          ? 'bg-amber-400'
          : 'bg-blue-400/100';
  return (
    <div className="w-full bg-si-over-2 rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

export function GuardianAlertModal({ alert, onDismiss }: Props) {
  const navigate = useNavigate();
  const { rule, spentPct, spentAmount, budgetAmount, remaining } = alert;
  const label = rule.label || rule.category;
  const overBudget = spentAmount > budgetAmount;
  const statusColor = overBudget ? 'text-rose-400' : 'text-amber-400';
  const statusBg = overBudget ? 'bg-rose-500/10 border-rose-500/25' : 'bg-amber-500/10 border-amber-500/25';

  const message =
    rule.customMessage ||
    (overBudget
      ? `Você estourou o orçamento de ${label} este mês.`
      : `Você já usou ${spentPct}% do orçamento de ${label}.`);

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onDismiss}
      aria-modal="true"
      role="dialog"
      aria-labelledby="guardian-title"
    >
      {/* Card — clica sem propagar para fechar */}
      <div
        className="w-full max-w-sm bg-si-card border border-si-border rounded-2xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-si-border">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${statusBg}`}>
              <ShieldAlert className={`w-4 h-4 ${statusColor} shrink-0`} aria-hidden />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-si-5">
                Guardião Financeiro
              </p>
              <h2 id="guardian-title" className="font-semibold text-si-1 text-sm leading-tight">
                {label}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-si-5 hover:bg-si-over-2 transition-colors"
            aria-label="Fechar alerta"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Frase do Arquiteto */}
          <p className="text-si-4 text-xs italic leading-relaxed border-l-2 border-si-border-md pl-3">
            Você me pediu para te guardar quando <span className="text-si-2 not-italic">{label}</span>{' '}
            atingisse {rule.thresholdPct}% do orçamento.
          </p>

          {/* Mensagem principal */}
          <p className={`text-sm font-medium ${statusColor}`}>{message}</p>

          {/* Barra de progresso */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-si-5">
                Gasto vs Orçamento
              </span>
              <span className={`text-xs font-bold tabular-nums ${statusColor}`}>{spentPct}%</span>
            </div>
            <ProgressBar pct={spentPct} />
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-si-over-1 rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-si-5 mb-0.5">Gasto</p>
              <p className="text-xs font-semibold text-si-1 tabular-nums">{fmt(spentAmount)}</p>
            </div>
            <div className="bg-si-over-1 rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-si-5 mb-0.5">Limite</p>
              <p className="text-xs font-semibold text-si-1 tabular-nums">{fmt(budgetAmount)}</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${overBudget ? 'bg-rose-500/10' : 'bg-si-over-1'}`}>
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-si-5 mb-0.5">
                {overBudget ? 'Excesso' : 'Saldo'}
              </p>
              <p className={`text-xs font-semibold tabular-nums ${overBudget ? 'text-rose-400' : 'text-si-1'}`}>
                {overBudget ? fmt(spentAmount - budgetAmount) : fmt(remaining)}
              </p>
            </div>
          </div>

          {/* Dica */}
          {remaining > 0 && !overBudget && (
            <div className="flex items-start gap-2 bg-si-over-1 rounded-xl p-3">
              <TrendingDown className="w-3.5 h-3.5 text-si-5 shrink-0 mt-0.5" aria-hidden />
              <p className="text-xs text-si-4 leading-relaxed">
                Você tem <span className="text-si-2 font-medium">{fmt(remaining)}</span> restantes em{' '}
                {label} este mês.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 pt-0 flex gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-si-3 bg-si-over-2 hover:bg-si-over-3 border border-si-border transition-colors"
          >
            Entendido
          </button>
          <button
            type="button"
            onClick={() => { onDismiss(); navigate('/orcamento'); }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-si-2 bg-si-over-2 hover:bg-si-over-3 border border-si-border transition-colors"
          >
            Ver orçamento
            <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
