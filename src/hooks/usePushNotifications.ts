import { useCallback, useEffect } from 'react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { useUiStore } from '../store/useUiStore';


function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMsg));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

export function usePushNotifications(uid: string | undefined) {
  const state = useUiStore((s) => s.pushState);
  const setPushState = useUiStore((s) => s.setPushState);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    
    const currentPermission = Notification.permission;
    setPushState({ permission: currentPermission });

    if (currentPermission === 'granted' && uid) {
      let isMounted = true;
      const fetchToken = async () => {
        try {
          console.log('[PushTelemetry-Mount] 1. Starting auto-fetch token');
          const { getMessaging, getToken } = await import('firebase/messaging');
          const { default: app } = await import('../firebase');
          console.log('[PushTelemetry-Mount] 2. Firebase modules loaded');
          const messaging = getMessaging(app);

          // Registra o Service Worker explicitamente e aguarda ele ficar ativo/pronto com timeout de 10s
          console.log('[PushTelemetry-Mount] 3. Registering service worker /sw.js');
          const token = await withTimeout(
            (async () => {
              const registration = await navigator.serviceWorker.register('/sw.js');
              console.log('[PushTelemetry-Mount] 4. Service worker registered. Waiting for ready...');
              await navigator.serviceWorker.ready;
              console.log('[PushTelemetry-Mount] 5. Service worker ready. Requesting FCM token...');
              const tk = await getToken(messaging, {
                vapidKey: import.meta.env.VITE_VAPID_KEY || '',
                serviceWorkerRegistration: registration,
              });
              console.log('[PushTelemetry-Mount] 6. FCM token retrieved:', tk ? 'yes (length: ' + tk.length + ')' : 'no');
              return tk;
            })(),
            10000,
            'Tempo limite esgotado ao buscar token de push.'
          );

          if (token && isMounted) {
            setPushState({ token });
            console.log('[PushTelemetry-Mount] 7. State updated with token');
          }
        } catch (err) {
          console.error('[PushTelemetry-Mount] ERROR:', err);
          console.error('[usePushNotifications] Erro ao recuperar token FCM no mount:', err);
        }
      };
      fetchToken();
      return () => {
        isMounted = false;
      };
    }
  }, [uid, setPushState]);

  const requestPermission = useCallback(async () => {
    if (!state.supported || !uid) {
      console.log('[PushTelemetry-Manual] requestPermission aborted: supported =', state.supported, ', uid =', uid);
      return;
    }
    console.log('[PushTelemetry-Manual] 1. Requesting notification permission...');
    setPushState({ loading: true, error: null });

    try {
      const permission = await Notification.requestPermission();
      console.log('[PushTelemetry-Manual] 2. Permission result:', permission);
      setPushState({ permission });

      if (permission !== 'granted') {
        console.log('[PushTelemetry-Manual] 3. Permission denied/dismissed. Exiting.');
        setPushState({ loading: false });
        return;
      }

      console.log('[PushTelemetry-Manual] 4. Importing Firebase modules...');
      const { getMessaging, getToken } = await import('firebase/messaging');
      const { default: app } = await import('../firebase');
      console.log('[PushTelemetry-Manual] 5. Modules loaded. Initializing messaging.');
      const messaging = getMessaging(app);

      // Registra o Service Worker explicitamente e aguarda ele ficar ativo/pronto com timeout de 15s
      console.log('[PushTelemetry-Manual] 6. Registering service worker /sw.js...');
      const token = await withTimeout(
        (async () => {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('[PushTelemetry-Manual] 7. Service worker registered. Waiting for ready...');
          await navigator.serviceWorker.ready;
          console.log('[PushTelemetry-Manual] 8. Service worker ready. Calling getToken...');
          const tk = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_VAPID_KEY || '',
            serviceWorkerRegistration: registration,
          });
          console.log('[PushTelemetry-Manual] 9. getToken finished. Token length:', tk ? tk.length : 0);
          return tk;
        })(),
        15000,
        'Tempo limite excedido ao registrar no serviço de notificações (15s).'
      );

      if (token) {
        console.log('[PushTelemetry-Manual] 10. Saving token to Firestore users/' + uid + '...');
        // Grava no Firestore com timeout de 10s
        await withTimeout(
          updateDoc(doc(db, 'users', uid), {
            fcmTokens: arrayUnion(token),
            notificacoesPush: true,
          }),
          10000,
          'Tempo limite excedido ao salvar token no banco de dados (10s).'
        );
        console.log('[PushTelemetry-Manual] 11. Firestore update successful. Updating pushState...');
        setPushState({ token, loading: false });

        // Dispara uma notificação local imediata de confirmação
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification("Notificações Ativas! 📈", {
              body: "Você receberá alertas de orçamento e insights financeiros diretamente aqui.",
              icon: "/icon-192.svg",
              badge: "/icon-192.svg"
            });
          } catch (e) {
            console.warn('Erro ao disparar notificação local:', e);
          }
        }
      } else {
        console.warn('[PushTelemetry-Manual] getToken returned empty token');
        setPushState({ loading: false, error: 'Token não gerado. Verifique as permissões do navegador.' });
      }
    } catch (err) {
      console.error('[PushTelemetry-Manual] ERROR caught:', err);
      console.error('[usePushNotifications] Erro ao ativar push notifications:', err);
      setPushState({
        loading: false,
        error: err instanceof Error ? err.message : 'Erro ao configurar notificações.',
      });
    }
  }, [uid, state.supported, setPushState]);

  return {
    ...state,
    isEnabled: state.permission === 'granted' && !!state.token,
    requestPermission,
  };
}
