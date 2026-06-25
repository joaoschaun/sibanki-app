/**
 * CreditCardVisual.tsx
 * Renderiza um cartão de crédito com layout fiel ao real:
 *  - Chip metálico SVG
 *  - Número mascarado (•••• •••• •••• XXXX)
 *  - Bandeira (Visa/Mastercard/Elo/Amex/Hipercard)
 *  - Logo do banco (Clearbit + fallback)
 *  - Gradiente de cor do banco
 *  - Shimmer/noise texture
 *
 * Proporção padrão de cartão: 85.6mm × 54mm = 1.586:1
 */
import { BankLogo } from './BankLogo';
import { identifyBank, BANKS } from './bankData';

// ── Bandeiras SVG inline ───────────────────────────────────────────────────────

function VisaLogo({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.32} viewBox="0 0 152 48" fill="none">
      <text x="0" y="40" fontFamily="Arial, sans-serif" fontWeight="900"
        fontSize="48" fill="white" letterSpacing="-2">VISA</text>
    </svg>
  );
}

function MastercardLogo({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.65} viewBox="0 0 44 28">
      <circle cx="15" cy="14" r="13" fill="#EB001B" />
      <circle cx="29" cy="14" r="13" fill="#F79E1B" />
      <path d="M22 5.3C25.1 7.5 27 11 27 14s-1.9 6.5-5 8.7C18.9 20.5 17 17 17 14s1.9-6.5 5-8.7z" fill="#FF5F00" />
    </svg>
  );
}

function EloLogo({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.38} viewBox="0 0 80 30" fill="none">
      <rect width="80" height="30" rx="4" fill="white" fillOpacity="0.15" />
      <text x="8" y="22" fontFamily="Arial, sans-serif" fontWeight="900"
        fontSize="20" fill="white" letterSpacing="0">elo</text>
    </svg>
  );
}

function AmexLogo({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.4} viewBox="0 0 80 32" fill="none">
      <text x="0" y="26" fontFamily="Arial, sans-serif" fontWeight="900"
        fontSize="22" fill="white" letterSpacing="1">AMEX</text>
    </svg>
  );
}

function HipercardLogo({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.4} viewBox="0 0 80 32" fill="none">
      <text x="0" y="26" fontFamily="Arial, sans-serif" fontWeight="700"
        fontSize="18" fill="white" letterSpacing="0.5">hipercard</text>
    </svg>
  );
}

function FlagLogo({ flag, size = 44 }: { flag: string; size?: number }) {
  const f = (flag || '').toLowerCase();
  if (f.includes('visa'))       return <VisaLogo size={size} />;
  if (f.includes('master'))     return <MastercardLogo size={size} />;
  if (f.includes('elo'))        return <EloLogo size={size} />;
  if (f.includes('amex'))       return <AmexLogo size={size} />;
  if (f.includes('hipercard'))  return <HipercardLogo size={size} />;
  return null;
}

// ── Chip metálico ─────────────────────────────────────────────────────────────

