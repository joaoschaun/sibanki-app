/**
 * useSibcoinToast
 *
 * Wraps useSibcoin's triggerEvent and fires a transient toast notification
 * whenever the call returns a completed mission.
 *
 * Usage:
 *   const { triggerWithToast } = useSibcoinToast();
 *   await addEntry(...);
 *   triggerWithToast('entry_added').catch(() => {});
 *
 * The hook manages its own toast queue; render <SibcoinToastContainer />
 * once (e.g. in App.tsx or Dashboard) to show the toasts.
 */

import { useCallback } from 'react';
import { useSibcoin } from './useSibcoin';
import type { SibcoinEventType } from './useSibcoin';

// ── Singleton toast store (module-level so it persists across renders) ────────
type ToastEntry = { id: string; title: string; reward: number; ts: number };
type Listener = (toasts: ToastEntry[]) => void;

let _toasts: ToastEntry[] = [];
const _listeners = new Set<Listener>();

function notify() {
  _listeners.forEach((fn) => fn([..._toasts]));
}

export function subscribeToSibcoinToasts(fn: Listener) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export function addSibcoinToast(entry: Omit<ToastEntry, 'ts'>) {
  const toast: ToastEntry = { ...entry, ts: Date.now() };
  _toasts = [..._toasts, toast];
  notify();
  // Auto-remove after 4 s
  setTimeout(() => {
    _toasts = _toasts.filter((t) => t.id !== toast.id);
    notify();
  }, 4000);
}

export function getSibcoinToasts(): ToastEntry[] {
  return _toasts;
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useSibcoinToast() {
  const { triggerEvent } = useSibcoin();

  /**
   * Call after a Firestore save succeeds.
   * Fire-and-forget: never blocks UX; errors silently swallowed.
   */
  const triggerWithToast = useCallback(
    (eventType: SibcoinEventType, meta?: Record<string, unknown>) => {
      return triggerEvent(eventType, meta)
        .then((result: any) => {
          // rewardEngine returns { ok, missionCompleted, missionTitle, reward }
          if (result?.data?.missionCompleted) {
            addSibcoinToast({
              id: `${eventType}-${Date.now()}`,
              title: result.data.missionTitle ?? 'Missão concluída!',
              reward: result.data.reward ?? 0,
            });
          }
        })
        .catch(() => {
          // intentionally silent — SibCoin is non-critical
        });
    },
    [triggerEvent]
  );

  return { triggerWithToast };
}
