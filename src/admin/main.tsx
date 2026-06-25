import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import '../index.css';
import { TenantProvider } from '../hooks/useTenant';
import { AppProvider, useAppContext } from '../context/AppContext';
import { AdminRoute } from '../components/admin/AdminRoute';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { AdminLogin } from './AdminLogin';
import { AdminLayout } from './AdminLayout';

// Páginas admin (code-split) — mesmas do app, agora num deploy próprio.
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const AdminMetricas = lazy(() => import('../pages/admin/AdminMetricas'));
const AdminUsuarios = lazy(() => import('../pages/admin/AdminUsuarios'));
const AdminHealth = lazy(() => import('../pages/admin/AdminHealth'));
const AdminSibcoin = lazy(() => import('../pages/admin/AdminSibcoin'));
const AdminFlags = lazy(() => import('../pages/admin/AdminFlags'));
const AdminModulos = lazy(() => import('../pages/admin/AdminModulos'));
const AdminPlanos = lazy(() => import('../pages/admin/AdminPlanos'));
const AdminFeedbacks = lazy(() => import('../pages/admin/AdminFeedbacks'));
const AdminSocial = lazy(() => import('../pages/admin/AdminSocial'));
const AdminCalendario = lazy(() => import('../pages/admin/AdminCalendario'));
const AdminBrand = lazy(() => import('../pages/admin/AdminBrand'));

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-si-bg">
      <div className="w-8 h-8 border-2 border-si-border border-t-si-3 rounded-full animate-spin" />
    </div>
  );
}

function AdminApp() {
  const { user, authLoading } = useAppContext();
  if (authLoading) return <Spinner />;
  if (!user) return <AdminLogin />;

  return (
    <div className="min-h-screen bg-si-bg text-si-1 font-sans">
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/" element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<ErrorBoundary><AdminDashboard /></ErrorBoundary>} />
              <Route path="metricas" element={<ErrorBoundary><AdminMetricas /></ErrorBoundary>} />
              <Route path="usuarios" element={<ErrorBoundary><AdminUsuarios /></ErrorBoundary>} />
              <Route path="health" element={<ErrorBoundary><AdminHealth /></ErrorBoundary>} />
              <Route path="sibcoin" element={<ErrorBoundary><AdminSibcoin /></ErrorBoundary>} />
              <Route path="flags" element={<ErrorBoundary><AdminFlags /></ErrorBoundary>} />
              <Route path="modulos" element={<ErrorBoundary><AdminModulos /></ErrorBoundary>} />
              <Route path="planos" element={<ErrorBoundary><AdminPlanos /></ErrorBoundary>} />
              <Route path="feedbacks" element={<ErrorBoundary><AdminFeedbacks /></ErrorBoundary>} />
              <Route path="social" element={<ErrorBoundary><AdminSocial /></ErrorBoundary>} />
              <Route path="calendario" element={<ErrorBoundary><AdminCalendario /></ErrorBoundary>} />
              <Route path="brand" element={<ErrorBoundary><AdminBrand /></ErrorBoundary>} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TenantProvider>
      <AppProvider>
        <BrowserRouter>
          <AdminApp />
        </BrowserRouter>
      </AppProvider>
    </TenantProvider>
  </StrictMode>,
);
