/**
 * AppContext — fonte única de verdade para auth + dados financeiros.
 *
 * Antes: cada página chamava useAuth() + useFinancialData() separadamente,
 * abrindo múltiplos listeners onSnapshot no mesmo documento Firestore.
 *
 * Agora: App.tsx monta o provider UMA vez; todas as páginas consomem via
 * useAppContext() — zero listeners duplicados.
 *
 * Open Finance: expõe sinais de primeira classe (hasOpenFinance, dataFreshness,
 * verifiedEntries, syncOpenFinance…) para que qualquer componente saiba distinguir
 * dado verificado pelo banco de dado inserido manualmente.
 */
import {
  createContext, useContext, useMemo, useEffect, useRef, useState, useCallback,
  type ReactNode,
} from 'react';
import { httpsCallable } from 'firebase/functions';
import { fnsBR } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { useFinancialData } from '../hooks/useFinancialData';
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
import { buildFinancialProfile } from '../utils/financialProfile';

/** Quão recente é o dado Open Finance do usuário. */
export type DataFreshness = 'fresh' | 'stale' | 'none';
/** < 6 h → fresh; > 6 h mas conectado → stale; não conectado → none */
const OF_STALE_HOURS = 6;

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
  /** Status da conexão Pluggy/OF. */
  openFinanceStatus: UserData['openFinanceStatus'] | null;
  /** ISO string da última sync bem-sucedida. */
  openFinanceSyncedAt: string | null;
  /** Faturas de cartão confirmadas pelo banco (API bills Pluggy). */
  openFinanceCreditBills: OpenFinanceCreditBill[];
  /** Identidade por item Pluggy (CPF mascarado, perfil de investidor…). */
  openFinanceIdentityByItem: Record<string, OpenFinanceIdentitySnapshot>;
  /** IDs dos itens Pluggy conectados. */
  openFinanceItems: string[];
  /** Resumo de consentimentos OF por item. */
  openFinanceConsentsByItem: Record<string, OpenFinanceConsentItemSummary>;
  /** Metadados da última sync Pluggy. */
  openFinanceLastSyncSummary: UserData['openFinanceLastSyncSummary'] | null;
  /** true quando openFinanceStatus === 'ativo'. */
  hasOpenFinance: boolean;
  /**
   * Quão recente é o dado bancário:
   * - 'fresh'  → sincronizado há < 6 h
   * - 'stale'  → conectado mas sync > 6 h atrás
   * - 'none'   → não conectado
   */
  dataFreshness: DataFreshness;
  /** Lançamentos cuja origem foi confirmada pelo Open Finance. */
  verifiedEntries: Entry[];
  /** Lançamentos inseridos manualmente pelo usuário. */
  manualEntries: Entry[];
  /** Dispara sync Pluggy imediato (Cloud Function pluggySyncAccounts). */
  syncOpenFinance: () => Promise<{ ok: boolean; message?: string }>;
  /** true enquanto o sync está em andamento. */
  isSyncing: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const financial = useFinancialData(user?.uid);

  // ── Sync state ────────────────────────────────────────────────────────────
  const [isSyncing, setIsSyncing] = useState(false);

  const syncOpenFinance = useCallback(async (): Promise<{ ok: boolean; message?: string }> => {
    if (!user?.uid) return { ok: false, message: 'Usuário não autenticado' };
    if (isSyncing) return { ok: false, message: 'Sync já em andamento' };
    setIsSyncing(true);
    try {
      const fns = fnsBR;
      const fn = httpsCallable<unknown, { ok: boolean; message?: string }>(fns, 'pluggySyncAccounts');
      const result = await fn({});
      return result.data ?? { ok: true };
    } catch {
      return { ok: false, message: 'Erro ao sincronizar com o banco' };
    } finally {
      setIsSyncing(false);
    }
  }, [user?.uid, isSyncing]);

  // ── Open Finance connected: fire SibCoin once ─────────────────────────────
  const ofFiredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user?.uid) return;
    if (financial.data?.openFinanceStatus !== 'ativo') return;
    const key = `sibcoin_of_${user.uid}`;
    if (ofFiredRef.current === user.uid) return;
    if (localStorage.getItem(key)) { ofFiredRef.current = user.uid; return; }
    ofFiredRef.current = user.uid;
    localStorage.setItem(key, '1');
    const fns = fnsBR;
    httpsCallable(fns, 'triggerSibcoinEvent')({ eventType: 'open_finance_connected' }).catch(() => {});
  }, [user?.uid, financial.data?.openFinanceStatus]);

  // ── Auto-sync: se dados estiverem stale (>6h), dispara uma vez por dia ────
  const autoSyncFiredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user?.uid) return;
    if (financial.data?.openFinanceStatus !== 'ativo') return;
    const syncedAt = financial.data?.openFinanceSyncedAt;
    if (!syncedAt) return; // nunca sincronizou → usuário deve disparar manualmente
    const hoursSince = (Date.now() - new Date(syncedAt).getTime()) / 3_600_000;
    if (hoursSince < OF_STALE_HOURS) return; // ainda fresco
    const today = new Date().toDateString();
    const key = `sib_of_autosync_${user.uid}`;
    if (autoSyncFiredRef.current === today) return;
    if (localStorage.getItem(key) === today) { autoSyncFiredRef.current = today; return; }
    autoSyncFiredRef.current = today;
    localStorage.setItem(key, today);
    // fire-and-forget: o onSnapshot vai atualizar o contexto quando o sync terminar
    const fns = fnsBR;
    httpsCallable(fns, 'pluggySyncAccounts')({}).catch(() => {});
  }, [user?.uid, financial.data?.openFinanceStatus, financial.data?.openFinanceSyncedAt]);

  // ── Login streak ──────────────────────────────────────────────────────────
  const loginFiredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user?.uid) return;
    const today = new Date().toDateString();
    const key = `sibcoin_login_${user.uid}`;
    if (loginFiredRef.current === today) return;
    if (localStorage.getItem(key) === today) { loginFiredRef.current = today; return; }
    loginFiredRef.current = today;
    localStorage.setItem(key, today);
    const fns = fnsBR;
    httpsCallable(fns, 'triggerSibcoinEvent')({ eventType: 'login_streak' }).catch(() => {});
  }, [user?.uid]);

  // ── Valor do contexto ─────────────────────────────────────────────────────
  const value = useMemo<AppContextValue>(
    () => {
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

      // ── Open Finance — derivados ────────────────────────────────────────
      const openFinanceStatus = financial.data?.openFinanceStatus ?? null;
      const openFinanceSyncedAt = financial.data?.openFinanceSyncedAt ?? null;
      const openFinanceCreditBills =
        (financial.data?.openFinanceCreditBills ?? []) as OpenFinanceCreditBill[];
      const openFinanceIdentityByItem =
        (financial.data?.openFinanceIdentityByItem ?? {}) as Record<string, OpenFinanceIdentitySnapshot>;
      const openFinanceItems = financial.data?.openFinanceItems ?? [];
      const openFinanceConsentsByItem =
        (financial.data?.openFinanceConsentsByItem ?? {}) as Record<string, OpenFinanceConsentItemSummary>;
      const openFinanceLastSyncSummary = financial.data?.openFinanceLastSyncSummary ?? null;
      const hasOpenFinance = openFinanceStatus === 'ativo';

      let dataFreshness: DataFreshness = 'none';
      if (hasOpenFinance && openFinanceSyncedAt) {
        const hoursSince =
          (Date.now() - new Date(openFinanceSyncedAt).getTime()) / 3_600_000;
        dataFreshness = hoursSince < OF_STALE_HOURS ? 'fresh' : 'stale';
      }

      // Lançamentos com origem confirmada pelo banco
      const verifiedEntries = financial.entries.filter((e) => e.source === 'open-finance');
      // Lançamentos manuais (sem marcação ou explicitamente manual)
      const manualEntries = financial.entries.filter((e) => e.source !== 'open-finance');

      return {
        user,
        authLoading,
        ...financial,
        avatarURL: financial.data?.avatarURL ?? user?.photoURL ?? null,
        financialProfile,
        // Open Finance
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, authLoading, financial, syncOpenFinance, isSyncing],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** Hook para consumir o contexto em qualquer componente filho. */
export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext deve ser usado dentro de <AppProvider>');
  return ctx;
}
