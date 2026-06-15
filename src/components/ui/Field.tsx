import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

/**
 * Field / Input / Select — primitivos de formulário.
 * Label ALL CAPS padronizado + controle com tokens si-*.
 */
const CONTROL =
  'w-full bg-si-over-1 border border-si-border rounded-xl px-3 py-2 text-sm text-si-1 ' +
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
        <p className="mt-1 text-xs text-rose-400">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-si-5">{hint}</p>
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
  const control = (
    <input
      ref={ref}
      id={inputId}
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
  const control = (
    <select
      ref={ref}
      id={selectId}
      className={cn(CONTROL, 'appearance-none pr-8', error && 'border-rose-500/40', className)}
      {...rest}
    >
      {children}
    </select>
  );
  if (!label && !hint && !error) return control;
  return (
    <Field label={label} htmlFor={selectId} hint={hint} error={error}>
      {control}
    </Field>
  );
});
