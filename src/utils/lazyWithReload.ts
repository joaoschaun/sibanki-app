import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * lazyWithReload — `React.lazy` resiliente a deploy.
 *
 * Problema: depois de um deploy, o `index.html` (em cache no navegador/Cloudflare)
 * aponta para hashes de chunk antigos que já foram substituídos. Ao navegar, o
 * `import()` dinâmico falha com "Failed to fetch dynamically imported module" e o
 * usuário vê uma tela de erro até dar hard refresh.
 *
 * Solução: ao detectar esse erro específico de chunk, recarrega a página UMA vez
 * (busca o index.html novo, com os hashes corretos). Um flag em sessionStorage
 * evita loop de reload infinito — se mesmo após o reload o chunk falhar (404 real,
 * não um deploy), o erro é propagado para o ErrorBoundary normalmente.
 *
 * Uso: troque `lazy(() => import('./X'))` por `lazyWithReload(() => import('./X'))`.
 */
const RELOAD_FLAG = 'sib:chunk-reload-attempted';

function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /dynamically imported module|Failed to fetch|Importing a module script failed|error loading dynamically imported|Loading chunk/i.test(
    msg,
  );
}

export function lazyWithReload<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const mod = await factory();
      // Sucesso: limpa o flag para que um futuro chunk stale possa recarregar de novo.
      try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* sessionStorage indisponível */ }
      return mod;
    } catch (err) {
      const alreadyTried = (() => {
        try { return sessionStorage.getItem(RELOAD_FLAG) === '1'; } catch { return false; }
      })();

      if (isChunkLoadError(err) && !alreadyTried) {
        try { sessionStorage.setItem(RELOAD_FLAG, '1'); } catch { /* noop */ }
        window.location.reload();
        // Promise que nunca resolve enquanto a página recarrega (evita flash do erro).
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });
}
