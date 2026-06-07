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

export interface UserData {
  name?: string;
  email?: string;
  updated?: string;
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
  categories?: string[];
  recurrents?: Recurrent[];
  commProfile?: CommProfile | null;
  commPosts?: unknown[];
  commBookmarks?: string[];
  tourModulos?: Record<string, unknown>;
  investorProfile?: InvestorProfile | null;
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
