import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { AppProvider, useAppContext } from './context/AppContext';
import { IntelligenceProvider } from './context/IntelligenceContext';
import { ConsultantSessionProvider } from './context/ConsultantSessionContext';
// TenantProvider fica em main.tsx (resolve branding pelo host antes do AppProvider)
import { useUiStore } from './store/useUiStore';
import { useTheme } from './hooks/useTheme';
import { Sidebar, type SidebarOpenGroup } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { AppLoadingScreen } from './components/ui/AppLoadingScreen';
import { OnboardingTour } from './components/ui/OnboardingTour';
import { SibcoinToastContainer } from './components/sibcoin/SibcoinToastContainer';
import { RegistrationWizard } from './components/onboarding/RegistrationWizard';
import { SpotlightTour, GLOBAL_TOUR_STEPS } from './components/ui/SpotlightTour';
import { InstallPrompt } from './components/ui/InstallPrompt';
import { ConsultantDrawer } from './components/consultant/ConsultantDrawer';
import { captureRefParam, useReferral } from './hooks/useReferral';
import { useSmartAlerts } from './hooks/useSmartAlerts';
import Login from './pages/Login';
import { useState, useEffect } from 'react';

captureRefParam();

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
const Filiados     = lazy(() => import('./pages/Filiados'));
const Quarentena   = lazy(() => import('./pages/Quarentena'));
const FilhosPage   = lazy(() => import('./pages/Filhos'));
const CrediAmigo     = lazy(() => import('./pages/CrediAmigo'));
const ConsorcioAmigo = lazy(() => import('./pages/ConsorcioAmigo'));
const Assinaturas    = lazy(() => import('./pages/Assinaturas'));
const Fire           = lazy(() => import('./pages/Fire'));
const Envelope       = lazy(() => import('./pages/Envelope'));
const RelatorioIR    = lazy(() => import('./pages/RelatorioIR'));
const Casal          = lazy(() => import('./pages/Casal'));

// ── Spinner reutilizável para Suspense ───────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-si-border border-t-si-3 rounded-full animate-spin" />
    </div>
  );
}

function OnboardingTourRedirect() {
  const navigate = useNavigate();
  return <OnboardingTour onComplete={() => navigate('/consultor-ia', { replace: true })} />;
}

function FloatingConsultantButton() {
  const location = useLocation();
  const openDrawer = useUiStore((s) => s.openConsultantDrawer);
  const drawerOpen = useUiStore((s) => s.consultantDrawerOpen);

  if (drawerOpen) return null;
  /** Na página do Assistente o painel já está na sidebar e no toggle do header — sem FAB duplicado. */
  if (location.pathname === '/consultor-ia') return null;

  return (
    <button
      type="button"
      onClick={openDrawer}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-si-card border border-si-border-md text-si-1 shadow-lg hover:bg-si-over-2 transition-all duration-200 hover:scale-[1.02]"
      aria-label="Abrir o Assistente"
    >
      <MessageCircle className="w-5 h-5 text-si-3 shrink-0" aria-hidden />
      <span className="text-sm font-medium hidden sm:inline">Falar com o Assistente</span>
    </button>
  );
}

