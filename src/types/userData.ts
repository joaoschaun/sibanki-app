/**
 * Formato do documento users/{uid} no Firestore (mesmo do app atual).
 * Não perdemos nada: todos os campos que o app atual usa ficam aqui.
 */
import type {
  OpenFinanceConsentItemSummary,
  OpenFinanceCreditBill,
  OpenFinanceIdentitySnapshot,
} from './openFinance';
import type { CardPurchaseNew } from '../utils/cardCycleUtils';

// ─────────────────────────────────────────────────────────────────────────────
// PILAR 1 — Alertas de Preço
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Alerta de preço para um ativo B3/cripto.
 *
 * Usado pelo job `checkPriceAlerts` (telegramBot.js) a cada 15 min em dias úteis.
 * TODO: estender o job para também enviar push via pushService.sendPush().
 *
 * Firestore path: users/{uid}.priceAlerts[]
 * Callable CF:   setPriceAlert({ action: 'add'|'remove', alert: PriceAlert })
 */
export interface PriceAlert {
  /** ID único do alerta (gerado com crypto.randomUUID() no cliente). */
  id: string;
  /** Ticker do ativo. Ex: "PETR4", "BTCUSDT". */
  ticker: string;
  /** Nome display opcional. Ex: "Petrobras PN". */
  nome?: string;
  /** Condição do disparo: ">" sobe acima, "<" cai abaixo. */
  condition: '>' | '<';
  /** Preço-alvo em BRL. */
  price: number;
  /** Se o alerta deve se repetir ou ser disparado apenas uma vez. */
  repeat?: boolean;
  /** Canais de notificação desejados. */
  channels?: Array<'telegram' | 'push' | 'email'>;
  /** Timestamp ISO de criação. */
  createdAt: string;
  /** Timestamp ISO do último disparo (preenchido pelo job). */
  lastTriggeredAt?: string;
  /** Quantas vezes o alerta foi disparado. */
  triggerCount?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PILAR 2 — Watchlist
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Item da watchlist — ativo monitorado mas ainda não na carteira.
 *
 * Graham / Bazin pré-calculados no momento da adição (via marketAssetAnalysis CF).
 * A UI pode re-calcular ao abrir, atualizando com cotação atual.
 *
 * Firestore path: users/{uid}.watchlist[]
 * Hook:          useWatchlist.ts (CRUD via persistUserData)
 */
export interface WatchlistItem {
  /** ID único (gerado no cliente). */
  id: string;
  /** Ticker. Ex: "ITUB4". */
  ticker: string;
  /** Nome completo do ativo. */
  nome: string;
  /** Tipo do ativo. */
  tipo: 'Ações' | 'FIIs' | 'ETFs' | 'Criptoativos' | 'Renda Fixa' | 'Outros';
  /** Preço atual no momento da adição (em BRL). */
  precoNaAdicao?: number;
  /** Preço-alvo de compra definido pelo usuário (em BRL). */
  precoAlvo?: number;
  /** Notas do usuário. */
  notas?: string;

  // Análise fundamentalista (snapshot no momento da adição)
  /** Preço justo Graham (√(22.5 × LPA × VPA)). */
  grahamIntrinsicValue?: number;
  /** Desconto/prêmio vs preço justo Graham em %. */
  grahamDiscount?: number;
  /** Teto Bazin (DY anual / 6%). */
  bazinCeiling?: number;
  /** Verdict Graham: "DESCONTO_ATRATIVO" | "PROXIMO_JUSTO" | "ACIMA_DO_JUSTO" | "SEM_DADOS". */
  grahamVerdict?: string;
  /** Verdict Bazin: "ABAIXO_TETO" | "PROXIMO_TETO" | "ACIMA_TETO" | "SEM_DADOS". */
  bazinVerdict?: string;

  // Análise técnica (snapshot)
  /** RSI (14 dias). */
  rsi?: number;
  /** Sinal RSI: "SOBREVENDIDO" | "NEUTRO" | "SOBRECOMPRADO". */
  rsiSignal?: string;

