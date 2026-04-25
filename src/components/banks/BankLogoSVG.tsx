/**
 * BankLogoSVG.tsx
 * Logos SVG inline como componentes React — zero HTTP requests, zero falha.
 */
import type { BankData } from './bankData';

interface P { size: number }

// ── Nubank ────────────────────────────────────────────────────────────────────
const Nubank = ({ size }: P) => (
  <svg width={size * 1.4} height={size} viewBox="0 0 56 40" fill="none">
    <text x="2" y="32" fontFamily="'Helvetica Neue',Helvetica,Arial,sans-serif"
      fontWeight="300" fontSize="32" fill="white" letterSpacing="-1">nu</text>
  </svg>
);

// ── Itaú ──────────────────────────────────────────────────────────────────────
const Itau = ({ size }: P) => (
  <svg width={size * 2} height={size} viewBox="0 0 80 40" fill="none">
    <text x="1" y="32" fontFamily="'Helvetica Neue',Helvetica,Arial,sans-serif"
      fontWeight="700" fontSize="30" fill="white" letterSpacing="-1">itaú</text>
  </svg>
);

// ── Bradesco ──────────────────────────────────────────────────────────────────
const Bradesco = ({ size }: P) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <text x="2" y="34" fontFamily="Georgia,'Times New Roman',serif"
      fontWeight="900" fontSize="36" fill="white">B</text>
  </svg>
);

// ── Santander ─────────────────────────────────────────────────────────────────
const Santander = ({ size }: P) => (
  <svg width={size} height={size * 1.2} viewBox="0 0 40 48" fill="none">
    <path d="M20 44C20 44 6 34 6 22C6 13 12 7 18 10C13 13 12 20 16 26C18 20 21 13 19 5C27 9 34 17 34 26C34 36 20 44 20 44Z" fill="white"/>
  </svg>
);

// ── Banco do Brasil — logo geométrico diamante real ───────────────────────────
const BB = ({ size }: P) => (
  <svg width={size * 1.3} height={size * 1.3} viewBox="0 0 52 52" fill="none">
    {/*
      Reprodução fiel do logo BB:
      Diamante (losango) com dois paralelogramos internos sobrepostos
      criando o efeito de cubo 3D estilizado característico do Banco do Brasil.
      Cor oficial: #003882
    */}
    {/* Paralelogramo superior-esquerdo */}
    <path d="M26 4 L10 18 L26 26 L42 12 Z" fill="#003882"/>
    {/* Paralelogramo inferior-direito */}
    <path d="M10 18 L10 34 L26 48 L26 32 Z" fill="#003882"/>
    {/* Paralelogramo central-direito (sobreposição) */}
    <path d="M26 26 L42 12 L42 28 L26 42 Z" fill="#003882"/>
    {/* Miolo branco — cria efeito de intersecção */}
    <path d="M26 26 L18 20 L26 14 L34 20 Z" fill="white"/>
    {/* Face superior do cubo */}
    <path d="M26 4 L42 12 L26 20 L10 12 Z" fill="#0050AA"/>
    {/* Face esquerda do cubo */}
    <path d="M10 12 L26 20 L26 36 L10 28 Z" fill="#003882"/>
    {/* Face direita do cubo */}
    <path d="M42 12 L42 28 L26 36 L26 20 Z" fill="#002060"/>
  </svg>
);

// ── Caixa ─────────────────────────────────────────────────────────────────────
const Caixa = ({ size }: P) => (
  <svg width={size * 3.5} height={size} viewBox="0 0 140 40" fill="none">
    <text x="2" y="30" fontFamily="'Helvetica Neue',Helvetica,Arial,sans-serif"
      fontWeight="900" fontSize="26" fill="white" letterSpacing="3">CAIXA</text>
  </svg>
);

// ── Inter ─────────────────────────────────────────────────────────────────────
const Inter = ({ size }: P) => (
  <svg width={size * 2.2} height={size} viewBox="0 0 88 40" fill="none">
    <text x="1" y="30" fontFamily="'Helvetica Neue',Helvetica,Arial,sans-serif"
      fontWeight="600" fontSize="26" fill="white" letterSpacing="-0.5">inter</text>
  </svg>
);

