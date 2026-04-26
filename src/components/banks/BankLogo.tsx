/**
 * BankLogo.tsx
 * Renderiza o logo real do banco com contraste automático.
 *
 * Quando `backgroundHex` é fornecido, calcula automaticamente se a logo
 * precisa de inversão (brightness(0) invert(1)) para ficar visível.
 *
 * Ex: Santander vermelho sobre card vermelho → logo fica branca automaticamente.
 */
import { useState } from 'react';
import { BankLogoSVG } from './BankLogoSVG';
import type { BankData } from './bankData';
import { logoFilterForBackground } from '../../utils/colorUtils';

interface BankLogoProps {
  bank: BankData;
  size?: number;
  className?: string;
  /** Cor de fundo onde a logo será exibida (hex). Ativa contraste automático. */
  backgroundHex?: string;
}

/** Bancos com logo oficial disponível em /public/banks/{slug}.svg */
const HAS_REAL_LOGO = new Set([
  'nubank', 'itau', 'bradesco', 'santander', 'bb', 'caixa',
  'inter', 'c6', 'pagbank', 'mercadopago', 'btg', 'xp',
  'sicoob', 'sicredi', 'banrisul', 'original',
  'stone', 'safra', 'brb', 'bs2', 'sofisa',
  'cresol', 'credisis', 'unicred', 'uniprime', 'ailos',
  'banestes', 'bnb',
]);

export function BankLogo({ bank, size = 28, className = '', backgroundHex }: BankLogoProps) {
  const [imgFailed, setImgFailed] = useState(false);

  // Calcula filtro de contraste automático
  const filter = backgroundHex
    ? logoFilterForBackground(backgroundHex, bank.logoColor ?? bank.primary)
    : '';

  const hasReal = bank.slug && HAS_REAL_LOGO.has(bank.slug);

  if (hasReal && !imgFailed) {
    return (
      <img
        src={`/banks/${bank.slug}.svg`}
        alt={bank.name}
        loading="lazy"
        decoding="async"
        onError={() => setImgFailed(true)}
        className={`object-contain ${className}`}
        style={{
          height: size,
          width: 'auto',
          maxWidth: size * 5,
          minWidth: size * 0.8,
          filter: filter || undefined,
          transition: 'filter 0.2s ease',
        }}
      />
    );
  }

  // Fallback: componente SVG inline com filtro aplicado
  return (
    <span style={{ filter: filter || undefined }} className="inline-flex items-center">
      <BankLogoSVG bank={bank} size={size} className={className} />
    </span>
  );
}
