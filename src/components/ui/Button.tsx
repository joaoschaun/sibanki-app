import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

/**
 * Button — primitivo neutro do design system Pierre.
 *
 * Regra da marca: SEM botões coloridos. Apenas tons neutros (si-over) +
 * `danger` (rose) para ações destrutivas. A cor semântica fica reservada
 * para estado financeiro (Ld/Sg/Sv), nunca para CTAs decorativos.
 *
 * `buttonClasses` é exportado para que <Link> (react-router) reaproveite o
 * mesmo visual sem precisar virar <button>.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  // CTA primário da marca = botão branco (linguagem Pierre da branch de auditoria).
  primary: 'bg-white hover:bg-zinc-100 text-zinc-900',
  secondary: 'bg-si-over-2 hover:bg-si-over-3 border border-si-border text-si-2',
  ghost: 'bg-transparent hover:bg-si-over-2 text-si-3 hover:text-si-1',
  danger: 'bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'px-4 py-2 text-sm gap-2 rounded-xl',
  lg: 'px-6 py-2.5 text-sm gap-2 rounded-xl',
};

const BASE =
  'inline-flex items-center justify-center font-bold transition-colors ' +
  'disabled:opacity-50 disabled:pointer-events-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-si-border-xl';

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
) {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** ícone à esquerda do label */
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClasses(variant, size, className)} {...rest}>
      {icon}
      {children}
    </button>
  );
});