// ── C6 Bank ───────────────────────────────────────────────────────────────────
const C6 = ({ size }: P) => (
  <svg width={size * 1.5} height={size} viewBox="0 0 60 40" fill="none">
    <text x="1" y="32" fontFamily="'Helvetica Neue',Helvetica,Arial,sans-serif"
      fontWeight="900" fontSize="32" fill="#D4A843" letterSpacing="-1">C6</text>
  </svg>
);

// ── PicPay ────────────────────────────────────────────────────────────────────
const PicPay = ({ size }: P) => (
  <svg width={size * 3} height={size} viewBox="0 0 120 40" fill="none">
    <text x="1" y="28" fontFamily="'Helvetica Neue',Helvetica,Arial,sans-serif"
      fontWeight="700" fontSize="24" fill="white" letterSpacing="-0.5">picpay</text>
  </svg>
);

// ── PagBank ───────────────────────────────────────────────────────────────────
const PagBank = ({ size }: P) => (
  <svg width={size * 3} height={size} viewBox="0 0 120 40" fill="none">
    <text x="1" y="28" fontFamily="'Helvetica Neue',Helvetica,Arial,sans-serif"
      fontWeight="700" fontSize="22" fill="white" letterSpacing="-0.5">PagBank</text>
  </svg>
);

// ── Neon ──────────────────────────────────────────────────────────────────────
const Neon = ({ size }: P) => (
  <svg width={size * 2.2} height={size} viewBox="0 0 88 40" fill="none">
    <text x="1" y="30" fontFamily="'Helvetica Neue',Helvetica,Arial,sans-serif"
      fontWeight="700" fontSize="26" fill="white" letterSpacing="-0.5">neon</text>
  </svg>
);

// ── Mercado Pago ──────────────────────────────────────────────────────────────
const MercadoPago = ({ size }: P) => (
  <svg width={size * 1.3} height={size} viewBox="0 0 52 40" fill="none">
    <text x="1" y="32" fontFamily="'Helvetica Neue',Helvetica,Arial,sans-serif"
      fontWeight="900" fontSize="30" fill="white" letterSpacing="-1">MP</text>
  </svg>
);

// ── Next ──────────────────────────────────────────────────────────────────────
const Next = ({ size }: P) => (
  <svg width={size * 2.2} height={size} viewBox="0 0 88 40" fill="none">
    <text x="1" y="30" fontFamily="'Helvetica Neue',Helvetica,Arial,sans-serif"
      fontWeight="700" fontSize="26" fill="#002E35" letterSpacing="-0.5">next</text>
  </svg>
);

// ── Agi ───────────────────────────────────────────────────────────────────────
const Agi = ({ size }: P) => (
  <svg width={size * 1.5} height={size} viewBox="0 0 60 40" fill="none">
    <text x="1" y="30" fontFamily="'Helvetica Neue',Helvetica,Arial,sans-serif"
      fontWeight="700" fontSize="26" fill="white" letterSpacing="-0.5">agi</text>
  </svg>
);

// ── BTG ───────────────────────────────────────────────────────────────────────
const BTG = ({ size }: P) => (
  <svg width={size * 2} height={size} viewBox="0 0 80 40" fill="none">
    <text x="1" y="30" fontFamily="'Helvetica Neue',Helvetica,Arial,sans-serif"
      fontWeight="900" fontSize="26" fill="#F5C518" letterSpacing="1">BTG</text>
  </svg>
);

// ── XP ────────────────────────────────────────────────────────────────────────
const XP = ({ size }: P) => (
  <svg width={size * 1.3} height={size} viewBox="0 0 52 40" fill="none">
    <text x="1" y="32" fontFamily="'Helvetica Neue',Helvetica,Arial,sans-serif"
      fontWeight="900" fontSize="32" fill="white" letterSpacing="-1">XP</text>
  </svg>
);

