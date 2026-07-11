import { AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import type { HorizonItem } from '../../utils/anticipationEngine';
import { Card } from './Card';

interface RadarCardProps {
  item: HorizonItem | null;
  onMontarPlano: (item: HorizonItem) => void;
  onSnooze: (item: HorizonItem) => void;
}

const TONE = {
  urgent: { label: 'Precisa de decisão · hoje', accent: 'text-rose-400', border: 'border-rose-500/28' },
  act:    { label: 'Decida esta semana',        accent: 'text-si-2',    border: 'border-si-border-md' },
  plan:   { label: 'No radar · dá tempo',       accent: 'text-si-3',    border: 'border-si-border' },
};

export function RadarCard({ item, onMontarPlano, onSnooze }: RadarCardProps) {
  if (!item || item.decision === 'silence') {
    return (
      <Card surface="raised" className="w-full flex items-center justify-center p-3 text-center border-si-border">
        <span className="text-si-4 text-xs font-medium tracking-wide flex items-center justify-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          Tudo sob controle esta semana · nada precisa de você agora
        </span>
      </Card>
    );
  }

  const tone = TONE[item.decision] || TONE.plan;

  return (
    <Card
      surface="raised"
      glow={item.decision === 'urgent' ? 'neutral' : 'none'}
      className={`w-full p-5 border ${tone.border} relative overflow-hidden`}
    >
      <div className="flex items-center gap-2 mb-2">
        {item.decision === 'urgent' ? (
          <AlertTriangle className={`w-4 h-4 shrink-0 ${tone.accent}`} />
        ) : (
          <CheckCircle2 className={`w-4 h-4 shrink-0 ${tone.accent}`} />
        )}
        <span className={`text-[10px] font-bold tracking-[0.16em] uppercase ${tone.accent}`}>
          {tone.label}
        </span>
      </div>

      <p className="text-[15px] font-semibold text-si-1 leading-snug">
        {item.label} {item.daysUntilDue === 0 ? 'vence hoje' : `vence em ${item.daysUntilDue} ${item.daysUntilDue === 1 ? 'dia' : 'dias'}`}.
      </p>

      {item.reason && (
        <p className="text-[13px] text-si-4 mt-1 leading-relaxed">{item.reason}</p>
      )}

      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={() => onMontarPlano(item)}
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-zinc-900 bg-white hover:bg-zinc-100 rounded-xl px-3.5 py-2 transition-colors duration-300"
        >
          Montar plano <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onSnooze(item)}
          className="text-[12px] font-semibold text-si-4 hover:text-si-2 bg-transparent border border-si-border hover:border-si-border-md rounded-xl px-3.5 py-2 transition-colors duration-300"
        >
          Depois
        </button>
      </div>
    </Card>
  );
}
