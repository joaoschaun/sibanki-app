import {
  createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, type ReactNode
} from 'react';
import { httpsCallable } from 'firebase/functions';
import { fnsBR } from '../firebase';
import { useAuthContext } from './AuthContext';
import { useFinancialData } from '../hooks/useFinancialData';
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
import { buildFinancialProfile } from '../utils/financialProfile';
import { trackPlatformEvent } from '../services/platformEvents';

export type DataFreshness = 'fresh' | 'stale' | 'none';
const OF_STALE_HOURS = 6;

export interface FinancialDataContextValue {
  data: UserData | null;
  loading: boolean;
  error: Error | null;
  entries: Entry[];
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
  
  // Derivados
  financialProfile: ConsolidatedFinancialProfile;
  avatarURL: string | null | undefined;

  // Open Finance
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
}

const FinancialDataContext = createContext<FinancialDataContextValue | null>(null);

export function FinancialDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const financial = useFinancialData(user?.uid);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncOpenFinance = useCallback(async (): Promise<{ ok: boolean; message?: string }> => {
    if (!user?.uid) return { ok: false, message: 'Usuário não autenticado' };
    if (isSyncing) return { ok: false, message: 'Sync já em andamento' };
    setIsSyncing(true);
    try {
      const fn = httpsCallable<unknown, { ok: boolean; message?: string }>(fnsBR, 'pluggySyncAccounts');
      const result = await fn({});
      return result.data ?? { ok: true };
    } catch {
      return { ok: false, message: 'Erro ao sincronizar com o banco' };
    } finally {
      setIsSyncing(false);
    }
  }, [user?.uid, isSyncing]);

  // Auto-sync
  const autoSyncFiredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user?.uid) return;
    if (financial.data?.openFinanceStatus !== 'ativo') return;
    const syncedAt = financial.data?.openFinanceSyncedAt;
    if (!syncedAt) return;
    const hoursSince = (Date.now() - new Date(syncedAt).getTime()) / 3_600_000;
    if (hoursSince < OF_STALE_HOURS) return;
    const today = new Date().toDateString();
    const key = `sib_of_autosync_${user.uid}`;
    if (autoSyncFiredRef.current === today) return;
    if (localStorage.getItem(key) === today) { autoSyncFiredRef.current = today; return; }
    autoSyncFiredRef.current = today;
    localStorage.setItem(key, today);
    httpsCallable(fnsBR, 'pluggySyncAccounts')({}).catch(() => {});
  }, [user?.uid, financial.data?.openFinanceStatus, financial.data?.openFinanceSyncedAt]);

  // Funil de ativação
  useEffect(() => {
    if (!user?.uid) return;
    if (financial.data?.openFinanceStatus !== 'ativo') return;
    const key = `sib_funnel_of_${user.uid}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    void trackPlatformEvent('activation_of_connected', { source: 'app_context' });
  }, [user?.uid, financial.data?.openFinanceStatus]);

  useEffect(() => {
    if (!user?.uid) return;
    const count = financial.entries?.length ?? 0;
    if (count < 1) return;
    const key = `sib_funnel_entry_${user.uid}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    void trackPlatformEvent('activation_first_entry', { entriesCount: count });
  }, [user?.uid, financial.entries]);

  const value = useMemo<FinancialDataContextValue>(() => {
    const financialProfile = buildFinancialProfile({
      entries: financial.entries,
      goals: financial.goals,
      investments: financial.investments,
      budgets: financial.budgets,
      accounts: financial.accounts,
      accountBalances: financial.accountBalances,
      accountMeta: financial.accountMeta,
      cards: financial.cards,
      recurrents: financial.recurrents,
      investorProfile: financial.investorProfile ?? null,
      creditAccounts: financial.creditAccounts,
      creditObligations: financial.creditObligations,
      creditSnapshot: financial.creditSnapshot,
      data: financial.data as Record<string, unknown> | null,
    });

    const openFinanceStatus = financial.data?.openFinanceStatus ?? null;
    const openFinanceSyncedAt = financial.data?.openFinanceSyncedAt ?? null;
    const openFinanceCreditBills = (financial.data?.openFinanceCreditBills ?? []) as OpenFinanceCreditBill[];
    const openFinanceIdentityByItem = (financial.data?.openFinanceIdentityByItem ?? {}) as Record<string, OpenFinanceIdentitySnapshot>;
    const openFinanceItems = financial.data?.openFinanceItems ?? [];
    const openFinanceConsentsByItem = (financial.data?.openFinanceConsentsByItem ?? {}) as Record<string, OpenFinanceConsentItemSummary>;
    const openFinanceLastSyncSummary = financial.data?.openFinanceLastSyncSummary ?? null;
    const hasOpenFinance = openFinanceStatus === 'ativo';

    let dataFreshness: DataFreshness = 'none';
    if (hasOpenFinance && openFinanceSyncedAt) {
      const hoursSince = (Date.now() - new Date(openFinanceSyncedAt).getTime()) / 3_600_000;
      dataFreshness = hoursSince < OF_STALE_HOURS ? 'fresh' : 'stale';
    }

    const verifiedEntries = financial.entries.filter((e) => e.source === 'open-finance');
    const manualEntries = financial.entries.filter((e) => e.source !== 'open-finance');

    return {
      ...financial,
      avatarURL: financial.data?.avatarURL ?? user?.photoURL ?? null,
      financialProfile,
      openFinanceStatus,
      openFinanceSyncedAt,
      openFinanceCreditBills,
      openFinanceIdentityByItem,
      openFinanceItems,
      openFinanceConsentsByItem,
      openFinanceLastSyncSummary,
      hasOpenFinance,
      dataFreshness,
      verifiedEntries,
      manualEntries,
      syncOpenFinance,
      isSyncing,
    };
  }, [user, financial, syncOpenFinance, isSyncing]);

  return <FinancialDataContext.Provider value={value}>{children}</FinancialDataContext.Provider>;
}

export function useFinancialDataContext(): FinancialDataContextValue {
  const ctx = useContext(FinancialDataContext);
  if (!ctx) throw new Error('useFinancialDataContext deve ser usado dentro de <FinancialDataProvider>');
  return ctx;
}
