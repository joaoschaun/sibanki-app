import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { AuthProvider, useAuthContext } from './AuthContext';
import { FinancialDataProvider, useFinancialDataContext } from './FinancialDataContext';
import { SibcoinProvider } from './SibcoinContext';
import type { User } from 'firebase/auth';
import type {
  UserData,
  Entry,
  Recurrent,
  Card,
  Goal,
  Investment,
  CommProfile,
  InvestorProfile,
  CreditAccount,
  CreditObligation,
  CreditSnapshot,
} from '../types/userData';
import type {
  OpenFinanceCreditBill,
  OpenFinanceIdentitySnapshot,
  OpenFinanceConsentItemSummary,
} from '../types/openFinance';
import type { ConsolidatedFinancialProfile } from '../types/platform';
import type { DataFreshness } from './FinancialDataContext';
export type { DataFreshness } from './FinancialDataContext';

export interface AppContextValue {
  // ── Auth ──────────────────────────────────────────────────────────────────
  user: User | null;
  authLoading: boolean;
  // ── Firestore data ────────────────────────────────────────────────────────
  data: UserData | null;
  loading: boolean;
  error: Error | null;
  entries: Entry[];
  /** Lançamentos só no documento users (para gravar; não inclui entriesOverflow). */
  entriesInline: Entry[];
  accounts: string[];
  accountBalances: Record<string, number>;
  accountMeta: Record<string, {
    cor?: string;
    incluirNaSoma?: boolean;
    tipo?: string;
    temChequeEspecial?: boolean;
    chequeEspecialLimite?: number;
    chequeEspecialJurosPct?: number;
    agency?: string;
    accountNumber?: string;
    bankCode?: string;
    bankSlug?: string;
    currency?: string;
    ofStatus?: 'nao-conectado' | 'ativo' | 'erro' | 'expirado';
    source?: string;
    pluggyAccountId?: string;
    pluggyItemId?: string;
  }>;
  cards: Card[];
  goals: Goal[];
  investments: Investment[];
  budgets: Record<string, unknown>;
  categories: string[];
  recurrents: Recurrent[];
  commProfile: CommProfile | null;
  commBookmarks: string[];
  creditAccounts: CreditAccount[];
  creditObligations: CreditObligation[];
  creditSnapshot: CreditSnapshot | null;
  investorProfile: InvestorProfile | undefined;
  score: number;
  achievements: Record<string, { date?: string }>;
  // ── Derivado ──────────────────────────────────────────────────────────────
  avatarURL: string | null | undefined;
  financialProfile: ConsolidatedFinancialProfile;
  // ── Open Finance — sinais de primeira classe ──────────────────────────────
  openFinanceStatus: UserData['openFinanceStatus'] | null;
  openFinanceSyncedAt: string | null;
  openFinanceCreditBills: OpenFinanceCreditBill[];
  openFinanceIdentityByItem: Record<string, OpenFinanceIdentitySnapshot>;
  openFinanceItems: string[];
  openFinanceConsentsByItem: Record<string, OpenFinanceConsentItemSummary>;
  openFinanceLastSyncSummary: UserData['openFinanceLastSyncSummary'] | null;
  hasOpenFinance: boolean;
  dataFreshness: DataFreshness;
  verifiedEntries: Entry[];
  manualEntries: Entry[];
  syncOpenFinance: () => Promise<{ ok: boolean; message?: string }>;
  isSyncing: boolean;
  isAdmin: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

function AppContextFacade({ children }: { children: ReactNode }) {
  const { user, authLoading, isAdmin } = useAuthContext();
  const financialData = useFinancialDataContext();

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      authLoading,
      isAdmin,
      ...financialData,
    }),
    [user, authLoading, isAdmin, financialData]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <FinancialDataProvider>
        <SibcoinProvider>
          <AppContextFacade>{children}</AppContextFacade>
        </SibcoinProvider>
      </FinancialDataProvider>
    </AuthProvider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext deve ser usado dentro de <AppProvider>');
  return ctx;
}
