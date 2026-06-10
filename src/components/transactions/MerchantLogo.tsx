import { useState } from 'react';
import {
  Utensils,
  Car,
  Home,
  Heart,
  Gamepad2,
  GraduationCap,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Receipt,
  ArrowLeftRight,
  LucideIcon
} from 'lucide-react';

interface MerchantDetails {
  name: string;
  slug: string;
  bgColor: string;
  isLightLogo?: boolean;
}

const MERCHANTS: { regex: RegExp; details: MerchantDetails }[] = [
  { regex: /ifood/i, details: { name: 'iFood', slug: 'ifood', bgColor: '#EA1D2C' } },
  { regex: /netflix/i, details: { name: 'Netflix', slug: 'netflix', bgColor: '#E50914' } },
  { regex: /spotify/i, details: { name: 'Spotify', slug: 'spotify', bgColor: '#1DB954' } },
  { regex: /uber/i, details: { name: 'Uber', slug: 'uber', bgColor: '#000000' } },
  { regex: /airbnb/i, details: { name: 'Airbnb', slug: 'airbnb', bgColor: '#FF5A5F' } },
  { regex: /amazon|prime video/i, details: { name: 'Amazon', slug: 'amazon', bgColor: '#FF9900' } },
  { regex: /disney/i, details: { name: 'Disney+', slug: 'disneyplus', bgColor: '#113CCF' } },
  { regex: /hbo|max/i, details: { name: 'HBO Max', slug: 'hbo', bgColor: '#0000FF' } },
  { regex: /youtube|yt premium/i, details: { name: 'YouTube', slug: 'youtube', bgColor: '#FF0000' } },
  { regex: /google|gsuite|google one/i, details: { name: 'Google', slug: 'google', bgColor: '#4285F4' } },
  { regex: /apple|icloud|itunes/i, details: { name: 'Apple', slug: 'apple', bgColor: '#000000' } },
  { regex: /mercado livre|mercadolivre/i, details: { name: 'Mercado Livre', slug: 'mercadolibre', bgColor: '#FFE600', isLightLogo: false } },
  { regex: /mercado pago|mercadopago/i, details: { name: 'Mercado Pago', slug: 'mercadopago', bgColor: '#00A1E4' } },
  { regex: /rappi/i, details: { name: 'Rappi', slug: 'rappi', bgColor: '#FF441F' } },
  { regex: /steam/i, details: { name: 'Steam', slug: 'steam', bgColor: '#171A21' } },
  { regex: /playstation|psn/i, details: { name: 'PlayStation', slug: 'playstation', bgColor: '#003791' } },
  { regex: /xbox/i, details: { name: 'Xbox', slug: 'xbox', bgColor: '#107C10' } },
  { regex: /microsoft|office365/i, details: { name: 'Microsoft', slug: 'microsoft', bgColor: '#F25022' } },
  { regex: /canva/i, details: { name: 'Canva', slug: 'canva', bgColor: '#00C4CC' } },
  { regex: /adobe/i, details: { name: 'Adobe', slug: 'adobe', bgColor: '#FF0000' } },
  { regex: /gympass|wellhub/i, details: { name: 'Wellhub', slug: 'wellhub', bgColor: '#FF5E00' } },
  { regex: /smartfit|smart fit/i, details: { name: 'Smart Fit', slug: 'smartfit', bgColor: '#FFDF00', isLightLogo: false } },
  { regex: /nubank/i, details: { name: 'Nubank', slug: 'nubank', bgColor: '#820AD1' } },
  { regex: /itau|itaú/i, details: { name: 'Itaú', slug: 'itau', bgColor: '#EC7000' } },
  { regex: /bradesco/i, details: { name: 'Bradesco', slug: 'bradesco', bgColor: '#CC092F' } },
  { regex: /santander/i, details: { name: 'Santander', slug: 'santander', bgColor: '#EC0000' } },
  { regex: /caixa/i, details: { name: 'Caixa', slug: 'caixa', bgColor: '#006699' } },
  { regex: /banco do brasil|bb/i, details: { name: 'Banco do Brasil', slug: 'bancodobrasil', bgColor: '#FCFC00', isLightLogo: false } },
];

export function getMerchantDetails(desc: string): MerchantDetails | null {
  if (!desc) return null;
  const match = MERCHANTS.find((m) => m.regex.test(desc));
  return match ? match.details : null;
}

const CATEGORY_COLORS: Record<string, string> = {
  Alimentação: 'bg-si-cat-alimentacao-bg text-si-cat-alimentacao-text',
  Transporte: 'bg-si-cat-transporte-bg text-si-cat-transporte-text',
  Moradia: 'bg-si-cat-moradia-bg text-si-cat-moradia-text',
  Saúde: 'bg-si-cat-saude-bg text-si-cat-saude-text',
  Lazer: 'bg-si-cat-lazer-bg text-si-cat-lazer-text',
  Educação: 'bg-si-cat-educacao-bg text-si-cat-educacao-text',
  Salário: 'bg-si-cat-salario-bg text-si-cat-salario-text',
  Investimentos: 'bg-si-cat-investimentos-bg text-si-cat-investimentos-text',
  Assinaturas: 'bg-si-cat-assinaturas-bg text-si-cat-assinaturas-text',
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Alimentação: Utensils,
  Transporte: Car,
  Moradia: Home,
  Saúde: Heart,
  Lazer: Gamepad2,
  Educação: GraduationCap,
  Salário: DollarSign,
  Investimentos: TrendingUp,
  Assinaturas: RefreshCw,
};

interface MerchantLogoProps {
  description?: string;
  category?: string;
  type?: 'receita' | 'despesa' | string;
  size?: number;
  className?: string;
}

export function MerchantLogo({
  description = '',
  category = '',
  type = 'despesa',
  size = 32,
  className = '',
}: MerchantLogoProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const details = getMerchantDetails(description);

  const containerStyle = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
  };

  if (details && !imgFailed) {
    const isLightLogo = details.isLightLogo !== false;
    const logoColorSuffix = isLightLogo ? '/fff' : '';
    const logoUrl = `https://cdn.simpleicons.org/${details.slug}${logoColorSuffix}`;

    return (
      <div
        className={`rounded-full flex items-center justify-center overflow-hidden shrink-0 shadow-sm ${className}`}
        style={{
          ...containerStyle,
          backgroundColor: details.bgColor,
        }}
      >
        <img
          src={logoUrl}
          alt={details.name}
          className="w-1/2 h-1/2 object-contain"
          onError={() => setImgFailed(true)}
          loading="lazy"
        />
      </div>
    );
  }

  if (details && imgFailed) {
    return (
      <div
        className={`rounded-full flex items-center justify-center font-bold text-si-1 shrink-0 ${className}`}
        style={{
          ...containerStyle,
          backgroundColor: details.bgColor,
          fontSize: Math.max(10, Math.floor(size * 0.45)),
        }}
      >
        {details.name.charAt(0)}
      </div>
    );
  }

  const bgClass = CATEGORY_COLORS[category] || (type === 'receita' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400');
  const IconComponent = CATEGORY_ICONS[category] || (type === 'receita' ? ArrowLeftRight : Receipt);

  return (
    <div
      className={`rounded-xl flex items-center justify-center shrink-0 ${bgClass} ${className}`}
      style={containerStyle}
    >
      <IconComponent style={{ width: size * 0.5, height: size * 0.5 }} />
    </div>
  );
}