// ── Sicoob ────────────────────────────────────────────────────────────────────
const Sicoob = ({ size }: P) => (
  <svg width={size * 3} height={size} viewBox="0 0 120 40" fill="none">
    <text x="1" y="28" fontFamily="'Helvetica Neue',Helvetica,Arial,sans-serif"
      fontWeight="700" fontSize="22" fill="white" letterSpacing="-0.5">sicoob</text>
  </svg>
);

// ── Sicredi ───────────────────────────────────────────────────────────────────
const Sicredi = ({ size }: P) => (
  <svg width={size * 3} height={size} viewBox="0 0 120 40" fill="none">
    <text x="1" y="28" fontFamily="'Helvetica Neue',Helvetica,Arial,sans-serif"
      fontWeight="700" fontSize="22" fill="white" letterSpacing="-0.5">sicredi</text>
  </svg>
);

// ── Banrisul ──────────────────────────────────────────────────────────────────
const Banrisul = ({ size }: P) => (
  <svg width={size * 3.5} height={size} viewBox="0 0 140 40" fill="none">
    <text x="1" y="28" fontFamily="'Helvetica Neue',Helvetica,Arial,sans-serif"
      fontWeight="700" fontSize="22" fill="white" letterSpacing="-0.5">banrisul</text>
  </svg>
);

// ── Banco Original ────────────────────────────────────────────────────────────
const Original = ({ size }: P) => (
  <svg width={size * 3} height={size} viewBox="0 0 120 40" fill="none">
    <text x="1" y="28" fontFamily="'Helvetica Neue',Helvetica,Arial,sans-serif"
      fontWeight="700" fontSize="22" fill="white" letterSpacing="-0.5">original</text>
  </svg>
);

// ── Will Bank ─────────────────────────────────────────────────────────────────
const Will = ({ size }: P) => (
  <svg width={size * 1.8} height={size} viewBox="0 0 72 40" fill="none">
    <text x="1" y="30" fontFamily="'Helvetica Neue',Helvetica,Arial,sans-serif"
      fontWeight="700" fontSize="26" fill="#1A1A1A" letterSpacing="-0.5">will</text>
  </svg>
);

// ── Carteira ──────────────────────────────────────────────────────────────────
const Carteira = ({ size }: P) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <text x="4" y="30" fontSize="26">💵</text>
  </svg>
);

// ── Mapa de logos ──────────────────────────────────────────────────────────────

const LOGO_MAP: Record<string, React.ComponentType<P>> = {
  'Nubank':          Nubank,
  'Itaú':            Itau,
  'Bradesco':        Bradesco,
  'Santander':       Santander,
  'Banco do Brasil': BB,
  'Caixa':           Caixa,
  'Inter':           Inter,
  'C6 Bank':         C6,
  'PicPay':          PicPay,
  'PagBank':         PagBank,
  'Neon':            Neon,
  'Mercado Pago':    MercadoPago,
  'Next':            Next,
  'Agi':             Agi,
  'BTG':             BTG,
  'XP':              XP,
  'Sicoob':          Sicoob,
  'Sicredi':         Sicredi,
  'Banrisul':        Banrisul,
  'Banco Original':  Original,
  'Will Bank':       Will,
  'Carteira':        Carteira,
};

// ── Componente exportado ───────────────────────────────────────────────────────

interface BankLogoSVGProps {
  bank: BankData;
  size?: number;
  className?: string;
}

export function BankLogoSVG({ bank, size = 28, className = '' }: BankLogoSVGProps) {
  const Logo = LOGO_MAP[bank.name];

  if (Logo) {
    return (
      <span className={`inline-flex items-center ${className}`} style={{ height: size }}>
        <Logo size={size} />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center font-black select-none ${className}`}
      style={{ minWidth: size, height: size, fontSize: Math.round(size * 0.42),
        color: bank.text, lineHeight: 1, letterSpacing: '-0.03em' }}
    >
      {bank.abbr}
    </span>
  );
}
