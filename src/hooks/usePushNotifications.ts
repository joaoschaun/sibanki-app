import { useState, useCallback, useEffect } from 'react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';

interface PushState {
  supported: boolean;
  permission: NotificationPermission | 'default';
  token: string | null;
  loading: boolean;
  error: string | null;
}

export function usePushNotifications(uid: string | undefined) {
  const [state, setState] = useState<PushState>({
    supported: typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator,
    permission: typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default',
    token: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    
    const currentPermission = Notification.permission;
    setState((s) => ({ ...s, permission: currentPermission }));

    if (currentPermission === 'granted' && uid) {
      let isMounted = true;
      const fetchToken = async () => {
        try {
          const { getMessaging, getToken } = await import('firebase/messaging');
          const { default: app } = await import('../firebase');
          const messaging = getMessaging(app);

          const token = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_VAPID_KEY || '',
          });

          if (token && isMounted) {
            setState((s) => ({ ...s, token }));
          }
        } catch (err) {
          console.warn('Erro ao recuperar token FCM no mount:', err);
        }
      };
      fetchToken();
      return () => {
        isMounted = false;
      };
    }
  }, [uid]);

  const requestPermission = useCallback(async () => {
    if (!state.supported || !uid) return;
    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const permission = await Notification.requestPermission();
      setState((s) => ({ ...s, permission }));

      if (permission !== 'granted') {
        setState((s) => ({ ...s, loading: false }));
        return;
      }

      const { getMessaging, getToken } = await import('firebase/messaging');
      const { default: app } = await import('../firebase');
      const messaging = getMessaging(app);

      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_VAPID_KEY || '',
      });

      if (token) {
        await updateDoc(doc(db, 'users', uid), {
          fcmTokens: arrayUnion(token),
          notificacoesPush: true,
        });
        setState((s) => ({ ...s, token, loading: false }));

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
        setState((s) => ({ ...s, loading: false, error: 'Token não gerado. Verifique as permissões do navegador.' }));
      }
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Erro ao configurar notificações.',
      }));
    }
  }, [uid, state.supported]);

  return {
    ...state,
    isEnabled: state.permission === 'granted' && !!state.token,
    requestPermission,
  };
}