  /** Timestamp ISO de quando foi adicionado à watchlist. */
  addedAt: string;
  /** Timestamp ISO da última atualização dos dados. */
  updatedAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PILAR 3 — Investimentos via Open Finance (Pluggy)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Posição de investimento importada automaticamente via Pluggy.
 * Pluggy suporta contas do tipo INVESTMENT em corretoras (XP, Rico, BTG, etc).
 *
 * Mapeamento automático para Investment (src/types/userData.ts):
 *   - nome  → Investment.nome
 *   - valor → Investment.atual (valor de mercado atualizado)
 *   - tipo  → Investment.tipo (normalizado)
 *
 * Firestore path: users/{uid}.openFinanceInvestments[]
 *                 users/{uid}.openFinanceInvestmentsSyncedAt
 * Callable CF:   pluggySyncInvestments — STUB criado, aguarda ativação pelo suporte Pluggy
 *
 * Endpoint Pluggy (quando ativado):
 *   GET /accounts?type=INVESTMENT&itemId={itemId}
 *   GET /investments?accountId={accountId}
 */
export interface OpenFinanceInvestment {
  /** ID Pluggy da posição. */
  pluggyId: string;
  /** ID do item Pluggy (corretora/banco). */
  pluggyItemId: string;
  /** Nome da corretora/custodiante. Ex: "XP Investimentos". */
  institutionName: string;
  /** Nome do ativo na corretora. */
  nome: string;
  /** ISIN ou código do ativo (quando disponível). */
  isin?: string;
  /** Ticker B3 (quando disponível ou inferido). */
  ticker?: string;
  /** Tipo normalizado para compatibilidade com Investment.tipo. */
  tipo: 'Ações' | 'FIIs' | 'ETFs' | 'Criptoativos' | 'Renda Fixa' | 'Tesouro Direto' | 'CDB' | 'LCI' | 'LCA' | 'Fundo' | 'Outros';
  /** Quantidade de cotas. */
  qtd?: number;
  /** Preço médio de aquisição (quando Pluggy fornecer). */
  precoMedio?: number;
  /** Valor investido (custo histórico). */
  valorAplicado?: number;
  /** Valor atual de mercado. */
  valorAtual: number;
  /** P&L absoluto (quando Pluggy fornecer). */
  pnl?: number;
  /** P&L percentual. */
  pnlPct?: number;
  /** Rendimento bruto acumulado (Renda Fixa). */
  rendimentoBruto?: number;
  /** Data de vencimento (Renda Fixa). */
  vencimento?: string;
  /** Timestamp ISO da última atualização desta posição. */
  syncedAt: string;
  /**
   * Se true, esta posição já foi mesclada com um Investment manual existente.
   * Previne duplicatas na lista de investimentos.
   */
  mergedIntoManual?: boolean;
  /** ID do Investment manual ao qual foi mesclado. */
  mergedIntoId?: number;
}

// ─────────────────────────────────────────────────────────────────────────────

export interface UserData {
  name?: string;
  email?: string;
  updated?: string;
  /** UUID do último write bem-sucedido — usado para deduplicação server-side de retries. */
  _writeId?: string;
  finScore?: number;
  avatarURL?: string | null;
  cadastroCompleto?: {
    rendaEstimada?: string | number;
    reservaEstimada?: string | number;
    criptoEstimada?: string | number;
    gastosEstimados?: string | number;
    [key: string]: any;
  } | null;
  entries?: Entry[];
  accounts?: string[];
  accountBalances?: Record<string, number>;
  accountMeta?: Record<string, {
    cor?: string;
    incluirNaSoma?: boolean;
    tipo?: string;
    temChequeEspecial?: boolean;
    chequeEspecialLimite?: number;
    chequeEspecialJurosPct?: number;
    /** Número da agência (ex: "0001-7") */
    agency?: string;
    /** Número da conta (ex: "12345-8") */
    accountNumber?: string;
    /** Código ISPB / número do banco (ex: "260" para Nubank) */
    bankCode?: string;
    /** Slug identificador do banco oficial */
    bankSlug?: string;
    /** Moeda da conta (ex: "BRL", "USD", "EUR") */
    currency?: string;
    /** Status de conexão Open Finance para esta conta */
    ofStatus?: 'nao-conectado' | 'ativo' | 'erro' | 'expirado';
    /** ID do item Pluggy vinculado a esta conta */
    pluggyItemId?: string;
    /** ID da conta Pluggy */
    pluggyAccountId?: string;
  }>;
  accountCesta?: Record<string, unknown>;
  cards?: Card[];
  goals?: Goal[];
  investments?: Investment[];
  budgets?: Record<string, unknown>;
  orcamentosByMonth?: Record<string, unknown>;
  budgetMode?: 'simples' | 'envelope';
  envelopeMensal?: number;
  budgetHistory?: Record<string, Record<string, number>>;

