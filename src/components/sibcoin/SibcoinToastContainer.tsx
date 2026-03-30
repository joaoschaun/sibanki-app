/**
 * SibcoinToastContainer
 *
 * Renders mission-completion toasts in the bottom-right corner.
 * Mount once in App.tsx (inside AuthenticatedShell, after Suspense).
 */

import { useState, useEffect } from 'react';
import { Coins, X } from 'lucide-react';
import { subscribeToSibcoinToasts, getSibcoinToasts } from '../../hooks/useSibcoinToast';

const KEYFRAMES = `
@keyframes sibcoinSlideIn {
  from { opacity: 0; transform: translateX(110%); }
  to   { opacity: 1; transform: translateX(0); }
}
`;

type Toast = { id: string; title: string; reward: number; ts: number };

export function SibcoinToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>(getSibcoinToasts);

  useEffect(() => {
    const unsub = subscribeToSibcoinToasts(setToasts);
    return () => { unsub(); };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none"
        aria-live="polite"
        aria-label="SibCoin notifications"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-3 bg-[#0f1a2b] border border-amber-500/30 shadow-xl shadow-black/40 rounded-2xl px-4 py-3 min-w-[260px] max-w-[320px]"
            style={{ animation: 'sibcoinSlideIn 0.3s ease-out' }}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-amber-400 font-bold uppercase tracking-wide">Missão completa!</p>
              <p className="text-sm text-si-1 font-medium truncate">{t.title}</p>
              <p className="text-xs text-amber-300 font-bold mt-0.5">+{t.reward.toLocaleString('pt-BR')} SC</p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-si-5 hover:text-si-3 transition-colors shrink-0"
              aria-label="Fechar notificação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