function ChipSVG({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.77} viewBox="0 0 46 36" fill="none">
      <rect x="1" y="1" width="44" height="34" rx="5" fill="#D4AF37" stroke="#B8972A" strokeWidth="0.5" />
      <rect x="1" y="1" width="44" height="34" rx="5" fill="url(#chipGrad)" />
      {/* Linhas do chip */}
      <line x1="16" y1="1" x2="16" y2="35" stroke="#B8972A" strokeWidth="0.7" />
      <line x1="30" y1="1" x2="30" y2="35" stroke="#B8972A" strokeWidth="0.7" />
      <line x1="1"  y1="11" x2="45" y2="11" stroke="#B8972A" strokeWidth="0.7" />
      <line x1="1"  y1="25" x2="45" y2="25" stroke="#B8972A" strokeWidth="0.7" />
      <rect x="16" y="11" width="14" height="14" rx="2" fill="#D4AF37" stroke="#B8972A" strokeWidth="0.5" />
      <defs>
        <linearGradient id="chipGrad" x1="0" y1="0" x2="46" y2="36">
          <stop offset="0%" stopColor="#F0D060" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#D4AF37" stopOpacity="0" />
          <stop offset="100%" stopColor="#A07820" stopOpacity="0.3" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

interface CreditCardVisualProps {
  /** Nome do cartão (ex: "Nubank Ultraviolet", "Bradesco Elo Grafite") */
  name: string;
  /** Limite do cartão */
  limit?: number;
  /** Bandeira (Visa, Mastercard, Elo, Amex, Hipercard) */
  flag?: string;
  /** Cor customizada (sobrescreve a cor do banco se fornecida) */
  color?: string;
  /** Últimos 4 dígitos (opcional) */
  last4?: string;
  /** Classe adicional */
  className?: string;
  /** Tamanho: full (380px), md (300px), sm (240px) */
  size?: 'full' | 'md' | 'sm';
  /** Fatura atual */
  currentBill?: number;
  /**
   * Slug ou nome do banco salvo no cadastro (ex: "Inter", "inter").
   * Usado como fallback quando `name` não contém o nome do banco
   * (ex: card.name = "Black", card.bank = "Inter").
   */
  bankName?: string;
}

export function CreditCardVisual({
  name,
  limit,
  flag = 'Visa',
  color,
  last4 = '••••',
  className = '',
  size = 'full',
  currentBill,
  bankName,
}: CreditCardVisualProps) {
  const bank =
    identifyBank(name) ??
    (bankName
      ? (BANKS.find((b) => b.slug === bankName.toLowerCase()) ?? identifyBank(bankName))
      : null);

  const primary   = color ?? bank?.primary   ?? '#1e3a5f';
  const secondary = color
    ? adjustColor(color, -30)
    : bank?.secondary ?? '#0f1f36';
  const textColor = bank?.text ?? '#FFFFFF';

  const widths = { full: 380, md: 300, sm: 240 };
  const w = widths[size];
  const h = Math.round(w / 1.586);

  const pctUsado = limit && limit > 0 && currentBill != null
    ? Math.min(100, Math.round((currentBill / limit) * 100))
    : null;

  return (
    <div
      className={`relative rounded-[${Math.round(w * 0.04)}px] overflow-hidden select-none ${className}`}
      style={{
        width: w,
        height: h,
        maxWidth: '100%',
        background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
        boxShadow: `0 20px 60px -10px ${primary}90, 0 4px 20px -4px rgba(0,0,0,0.5)`,
        color: textColor,
        borderRadius: Math.round(w * 0.04),
      }}
    >
      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />

      {/* Reflexo de luz sutil */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
        }}
      />

      {/* Círculos decorativos de fundo (estilo material) */}
      <div
        className="absolute -top-8 -right-8 rounded-full pointer-events-none"
        style={{
          width: h * 1.1,
          height: h * 1.1,
          background: `radial-gradient(circle, ${lightenColor(primary, 40)}30 0%, transparent 70%)`,
        }}
      />

      {/* CONTEÚDO */}
      <div
        className="absolute inset-0 flex flex-col justify-between"
        style={{ padding: `${Math.round(h * 0.1)}px ${Math.round(w * 0.07)}px` }}
      >
          <div className="flex items-start justify-between">
          {/* Logo do banco com contraste automático sobre o fundo do card */}
          <div className="flex items-center">
            {bank ? (
              <BankLogo
                bank={bank}
                size={Math.round(w * 0.1)}
                backgroundHex={primary}
              />
            ) : (
              <span
                className="font-black tracking-tight"
                style={{ fontSize: Math.round(w * 0.06), opacity: 0.9, color: textColor }}
              >
                {name.split(' ').slice(0, 2).join(' ')}
              </span>
            )}
          </div>
          <ChipSVG size={Math.round(w * 0.094)} />
        </div>

        {/* ── NÚMERO DO CARTÃO ── */}
        <div style={{ marginTop: Math.round(h * 0.04) }}>
          <p
            className="font-mono tracking-[0.22em] opacity-90"
            style={{ fontSize: Math.round(w * 0.055), letterSpacing: '0.22em' }}
          >
            ••••&nbsp;&nbsp;••••&nbsp;&nbsp;••••&nbsp;&nbsp;{last4}
          </p>
        </div>

        {/* ── LINHA INFERIOR: Titular + Validade + Bandeira ── */}
        <div className="flex items-end justify-between">
          <div>
            {/* Nome do cartão */}
            <p style={{ fontSize: Math.round(w * 0.028), opacity: 0.6, marginBottom: 2 }}>
              CARTÃO
            </p>
            <p
              className="font-bold tracking-wide uppercase truncate"
              style={{ fontSize: Math.round(w * 0.038), maxWidth: Math.round(w * 0.55) }}
            >
              {name}
            </p>

            {/* Barra de utilização (se tiver dados) */}
            {pctUsado != null && (
              <div className="mt-1.5 flex items-center gap-2">
                <div
                  className="rounded-full overflow-hidden"
                  style={{ width: Math.round(w * 0.25), height: 3, backgroundColor: 'rgba(255,255,255,0.2)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pctUsado}%`,
                      backgroundColor: pctUsado > 80 ? '#FF6B6B' : pctUsado > 50 ? '#FFD93D' : 'rgba(255,255,255,0.8)',
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
                <span style={{ fontSize: Math.round(w * 0.026), opacity: 0.7 }}>
                  {pctUsado}%
                </span>
              </div>
            )}
          </div>

          {/* Bandeira */}
          <div style={{ marginBottom: 2 }}>
            <FlagLogo flag={flag} size={Math.round(w * 0.13)} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers de cor ─────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '').match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

function adjustColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(rgb[0] + amount, rgb[1] + amount, rgb[2] + amount);
}

function lightenColor(hex: string, amount: number): string {
  return adjustColor(hex, amount);
}
