/**
 * BankLogo.tsx
 * Renderiza o logo do banco usando SVG inline (sem dependência externa).
 * Substitui abordagem anterior com Clearbit que falhava por CSP/CORS.
 */
import { BankLogoInline } from './BankLogoInline';
import type { BankData } from './bankData';

interface BankLogoProps {
  bank: BankData;
  size?: number;
  className?: string;
  onDark?: boolean;
}

export function BankLogo({ bank, size = 28, className = '', onDark: _onDark = true }: BankLogoProps) {
  return <BankLogoInline bank={bank} size={size} className={className} />;
}
