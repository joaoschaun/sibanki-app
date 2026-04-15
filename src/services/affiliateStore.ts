import { httpsCallable, getFunctions } from 'firebase/functions';
import app, { functions } from '../firebase';

/** Callable do catálogo Lomadee — deploy em `southamerica-east1` (alinhado ao backend). */
const functionsAffiliateCatalog = getFunctions(app, 'southamerica-east1');

export interface AffiliateCatalogOffer {
  id: string;
  merchant: string;
  desc: string;
  cashbackPct: number;
  category: string;
  /** Todas as categorias vindas do produto (filtros na Loja). */
  categoryTags?: string[];
  logo: string;
  logoUrl?: string | null;
  network: string;
  featured?: boolean;
  targetUrl?: string | null;
}

export interface AffiliateCatalogFacets {
  segments: string[];
  brands: { id: string; name: string; segment: string }[];
}

export interface AffiliateCatalogPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AffiliateCatalogResult {
  source: 'lomadee' | 'demo';
  /** `products` = GET /affiliate/products; `advertisers` = fallback v3 */
  catalogKind?: 'products' | 'advertisers' | 'none';
  offers: AffiliateCatalogOffer[];
  pagination: AffiliateCatalogPagination | null;
  /** Filtros Lomadee (marcas/segmentos); omitido quando `includeFacets: false` na chamada. */
  facets?: AffiliateCatalogFacets;
  message?: string;
  error?: string;
  cached?: boolean;
}

export async function fetchAffiliateStoreCatalog(params: {
  page?: number;
  limit?: number;
  search?: string;
  /** Faixa de preço em centavos Lomadee, ex.: `5000:10000` */
  price?: string;
  /** UUIDs de marca separados por vírgula */
  organizationIds?: string;
  forceRefresh?: boolean;
  /** Se false, não busca GET /affiliate/brands (ex.: “Carregar mais” — economiza quota). */
  includeFacets?: boolean;
}): Promise<AffiliateCatalogResult> {
  const fn = httpsCallable<
    {
      page?: number;
      limit?: number;
      search?: string;
      price?: string;
      organizationIds?: string;
      forceRefresh?: boolean;
      includeFacets?: boolean;
    },
    AffiliateCatalogResult
  >(functionsAffiliateCatalog, 'affiliateStoreCatalogApi');
  const res = await fn(params);
  return res.data;
}

/**
 * Registra clique em oferta de afiliado (analytics + atribuição de cashback).
 * Extrai o mdasc da URL de destino (Lomadee injeta ?mdasc=... nos deeplinks)
 * para que o postback de conversão possa atribuir SibCoin ao usuário correto.
 * Fire-and-forget — não bloqueia o redirecionamento.
 */
export function trackAffiliateClick(offer: AffiliateCatalogOffer): void {
  // Tenta extrair mdasc do targetUrl (deeplink Lomadee)
  let mdasc: string | null = null;
  if (offer.targetUrl) {
    try {
      const url = new URL(offer.targetUrl);
      mdasc = url.searchParams.get('mdasc');
    } catch { /* URL inválida — ignora */ }
  }

  const fn = httpsCallable(functions, 'registrarCliqueSolucao');
  fn({
    produtoId: offer.id,
    produto:   offer.merchant,
    parceiro:  offer.network,
    categoria: offer.category,
    targetUrl: offer.targetUrl ?? null,
    ...(mdasc ? { mdasc } : {}),
  }).catch(() => {
    // falha silenciosa — não impede o redirecionamento
  });
}
