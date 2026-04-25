/**
 * BankLogoInline.tsx
 * Logos SVG inline para os principais bancos brasileiros.
 * Zero dependência externa — sem Clearbit, sem CDN, sem falha.
 * Cada logo replica a identidade visual real do banco.
 */
import type { BankData } from './bankData';

interface Props {
  bank: BankData;
  size?: number;
  className?: string;
}

// ── Logos individuais ──────────────────────────────────────────────────────────

function NubankLogo({ s }: { s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
      <text x="4" y="28" fontFamily="'Helvetica Neue',Arial,sans-serif"
        fontWeight="300" fontSize="22" fill="white" letterSpacing="-0.5">nu</text>
    </svg>
  );
}

function ItauLogo({ s }: { s: number }) {
  return (
    <svg width={s} height={s * 0.5} viewBox="0 0 80 40" fill="none">
      <text x="0" y="30" fontFamily="'Helvetica Neue',Arial,sans-serif"
        fontWeight="700" fontSize="28" fill="white" letterSpacing="-0.5">itaú</text>
    </svg>
  );
}

function BradescоLogo({ s }: { s: number }) {
  // Bradesco: "B" estilizado vermelho/branco
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
      <text x="4" y="30" fontFamily="'Helvetica Neue',Arial,sans-serif"
        fontWeight="900" fontSize="30" fill="white">B</text>
    </svg>
  );
}

function SantanderLogo({ s }: { s: number }) {
  // Chama estilizada do Santander
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
      {/* Chama simplificada */}
      <path d="M20 34 C20 34 8 26 8 16 C8 10 13 6 18 8 C15 10 14 14 16 18 C18 14 21 10 20 6 C25 8 32 14 32 20 C32 28 20 34 20 34Z"
        fill="white" />
    </svg>
  );
}

function BBLogo({ s }: { s: number }) {
  return (
    <svg width={s * 1.4} height={s * 0.7} viewBox="0 0 56 28" fill="none">
      <text x="0" y="22" fontFamily="'Helvetica Neue',Arial,sans-serif"
        fontWeight="900" fontSize="24" fill="#002B5B" letterSpacing="1">BB</text>
    </svg>
  );
}

function CaixaLogo({ s }: { s: number }) {
  return (
    <svg width={s * 2.5} height={s * 0.55} viewBox="0 0 100 22" fill="none">
      <text x="0" y="18" fontFamily="'Helvetica Neue',Arial,sans-serif"
        fontWeight="900" fontSize="18" fill="white" letterSpacing="1.5">CAIXA</text>
    </svg>
  );
}

function InterLogo({ s }: { s: number }) {
  return (
    <svg width={s * 1.8} height={s * 0.55} viewBox="0 0 72 22" fill="none">
      <text x="0" y="18" fontFamily="'Helvetica Neue',Arial,sans-serif"
        fontWeight="700" fontSize="18" fill="white" letterSpacing="-0.3">inter</text>
    </svg>
  );
}

function C6Logo({ s }: { s: number }) {
  return (
    <svg width={s * 1.2} height={s * 0.65} viewBox="0 0 48 26" fill="none">
      <text x="0" y="22" fontFamily="'Helvetica Neue',Arial,sans-serif"
        fontWeight="900" fontSize="22" fill="#D4A843" letterSpacing="-0.5">C6</text>
    </svg>
  );
}

function BTGLogo({ s }: { s: number }) {
  return (
    <svg width={s * 1.5} height={s * 0.55} viewBox="0 0 60 22" fill="none">
      <text x="0" y="18" fontFamily="'Helvetica Neue',Arial,sans-serif"
        fontWeight="900" fontSize="18" fill="#F5C518" letterSpacing="1">BTG</text>
    </svg>
  );
}

function XPLogo({ s }: { s: number }) {
  return (
    <svg width={s} height={s * 0.6} viewBox="0 0 40 24" fill="none">
      <text x="0" y="20" fontFamily="'Helvetica Neue',Arial,sans-serif"
        fontWeight="900" fontSize="22" fill="white" letterSpacing="-0.5">XP</text>
    </svg>
  );
}

function PicPayLogo({ s }: { s: number }) {
  return (
    <svg width={s * 2} height={s * 0.55} viewBox="0 0 80 22" fill="none">
      <text x="0" y="18" fontFamily="'Helvetica Neue',Arial,sans-serif"
        fontWeight="700" fontSize="16" fill="white" letterSpacing="-0.2">picpay</text>
    </svg>
  );
}

function MercadoPagoLogo({ s }: { s: number }) {
  return (
    <svg width={s} height={s * 0.6} viewBox="0 0 40 24" fill="none">
      <text x="0" y="20" fontFamily="'Helvetica Neue',Arial,sans-serif"
        fontWeight="900" fontSize="22" fill="white" letterSpacing="-0.5">MP</text>
    </svg>
  );
}

function NeonLogo({ s }: { s: number }) {
  return (
    <svg width={s * 2} height={s * 0.55} viewBox="0 0 80 22" fill="none">
      <text x="0" y="18" fontFamily="'Helvetica Neue',Arial,sans-serif"
        fontWeight="700" fontSize="18" fill="white" letterSpacing="-0.2">neon</text>
    </svg>
  );
}

