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

import { useAuthContext as useRealAuthContext } from '../context/AuthContext';

export function useAuthContext() {
  return useRealAuthContext();
}