  categories?: string[];
  recurrents?: Recurrent[];
  commProfile?: CommProfile | null;
  commPosts?: unknown[];
  commBookmarks?: string[];
  tourModulos?: Record<string, unknown>;
  investorProfile?: InvestorProfile | null;
  phone?: string | null;
  whatsappPhone?: string | null;
  financialObjective?: string | null;
  family?: UserFamilyConfig | null;
  creditAccounts?: CreditAccount[];
  creditObligations?: CreditObligation[];
  creditSnapshot?: CreditSnapshot | null;
  /** Preferências de privacidade (Perfil > Privacidade). */
  privacy?: Record<string, boolean>;
  /** Conquistas desbloqueadas: { badgeId: { date: string } } */
  achievements?: Record<string, { date?: string }>;

  // ─── SibCoin ───────────────────────────────────────────────────────────────
  /** Saldo de SibCoin off-chain (Firestore ledger). */
  sibcoinBalance?: number;
  /** Nível de tier do usuário: bronze → silver → gold → diamond. */
  sibcoinTier?: 'bronze' | 'silver' | 'gold' | 'diamond';
  /** Histórico resumido de transações SibCoin (últimas 50). */
  sibcoinHistory?: SibcoinTransaction[];
  /** Endereço da carteira on-chain (Polygon), preenchido quando o usuário faz bridge. */
  sibcoinWalletAddress?: string;
  /** Total de SibCoin ganho por missões (lifetime). */
  sibcoinEarned?: number;
  /** Total de SibCoin gasto/queimado (lifetime). */
  sibcoinSpent?: number;
  /** Missões completadas pelo usuário: { missionId: completedAt ISO }. */
  sibcoinMissionsCompleted?: Record<string, string>;
  /** Contadores de progresso para missões com requiredCount > 1: { "missionId:periodKey": count }. */
  sibcoinProgress?: Record<string, number>;

  // ─── Open Finance ──────────────────────────────────────────────────────────
  /** Legado / Firestore: true quando a conexão Open Finance está ativa (mesmo campo do app web). */
  openBankingAtivo?: boolean;
  /** Status da conexão Open Finance (via Pluggy). */
  openFinanceStatus?: 'nao-conectado' | 'conectando' | 'ativo' | 'erro' | 'expirado';
  /** IDs de itens Pluggy conectados. */
  openFinanceItems?: string[];
  /** Última sincronização Open Finance. */
  openFinanceSyncedAt?: string;
  /**
   * Versão do esquema de dados OF no documento (migrações).
   * @see functions/services/pluggy/openFinanceResourceCatalog.js
   */
  openFinanceDataSchemaVersion?: number;
  /** Identidade por item Pluggy (CPF/CNPJ apenas mascarados). */
  openFinanceIdentityByItem?: Record<string, OpenFinanceIdentitySnapshot>;
  /** Faturas de cartão vindas da API bills (não confundir com DDA). */
  openFinanceCreditBills?: OpenFinanceCreditBill[];
  /** Resumo de consentimentos OF por item. */
  openFinanceConsentsByItem?: Record<string, OpenFinanceConsentItemSummary>;
  /** Metadados da última sync Pluggy (contas, lançamentos novos, investimentos). */
  openFinanceLastSyncSummary?: {
    at: string;
    accounts: number;
    transactionsNew: number;
    investments: number;
    creditCards: number;
    loans: number;
    identityItems?: number;
    creditBills?: number;
    consentsTotal?: number;
    /** Lançamentos Pluggy movidos para subcoleção (limite do documento). */
    entriesArchived?: number;
    periodFrom: string;
    periodTo: string;
  };

  // ─── Arredondamento de Troco (Round-up) ────────────────────────────────────
  roundUpConfig?: RoundUpConfig;

  // ─── Guardião Financeiro ──────────────────────────────────────────────────
  /** Configuração do Guardião Financeiro (F0 — alertas de orçamento ao abrir o app). */
  guardianConfig?: GuardianConfig;

  // ─── Quarentena de Compras ────────────────────────────────────────────────
  quarentena?: QuarentenaItem[];

