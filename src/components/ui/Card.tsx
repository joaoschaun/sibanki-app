import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

/**
 * Card — superfície padrão do design system.
 * Substitui o `bg-si-card rounded-2xl border border-si-border` reescrito à mão
 * em dezenas de telas.
 */
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

const PADDING: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
  /** realça a borda (hover/destaque) */
  interactive?: boolean;
  surface?: 'flat' | 'raised';
  glow?: 'none' | 'positive' | 'neutral';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    padding = 'md',
    interactive = false,
    surface = 'flat',
    glow = 'none',
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        surface === 'raised' ? 'si-surface si-elev' : 'bg-si-card',
        'rounded-2xl border border-si-border',
        interactive && 'transition-colors hover:border-si-border-md',
        glow === 'positive' && 'si-glow-positive',
        glow === 'neutral' && 'si-glow',
        PADDING[padding],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});

/** Cabeçalho opcional com label ALL CAPS padronizado. */
export function CardHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase text-si-4">{title}</h3>
      {action}
    </div>
  );
}
