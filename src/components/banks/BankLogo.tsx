/**
 * BankLogo.tsx
 * Logo do banco via Clearbit Logo API + fallback estilizado.
 *
 * Clearbit: https://logo.clearbit.com/{domain}
 * Gratuito, sem chave, retorna PNG 32px por padrão.
 * Fallback: abreviação estilizada com a cor do banco.
 */
import { useState } from 'react';
import type { BankData } from './bankData';

interface BankLogoProps {
  bank: BankData;
  size?: number;         // px, default 28
  className?: string;
  /** Modo claro: logo sobre fundo escuro (padrão) ou branco */
  onDark?: boolean;
}

export function BankLogo({ bank, size = 28, className = '', onDark = true }: BankLogoProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const url = bank.domain
    ? `https://logo.clearbit.com/${bank.domain}?size=${size * 2}`
    : '';

  if (!imgFailed && url) {
    return (
      <img
        src={url}
        alt={bank.name}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setImgFailed(true)}
        className={`object-contain rounded-sm ${className}`}
        style={{ width: size, height: size, minWidth: size }}
      />
    );
  }

  // Fallback: abreviação estilizada
  return (
    <span
      className={`inline-flex items-center justify-center font-black rounded-sm select-none ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        fontSize: Math.round(size * 0.38),
        backgroundColor: onDark ? `${bank.primary}30` : bank.primary,
        color: onDark ? bank.primary : bank.text,
        lineHeight: 1,
        letterSpacing: '-0.03em',
      }}
    >
      {bank.abbr}
    </span>
  );
}
