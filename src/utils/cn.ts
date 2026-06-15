import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge condicional de classes Tailwind (clsx + tailwind-merge).
 * Fonte única — antes estava duplicado inline em vários componentes.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
