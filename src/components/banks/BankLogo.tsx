/**
 * BankLogo.tsx
 * Renderiza o logo real do banco via arquivo SVG em /public/banks/{slug}.svg
 * (logos oficiais do repositório Tgentil/Bancos-em-SVG no GitHub).
 *
 * Fallback para componente inline quando o arquivo não existe (PicPay, Neon, etc.)
 */
import { useState } from 'react';
import { BankLogoSVG } from './BankLogoSVG';
import type { BankData } from './bankData';

interface BankLogoProps {
  bank: BankData;
  size?: number;
  className?: string;
  onDark?: boolean;
}

/** Bancos com logo oficial disponível em /public/banks/ */
const HAS_REAL_LOGO = new Set([
  'nubank', 'itau', 'bradesco', 'santander', 'bb', 'caixa',
  'inter', 'c6', 'pagbank', 'mercadopago', 'btg', 'xp',
  'sicoob', 'sicredi', 'banrisul', 'original',
]);

export function BankLogo({ bank, size = 28, className = '', onDark: _onDark = true }: BankLogoProps) {
  const [imgFailed, setImgFailed] = useState(false);

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
        style={{ height: size, width: 'auto', maxWidth: size * 5, minWidth: size * 0.8 }}
      />
    );
  }

  // Fallback: componente SVG inline (PicPay, Neon, Next, Agi, Will, Carteira, etc.)
  return <BankLogoSVG bank={bank} size={size} className={className} />;
}
