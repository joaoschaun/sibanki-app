import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import type { SpreadGapResult } from '../../utils/sovereigntyEngine';

interface WidgetAlertaCriticoProps {
  spread: SpreadGapResult;
  monthlyBalance: number;
}

export function WidgetAlertaCritico({ spread, monthlyBalance }: WidgetAlertaCriticoProps) {
  const isNegativeBalance = monthlyBalance < 0;
  const hasLeakage = spread.monthlyLeakage > 0;

  if (!isNegativeBalance && !hasLeakage) return null;

  return (
    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/05 p-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0 border border-rose-500/25">
          <AlertTriangle className="w-5 h-5 text-rose-400" />
        </div>
        <div className="space-y-1.5 flex-1 min-w-0">
          <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em]">
            ALERTA CRÍTICO DE RISCO FINANCEIRO
          </p>
          <h4 className="text-sm font-bold text-si-1">
            {isNegativeBalance && hasLeakage
              ? 'Saldo negativo e vazamento de capital detectados'
              : isNegativeBalance
                ? 'Seu saldo mensal está negativo'
                : 'Seu Spread Gap está vazando capital'}
          </h4>
          <p className="text-xs text-si-4 leading-relaxed max-w-2xl">
            {isNegativeBalance && (
              <span>
                Suas despesas superaram suas receitas neste mês em{' '}
                <strong className="text-rose-400 font-bold">
                  R$ {Math.abs(monthlyBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </strong>
                . Isso pressiona sua liquidez e reduz seus Dias de Liberdade (Ld).{' '}
              </span>
            )}
            {hasLeakage && (
              <span>
                Você está perdendo cerca de{' '}
                <strong className="text-rose-400 font-bold">
                  R$ {spread.monthlyLeakage.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                </strong>{' '}
                devido à ineficiência de spread (suas dívidas custam mais do que seus investimentos rendem).
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <Link
          to="/consultor-ia"
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-[11px] uppercase tracking-wider text-center transition-colors flex items-center justify-center gap-2"
        >
          <span>Iniciar Plano de Sobrevivência</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <Link
          to="/credito/visao-geral"
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-si-over-1 hover:bg-si-over-2 border border-si-border text-si-3 hover:text-si-2 font-bold text-[11px] uppercase tracking-wider text-center transition-colors"
        >
          Consolidar Dívidas
        </Link>
      </div>
    </div>
  );
}
