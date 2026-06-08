/**
 * useAuthContext — seletor focado em auth dentro do AppContext.
 *
 * Componentes que só precisam de `user`, `authLoading` e `avatarURL` devem
 * usar este hook em vez de `useAppContext()` completo.
 *
 * Benefício: quando dados financeiros mudam (Firestore update), esses
 * componentes NÃO re-renderizam — apenas consumidores de `useAppContext()`
 * completo são afetados.
 *
 * Implementação atual: retorna um objeto memoizado com apenas os campos de auth.
 * Migração futura: extrair `AuthContext` próprio (quando valer o esforço de
 * atualizar todos os 43 consumidores do AppContext).
 */

import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';

export function useAuthContext() {
  const { user, authLoading, avatarURL } = useAppContext();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => ({ user, authLoading, avatarURL }), [
    user?.uid,
    authLoading,
    avatarURL,
  ]);
}
