import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { TenantProvider } from './hooks/useTenant';

// Resiliência a deploy: se um modulepreload de chunk falhar (hashes trocados após
// deploy), recarrega a página UMA vez. Compartilha o flag com lazyWithReload.ts
// para não entrar em loop de reload.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  try {
    if (sessionStorage.getItem('sib:chunk-reload-attempted') !== '1') {
      sessionStorage.setItem('sib:chunk-reload-attempted', '1');
      window.location.reload();
    }
  } catch { /* sessionStorage indisponível — não recarrega */ }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TenantProvider>
      <App />
    </TenantProvider>
  </StrictMode>
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
