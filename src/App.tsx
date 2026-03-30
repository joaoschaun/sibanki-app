import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
/**
 * Acao 6 (29/03/2026): Multi-tenant rollout.
 * TenantProvider resolve o tenant pelo host, aplica branding (CSS vars,
 * favicon, document.title, custom CSS) e expoe features flags.
 * Para o dominio principal (sibanki.com.br) usa fallback DEFAULT_BRANDING.
 */
import { TenantProvider } from './hooks/useTenant';
import { useUiStore } from './store/useUiStore';
import { useTheme } from './hooks/useTheme';
import { Sidebar, type SidebarOpenGroup } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { OnboardingTour } from './components/ui/OnboardingTour';
import { BriefingModal } from './components/ui/BriefingModal';
import { SibcoinToastContainer } from './components/sibcoin/SibcoinToastContainer';
import Login from './pages/Login';
import { useState } from 'react';

// ── Lazy-loaded pages (code splitting — cada rota vira chunk separado) ──────
const Dashboard   = lazy(() => import('./pages/Dashboard'));
const Transactions= lazy(() => import('./pages/Transactions'));
const Recurring   = lazy(() => import('./pages/Recurring'));
const Accounts    = lazy(() => import('./pages/Accounts'));
const Cards       = lazy(() => import('./pages/Cards'));
const Planning    = lazy(() => import('./pages/Planning'));
const Budget      = lazy(() => import('./pages/Budget'));
const Growth      = lazy(() => import('./pages/Growth'));
const Tools       = lazy(() => import('./pages/Tools'));
const Social      = lazy(() => import('./pages/Social'));
const Consultant  = lazy(() => import('./pages/Consultant'));
const Education   = lazy(() => import('./pages/Education'));
const Profile     = lazy(() => import('./pages/Profile'));
const Settings    = lazy(() => import('./pages/Settings'));
const Reports     = lazy(() => import('./pages/Reports'));
const Calendar    = lazy(() => import('./pages/Calendar'));
const Achievements= lazy(() => import('./pages/Achievements'));
const NotFound    = lazy(() => import('./pages/NotFound'));
const SolucaoCredito = lazy(() => import('./pages/solutions/SolucaoCredito'));
const SolucaoConsorcio = lazy(() => import('./pages/solutions/SolucaoConsorcio'));
const SolucaoSeguro = lazy(() => import('./pages/solutions/SolucaoSeguro'));
const SolucaoInvestimentosParceiros = lazy(() => import('./pages/solutions/SolucaoInvestimentosParceiros'));
// ── Novos módulos de expansão ────────────────────────────────────────────────
const Cripto       = lazy(() => import('./pages/Cripto'));
const Loja         = lazy(() => import('./pages/Loja'));
const MeuCpf       = lazy(() => import('./pages/MeuCpf'));
const MeusBoletos  = lazy(() => import('./pages/MeusBoletos'));
const Sibcoin      = lazy(() => import('./pages/Sibcoin'));
// Acao 12 (29/03/2026): Hub de Credito — visao consolidada do passivo financeiro
const CreditHub    = lazy(() => import('./pages/CreditHub'));

// ── Spinner reutilizável para Suspense ───────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );
}

function OnboardingTourRedirect() {
  const navigate = useNavigate();
  return <OnboardingTour onComplete={() => navigate('/lancamentos', { replace: true })} />;
}