function NextLogo({ s }: { s: number }) {
  return (
    <svg width={s * 1.8} height={s * 0.55} viewBox="0 0 72 22" fill="none">
      <text x="0" y="18" fontFamily="'Helvetica Neue',Arial,sans-serif"
        fontWeight="700" fontSize="18" fill="#002E35" letterSpacing="-0.2">next</text>
    </svg>
  );
}

function PagBankLogo({ s }: { s: number }) {
  return (
    <svg width={s * 2.5} height={s * 0.55} viewBox="0 0 100 22" fill="none">
      <text x="0" y="18" fontFamily="'Helvetica Neue',Arial,sans-serif"
        fontWeight="700" fontSize="16" fill="white" letterSpacing="-0.2">PagBank</text>
    </svg>
  );
}

function SicoobLogo({ s }: { s: number }) {
  return (
    <svg width={s * 2.5} height={s * 0.55} viewBox="0 0 100 22" fill="none">
      <text x="0" y="18" fontFamily="'Helvetica Neue',Arial,sans-serif"
        fontWeight="700" fontSize="16" fill="white" letterSpacing="-0.2">sicoob</text>
    </svg>
  );
}

function SicrediLogo({ s }: { s: number }) {
  return (
    <svg width={s * 2.5} height={s * 0.55} viewBox="0 0 100 22" fill="none">
      <text x="0" y="18" fontFamily="'Helvetica Neue',Arial,sans-serif"
        fontWeight="700" fontSize="16" fill="white" letterSpacing="-0.2">sicredi</text>
    </svg>
  );
}

function AgiLogo({ s }: { s: number }) {
  return (
    <svg width={s * 1.2} height={s * 0.55} viewBox="0 0 48 22" fill="none">
      <text x="0" y="18" fontFamily="'Helvetica Neue',Arial,sans-serif"
        fontWeight="700" fontSize="18" fill="white" letterSpacing="-0.2">agi</text>
    </svg>
  );
}

function WillLogo({ s }: { s: number }) {
  return (
    <svg width={s * 1.5} height={s * 0.55} viewBox="0 0 60 22" fill="none">
      <text x="0" y="18" fontFamily="'Helvetica Neue',Arial,sans-serif"
        fontWeight="700" fontSize="18" fill="#1A1A1A" letterSpacing="-0.2">will</text>
    </svg>
  );
}

function BanrisulLogo({ s }: { s: number }) {
  return (
    <svg width={s * 3} height={s * 0.55} viewBox="0 0 120 22" fill="none">
      <text x="0" y="18" fontFamily="'Helvetica Neue',Arial,sans-serif"
        fontWeight="700" fontSize="15" fill="white" letterSpacing="-0.2">banrisul</text>
    </svg>
  );
}

function OriginalLogo({ s }: { s: number }) {
  return (
    <svg width={s * 3} height={s * 0.55} viewBox="0 0 120 22" fill="none">
      <text x="0" y="18" fontFamily="'Helvetica Neue',Arial,sans-serif"
        fontWeight="700" fontSize="14" fill="white" letterSpacing="-0.2">original</text>
    </svg>
  );
}

function CarteirаLogo({ s }: { s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
      <text x="2" y="30" fontSize="28">💵</text>
    </svg>
  );
}

// ── Mapa de logos ─────────────────────────────────────────────────────────────

const LOGO_MAP: Record<string, (props: { s: number }) => JSX.Element> = {
  'Nubank':          NubankLogo,
  'Itaú':            ItauLogo,
  'Bradesco':        BradescоLogo,
  'Santander':       SantanderLogo,
  'Banco do Brasil': BBLogo,
  'Caixa':           CaixaLogo,
  'Inter':           InterLogo,
  'C6 Bank':         C6Logo,
  'BTG':             BTGLogo,
  'XP':              XPLogo,
  'PicPay':          PicPayLogo,
  'Mercado Pago':    MercadoPagoLogo,
  'Neon':            NeonLogo,
  'Next':            NextLogo,
  'Agi':             AgiLogo,
  'PagBank':         PagBankLogo,
  'Sicoob':          SicoobLogo,
  'Sicredi':         SicrediLogo,
  'Banrisul':        BanrisulLogo,
  'Banco Original':  OriginalLogo,
  'Will Bank':       WillLogo,
  'Carteira':        CarteirаLogo,
};

// ── Componente exportado ───────────────────────────────────────────────────────

export function BankLogoInline({ bank, size = 28, className = '' }: Props) {
  const LogoComponent = LOGO_MAP[bank.name];

  if (LogoComponent) {
    return (
      <span className={`inline-flex items-center justify-center ${className}`}
        style={{ minWidth: size, height: size }}>
        <LogoComponent s={size} />
      </span>
    );
  }

  // Fallback genérico: abreviação estilizada
  return (
    <span
      className={`inline-flex items-center justify-center font-black rounded select-none ${className}`}
      style={{
        minWidth: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        color: bank.text,
        lineHeight: 1,
        letterSpacing: '-0.03em',
      }}
    >
      {bank.abbr}
    </span>
  );
}
