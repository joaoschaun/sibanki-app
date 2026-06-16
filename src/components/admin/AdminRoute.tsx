import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { useAppContext } from '../../context/AppContext';
import { fnsUS } from '../../firebase';

interface AdminRouteProps {
  children?: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, authLoading, isAdmin } = useAppContext();
  const [checking, setChecking] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setDenied(true);
      return;
    }
    if (isAdmin) {
      setChecking(false);
      setDenied(false);
      return;
    }

    // User is logged in but the client token doesn't have the admin claim yet.
    // Call the validation cloud function and force token refresh on success.
    let active = true;
    setChecking(true);

    async function performValidation() {
      try {
        const validate = httpsCallable(fnsUS, 'validateAdminAccess');
        await validate();
        
        // Force refresh user token to pick up the newly set custom claims
        await user!.getIdToken(true);
      } catch (err) {
        console.warn('[AdminRoute] Admin validation failed:', err);
        if (active) {
          setDenied(true);
        }
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    }

    performValidation();

    return () => {
      active = false;
    };
  }, [user, authLoading, isAdmin]);

  if (authLoading || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-si-bg">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-si-3 animate-spin" />
          <span className="text-[10px] font-bold tracking-[0.2em] text-si-4 uppercase text-si-3">Verificando credenciais...</span>
        </div>
      </div>
    );
  }

  if (!user || denied || !isAdmin) {
    return (
      <div className="min-h-screen bg-si-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-si-card border border-si-border-md rounded-2xl p-8 text-center space-y-6 animate-in fade-in duration-300">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-950/30 border border-red-500/20 flex items-center justify-center text-red-500">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-lg font-bold tracking-[0.2em] text-si-1 uppercase">
              Acesso Restrito
            </h1>
            <p className="text-xs text-si-3 leading-relaxed">
              Você não tem permissão para acessar esta área. Este painel é reservado exclusivamente para administradores do Sibanki.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.location.replace('/')}
            className="w-full py-3 px-4 rounded-xl bg-si-over-2 hover:bg-si-over-3 border border-si-border text-xs font-bold tracking-[0.18em] text-si-1 uppercase transition-all duration-200"
          >
            Voltar para o Início
          </button>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
}
