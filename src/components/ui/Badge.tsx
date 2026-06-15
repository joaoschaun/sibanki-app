import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

/**
 * Badge / Pill — rótulo compacto.
 * `tone` cobre o uso neutro (default) e os estados semânticos financeiros.
 * Para Sv/Ld use as classes de `constants/sovereigntyScale` via `tone="custom"`.
 */
export type BadgeTone = 'neutral' | 'positive' | 'warning' | 'negative' | 'info' | 'custom';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-si-over-2 text-si-3 border-si-border',
  positive: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  negative: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  info: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  custom: '',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  icon?: ReactNode;
  /** label em ALL CAPS com tracking (padrão Pierre) */
  caps?: boolean;
}

export function Badge({ tone = 'neutral', icon, caps = false, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border',
        caps && 'tracking-[0.18em] uppercase',
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </span>
  );
}
