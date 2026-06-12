/**
 * SibcoinMissionBanner
 *
 * Chip discreto de missão SibCoin — não compete com o conteúdo da página.
 * (Era um banner âmbar full-width; reduzido na varredura visual S1 de 12/06/2026.)
 *
 * Usage:
 *   <SibcoinMissionBanner eventType="entry_added" />
 */

import { Link } from 'react-router-dom';
import { Coins } from 'lucide-react';
import { useSibcoin } from '../../hooks/useSibcoin';
import type { SibcoinEventType } from '../../hooks/useSibcoin';

interface Props {
  eventType: SibcoinEventType;
  className?: string;
}

export function SibcoinMissionBanner({ eventType, className = '' }: Props) {
  const { missions } = useSibcoin();

  // Primeira missão ativa e não concluída relevante para esta página
  const mission = missions.find(
    (m) => (m as any).requiredEvent === eventType && !m.completed && m.active
  );

  if (!mission) return null;

  const progress = (mission as any).progress as number | undefined;
  const target   = (mission as any).target   as number | undefined;
  const hasProg  = typeof progress === 'number' && typeof target === 'number';

  return (
    <div className={`flex justify-end ${className}`}>
      <Link
        to="/sibcoin"
        aria-label={`Missão: ${mission.title} — ver missões SibCoin`}
        className="inline-flex items-center gap-2 rounded-full border border-si-border bg-si-over-1 px-3 py-1.5 text-[12px] text-si-4 hover:text-si-2 hover:bg-si-over-2 hover:border-si-border-md transition-colors max-w-full"
      >
        <Coins className="w-3.5 h-3.5 text-amber-400/80 shrink-0" aria-hidden />
        <span className="truncate">{mission.title}</span>
        {hasProg && (
          <span className="tabular-nums text-si-5 shrink-0">{progress}/{target}</span>
        )}
        <span className="font-bold text-amber-400/90 shrink-0">+{mission.reward} SC</span>
      </Link>
    </div>
  );
}
