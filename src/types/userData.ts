/**
 * Formato do documento users/{uid} no Firestore (mesmo do app atual).
 * Não perdemos nada: todos os campos que o app atual usa ficam aqui.
 */
export interface UserData {
  name?: string;
  email?: string;
  updated?: string;
  avatarURL?: string | null;
  entries?: Entry[];
  accounts?: string[];
  accountBalances?: Record<string, number>;
  accountMeta?: Record<string, { cor?: string; incluirNaSoma?: boolean; tipo?: string }>;
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
  investorProfile?: InvestorProfile;
  /** Preferências de privacidade (Perfil > Privacidade). */
  privacy?: Record<string, boolean>;
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

export interface Card {
  id: number;
  name: string;
  limit: number;
  closeDay: number;
  dueDay: number;
  flag?: string;
  color?: string;
  active?: boolean;
  purchases?: CardPurchase[];
  faturas?: unknown[];
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
  [key: string]: unknown;
}