// ── Shell autenticado (usa AppContext — sem chamadas extras de hook) ──────────
function AuthenticatedShell() {
  const { user, authLoading, score, data, avatarURL } = useAppContext();
  const { theme } = useTheme();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const [sidebarOpenGroup, setSidebarOpenGroup] = useState<SidebarOpenGroup>(null);

  const handleToggle = () => {
    toggleSidebar();
    if (!sidebarCollapsed) setSidebarOpenGroup(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-si-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Login />;

  const rootBg = theme === 'light' ? 'bg-zinc-50 text-zinc-950' : 'bg-si-bg text-si-1';

  return (
    <div className={`min-h-screen ${rootBg} font-sans flex overflow-hidden`}>
      <Sidebar
        userName={user.displayName || data?.name || undefined}
        userEmail={user.email || undefined}
        avatarURL={avatarURL ?? undefined}
        score={score}
        collapsed={sidebarCollapsed}
        openGroup={sidebarOpenGroup}
        setOpenGroup={setSidebarOpenGroup}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header onMenuClick={handleToggle} sidebarCollapsed={sidebarCollapsed} />
        <main className="flex-1 overflow-y-auto p-8 space-y-8">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
              <Route path="/contas" element={<ErrorBoundary><Accounts /></ErrorBoundary>} />
              <Route path="/cartoes" element={<ErrorBoundary><Cards /></ErrorBoundary>} />
              <Route path="/lancamentos" element={<ErrorBoundary><Transactions /></ErrorBoundary>} />
              <Route path="/recorrentes" element={<ErrorBoundary><Recurring /></ErrorBoundary>} />
              <Route path="/transactions" element={<Navigate to="/lancamentos" replace />} />
              <Route path="/planejamento" element={<ErrorBoundary><Planning /></ErrorBoundary>} />
              <Route path="/orcamento" element={<ErrorBoundary><Budget /></ErrorBoundary>} />
              <Route path="/crescimento" element={<ErrorBoundary><Growth /></ErrorBoundary>} />
              <Route path="/ferramentas" element={<ErrorBoundary><Tools /></ErrorBoundary>} />
              <Route path="/social" element={<ErrorBoundary><Social /></ErrorBoundary>} />
              <Route path="/consultor-ia" element={<ErrorBoundary><Consultant /></ErrorBoundary>} />
              <Route path="/educacao" element={<ErrorBoundary><Education /></ErrorBoundary>} />
              <Route path="/solucoes/credito" element={<ErrorBoundary><SolucaoCredito /></ErrorBoundary>} />
              <Route path="/solucoes/consorcio" element={<ErrorBoundary><SolucaoConsorcio /></ErrorBoundary>} />
              <Route path="/solucoes/seguro" element={<ErrorBoundary><SolucaoSeguro /></ErrorBoundary>} />
              <Route path="/solucoes/investimentos" element={<ErrorBoundary><SolucaoInvestimentosParceiros /></ErrorBoundary>} />
              {/* ── Novos módulos de expansão ──────────────────────────────── */}
              {/* Acao 12: Hub de Credito */}
              <Route path="/credito" element={<ErrorBoundary><CreditHub /></ErrorBoundary>} />
              <Route path="/cripto" element={<ErrorBoundary><Cripto /></ErrorBoundary>} />
              <Route path="/loja" element={<ErrorBoundary><Loja /></ErrorBoundary>} />
              <Route path="/meu-cpf" element={<ErrorBoundary><MeuCpf /></ErrorBoundary>} />
              <Route path="/meus-boletos" element={<ErrorBoundary><MeusBoletos /></ErrorBoundary>} />
              <Route path="/sibcoin" element={<ErrorBoundary><Sibcoin /></ErrorBoundary>} />
              <Route path="/perfil" element={<ErrorBoundary><Profile /></ErrorBoundary>} />
              <Route path="/configuracoes" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
              <Route path="/relatorios" element={<ErrorBoundary><Reports /></ErrorBoundary>} />
              <Route path="/calendario" element={<ErrorBoundary><Calendar /></ErrorBoundary>} />
              <Route path="/conquistas" element={<ErrorBoundary><Achievements /></ErrorBoundary>} />
              <Route path="*" element={<ErrorBoundary><NotFound /></ErrorBoundary>} />
            </Routes>
          </Suspense>
        </main>
      </div>
      <OnboardingTourRedirect />
      <BriefingModal />
      <SibcoinToastContainer />
    </div>
  );
}

// Acao 6 (29/03/2026): TenantProvider externo resolve branding antes do AppProvider
export default function App() {
  return (
    <TenantProvider>
      <AppProvider>
        <BrowserRouter>
          <AuthenticatedShell />
        </BrowserRouter>
      </AppProvider>
    </TenantProvider>
  );
}