  // ─── Finanças dos Filhos ──────────────────────────────────────────────────
  filhos?: Filho[];

  // ─── CPF Monitoring ────────────────────────────────────────────────────────
  /** Snapshot do monitoramento CPF. */
  cpfMonitoring?: CpfMonitoringSnapshot | null;

  // ─── DDA ───────────────────────────────────────────────────────────────────
  /** Status do DDA (Débito Direto Autorizado). */
  ddaStatus?: 'nao-ativado' | 'pendente' | 'ativo' | 'erro';
  /** Última sincronização de boletos DDA. */
  ddaSyncedAt?: string;
  /** Boletos sincronizados via DDA ou Open Finance (quando o backend popular). */
  ddaBoletos?: DdaBoleto[];

  // ─── PILAR 1: Alertas de Preço ─────────────────────────────────────────────
  /**
   * Alertas de preço configurados pelo usuário.
   * Verificados a cada 15min pelo job `checkPriceAlerts` (seg–sex, 10h–18h).
   * Dispara via: Telegram (existente) + Push Notification (implementar).
   *
   * Firestore: users/{uid}.priceAlerts[]
   * CF: setPriceAlert (callable) para CRUD
   * CF: checkPriceAlerts (pubsub) para verificação — já existe no telegramBot.js
   *     TODO: adicionar sendPushNotification ao loop de triggers
   */
  priceAlerts?: PriceAlert[];

  // ─── PILAR 2: Watchlist ────────────────────────────────────────────────────
  /**
   * Lista de ativos monitorados que o usuário ainda não possui.
   * Cada item inclui: ticker, alvo de compra (preço), análise Graham/Bazin
   * pré-calculada no momento da adição.
   *
   * Firestore: users/{uid}.watchlist[]
   * CF: nenhuma nova necessária — usa marketAssetAnalysis existente
   * Hook: useWatchlist (CRUD local via persistUserData)
   */
  watchlist?: WatchlistItem[];

