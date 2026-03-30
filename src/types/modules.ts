/**
 * Contratos TypeScript para os 4 novos módulos de expansão Sibanki:
 *   A) Cripto Exchange
 *   B) Loja Sibanki
 *   C) Monitoramento CPF
 *   D) DDA — Débito Direto Autorizado
 *
 * Estes tipos evoluem em 3 fases (WL → híbrido → próprio).
 * A camada off-chain vive no Firestore; a on-chain usa Polygon ERC-20.
 */

// ══════════════════════════════════════════════════════════════════════════════
// A) CRIPTO EXCHANGE
// ══════════════════════════════════════════════════════════════════════════════

export type CryptoNetwork =
  | 'bitcoin'
  | 'ethereum'
  | 'polygon'
  | 'solana'
  | 'bnb'
  | 'avalanche'
  | 'other';

export type CryptoAssetCategory =
  | 'layer1'
  | 'layer2'
  | 'defi'
  | 'stablecoin'
  | 'rwa'
  | 'meme'
  | 'other';

export interface CryptoAsset {
  id: string;                          // ticker único (ex: 'BTC', 'ETH', 'SIB')
  symbol: string;
  name: string;
  network: CryptoNetwork;
  category: CryptoAssetCategory;
  contractAddress?: string;            // ERC-20 / SPL contract
  decimals: number;
  logoUrl?: string;
  coingeckoId?: string;                // para market data
  isSibcoin?: boolean;
}

export interface CryptoHolding {
  id: string;
  userId: string;
  assetId: string;
  asset?: CryptoAsset;
  quantity: number;
  avgBuyPrice: number;                 // BRL
  currentPrice?: number;              // BRL, atualizado via market data
  currentValue?: number;              // quantity * currentPrice
  pnlBrl?: number;
  pnlPct?: number;
  source: 'exchange-wl' | 'manual' | 'bridge-sibcoin' | 'open-finance';
  walletAddress?: string;
  updatedAt: string;
  createdAt: string;
}

export type CryptoTradeType = 'buy' | 'sell' | 'swap' | 'transfer' | 'stake' | 'unstake';
export type CryptoTradeStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface CryptoTrade {
  id: string;
  userId: string;
  type: CryptoTradeType;
  status: CryptoTradeStatus;
  fromAssetId?: string;
  toAssetId?: string;
  fromAmount?: number;
  toAmount?: number;
  priceAtTrade?: number;               // BRL/unit
  feeBrl?: number;
  provider: 'parfin' | 'liqi' | 'hubchain' | 'blockbr' | 'sibanki-own' | 'manual';
  txHash?: string;
  network?: CryptoNetwork;
  executedAt?: string;
  createdAt: string;
  irEventoCriptoBR?: boolean;         // flag para cálculo IR
}

export interface CryptoStakingPosition {
  id: string;
  userId: string;
  assetId: string;
  amount: number;
  apyPct: number;
  lockPeriodDays?: number;
  startedAt: string;
  endsAt?: string;
  rewardsAccrued?: number;
  status: 'active' | 'unlocking' | 'completed';
  provider: string;
}

export interface CryptoIREvent {
  id: string;
  userId: string;
  year: number;
  month: number;
  assetId: string;
  tradeType: CryptoTradeType;
  gainBrl: number;
  isExempt: boolean;                  // vendas ≤ R$35k/mês são isentas
  darfDue?: number;
  tradeId: string;
  createdAt: string;
}

export interface CryptoPortfolioSnapshot {
  userId: string;
  version: number;
  updatedAt: string;
  totalValueBrl: number;
  totalCostBrl: number;
  totalPnlBrl: number;
  totalPnlPct: number;
  holdingsCount: number;
  topAsset?: string;
  allocation?: Record<string, number>; // assetId → % do portfolio
  provider: 'parfin' | 'liqi' | 'hubchain' | 'sibanki-own' | 'manual';
}

// ══════════════════════════════════════════════════════════════════════════════
// B) LOJA SIBANKI
// ══════════════════════════════════════════════════════════════════════════════

export type StoreCategory =
  | 'seguros'
  | 'cartoes'
  | 'educacao'
  | 'investimentos'
  | 'saude'
  | 'tecnologia'
  | 'viagem'
  | 'shopping'
  | 'outros';

