/**
 * SibcoinMissionBanner
 *
 * Shows a subtle banner on pages where the user can earn SibCoin,
 * highlighting the first pending mission relevant to that page.
 *
 * Usage:
 *   <SibcoinMissionBanner eventType="entry_added" />
 */

import { Link } from 'react-router-dom';
import { Coins, ChevronRight } from 'lucide-react';
import { useSibcoin } from '../../hooks/useSibcoin';
import type { SibcoinEventType } from '../../hooks/useSibcoin';

interface Props {
  eventType: SibcoinEventType;
  className?: string;
}

export function SibcoinMissionBanner({ eventType, className = '' }: Props) {
  const { missions, balance, tier } = useSibcoin();

  // Find first active, non-completed mission that matches this event
  const mission = missions.find(
    (m) => (m as any).requiredEvent === eventType && !m.completed && m.active
  );

  if (!mission) return null;

  const progress = (mission as any).progress as number | undefined;
  const target   = (mission as any).target   as number | undefined;
  const hasProg  = typeof progress === 'number' && typeof target === 'number';

  const TIER_GLOW: Record<string, string> = {
    bronze:  'from-amber-600/10',
    silver:  'from-slate-500/10',
    gold:    'from-yellow-500/10',
    diamond: 'from-cyan-500/10',
  };

  return (
    <div
      className={`bg-gradient-to-r ${TIER_GLOW[tier] ?? 'from-amber-600/10'} to-transparent border border-amber-500/15 rounded-xl px-4 py-3 flex items-center gap-3 ${className}`}
    >
      <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
        <Coins className="w-4 h-4 text-amber-400" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-300 truncate">
          Missão: <span className="text-amber-400 font-bold">{mission.title}</span>
        </p>
        {hasProg ? (
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex-1 h-1 bg-amber-900/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all"
                style={{ width: `${Math.min(100, (progress! / target!) * 100)}%` }}
              />
            </div>
            <span className="text-[11px] text-amber-500 tabular-nums shrink-0">
              {progress}/{target}
            </span>
          </div>
        ) : (
          <p className="text-xs text-amber-500/70 mt-0.5">{mission.description}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-bold text-amber-400">+{mission.reward} SC</span>
        <Link
          to="/sibcoin"
          className="text-amber-500/60 hover:text-amber-400 transition-colors"
          aria-label="Ver missões SibCoin"
        >
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Show current balance hint if near a tier milestone */}
      {balance > 0 && (
        <span className="hidden sm:flex items-center gap-1 text-[11px] text-amber-600 shrink-0 border-l border-amber-500/10 pl-3">
          <Coins className="w-3 h-3" />{balance.toLocaleString('pt-BR')} SC
        </span>
      )}
    </div>
  );
}