  // ─── PILAR 3: Investimentos via Open Finance ────────────────────────────────
  /**
   * Posições de investimento importadas automaticamente via Pluggy.
   * Pluggy suporta contas do tipo INVESTMENT (XP, Rico, BTG, etc).
   * Cada item é mapeado para um Investment regular na carteira.
   *
   * Firestore: users/{uid}.openFinanceInvestments[]
   * Firestore: users/{uid}.openFinanceInvestmentsSyncedAt (ISO string)
   * CF: pluggySyncInvestments (callable) — stub criado, aguarda ativação Pluggy
   *
   * TODO: ativar quando Pluggy habilitar investment accounts para o app_id
   * Endpoint Pluggy: GET /accounts?type=INVESTMENT&itemId={itemId}
   * Endpoint Pluggy: GET /investments?accountId={accountId}
   */
  openFinanceInvestments?: OpenFinanceInvestment[];
  openFinanceInvestmentsSyncedAt?: string;
}

// ─── SibCoin Types ──────────────────────────────────────────────────────────
export type SibcoinEventType =
  | 'mission_completed'
  | 'login_streak'
  | 'entry_added'
  | 'goal_created'
  | 'open_finance_connected'
  | 'profile_completed'
  | 'investment_added'
  | 'budget_created'
  | 'referral_signup'
  | 'store_purchase'
  | 'cashback_received'
  | 'burn_store'
  | 'burn_upgrade'
  | 'bridge_to_polygon'
  | 'admin_credit'
  | 'admin_debit'
  | 'dda_boleto_detected';

export interface SibcoinTransaction {
  id: string;
  type: 'credit' | 'debit' | 'burn' | 'bridge';
  event: SibcoinEventType;
  amount: number;
  balanceAfter: number;
  description: string;
  missionId?: string;
  referenceId?: string;
  createdAt: string;
}

export interface CpfNegativacao {
  id: string;
  credor: string;
  valor: number;
  vencimento: string;
  status: 'ativa' | 'quitada' | 'prescrita';
  origem: string;
}

export interface CpfConsulta {
  id: string;
  empresa: string;
  data: string;
  motivo: string;
}

// ─── CPF Monitoring Types ───────────────────────────────────────────────────
export interface CpfMonitoringSnapshot {
  version: number;
  updatedAt: string;
  score?: number;
  scoreBand?: 'muito-baixo' | 'baixo' | 'regular' | 'bom' | 'excelente';
  scoreSource?: 'serasa' | 'boa-vista' | 'spc' | 'proprio';
  negativacoesCount?: number;
  negativacoesTotal?: number;
  consultasRecentes?: number;
  protecaoAtiva?: boolean;
  alertas?: CpfAlerta[];
  negativacoes?: CpfNegativacao[];
  consultas?: CpfConsulta[];
}

export interface CpfAlerta {
  id: string;
  tipo: 'negativacao' | 'consulta' | 'score-queda' | 'score-alta' | 'protecao';
  descricao: string;
  valor?: number;
  credor?: string;
  detectedAt: string;
  lido: boolean;
}

// ─── DDA / Boleto Types ─────────────────────────────────────────────────────
export interface DdaBoleto {
  id: string;
  barcode: string;
  pagador?: string;
  beneficiario: string;
  descricao?: string;
  valor: number;
  vencimento: string;
  status: 'pendente' | 'pago' | 'vencido' | 'cancelado' | 'agendado';
  categoria?: string;
  recorrente?: boolean;
  source: 'dda' | 'open-finance' | 'manual';
  syncedAt: string;
}

export interface CreditAccount {
  id: string;
  kind:
    | 'cartao'
    | 'emprestimo'
    | 'financiamento'
    | 'consignado'
    | 'cheque-especial'
    | 'credito-garantia'
    | 'outro';
  label: string;
  institution?: string;
  source?: 'manual' | 'open-finance' | 'partner' | 'legacy-derived';
  status?: 'ativo' | 'quitado' | 'atrasado' | 'renegociado' | 'suspenso';
  limitTotal?: number;
  balanceUsed?: number;
  availableLimit?: number;
  monthlyInstallment?: number;
  annualInterestPct?: number;
  closeDay?: number;
  dueDay?: number;
  updatedAt?: string;
  pluggyLoanId?: string;
  pluggyItemId?: string;
  [key: string]: unknown;
}

export interface CreditObligation {
  id: string;
  accountId?: string;
  kind: 'fatura' | 'parcela' | 'emprestimo' | 'financiamento' | 'rotativo' | 'negociacao' | 'outro';
  label: string;
  institution?: string;
  source?: 'manual' | 'open-finance' | 'partner' | 'legacy-derived';
  status?: 'aberta' | 'paga' | 'atrasada' | 'agendada';
  amount: number;
  dueDate: string;
  /**
   * Taxa de juros em **% ao mês** (padrão brasileiro: "juros ao mês"). Ex: 2.5 = 2,5% a.m.
   *
   * SOV-2 (auditoria 26/04/2026): este é o campo CANÔNICO, alinhado com o legado
   * (`public/app/app.js` usa `interestRatePct` em % a.m.) e com a UI de cadastro
   * de obrigação que pede "Juros ao mês (%)".
   *
   * Fallbacks legados que o `sovereigntyEngine.calculateSpreadGap` ainda aceita:
   *  - `interestPct` (mesmo significado, nome antigo no React)
   *  - `interestRate` (campo nunca produzido — só consumido pelo engine antigo)
   * Novo código DEVE usar `interestRatePct`.
   */
  interestRatePct?: number;
  /** @deprecated use `interestRatePct` (mesma unidade: % a.m.). Mantido para retrocompat. */
  interestPct?: number;
  /** @deprecated use `interestRatePct`. Nome legado, ambíguo. */
  interestRate?: number;
  /** CET anual em %, quando disponível (informativo). */
  cetAnnualPct?: number;
  installmentNumber?: number;
  installmentTotal?: number;
  updatedAt?: string;
  pluggyLoanId?: string;
  [key: string]: unknown;
}

export interface CreditSnapshot {
  version: number;
  updatedAt: string;
  accountsCount: number;
  obligationsOpenCount: number;
  totalLimit: number;
  totalUsed: number;
  availableLimit: number;
  cardUtilizationPct: number;
  monthlyDebtCommitment: number;
  dueSoonAmount: number;
  dueSoonCount: number;
  highUtilizationAccounts: number;
  pressureLevel?: 'controlado' | 'atencao' | 'elevado' | 'critico';
  [key: string]: unknown;
}

export interface InvestorProfileAnswers {
  objetivos: 'preservar-capital' | 'crescimento' | 'especulacao';
  horizonte: '<2' | '2-5' | '>5';
  toleranciaQueda: 'baixa' | 'media' | 'alta';
  experiencia: 'iniciante' | 'intermediario' | 'avancado';
  liquidez: 'alta' | 'media' | 'baixa';
  renda: 'baixa' | 'media' | 'alta';
}

export interface InvestorProfile {
  profile: 'conservador' | 'moderado' | 'arrojado';
  score: number;
  version: number;
  updatedAt: string;
  answers: InvestorProfileAnswers;
}

export interface UserFamilyConfig {
  inviteEmail?: string | null;
  role: 'viewer' | 'editor';
  updatedAt: string;
}

export interface CommProfile {
  nickname: string;
  color: string;
  joinedAt?: string;
  photoURL?: string | null;
}

/** Post na coleção Firestore "community" (não no doc do usuário). */
export interface CommPost {
  id: string;
  uid: string;
  nickname: string;
  color: string;
  photoURL?: string | null;
  text: string;
  cat?: string;
  likes?: string[];
  comments?: { nickname: string; color: string; text: string; createdAt: string }[];
  createdAt: string;
}

/** Lançamento recorrente (ex.: aluguel todo dia 10). */
export interface Recurrent {
  id: number;
  type: 'receita' | 'despesa';
  desc: string;
  category?: string;
  value: number;
  account?: string;
  day: number; // 1–31
  freq?: string; // mensal, semanal, quinzenal, bimestral, trimestral, semestral, anual
  active?: boolean;
  // ✅ Campos de duração adicionados
  durationType?: 'indefinido' | 'data' | 'qtd';
  repeatCount?: number;   // nº de repetições (quando durationType='qtd')
  endDate?: string;       // data de término ISO (quando durationType='data')
  [key: string]: unknown;
}

export interface Entry {
  id: number;
  type: 'receita' | 'despesa';
  desc?: string;
  category?: string;
  value: number;
  date: string;
  account?: string;
  tags?: string[] | string;
  status?: string;
  formaPgto?: string;
  isTransfer?: boolean;
  /** IDs Pluggy quando o lançamento veio do Open Finance */
  pluggyTransactionId?: string;
  pluggyAccountId?: string;
  source?: 'open-finance' | 'manual';
  /**
   * Onde o lançamento mora hoje:
   *  - 'inline'        : array entries[] no doc principal
   *  - 'overflow'      : subcoleção entriesOverflow (lançamentos Pluggy quando o doc principal estoura 1MB)
   *  - 'subcollection' : subcoleção entries (escopo do dual-write da migração de entries)
   *
   * PUD-4 (auditoria 26/04/2026): 'subcollection' foi adicionado para remover
   * `(target as any).entryLocation === 'subcollection'` em persistUserData.ts.
   */
  entryLocation?: 'inline' | 'overflow' | 'subcollection';
  [key: string]: unknown;
}

/** Compra na fatura do cartão (billingMonth = YYYY-MM). */
export interface CardPurchase {
  id: number;
  purchaseId?: number;
  desc: string;
  category?: string;
  value: number;
  date: string;
  billingMonth: string;
  parcela?: number;
  totalParcelas?: number;
  totalValue?: number;
  [key: string]: unknown;
}

export interface CardBenefits {
  vipLounge?: boolean;
  vipNetwork?: string;
  vipVisitsPerYear?: number;
  travelInsurance?: boolean;
  purchaseProtection?: boolean;
  extendedWarranty?: boolean;
  concierge?: boolean;
  pointsProgram?: string;
  cashbackPct?: number;
  notes?: string;
  updatedAt?: string;
  source?: 'manual' | 'open-finance' | 'catalog';
}

export interface Card {
  id: number;
  name: string;
  limit: number;
  closeDay: number;
  dueDay: number;
  flag?: string;
  color?: string;
  active?: boolean;
  /** Compras legadas (sem cycleKey) — mantidas para compatibilidade */
  purchases?: CardPurchase[];
  faturas?: unknown[];
  /** Fatura atual aberta (soma das compras do ciclo em andamento) */
  currentBill?: number;
  /** Benefícios declarados pelo usuário (sala VIP, seguros, pontos, etc.). */
  cardBenefits?: CardBenefits;
  /**
   * Compras no novo modelo com cycleKey — alimentadas pelo CardBillingCycle.
   * Substitui `purchases` gradualmente (dual-read enquanto migra).
   */
  purchasesV2?: CardPurchaseNew[];
  /** Ciclos de fatura marcados como pagos pelo usuário (YYYY-MM[]) */
  paidCycles?: string[];
  [key: string]: unknown;
}

export interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  [key: string]: unknown;
}

export interface Investment {
  id: number;
  date: string;
  tipo: string;
  nome: string;
  valor: number;
  atual: number;
  conta?: string;
  entryId?: number;
  precoCompra?: number;
  qtd?: number;
  /** Taxa de rendimento anual declarada em **% a.a.** (ex: 12 = 12% a.a.). */
  taxaAnual?: number;
  /** Indexador original (para Renda Fixa). Ex: 'cdi', 'ipca', 'pre', 'mensal'. */
  indexer?: 'pre' | 'cdi' | 'ipca' | 'mensal';
  /** Valor do indexador. Ex: 105 para 105% do CDI, 6 para IPCA+6%. */
  indexerValue?: number;
  /**
   * Renda passiva mensal estimada deste ativo em R$ (dividendos de FIIs, JCP de ações,
   * etc.). Quando informado, entra em `monthlyPassiveIncome` no cálculo de Ld.
   *
   * SOV-7 (auditoria 26/04/2026): antes só investimentos LÍQUIDOS contavam para
   * renda passiva (rendimento * yield). FIIs/ações com dividendos ficavam de fora.
   * Agora `proventosMensais` é somado quando presente.
   *
   * Origem: preenchido pelo usuário OU automaticamente via BRAPI quando o ativo
   * tem histórico de proventos (média 12 meses).
   */
  proventosMensais?: number;
  [key: string]: unknown;
}

// ─── Round-up (Arredondamento de Troco) ──────────────────────────────────────
export interface RoundUpConfig {
  enabled: boolean;
  roundTo: 1 | 5 | 10;
  cofreTotal: number;
  cofreHistory?: RoundUpEntry[];
}

export interface RoundUpEntry {
  id: number;
  entryId: number;
  originalValue: number;
  roundedValue: number;
  diff: number;
  date: string;
}

// ─── Guardião Financeiro (F0) ────────────────────────────────────────────────

/**
 * Regra de alerta do Guardião.
 * Dispara quando o gasto na `category` atinge `thresholdPct`% do orçamento mensal.
 * Cooldown via localStorage para evitar fadiga de alertas.
 */
export interface GuardianRule {
  id: string;
  /** Categoria do orçamento (deve bater com `budgets` key). */
  category: string;
  /** Label amigável para exibição (pode ser diferente da key do budget). */
  label?: string;
  /** Porcentagem do orçamento que dispara o alerta (ex: 80 = 80%). */
  thresholdPct: number;
  /** Horas de cooldown entre disparos do mesmo alerta (ex: 12 = 12h). */
  cooldownHours: number;
  /** Mensagem personalizada opcional. */
  customMessage?: string;
  enabled: boolean;
}

export interface GuardianConfig {
  /** O Guardião está ativo? */
  enabled: boolean;
  rules: GuardianRule[];
  /** Quando o usuário configurou o Guardião (ISO). */
  configuredAt?: string;
}

// ─── Quarentena de Compras ───────────────────────────────────────────────────
export interface QuarentenaItem {
  id: string;
  descricao: string;
  valor: number;
  categoria?: string;
  criadoEm: string;
  expiraEm: string;
  status: 'pendente' | 'comprado' | 'desistido';
  notificado?: boolean;
}

// ─── Finanças dos Filhos ─────────────────────────────────────────────────────
export interface FilhoTarefa {
  id: string;
  titulo: string;
  recompensa: number;
  frequencia: 'diaria' | 'semanal' | 'mensal' | 'unica';
  completaEm?: string;
  status: 'pendente' | 'completa';
}

export interface Filho {
  id: string;
  nome: string;
  idade: number;
  avatarEmoji?: string;
  mesadaValor: number;
  mesadaFrequencia: 'semanal' | 'quinzenal' | 'mensal';
  saldo: number;
  sibcoinBalance: number;
  tarefas: FilhoTarefa[];
  historico: FilhoTransacao[];
}

export interface FilhoTransacao {
  id: string;
  tipo: 'mesada' | 'tarefa' | 'gasto' | 'bonus';
  descricao: string;
  valor: number;
  date: string;
}