export type StoreProductType =
  | 'affiliate-link'       // Fase 1: link afiliado (AWIN, Lomadee, ML, Amazon)
  | 'direct-partner'       // Fase 2: parceria direta negociada
  | 'marketplace-item'     // Fase 3: marketplace próprio
  | 'sibcoin-reward';      // item resgatável com SibCoin

export interface StoreProduct {
  id: string;
  type: StoreProductType;
  category: StoreCategory;
  title: string;
  description: string;
  imageUrl?: string;
  brand?: string;
  provider: string;                    // ex: 'awin', 'lomadee', 'ml-afiliados', 'amazon', 'direct'
  affiliateUrl?: string;
  deepLink?: string;
  commissionPct?: number;              // comissão Sibanki (%)
  sibcoinCashback?: number;            // SibCoin creditados ao usuário por conversão
  sibcoinPrice?: number;               // se resgatável com SibCoin
  priceMin?: number;                   // BRL
  priceMax?: number;
  tags?: string[];
  targetProfile?: string[];            // journeyStage ou perfil de investidor alvo
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AffiliateClick {
  id: string;
  userId: string;
  productId: string;
  provider: string;
  affiliateUrl: string;
  clickedAt: string;
  converted?: boolean;
  convertedAt?: string;
  commissionBrl?: number;
  sibcoinAwarded?: number;
  sessionId?: string;
}

export interface StoreOrder {
  id: string;
  userId: string;
  productId: string;
  type: 'affiliate' | 'sibcoin-redeem' | 'direct';
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  amountBrl?: number;
  sibcoinUsed?: number;
  sibcoinEarned?: number;
  clickId?: string;
  createdAt: string;
  updatedAt: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// C) MONITORAMENTO CPF
// ══════════════════════════════════════════════════════════════════════════════

export type CpfBureauSource = 'serasa' | 'boa-vista' | 'spc' | 'receita-federal' | 'bacen-registrato' | 'proprio';

export type CpfMonitorEventType =
  | 'score-update'
  | 'negativacao-nova'
  | 'negativacao-removida'
  | 'consulta-detectada'
  | 'protecao-ativada'
  | 'protecao-desativada'
  | 'dados-atualizados'
  | 'score-queda-alerta'
  | 'score-alta-alerta';

export interface CpfMonitorEvent {
  id: string;
  userId: string;
  type: CpfMonitorEventType;
  source: CpfBureauSource;
  description: string;
  scoreBefore?: number;
  scoreAfter?: number;
  valor?: number;
  credor?: string;
  detectedAt: string;
  notified: boolean;
  notifiedAt?: string;
}

export interface CpfNegativacao {
  id: string;
  userId: string;
  credor: string;
  valor: number;
  dataOcorrencia: string;
  dataVencimento?: string;
  status: 'ativa' | 'quitada' | 'prescrita' | 'em-negociacao';
  source: CpfBureauSource;
  updatedAt: string;
}

export interface CpfConsulta {
  id: string;
  userId: string;
  consultante: string;
  tipo: 'credito' | 'cadastro' | 'outro';
  dataConsulta: string;
  source: CpfBureauSource;
}

export interface CpfBehavioralScore {
  userId: string;
  version: number;
  updatedAt: string;
  overallScore: number;               // 0-1000 Sibanki score interno
  components: {
    pagamentos: number;               // pontualidade de pagamentos (0-100)
    endividamento: number;            // nível de endividamento (0-100)
    liquidez: number;                 // saldo médio disponível (0-100)
    consistencia: number;             // consistência de lançamentos (0-100)
    crescimento: number;              // evolução patrimonial (0-100)
  };
  bureauScore?: number;               // score externo integrado
  bureauSource?: CpfBureauSource;
  predictedDefault90d?: number;       // probabilidade de inadimplência (0-1)
}

// ══════════════════════════════════════════════════════════════════════════════
// D) DDA — DÉBITO DIRETO AUTORIZADO
// ══════════════════════════════════════════════════════════════════════════════

export type DdaAccessMethod =
  | 'open-finance'         // Fase 1: via Pluggy/Belvo consultando banco conectado
  | 'baas-partner'         // Fase 2: via BaaS (Dock, Fitbank, Zoop) com participação indireta
  | 'spb-direct';          // Fase 3: participação direta no SPB/CIP como IP ou ITP

export type BoletoType =
  | 'conta-agua'
  | 'conta-luz'
  | 'conta-gas'
  | 'conta-internet'
  | 'conta-telefone'
  | 'aluguel'
  | 'condominio'
  | 'escola'
  | 'cartao-credito'
  | 'emprestimo'
  | 'financiamento'
  | 'impostos'
  | 'outros';

export interface DdaBoletoParsed {
  id: string;
  userId: string;
  barcode: string;
  linha_digitavel?: string;
  beneficiario: string;
  cnpjBeneficiario?: string;
  pagador?: string;
  cpfPagador?: string;
  valor: number;
  valorDesconto?: number;
  valorJuros?: number;
  valorFinal?: number;
  vencimento: string;
  dataEmissao?: string;
  descricao?: string;
  tipoCobranca?: BoletoType;
  categoria?: string;
  recorrente?: boolean;
  recorrenteId?: string;              // agrupa boletos da mesma origem
  status: 'pendente' | 'pago' | 'vencido' | 'cancelado' | 'agendado';
  pagoEm?: string;
  agendadoPara?: string;
  accessMethod: DdaAccessMethod;
  source: string;                     // nome do banco/parceiro que originou
  syncedAt: string;
  createdAt: string;
}

export interface DdaSyncLog {
  id: string;
  userId: string;
  accessMethod: DdaAccessMethod;
  provider: string;
  status: 'success' | 'error' | 'partial';
  boletosFound: number;
  boletosNew: number;
  boletosUpdated: number;
  errorMessage?: string;
  syncedAt: string;
  durationMs?: number;
}

export interface DdaAlertConfig {
  userId: string;
  alertVencimentoDias: number[];      // ex: [7, 3, 1] — alerta N dias antes do vencimento
  alertValorMinimo?: number;          // só alertar acima de N reais
  canalTelegram: boolean;
  canalWhatsapp: boolean;
  canalEmail: boolean;
  canalPush: boolean;
  updatedAt: string;
}

export interface DdaInsight {
  id: string;
  userId: string;
  tipo:
    | 'gasto-fixo-novo'
    | 'gasto-fixo-aumento'
    | 'duplicado-detectado'
    | 'vencimento-concentrado'
    | 'economia-potencial'
    | 'pagamento-atrasado';
  titulo: string;
  descricao: string;
  valor?: number;
  boletoIds?: string[];
  acao?: string;
  createdAt: string;
  lido: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// SibCoin Missions (contratos compartilhados entre front e Cloud Function)
// ══════════════════════════════════════════════════════════════════════════════

export type MissionFrequency = 'once' | 'daily' | 'weekly' | 'monthly';
export type MissionCategory = 'onboarding' | 'habito' | 'produto' | 'social' | 'especial';

export interface SibcoinMission {
  id: string;
  title: string;
  description: string;
  category: MissionCategory;
  frequency: MissionFrequency;
  reward: number;                     // SibCoin a creditar
  requiredEvent: string;              // evento que dispara a missão
  requiredCount?: number;             // quantas vezes o evento precisa ocorrer
  requiredValue?: number;             // valor mínimo (ex: lançamento > R$100)
  tierRequired?: 'bronze' | 'silver' | 'gold' | 'diamond';
  active: boolean;
  startsAt?: string;
  endsAt?: string;
  iconEmoji?: string;
  createdAt: string;
}

export interface MissionProgress {
  missionId: string;
  userId: string;
  currentCount: number;
  requiredCount: number;
  completedAt?: string;
  lastEventAt?: string;
  periodKey?: string;                 // YYYY-WW para weekly, YYYY-MM para monthly
}

// ══════════════════════════════════════════════════════════════════════════════
// Partner Offers (transversal a todos os módulos)
// ══════════════════════════════════════════════════════════════════════════════

export type PartnerCategory =
  | 'open-finance'
  | 'baas'
  | 'cripto-exchange'
  | 'bureau-cpf'
  | 'afiliado'
  | 'credito'
  | 'seguro'
  | 'consorcio'
  | 'investimento';

export interface PartnerOffer {
  id: string;
  partnerId: string;
  partnerName: string;
  category: PartnerCategory;
  title: string;
  description: string;
  cta: string;
  url?: string;
  logoUrl?: string;
  sibcoinBonus?: number;              // SibCoin extras ao converter
  targetJourneyStage?: string[];
  targetHealthLevel?: string[];
  targetInvestorProfile?: string[];
  active: boolean;
  priority: number;
  createdAt: string;
}
