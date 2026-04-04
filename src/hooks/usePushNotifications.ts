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
    if ('Notification' in window) {
      setState((s) => ({ ...s, permission: Notification.permission }));
    }
  }, []);

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
