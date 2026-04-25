/**
 * BankLogo.tsx
 * Wrapper final — usa BankLogoSVG (inline, sem HTTP requests).
 * Os arquivos em /public/banks/*.svg são mantidos como referência,
 * mas o render é feito via componentes React inline para máxima confiabilidade.
 */
import { BankLogoSVG } from './BankLogoSVG';
import type { BankData } from './bankData';

interface BankLogoProps {
  bank: BankData;
  size?: number;
  className?: string;
  onDark?: boolean;
}

export function BankLogo({ bank, size = 28, className = '', onDark: _onDark = true }: BankLogoProps) {
  return <BankLogoSVG bank={bank} size={size} className={className} />;
}
