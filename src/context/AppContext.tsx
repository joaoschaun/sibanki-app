/**
 * AppContext — fonte única de verdade para auth + dados financeiros.
 *
 * Antes: cada página chamava useAuth() + useFinancialData() separadamente,
 * abrindo múltiplos listeners onSnapshot no mesmo documento Firestore.
 *
 * Agora: App.tsx monta o provider UMA vez; todas as páginas consomem via
 * useAppContext() — zero listeners duplicados.
 */
import { createContext, useContext, useMemo, useEffect, useRef, type ReactNode } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
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
import type { ConsolidatedFinancialProfile } from '../types/platform';
import { buildFinancialProfile } from '../utils/financialProfile';

interface AppContextValue {
  // ── Auth ──────────────────────────────────────────────────────────────────
  user: User | null;
  authLoading: boolean;
  // ── Firestore data ────────────────────────────────────────────────────────
  data: UserData | null;
  loading: boolean;
  error: Error | null;
  entries: Entry[];
  accounts: string[];
  accountBalances: Record<string, number>;
  accountMeta: Record<string, {
    cor?: string;
    incluirNaSoma?: boolean;
    tipo?: string;
    temChequeEspecial?: boolean;
    chequeEspecialLimite?: number;
    chequeEspecialJurosPct?: number;
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
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const financial = useFinancialData(user?.uid);

  // ── Open Finance connected: fire once when status flips to 'ativo' ────────
  const ofFiredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user?.uid) return;
    if (financial.data?.openFinanceStatus !== 'ativo') return;
    const key = `sibcoin_of_${user.uid}`;
    if (ofFiredRef.current === user.uid) return;
    if (localStorage.getItem(key)) { ofFiredRef.current = user.uid; return; }
    ofFiredRef.current = user.uid;
    localStorage.setItem(key, '1');
    const fns = getFunctions(undefined, 'southamerica-east1');
    const trigger = httpsCallable(fns, 'triggerSibcoinEvent');
    trigger({ eventType: 'open_finance_connected' }).catch(() => {});
  }, [user?.uid, financial.data?.openFinanceStatus]);

  // ── Login streak: fire once per day per uid (fire-and-forget) ────────────
  const loginFiredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user?.uid) return;
    const today = new Date().toDateString();
    const key = `sibcoin_login_${user.uid}`;
    // Already fired this session or already fired today
    if (loginFiredRef.current === today) return;
    if (localStorage.getItem(key) === today) { loginFiredRef.current = today; return; }
    loginFiredRef.current = today;
    localStorage.setItem(key, today);
    const fns = getFunctions(undefined, 'southamerica-east1');
    const trigger = httpsCallable(fns, 'triggerSibcoinEvent');
    trigger({ eventType: 'login_streak' }).catch(() => {});
  }, [user?.uid]);

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

      return {
        user,
        authLoading,
        ...financial,
        avatarURL: financial.data?.avatarURL ?? user?.photoURL ?? null,
        financialProfile,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, authLoading, financial],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** Hook para consumir o contexto em qualquer componente filho. */
export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext deve ser usado dentro de <AppProvider>');
  return ctx;
}
