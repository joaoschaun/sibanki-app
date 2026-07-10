/**
 * HorizonBriefing — a fala de cuidado na entrada do Consultor IA.
 *
 * Renderiza a "unica coisa que importa agora" (rubric §8.2) derivada do motor de
 * antecipacao (`anticipationEngine`), obedecendo ao Contrato de "quando falar" (§9):
 *  - Lidera pela calma; o card de risco e a excecao, nao a regra.
 *  - Uma decisao por vez; enquadramento de PRESERVACAO ("preserva X dias"), nao de perda.
 *  - Dia calmo (item = null) e tratado como CONQUISTA, nunca como tela vazia (§9.2).
 *
 * Componente PURAMENTE apresentacional — a decisao (silence/plan/act/urgent) e o
 * ranking ja vem resolvidos do motor.
 */
import { AlertTriangle, ArrowRight, CircleCheck } from 'lucide-react';
import type { HorizonItem } from '../../utils/anticipationEngine';

interface ToneSpec {
  label: string;
  accent: string; // cor do rotulo/icone — cor SO para estado (§8.4)
  border: string;
}

// Cor apenas para estado: rose no risco iminente; neutro no planejamento calmo.
const TONE: Record<Exclude<HorizonItem['decision'], 'silence'>, ToneSpec> = {
  urgent: { label: 'Precisa de decisao · hoje', accent: 'text-rose-400', border: 'border-rose-500/28' },
  act:    { label: 'Decida esta semana',        accent: 'text-si-2',    border: 'border-si-border-md' },
  plan:   { label: 'No radar · da tempo',       accent: 'text-si-3',    border: 'border-si-border' },
};

export function HorizonBriefing({
  item,
  onAsk,
  onSnooze,
}: {
  item: HorizonItem | null;
  onAsk: (item: HorizonItem) => void;
  onSnooze: (item: HorizonItem) => void;
}) {
  // Dia calmo — o melhor resultado. Desenhado como tranquilizacao, nao ausencia.
  if (!item || item.decision === 'silence') {
    return (
      <p className="text-si-4 text-[15px] mb-9 max-w-md leading-relaxed">
        Passei seu dinheiro a limpo. Esta tudo tranquilo por aqui — nada precisa de voce agora.
        Como posso ajudar?
      </p>
    );
  }

  const tone = TONE[item.decision];

  return (
    <div className="w-full max-w-md mb-9 space-y-3 text-left">
      {/* Lidera pela seguranca: a fala de cuidado vem primeiro (§9.2). */}
      <p className="text-si-4 text-[15px] leading-relaxed">
        Passei seu dinheiro a limpo. No geral, tranquilo — mas{' '}
        <span className="text-si-1 font-semibold">uma coisa vale sua atencao.</span>
      </p>

      {/* A unica decisao (§8.2). */}
      <div className={`bg-si-card rounded-2xl border ${tone.border} p-4`}>
        <div className="flex items-center gap-2 mb-2">
          {item.decision === 'urgent'
            ? <AlertTriangle className={`w-4 h-4 shrink-0 ${tone.accent}`} aria-hidden />
            : <CircleCheck className={`w-4 h-4 shrink-0 ${tone.accent}`} aria-hidden />}
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

        <div className="flex gap-2 mt-3.5">
          <button
            type="button"
            onClick={() => onAsk(item)}
            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-zinc-900 bg-white hover:bg-zinc-100 rounded-xl px-3.5 py-2 transition-colors"
          >
            Montar plano <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onSnooze(item)}
            className="text-[12px] font-semibold text-si-4 hover:text-si-2 bg-transparent border border-si-border hover:border-si-border-md rounded-xl px-3.5 py-2 transition-colors"
          >
            Depois
          </button>
        </div>
      </div>
    </div>
  );
}
