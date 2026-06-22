import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { httpsCallable } from 'firebase/functions';
import { fnsBR } from '../firebase';
import { useAuthContext } from './AuthContext';
import { useFinancialDataContext } from './FinancialDataContext';

const SibcoinContext = createContext<null>(null);

export function SibcoinProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const { openFinanceStatus } = useFinancialDataContext();

  // SibCoin: Open Finance connected trigger
  const ofFiredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user?.uid) return;
    if (openFinanceStatus !== 'ativo') return;
    const key = `sibcoin_of_${user.uid}`;
    if (ofFiredRef.current === user.uid) return;
    if (localStorage.getItem(key)) { ofFiredRef.current = user.uid; return; }
    ofFiredRef.current = user.uid;
    localStorage.setItem(key, '1');
    httpsCallable(fnsBR, 'triggerSibcoinEvent')({ eventType: 'open_finance_connected' }).catch(() => {});
  }, [user?.uid, openFinanceStatus]);

  // SibCoin: Login streak trigger
  const loginFiredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user?.uid) return;
    const today = new Date().toDateString();
    const key = `sibcoin_login_${user.uid}`;
    if (loginFiredRef.current === today) return;
    if (localStorage.getItem(key) === today) { loginFiredRef.current = today; return; }
    loginFiredRef.current = today;
    localStorage.setItem(key, today);
    httpsCallable(fnsBR, 'triggerSibcoinEvent')({ eventType: 'login_streak' }).catch(() => {});
  }, [user?.uid]);

  return <SibcoinContext.Provider value={null}>{children}</SibcoinContext.Provider>;
}

export function useSibcoinContext() {
  return useContext(SibcoinContext);
}
