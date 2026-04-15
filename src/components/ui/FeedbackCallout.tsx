import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';

/** Botão + modal de feedback (mesmo fluxo do menu do cabeçalho). */
export function FeedbackCallout() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] uppercase rounded-lg border border-si-border bg-si-over-2 px-3 py-1.5 text-si-3 hover:bg-si-over-3 hover:text-si-1 shrink-0"
      >
        <MessageSquare className="w-3.5 h-3.5" aria-hidden />
        Feedback ou problema
      </button>
      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
