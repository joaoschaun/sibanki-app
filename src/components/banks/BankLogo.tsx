/**
 * BankLogo.tsx
 * Renderiza o logo do banco via arquivo estático /public/banks/{slug}.svg
 * com fallback para abreviação estilizada.
 *
 * Logos ficam em /public/banks/ — gerenciadas como banco de dados de arquivos.
 * Para adicionar/atualizar um logo: basta editar o SVG em public/banks/.
 */
import { useState } from 'react';
import type { BankData } from './bankData';

interface BankLogoProps {
  bank: BankData;
  size?: number;
  className?: string;
  onDark?: boolean;
}

export function BankLogo({ bank, size = 28, className = '', onDark: _onDark = true }: BankLogoProps) {
  const [imgFailed, setImgFailed] = useState(false);

  // Sem slug: usa fallback direto (ex: Carteira)
  if (!bank.slug) {
    return <FallbackLogo bank={bank} size={size} className={className} />;
  }

  const url = `/banks/${bank.slug}.svg`;

  if (!imgFailed) {
    return (
      <img
        src={url}
        alt={bank.name}
        width={size * 3}   // viewBox amplo → dar espaço ao SVG
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setImgFailed(true)}
        className={`object-contain ${className}`}
        style={{ height: size, width: 'auto', maxWidth: size * 4, minWidth: size }}
      />
    );
  }

  return <FallbackLogo bank={bank} size={size} className={className} />;
}

function FallbackLogo({ bank, size, className }: { bank: BankData; size: number; className: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center font-black rounded select-none ${className}`}
      style={{
        minWidth: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        color: bank.text,
        lineHeight: 1,
        letterSpacing: '-0.03em',
      }}
    >
      {bank.abbr}
    </span>
  );
}
