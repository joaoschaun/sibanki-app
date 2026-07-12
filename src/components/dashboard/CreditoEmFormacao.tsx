import { Link } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useIntelligence } from '../../context/IntelligenceContext';
import { Card } from '../ui/Card';
import { CreditCard, ArrowUpRight } from 'lucide-react';
import { reaisToFreedomDays } from '../../utils/anticipationEngine';
import { cn } from '../../utils/cn';

export function CreditoEmFormacao() {
  const { financialProfile } = useAppContext();
  const { freedom } = useIntelligence();

  const credit = financialProfile?.credit;
  const hasCards = credit && credit.activeCards > 0;
  
  const dailyBurnRate = freedom?.dailyBurnRate ?? 0;
  const usage = credit?.estimatedCardUsage ?? 0;
  const freedomDaysEquiv = reaisToFreedomDays(usage, dailyBurnRate);

  const getPressureTone = (level: string) => {
    switch (level) {
      case 'critico':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'elevado':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'atencao':
        return 'text-blue-300 bg-blue-500/10 border-blue-500/20';
      default:
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  const getPressureColor = (level: string) => {
    switch (level) {
      case 'critico': return '#f43f5e'; // rose-500
      case 'elevado': return '#f59e0b'; // amber-500
      case 'atencao': return '#3b82f6'; // blue-500
      default: return '#10b981'; // emerald-500
    }
  };

  return (
    <Card surface="raised" className="w-full p-5 border border-si-border flex flex-col justify-between h-full">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-si-4" />
            <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-si-4">
              Crédito em formação
            </span>
          </div>
          {hasCards && (
            <span className={cn(
              "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border",
              getPressureTone(credit.pressureLevel)
            )}>
              {credit.pressureLevel}
            </span>
          )}
        </div>

        {/* Content */}
        {!hasCards ? (
          <div className="py-4">
            <p className="text-sm font-bold text-si-2">Nenhum cartão ativo</p>
            <p className="text-xs text-si-4 mt-1 leading-relaxed">
              Mantenha suas contas sob controle e use o crédito com sabedoria quando necessário.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <span className="text-[9px] text-si-4 uppercase tracking-wider block mb-0.5">fatura consolidada</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-si-1">
                  R$ {usage.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                {freedomDaysEquiv > 0 && (
                  <span className="text-xs text-rose-400 font-semibold">
                    ≈ {freedomDaysEquiv} {freedomDaysEquiv === 1 ? 'dia' : 'dias'} de liberdade
                  </span>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-si-3">
                <span>Limite Utilizado</span>
                <span className="font-bold">{credit.cardUtilizationPct.toFixed(1)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-si-over-2 border border-si-border overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(credit.cardUtilizationPct, 100)}%`,
                    backgroundColor: getPressureColor(credit.pressureLevel)
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[9px] text-si-4">
                <span>Disponível: R$ {credit.availableLimit.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                <span>Total: R$ {credit.totalCardLimit.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-si-border/30 pt-3 mt-4 flex items-center justify-between">
        <Link
          to="/cartoes"
          className="text-[10px] font-bold text-si-3 hover:text-si-1 flex items-center gap-1 group transition-colors"
        >
          Revisar cartões
          <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>
    </Card>
  );
}
