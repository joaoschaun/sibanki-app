import { useState } from 'react';

interface SovereigntyBadgeProps {
  score: number;
  daysLost: number;
  opportunityCost10y: number;
  compact?: boolean;
}

const TIERS = [
  { min: 80, label: 'Soberano',      bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  { min: 50, label: 'Consciente',    bg: 'bg-blue-500/15',    text: 'text-blue-300',    border: 'border-blue-500/30' },
  { min: 25, label: 'Atenção',       bg: 'bg-amber-500/15',   text: 'text-amber-300',   border: 'border-amber-500/30' },
  { min: 0,  label: 'Auto-sabotagem',bg: 'bg-rose-500/15',    text: 'text-rose-300',    border: 'border-rose-500/30' },
] as const;

function getTier(score: number) {
  return TIERS.find((t) => score >= t.min) ?? TIERS[TIERS.length - 1];
}

const fmtBRL = (v: number) =>
  'R$ ' + Math.round(v).toLocaleString('pt-BR');

export function SovereigntyBadge({
  score,
  daysLost,
  opportunityCost10y,
  compact = false,
}: SovereigntyBadgeProps) {
  const [open, setOpen] = useState(false);
  const tier = getTier(score);

  if (compact) {
    // Versão pill pequena (usada inline no extrato)
    return (
      <div className="relative inline-block">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-bold border transition-colors ${tier.bg} ${tier.text} ${tier.border} hover:opacity-80`}
          title={`Sv ${score} — ${tier.label}`}
        >
          <span className="opacity-60">Sv</span>
          <span>{score}</span>
        </button>

        {open && (
          <div
            className="absolute right-0 top-full mt-1 z-50 w-52 rounded-xl border border-si-border bg-si-card shadow-xl p-3 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Score bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className={`font-bold ${tier.text}`}>Sv {score} — {tier.label}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-si-over-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    score >= 80 ? 'bg-emerald-400' :
                    score >= 50 ? 'bg-blue-400' :
                    score >= 25 ? 'bg-amber-400' : 'bg-rose-400'
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>

            {/* Métricas */}
            {daysLost > 0 && (
              <p className="text-xs text-si-4">
                ⏱ <span className="font-semibold text-si-2">{daysLost} dia{daysLost !== 1 ? 's' : ''}</span> de liberdade perdidos
              </p>
            )}
            {opportunityCost10y > 0 && (
              <p className="text-xs text-si-4">
                📈 <span className="font-semibold text-si-2">{fmtBRL(opportunityCost10y)}</span> em 10 anos (8%/a)
              </p>
            )}

            {/* Escala de referência */}
            <div className="pt-1 border-t border-si-border text-[11px] text-si-5 space-y-0.5">
              <div className="flex justify-between"><span className="text-emerald-400">80–100</span><span>Soberano</span></div>
              <div className="flex justify-between"><span className="text-blue-400">50–79</span><span>Consciente</span></div>
              <div className="flex justify-between"><span className="text-amber-400">25–49</span><span>Atenção</span></div>
              <div className="flex justify-between"><span className="text-rose-400">0–24</span><span>Auto-sabotagem</span></div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full text-[11px] text-si-5 hover:text-si-3 mt-1"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    );
  }

  // Versão full (card standalone)
  return (
    <div className={`inline-flex flex-col gap-1 px-3 py-2 rounded-xl border ${tier.bg} ${tier.border}`}>
      <div className="flex items-center gap-2">
        <span className={`text-lg font-black ${tier.text}`}>Sv {score}</span>
        <span className={`text-xs font-bold ${tier.text} opacity-80`}>{tier.label}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-black/20 overflow-hidden">
        <div
          className={`h-full rounded-full ${
            score >= 80 ? 'bg-emerald-400' :
            score >= 50 ? 'bg-blue-400' :
            score >= 25 ? 'bg-amber-400' : 'bg-rose-400'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
      {daysLost > 0 && (
        <p className="text-[11px] text-si-5">−{daysLost}d liberdade · {fmtBRL(opportunityCost10y)} em 10a</p>
      )}
    </div>
  );
}
