import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';

interface BiometricGuardProps {
  children: React.ReactNode;
}

export function BiometricGuard({ children }: BiometricGuardProps) {
  const [locked, setLocked] = useState(() => {
    try {
      return (
        Capacitor.isNativePlatform() &&
        localStorage.getItem('sibanki_biometrics_enabled') === 'true'
      );
    } catch {
      return false;
    }
  });

  const triggerBiometricAuth = async () => {
    if (!Capacitor.isNativePlatform()) {
      setLocked(false);
      return;
    }

    try {
      const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
      const available = await NativeBiometric.isAvailable();
      
      if (!available.isAvailable) {
        setLocked(false);
        return;
      }

      await NativeBiometric.verifyIdentity({
        reason: 'Acesse seus dados financeiros no Sibanki',
        title: 'Biometria',
        subtitle: 'Autenticação necessária',
        description: 'Use biometria para desbloquear',
        negativeButtonText: 'Cancelar',
      });
      setLocked(false);
    } catch (err) {
      console.error('[Biometrics] Falha ao autenticar:', err);
      // Mantém bloqueado em caso de erro ou cancelamento
    }
  };

  useEffect(() => {
    if (locked) {
      triggerBiometricAuth();
    }
  }, [locked]);

  // Monitora retorno do background (app resume) no celular
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let sub: { remove: () => void } | undefined;

    const setupAppListener = async () => {
      try {
        const { App } = await import('@capacitor/app');
        sub = await App.addListener('appStateChange', (state) => {
          if (state.isActive && localStorage.getItem('sibanki_biometrics_enabled') === 'true') {
            setLocked(true);
          }
        });
      } catch (err) {
        console.error('[Biometrics] Erro ao registrar listener do App:', err);
      }
    };

    setupAppListener();

    return () => {
      if (sub) {
        sub.remove();
      }
    };
  }, []);

  if (!locked) return <>{children}</>;

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] z-[9999] flex flex-col items-center justify-center p-6 space-y-8 select-none">
      <div className="text-center space-y-2">
        <p className="text-xs font-bold text-si-5 uppercase tracking-[0.2em] mb-1">CFO Pessoal</p>
        <h1 className="text-xl font-bold text-si-1 uppercase tracking-[0.18em]">Sibanki OS</h1>
        <p className="text-xs text-si-4">Dispositivo Bloqueado por Segurança</p>
      </div>

      <div className="relative w-20 h-20 rounded-full border border-si-border flex items-center justify-center bg-si-card shadow-[0_0_50px_rgba(255,255,255,0.02)]">
        <span className="text-3xl filter saturate-50">🔒</span>
      </div>

      <div className="flex flex-col w-full max-w-xs gap-3">
        <button
          type="button"
          onClick={triggerBiometricAuth}
          className="w-full py-3.5 rounded-xl bg-white text-zinc-900 text-sm font-bold transition-all hover:bg-zinc-100 uppercase tracking-wider text-[11px]"
        >
          Desbloquear com Biometria
        </button>
        <button
          type="button"
          onClick={async () => {
            try {
              await signOut(auth);
            } catch (err) {
              console.error('Erro ao deslogar:', err);
            }
          }}
          className="w-full py-3.5 rounded-xl bg-si-over-1 border border-si-border text-si-3 text-sm font-bold transition-all hover:bg-si-over-2 hover:text-si-1 uppercase tracking-wider text-[11px]"
        >
          Usar outra conta / Sair
        </button>
      </div>
    </div>
  );
}
