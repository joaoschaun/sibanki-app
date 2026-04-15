import type { CardBenefits } from '../types/userData';

/** Referência de mercado — o usuário deve conferir no app do banco antes de confiar cegamente. */
export interface CardBenefitsCatalogEntry {
  id: string;
  /** Mesmo valor que em `BANDEIRAS` do cadastro (Visa, Mastercard, …) */
  flag: string;
  tierLabel: string;
  shortLabel: string;
  benefits: Partial<CardBenefits>;
  vipNetworkHint?: string;
  pointsProgramHint?: string;
  notesHint?: string;
}

/**
 * Perfis típicos por bandeira. Não cobre todos os produtos; serve como ponto de partida.
 * Cashback e % variam por banco — deixamos em aberto para o usuário preencher.
 */
export const CARD_BENEFITS_CATALOG: CardBenefitsCatalogEntry[] = [
  // Visa
  {
    id: 'visa-basico',
    flag: 'Visa',
    tierLabel: 'Básico',
    shortLabel: 'Proteção de compra comum',
    benefits: {
      purchaseProtection: true,
      travelInsurance: false,
      vipLounge: false,
      extendedWarranty: false,
      concierge: false,
    },
    notesHint: 'Referência genérica Visa nível entrada. Confira seu contrato no app do banco.',
  },
  {
    id: 'visa-intermediario',
    flag: 'Visa',
    tierLabel: 'Intermediário',
    shortLabel: 'Seguro viagem + proteções',
    benefits: {
      purchaseProtection: true,
      travelInsurance: true,
      vipLounge: false,
      extendedWarranty: true,
      concierge: false,
    },
    notesHint: 'Comum em Gold / equivalentes. Validar coberturas e carências.',
  },
  {
    id: 'visa-premium',
    flag: 'Visa',
    tierLabel: 'Premium',
    shortLabel: 'Sala VIP + viagem',
    benefits: {
      purchaseProtection: true,
      travelInsurance: true,
      vipLounge: true,
      extendedWarranty: true,
      concierge: false,
      vipVisitsPerYear: 4,
    },
    vipNetworkHint: 'LoungeKey ou rede Visa (conforme banco)',
    notesHint: 'Próximo de Platinum. Número de visitas varia por produto — ajuste se precisar.',
  },
  {
    id: 'visa-topo',
    flag: 'Visa',
    tierLabel: 'Topo de linha',
    shortLabel: 'Infinite / equivalente',
    benefits: {
      purchaseProtection: true,
      travelInsurance: true,
      vipLounge: true,
      extendedWarranty: true,
      concierge: true,
      vipVisitsPerYear: 8,
    },
    vipNetworkHint: 'LoungeKey (rede Visa Infinite)',
    notesHint: 'Perfil “Infinite”: concierge e visitas dependem do banco emissor.',
  },
  // Mastercard
  {
    id: 'mc-basico',
    flag: 'Mastercard',
    tierLabel: 'Básico',
    shortLabel: 'Proteção de compra',
    benefits: {
      purchaseProtection: true,
      travelInsurance: false,
      vipLounge: false,
      extendedWarranty: false,
      concierge: false,
    },
    notesHint: 'Referência Mastercard padrão. Confirmar no app.',
  },
  {
    id: 'mc-intermediario',
    flag: 'Mastercard',
    tierLabel: 'Intermediário',
    shortLabel: 'Viagem + proteção',
    benefits: {
      purchaseProtection: true,
      travelInsurance: true,
      vipLounge: false,
      extendedWarranty: true,
      concierge: false,
    },
    notesHint: 'Comum em Gold Mastercard.',
  },
  {
    id: 'mc-premium',
    flag: 'Mastercard',
    tierLabel: 'Premium',
    shortLabel: 'Black / salas VIP',
    benefits: {
      purchaseProtection: true,
      travelInsurance: true,
      vipLounge: true,
      extendedWarranty: true,
      concierge: false,
      vipVisitsPerYear: 4,
    },
    vipNetworkHint: 'DragonPass ou programa do banco',
    notesHint: 'Cartões Black variam: ajuste visitas e rede.',
  },
  {
    id: 'mc-topo',
    flag: 'Mastercard',
    tierLabel: 'Topo de linha',
    shortLabel: 'World Elite / equivalente',
    benefits: {
      purchaseProtection: true,
      travelInsurance: true,
      vipLounge: true,
      extendedWarranty: true,
      concierge: true,
      vipVisitsPerYear: 8,
    },
    vipNetworkHint: 'DragonPass / Mastercard Travel Pass',
    notesHint: 'World Elite: benefícios fortes em viagem — conferir guia do emissor.',
  },
  // Elo
  {
    id: 'elo-basico',
    flag: 'Elo',
    tierLabel: 'Básico',
    shortLabel: 'Proteções básicas',
    benefits: {
      purchaseProtection: true,
      travelInsurance: false,
      vipLounge: false,
      extendedWarranty: false,
      concierge: false,
    },
    notesHint: 'Elo mais simples costuma focar em compra e parcelamento.',
  },
  {
    id: 'elo-intermediario',
    flag: 'Elo',
    tierLabel: 'Intermediário',
    shortLabel: 'Mais coberturas',
    benefits: {
      purchaseProtection: true,
      travelInsurance: true,
      vipLounge: false,
      extendedWarranty: true,
      concierge: false,
    },
    notesHint: 'Nanquim / variantes: comparar seguros no site Elo + banco.',
  },
  {
    id: 'elo-premium',
    flag: 'Elo',
    tierLabel: 'Premium',
    shortLabel: 'Grafite / salas',
    benefits: {
      purchaseProtection: true,
      travelInsurance: true,
      vipLounge: true,
      extendedWarranty: true,
      concierge: false,
      vipVisitsPerYear: 4,
    },
    vipNetworkHint: 'Programa Elo / parceiros (ver guia atual)',
    notesHint: 'Benefícios premium mudam com frequência — valide na data da sua viagem.',
  },
  // Amex
  {
    id: 'amex-basico',
    flag: 'Amex',
    tierLabel: 'Básico',
    shortLabel: 'Proteção e pontos',
    benefits: {
      purchaseProtection: true,
      travelInsurance: false,
      vipLounge: false,
      extendedWarranty: false,
      concierge: false,
    },
    pointsProgramHint: 'Membership Rewards (se aplicável)',
    notesHint: 'American Express: regras fortes em compra internacional — leia o guia do cartão.',
  },
  {
    id: 'amex-premium',
    flag: 'Amex',
    tierLabel: 'Premium',
    shortLabel: 'Viagem + proteção forte',
    benefits: {
      purchaseProtection: true,
      travelInsurance: true,
      vipLounge: true,
      extendedWarranty: true,
      concierge: true,
      vipVisitsPerYear: 4,
    },
    vipNetworkHint: 'Global Lounge Collection / parceiros Amex',
    pointsProgramHint: 'Membership Rewards',
    notesHint: 'Gold/Platinum variam — concierge e salas conforme produto.',
  },
  // Hipercard / Outros — fallback genérico
  {
    id: 'hipercard-padrao',
    flag: 'Hipercard',
    tierLabel: 'Padrão',
    shortLabel: 'Referência geral',
    benefits: {
      purchaseProtection: true,
      travelInsurance: true,
      vipLounge: false,
      extendedWarranty: false,
      concierge: false,
    },
    notesHint: 'Hipercard: benefícios dependem muito do banco emissor.',
  },
  {
    id: 'outros-basico',
    flag: 'Outros',
    tierLabel: 'Genérico',
    shortLabel: 'Só o essencial',
    benefits: {
      purchaseProtection: true,
      travelInsurance: false,
      vipLounge: false,
      extendedWarranty: false,
      concierge: false,
    },
    notesHint: 'Bandeira não listada: preencha manualmente com base no site do banco.',
  },
  {
    id: 'outros-completo',
    flag: 'Outros',
    tierLabel: 'Genérico completo',
    shortLabel: 'Pacote amplo (estimado)',
    benefits: {
      purchaseProtection: true,
      travelInsurance: true,
      vipLounge: true,
      extendedWarranty: true,
      concierge: false,
      vipVisitsPerYear: 2,
    },
    notesHint: 'Use só como rascunho; confirme cada item no app do emissor.',
  },
];

export function listCatalogByFlag(flag: string): CardBenefitsCatalogEntry[] {
  const f = (flag || '').trim() || 'Outros';
  const exact = CARD_BENEFITS_CATALOG.filter((e) => e.flag === f);
  if (exact.length) return exact;
  return CARD_BENEFITS_CATALOG.filter((e) => e.flag === 'Outros');
}

export function getCatalogEntry(id: string): CardBenefitsCatalogEntry | undefined {
  return CARD_BENEFITS_CATALOG.find((e) => e.id === id);
}
