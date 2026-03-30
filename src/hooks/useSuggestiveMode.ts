/**
 * useSuggestiveMode — Modo Sugestivo Sibanki
 *
 * Ação 18 (29/03/2026): expõe o Modo Sugestivo como preferência configurável.
 *
 * O Modo Sugestivo controla se a IA age de forma proativa ou reativa:
 *
 *   ATIVO  (padrão):
 *     - InsightDoDia busca automaticamente proactiveInsightApi ao carregar
 *     - Sugestões contextuais aparecem em páginas relevantes
 *     - Modo de alto engajamento — ideal para usuários em fase de aprendizado
 *
 *   INATIVO:
 *     - InsightDoDia fica em modo silencioso (não faz chamada automática)
 *     - O usuário pode solicitar insights manualmente a qualquer momento
 *     - Modo minimalista — ideal para usuários avançados que preferem controle
 *
 * Persistência: localStorage (key: 'sibanki_suggestive_mode')
 * Valor padrão: true (ativo)
 *
 * Uso:
 *   const { suggestiveMode, toggleSuggestiveMode, setSuggestiveMode } = useSuggestiveMode();
 */

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'sibanki_suggestive_mode';

export function useSuggestiveMode() {
  const [suggestiveMode, setSuggestiveModeState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    // Padrão ativo. Somente 'false' explícito desativa.
    return stored === null ? true : stored !== 'false';
  });

  // Persiste mudanças no localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, String(suggestiveMode));
  }, [suggestiveMode]);

  /** Alterna entre ativo / inativo */
  const toggleSuggestiveMode = () => setSuggestiveModeState((prev) => !prev);

  /** Define o valor explicitamente */
  const setSuggestiveMode = (value: boolean) => setSuggestiveModeState(value);

  return { suggestiveMode, toggleSuggestiveMode, setSuggestiveMode };
}
