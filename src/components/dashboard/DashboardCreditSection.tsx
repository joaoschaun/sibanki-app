/**
 * DashboardCreditSection — Macro de crédito extraída do Dashboard.tsx.
 *
 * Exibe limite total, uso estimado, faturas próximas e compromisso mensal.
 * P2: reduzido de 3 CTAs para 1 primário + 1 link texto.
 */

import { useMemo } from 'react';
import { CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buttonClasses } from '../ui/Button';
import { useAppContext } from '../../context/AppContext';
import { useDashboardMode } from '../../hooks/useDashboardMode';

export function DashboardCreditSection() {
  const { financialProfile } = useAppContext();
  const { mode: dashboardMode } = useDashboardMode();

  const credit = financialProfile.credit;
  const show = credit.activeCards > 0 || credit.monthlyDebtCommitment > 0;

  const cardClass = dashboardMode === 'caixa'
    ? 'bg-si-bg border border-blue-500/25 rounded-xl p-5 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.12)]'
    : 'bg-si-card border border-si-border rounded-2xl p-6';

  const creditTone = useMemo(() => {
    switch (credit.pressureLevel) {
      case 'critico':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'elevado':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'atencao':
        return 'text-blue-300 bg-blue-500/10 border-blue-500/20';
      default:
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    }
  }, [credit.pressureLevel]);

  if (!show) return null;

  return (
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
          {credit.pressureLevel}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={cardClass}>
          <p className="text-si-5 text-sm">Limite total</p>
          <p className="text-2xl font-bold text-blue-400">
            R$ {credit.totalCardLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-si-5 mt-1">{credit.activeCards} cartão(ões) ativos</p>
        </div>
        <div className={cardClass}>
          <p className="text-si-5 text-sm">Uso estimado</p>
          <p className="text-2xl font-bold text-si-1">
            {credit.cardUtilizationPct.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}%
          </p>
          <p className="text-xs text-si-5 mt-1">
            R$ {credit.estimatedCardUsage.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} na fatura atual
          </p>
        </div>
        <div className={cardClass}>
          <p className="text-si-5 text-sm">Faturas em 7 dias</p>
          <p className="text-2xl font-bold text-amber-400">
            R$ {credit.dueSoonAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-si-5 mt-1">{credit.dueSoonCount} vencimento(s) próximo(s)</p>
        </div>
        <div className={cardClass}>
          <p className="text-si-5 text-sm">Compromisso mensal</p>
          <p className="text-2xl font-bold text-si-1">
            R$ {credit.monthlyDebtCommitment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-si-5 mt-1">
            Disponível: R$ {credit.availableLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* P2: Golden Path — 1 CTA primário + 1 link texto */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          to="/cartoes"
          className={buttonClasses('secondary', 'md', 'w-full sm:w-auto')}
        >
          Revisar cartões
        </Link>
        <Link
          to="/solucoes/credito"
          className="text-xs font-bold text-si-4 hover:text-si-2 uppercase tracking-wider underline underline-offset-4 decoration-si-border hover:decoration-si-4 transition-colors"
        >
          Ver soluções de crédito
        </Link>
      </div>
    </section>
  );
}