// ── Shell autenticado (usa AppContext — sem chamadas extras de hook) ──────────
function AuthenticatedShell() {
  const location = useLocation();
  const { user, authLoading, score, data, avatarURL, entries, recurrents, budgets, accountBalances } = useAppContext();
  const { theme } = useTheme();
  const { sidebarCollapsed, toggleSidebar, syncRoute } = useUiStore();
  useEffect(() => {
    syncRoute(location.pathname);
  }, [location.pathname, syncRoute]);
  const [sidebarOpenGroup, setSidebarOpenGroup] = useState<SidebarOpenGroup>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const showWizard = user && !authLoading && !(data as any)?.cadastroCompleto;
  const [wizardDismissed, setWizardDismissed] = useState(false);
  const [minSplashTimeDone, setMinSplashTimeDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinSplashTimeDone(true), 3000);
    return () => clearTimeout(t);
  }, []);

  /** Sempre no topo do shell (efeito interno ignora se !user) — não colocar após return condicional. */
  useReferral();

  // Alertas push inteligentes (vencimentos, orçamento, saldo baixo)
  useSmartAlerts({
    entries,
    recurrents,
    budgets: (budgets as Record<string, unknown>) ?? {},
    accountBalances: accountBalances as Record<string, number>,
    uid: user?.uid,
  });

  const handleToggle = () => {
    // Em mobile (< lg): abre/fecha drawer overlay
    // Em desktop: colapsa/expande sidebar normal
    if (window.innerWidth < 1024) {
      setMobileOpen((v) => !v);
    } else {
      toggleSidebar();
      if (!sidebarCollapsed) setSidebarOpenGroup(null);
    }
  };

  const closeMobile = () => setMobileOpen(false);

  if (authLoading || !minSplashTimeDone) {
    return <AppLoadingScreen />;
  }

  if (!user) return <Login />;

  const rootBg = theme === 'light' ? 'bg-zinc-50 text-zinc-950' : 'bg-si-bg text-si-1';

  return (
    <ConsultantSessionProvider>
    <div className={`min-h-screen ${rootBg} font-sans flex overflow-hidden`}>

      {/* ── Mobile: backdrop + drawer overlay ─────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}
      <div
        className={[
          // Mobile: drawer fixo, entra/sai pela esquerda
          'fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <Sidebar
          userName={user.displayName || data?.name || undefined}
          userEmail={user.email || undefined}
          avatarURL={avatarURL ?? undefined}
          score={score}
          collapsed={false}
          openGroup={sidebarOpenGroup}
          setOpenGroup={setSidebarOpenGroup}
        />
      </div>

      {/* ── Desktop: sidebar inline ────────────────────────────────────── */}
      <div className="hidden lg:flex">
        <Sidebar
          userName={user.displayName || data?.name || undefined}
          userEmail={user.email || undefined}
          avatarURL={avatarURL ?? undefined}
          score={score}
          collapsed={sidebarCollapsed}
          openGroup={sidebarOpenGroup}
          setOpenGroup={setSidebarOpenGroup}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header onMenuClick={handleToggle} sidebarCollapsed={sidebarCollapsed} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 lg:space-y-8">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Navigate to="/consultor-ia" replace />} />
              <Route path="/" element={<Navigate to="/consultor-ia" replace />} />
              <Route path="/dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
              <Route path="/contas" element={<ErrorBoundary><Accounts /></ErrorBoundary>} />
              <Route path="/cartoes" element={<Navigate to="/credito/cartoes" replace />} />
              <Route path="/lancamentos" element={<ErrorBoundary><Transactions /></ErrorBoundary>} />
              <Route path="/recorrentes" element={<ErrorBoundary><Recurring /></ErrorBoundary>} />
              <Route path="/transactions" element={<Navigate to="/lancamentos" replace />} />
              {/* Aliases (URLs em inglês / legado / concorrentes) → rotas canônicas PT-BR */}
              <Route path="/settings" element={<Navigate to="/configuracoes" replace />} />
              <Route path="/dashboard/settings" element={<Navigate to="/configuracoes" replace />} />
              <Route path="/my-account" element={<Navigate to="/perfil" replace />} />
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
              {/* Crédito como módulo pai + submódulos por rota */}
              <Route path="/credito" element={<Navigate to="/credito/visao-geral" replace />} />
              <Route path="/credito/visao-geral" element={<ErrorBoundary><CreditHub /></ErrorBoundary>} />
              <Route path="/credito/cartoes" element={<ErrorBoundary><Cards /></ErrorBoundary>} />
              <Route path="/credito/emprestimos" element={<ErrorBoundary><CreditHub /></ErrorBoundary>} />
              <Route path="/credito/plano" element={<ErrorBoundary><CreditHub /></ErrorBoundary>} />
              <Route path="/credito/oportunidades" element={<ErrorBoundary><CreditHub /></ErrorBoundary>} />
              <Route path="/credito/educacao" element={<ErrorBoundary><CreditHub /></ErrorBoundary>} />
              <Route path="/cripto" element={<ErrorBoundary><Cripto /></ErrorBoundary>} />
              <Route path="/loja" element={<ErrorBoundary><Loja /></ErrorBoundary>} />
              <Route path="/meu-cpf" element={<ErrorBoundary><MeuCpf /></ErrorBoundary>} />
              <Route path="/meus-boletos" element={<ErrorBoundary><MeusBoletos /></ErrorBoundary>} />
              <Route path="/sibcoin" element={<ErrorBoundary><Sibcoin /></ErrorBoundary>} />
              <Route path="/filiados" element={<ErrorBoundary><Filiados /></ErrorBoundary>} />
              <Route path="/quarentena" element={<ErrorBoundary><Quarentena /></ErrorBoundary>} />
              <Route path="/filhos" element={<ErrorBoundary><FilhosPage /></ErrorBoundary>} />
              <Route path="/credi-amigo" element={<ErrorBoundary><CrediAmigo /></ErrorBoundary>} />
              <Route path="/consorcio-amigo" element={<ErrorBoundary><ConsorcioAmigo /></ErrorBoundary>} />
              <Route path="/assinaturas" element={<ErrorBoundary><Assinaturas /></ErrorBoundary>} />
              <Route path="/fire" element={<ErrorBoundary><Fire /></ErrorBoundary>} />
              <Route path="/envelope" element={<ErrorBoundary><Envelope /></ErrorBoundary>} />
              <Route path="/relatorio-ir" element={<ErrorBoundary><RelatorioIR /></ErrorBoundary>} />
              <Route path="/casal" element={<ErrorBoundary><Casal /></ErrorBoundary>} />
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
      {/* ── Botão flutuante + drawer do Assistente ───────────────────── */}
      <FloatingConsultantButton />
      <ConsultantDrawer />
      <OnboardingTourRedirect />
      <SibcoinToastContainer />
      <RegistrationWizard
        open={!!showWizard && !wizardDismissed}
        onClose={() => setWizardDismissed(true)}
      />
      <SpotlightTour tourId="global" steps={GLOBAL_TOUR_STEPS} />
      <InstallPrompt uid={user?.uid} />
    </div>
    </ConsultantSessionProvider>
  );
}

// TenantProvider já está em main.tsx — não duplicar aqui
export default function App() {
  return (
    <AppProvider>
      <IntelligenceProvider>
        <BrowserRouter>
          <AuthenticatedShell />
        </BrowserRouter>
      </IntelligenceProvider>
    </AppProvider>
  );
}
