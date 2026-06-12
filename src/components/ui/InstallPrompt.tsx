import { useState, useEffect, useCallback } from 'react';
import { Download, X, Bell } from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'sibanki_install_dismissed';
const PUSH_DISMISS_KEY = 'sibanki_push_dismissed';

export function InstallPrompt({ uid }: { uid?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showPush, setShowPush] = useState(false);
  const push = usePushNotifications(uid);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if (localStorage.getItem(PUSH_DISMISS_KEY)) return;
    if (!push.supported || push.permission === 'granted' || push.permission === 'denied') return;
    const timer = setTimeout(() => setShowPush(true), 10000);
    return () => clearTimeout(timer);
  }, [push.supported, push.permission]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstall(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const dismissInstall = useCallback(() => {
    setShowInstall(false);
    localStorage.setItem(DISMISS_KEY, '1');
  }, []);

  const handlePush = useCallback(async () => {
    await push.requestPermission();
    setShowPush(false);
    localStorage.setItem(PUSH_DISMISS_KEY, '1');
  }, [push]);

  const dismissPush = useCallback(() => {
    setShowPush(false);
    localStorage.setItem(PUSH_DISMISS_KEY, '1');
  }, []);

  if (!showInstall && !showPush) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 space-y-3">
      {showInstall && (
        <div className="bg-si-card border border-si-border rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-si-1">Instalar Sibanki</p>
              <p className="text-xs text-si-5 mt-0.5">Acesse mais rápido direto da tela inicial do seu celular.</p>
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={handleInstall}
                  className="px-4 py-1.5 rounded-lg bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-bold">
                  Instalar
                </button>
                <button type="button" onClick={dismissInstall}
                  className="px-3 py-1.5 rounded-lg bg-si-over-2 text-si-4 text-xs hover:bg-si-over-3">
                  Agora não
                </button>
              </div>
            </div>
            <button type="button" onClick={dismissInstall} className="text-si-5 hover:text-si-3" title="Fechar">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {showPush && (
        <div className="bg-si-card border border-si-border rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-si-1">Ativar notificações</p>
              <p className="text-xs text-si-5 mt-0.5">Receba alertas de orçamento, faturas e insights financeiros.</p>
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={handlePush} disabled={push.loading}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50">
                  {push.loading ? 'Ativando…' : 'Ativar'}
                </button>
                <button type="button" onClick={dismissPush}
                  className="px-3 py-1.5 rounded-lg bg-si-over-2 text-si-4 text-xs hover:bg-si-over-3">
                  Depois
                </button>
              </div>
            </div>
            <button type="button" onClick={dismissPush} className="text-si-5 hover:text-si-3" title="Fechar">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
