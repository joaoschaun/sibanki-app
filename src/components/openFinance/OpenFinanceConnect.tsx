import { useState } from 'react';
import { PluggyConnect } from 'react-pluggy-connect';
import { httpsCallable } from 'firebase/functions';
import { Link2, Loader2 } from 'lucide-react';
import { functions } from '../../firebase';
import { updateUserDoc } from '../../services/persistUserData';
import type { UserData } from '../../types/userData';

type PluggySuccess = { item: { id: string } };

/** Contas trial Pluggy não podem criar itens de produção — só sandbox. Widget precisa listar conectores sandbox. */
function shouldIncludePluggySandbox(): boolean {
  if (import.meta.env.VITE_PLUGGY_INCLUDE_SANDBOX === '0') return false;
  if (import.meta.env.VITE_PLUGGY_INCLUDE_SANDBOX === '1') return true;
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'staging-13a0b.web.app' || h === 'localhost' || h === '127.0.0.1';
}

function friendlyPluggyError(message: string): string {
  if (message.includes('TRIAL_CLIENT_ITEM_CREATE_NOT_ALLOWED')) {
    return 'Conta Pluggy em trial: conecte apenas instituições de teste (sandbox). Escolha um banco marcado como teste no passo do Pluggy, ou peça liberação na Pluggy para itens de produção.';
  }
  return message;
}

/**
 * Inicia o widget Pluggy Connect no próprio app React após obter Connect Token via Cloud Function.
 */
export function OpenFinanceConnect({
  uid,
  data,
  theme,
  disabled,
  onConnected,
}: {
  uid: string;
  data: Partial<UserData> | null | undefined;
  theme: 'light' | 'dark';
  disabled?: boolean;
  /** Callback chamado após conexão + sync bem-sucedidos. */
  onConnected?: () => void;
}) {
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const startConnect = async () => {
    if (!uid || disabled) return;
    setLocalError(null);
    setBusy(true);
    try {
      const fn = httpsCallable<unknown, { accessToken?: string }>(functions, 'pluggyCreateConnectToken');
      const res = await fn({});
      const accessToken = res.data?.accessToken;
      if (!accessToken) throw new Error('Resposta sem token de conexão.');
      setConnectToken(accessToken);
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      const msg = (e as { message?: string })?.message ?? 'Não foi possível iniciar a conexão.';
      if (code === 'functions/failed-precondition') {
        setLocalError(
          'A conexão automática ainda não está disponível (Pluggy não configurado no servidor). Use o app web em /app com a mesma conta.',
        );
      } else {
        setLocalError(friendlyPluggyError(msg));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSuccess = async (payload: PluggySuccess) => {
    const itemId = payload?.item?.id;
    if (!itemId) {
      setConnectToken(null);
      return;
    }
    const prev = data?.openFinanceItems ?? [];
    const next = [...new Set([...prev, itemId])];
    await updateUserDoc(uid, {
      openBankingAtivo: true,
      openFinanceStatus: 'ativo',
      openFinanceItems: next,
      openFinanceSyncedAt: new Date().toISOString(),
    });
    try {
      const reg = httpsCallable(functions, 'registrarOpenBanking');
      await reg({});
    } catch {
      // servidor pode já ter marcado; ignorar
    }
    let syncOk = false;
    try {
      const sync = httpsCallable<unknown, { ok?: boolean; synced?: number; message?: string }>(functions, 'pluggySyncAccounts');
      await sync({});
      syncOk = true;
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? '';
      setLocalError(
        msg
          ? `Conexão ok, mas sincronização de contas falhou: ${msg}`
          : 'Conexão ok, mas não foi possível importar saldos agora. Use “Sincronizar contas” em Configurações.',
      );
    }
    setConnectToken(null);
    if (syncOk) onConnected?.();
  };

  const includeSandbox = shouldIncludePluggySandbox();

  return (
    <div className="flex flex-col items-stretch sm:items-end gap-2 w-full sm:w-auto">
      {localError && (
        <p className="text-[11px] text-rose-400 text-left sm:text-right max-w-[280px] order-first sm:order-none">
          {localError}
        </p>
      )}
      <button
        type="button"
        onClick={startConnect}
        disabled={disabled || busy}
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-si-1 text-sm font-semibold"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Link2 className="w-4 h-4 shrink-0" />}
        Conectar aqui (Open Finance)
      </button>
      {connectToken ? (
        <PluggyConnect
          key={connectToken}
          connectToken={connectToken}
          theme={theme === 'dark' ? 'dark' : 'light'}
          language="pt"
          includeSandbox={includeSandbox}
          onSuccess={handleSuccess}
          onError={(e) => {
            setLocalError(friendlyPluggyError(e.message || 'Erro no fluxo de conexão.'));
            setConnectToken(null);
          }}
          onClose={() => setConnectToken(null)}
        />
      ) : null}
    </div>
  );
}
