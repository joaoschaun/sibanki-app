import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { TenantProvider } from './hooks/useTenant';

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
