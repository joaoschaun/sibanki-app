import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Field / Input / Select — primitivos de formulário.
 * Label ALL CAPS padronizado + controle com tokens si-*.
 *
 * A11y: Input/Select conectam-se ao erro/hint via aria-describedby +
 * aria-invalid, e o Field renderiza o erro com role="alert" — leitores de
 * tela anunciam a validação (WCAG 3.3.1 / 4.1.2).
 */
// text-base (16px) no mobile evita o zoom automático do iOS Safari ao focar
// campos < 16px; sm:text-sm mantém a densidade do Pierre no desktop.
const CONTROL =
  'w-full bg-si-over-1 border border-si-border rounded-xl px-3 py-2 text-base sm:text-sm text-si-1 ' +
  'placeholder:text-si-5 transition-colors ' +
  'focus:outline-none focus:border-si-border-lg focus:bg-si-over-2 ' +
  'disabled:opacity-50 disabled:pointer-events-none';

const LABEL = 'block text-[10px] font-bold tracking-[0.18em] uppercase text-si-4 mb-1.5';

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label htmlFor={htmlFor} className={LABEL}>
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p id={htmlFor ? `${htmlFor}-err` : undefined} role="alert" className="mt-1 text-xs text-rose-400">
          {error}
        </p>
      ) : hint ? (
        <p id={htmlFor ? `${htmlFor}-hint` : undefined} className="mt-1 text-xs text-si-5">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined;
  const control = (
    <input
      ref={ref}
      id={inputId}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      className={cn(CONTROL, error && 'border-rose-500/40 focus:border-rose-500/60', className)}
      {...rest}
    />
  );
  if (!label && !hint && !error) return control;
  return (
    <Field label={label} htmlFor={inputId} hint={hint} error={error}>
      {control}
    </Field>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, className, id, children, ...rest },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const describedBy = error ? `${selectId}-err` : hint ? `${selectId}-hint` : undefined;
  const control = (
    <div className="relative w-full">
      <select
        ref={ref}
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(CONTROL, 'appearance-none pr-9', error && 'border-rose-500/40', className)}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-si-4"
        aria-hidden
      />
    </div>
  );
  if (!label && !hint && !error) return control;
  return (
    <Field label={label} htmlFor={selectId} hint={hint} error={error}>
      {control}
    </Field>
  );
});
