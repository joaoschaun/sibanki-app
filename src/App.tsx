import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { AppProvider, useAppContext } from './context/AppContext';
import { IntelligenceProvider } from './context/IntelligenceContext';
import { ConsultantSessionProvider } from './context/ConsultantSessionContext';
// TenantProvider fica em main.tsx (resolve branding pelo host antes do AppProvider)
import { useUiStore } from './store/useUiStore';
import { useTheme } from './hooks/useTheme';
import { Sidebar, type SidebarOpenGroup } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { AppLoadingScreen } from './components/ui/AppLoadingScreen';
import { SibcoinToastContainer } from './components/sibcoin/SibcoinToastContainer';
import { RegistrationWizard } from './components/onboarding/RegistrationWizard';
import { InstallPrompt } from './components/ui/InstallPrompt';
import { ConsultantDrawer } from './components/consultant/ConsultantDrawer';
import { useGuardian } from './hooks/useGuardian';
import { GuardianAlertModal } from './components/guardian/GuardianAlertModal';
import { captureRefParam, useReferral } from './hooks/useReferral';
import { AdminRoute } from './components/admin/AdminRoute';
import { useModuleFlags } from './hooks/useModuleFlags';
import { matchModuleByPath } from './constants/appModules';
import { trackPlatformEvent } from './services/platformEvents';

import Login from './pages/Login';
import { useState, useEffect } from 'react';

captureRefParam();

// Dedupe de telemetria module_viewed: 1 evento por módulo por sessão (carga da página).
const sentModuleViews = new Set<string>();

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
const Home         = lazy(() => import('./pages/Home'));
const Casal        = lazy(() => import('./pages/Casal'));
const Loja         = lazy(() => import('./pages/Loja'));
const MeuCpf       = lazy(() => import('./pages/MeuCpf'));
const MeusBoletos  = lazy(() => import('./pages/MeusBoletos'));
const Sibcoin      = lazy(() => import('./pages/Sibcoin'));
// Acao 12 (29/03/2026): Hub de Credito — visao consolidada do passivo financeiro
const CreditHub    = lazy(() => import('./pages/CreditHub'));
const Filiados     = lazy(() => import('./pages/Filiados'));
const Quarentena   = lazy(() => import('./pages/Quarentena'));
const CrediAmigo        = lazy(() => import('./pages/CrediAmigo'));
const ConsorcioAmigo    = lazy(() => import('./pages/ConsorcioAmigo'));
const AceitarEmprestimo = lazy(() => import('./pages/AceitarEmprestimo'));
const AceitarGrupo      = lazy(() => import('./pages/AceitarGrupo'));
const Assinaturas       = lazy(() => import('./pages/Assinaturas'));
const Fire              = lazy(() => import('./pages/Fire'));
const RelatorioIR       = lazy(() => import('./pages/RelatorioIR'));

// ── Admin pages ─────────────────────────────────────────────────────────────
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminMetricas   = lazy(() => import('./pages/admin/AdminMetricas'));
const AdminUsuarios   = lazy(() => import('./pages/admin/AdminUsuarios'));
const AdminFlags      = lazy(() => import('./pages/admin/AdminFlags'));
const AdminModulos    = lazy(() => import('./pages/admin/AdminModulos'));
const AdminPlanos     = lazy(() => import('./pages/admin/AdminPlanos'));
const AdminFeedbacks  = lazy(() => import('./pages/admin/AdminFeedbacks'));
const AdminSocial     = lazy(() => import('./pages/admin/AdminSocial'));
const AdminCalendario = lazy(() => import('./pages/admin/AdminCalendario'));
const AdminBrand      = lazy(() => import('./pages/admin/AdminBrand'));

// ── Spinner reutilizável para Suspense ───────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-si-border border-t-si-3 rounded-full animate-spin" />
    </div>
  );
}

/**
 * ModuleGuard — bloqueia acesso direto (URL) a um módulo desligado pelo admin.
 * Redireciona para o Painel. Essenciais e rotas sem módulo passam livremente.
 */
function ModuleGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isModuleEnabled, loaded } = useModuleFlags();
  if (loaded) {
    const mod = matchModuleByPath(location.pathname);
    if (mod && !mod.essential && !isModuleEnabled(mod.key)) {
      return <Navigate to="/dashboard" replace />;
    }
  }
  return <>{children}</>;
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
      title="Falar com o Assistente"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-12 h-12 rounded-full bg-si-card border border-si-border-md text-si-1 shadow-lg hover:bg-si-over-2 transition-all duration-200 hover:scale-105"
      aria-label="Abrir o Assistente"
    >
      <MessageCircle className="w-5 h-5 text-si-2 shrink-0" aria-hidden />
    </button>
  );
}

// ── Shell autenticado (usa AppContext — sem chamadas extras de hook) ──────────
function AuthenticatedShell() {
  const location = useLocation();
  const { user, authLoading, score, data, avatarURL } = useAppContext();
  const { theme } = useTheme();
  const { sidebarCollapsed, toggleSidebar, syncRoute } = useUiStore();
  useEffect(() => {
    syncRoute(location.pathname);
  }, [location.pathname, syncRoute]);

  // Telemetria de navegação: uso real por módulo (1x por módulo por sessão —
  // alimenta as métricas do admin via platform_events; baixo custo).
  useEffect(() => {
    if (!user) return;
    const mod = matchModuleByPath(location.pathname);
    if (!mod || sentModuleViews.has(mod.key)) return;
    sentModuleViews.add(mod.key);
    trackPlatformEvent('module_viewed', { module: mod.key });
  }, [location.pathname, user]);
  const [sidebarOpenGroup, setSidebarOpenGroup] = useState<SidebarOpenGroup>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const showWizard = user && !authLoading && !(data as any)?.cadastroCompleto;
  /** "Depois" do wizard persiste por usuário (7 dias) — antes era state volátil e o modal voltava a cada reload. */
  const wizardKey = user ? `sib_wizard_adiado_${user.uid}` : '';
  const [wizardDismissed, setWizardDismissed] = useState(false);
  useEffect(() => {
    if (!wizardKey) return;
    try {
      const t = Number(localStorage.getItem(wizardKey) || 0);
      setWizardDismissed(Date.now() - t < 7 * 24 * 60 * 60 * 1000);
    } catch { /* localStorage indisponível — segue volátil */ }
  }, [wizardKey]);
  const [minSplashTimeDone, setMinSplashTimeDone] = useState(false);

  // Splash mínimo de 1,2s (suficiente para mostrar o vídeo/logo sem bloquear usuários)
  useEffect(() => {
    const t = setTimeout(() => setMinSplashTimeDone(true), 1200);
    return () => clearTimeout(t);
  }, []);

  /** Sempre no topo do shell (efeito interno ignora se !user) — não colocar após return condicional. */
  useReferral();
  const { alert: guardianAlert, dismissAlert } = useGuardian();



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

  // Rotas públicas — acessíveis sem autenticação (links de convite CrediAmigo/Consórcio)
  const publicPaths = ['/aceitar/emprestimo/', '/aceitar/grupo/'];
  if (publicPaths.some((p) => window.location.pathname.startsWith(p))) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-si-bg"><div className="w-8 h-8 border-2 border-si-border border-t-si-3 rounded-full animate-spin" /></div>}>
        <Routes>
          <Route path="/aceitar/emprestimo/:token" element={<ErrorBoundary><AceitarEmprestimo /></ErrorBoundary>} />
          <Route path="/aceitar/grupo/:token"      element={<ErrorBoundary><AceitarGrupo /></ErrorBoundary>} />
        </Routes>
      </Suspense>
    );
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
        <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-8 lg:pb-8">
          {/* max-width global de conteúdo (S3 — linhas longas demais em telas largas) */}
          <div className="max-w-[1180px] mx-auto w-full space-y-6 lg:space-y-8">
          <ModuleGuard>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Navigate to="/consultor-ia" replace />} />
              <Route path="/" element={<Navigate to="/consultor-ia" replace />} />
              <Route path="/dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
              <Route path="/home" element={<ErrorBoundary><Home /></ErrorBoundary>} />
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
              <Route path="/loja" element={<ErrorBoundary><Loja /></ErrorBoundary>} />
              <Route path="/meu-cpf" element={<ErrorBoundary><MeuCpf /></ErrorBoundary>} />
              <Route path="/meus-boletos" element={<ErrorBoundary><MeusBoletos /></ErrorBoundary>} />
              <Route path="/sibcoin" element={<ErrorBoundary><Sibcoin /></ErrorBoundary>} />
              <Route path="/filiados" element={<ErrorBoundary><Filiados /></ErrorBoundary>} />
              <Route path="/casal" element={<ErrorBoundary><Casal /></ErrorBoundary>} />
              <Route path="/quarentena" element={<ErrorBoundary><Quarentena /></ErrorBoundary>} />
              <Route path="/filhos" element={<Navigate to="/casal?tab=filhos" replace />} />
              <Route path="/credi-amigo" element={<ErrorBoundary><CrediAmigo /></ErrorBoundary>} />
              <Route path="/consorcio-amigo" element={<ErrorBoundary><ConsorcioAmigo /></ErrorBoundary>} />
              <Route path="/assinaturas" element={<ErrorBoundary><Assinaturas /></ErrorBoundary>} />
              <Route path="/fire" element={<ErrorBoundary><Fire /></ErrorBoundary>} />
              <Route path="/relatorio-ir" element={<ErrorBoundary><RelatorioIR /></ErrorBoundary>} />

              <Route path="/perfil" element={<ErrorBoundary><Profile /></ErrorBoundary>} />
              <Route path="/configuracoes" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
              <Route path="/relatorios" element={<ErrorBoundary><Reports /></ErrorBoundary>} />
              <Route path="/calendario" element={<ErrorBoundary><Calendar /></ErrorBoundary>} />
              <Route path="/conquistas" element={<ErrorBoundary><Achievements /></ErrorBoundary>} />

              {/* ── Rotas Admin (Solo-OS) ─────────────────────────────────── */}
              <Route path="/admin" element={<AdminRoute />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<ErrorBoundary><AdminDashboard /></ErrorBoundary>} />
                <Route path="metricas" element={<ErrorBoundary><AdminMetricas /></ErrorBoundary>} />
                <Route path="usuarios" element={<ErrorBoundary><AdminUsuarios /></ErrorBoundary>} />
                <Route path="flags" element={<ErrorBoundary><AdminFlags /></ErrorBoundary>} />
                <Route path="modulos" element={<ErrorBoundary><AdminModulos /></ErrorBoundary>} />
                <Route path="planos" element={<ErrorBoundary><AdminPlanos /></ErrorBoundary>} />
                <Route path="feedbacks" element={<ErrorBoundary><AdminFeedbacks /></ErrorBoundary>} />
                <Route path="social" element={<ErrorBoundary><AdminSocial /></ErrorBoundary>} />
                <Route path="calendario" element={<ErrorBoundary><AdminCalendario /></ErrorBoundary>} />
                <Route path="brand" element={<ErrorBoundary><AdminBrand /></ErrorBoundary>} />
              </Route>

              <Route path="*" element={<ErrorBoundary><NotFound /></ErrorBoundary>} />
            </Routes>
          </Suspense>
          </ModuleGuard>
          </div>
        </main>
      </div>
      {/* ── Botão flutuante + drawer do Assistente ───────────────────── */}
      <FloatingConsultantButton />
      <ConsultantDrawer />
      <SibcoinToastContainer />
      <RegistrationWizard
        open={!!showWizard && !wizardDismissed}
        onClose={() => {
          setWizardDismissed(true);
          try { if (wizardKey) localStorage.setItem(wizardKey, String(Date.now())); } catch { /* noop */ }
        }}
      />
      {guardianAlert && <GuardianAlertModal alert={guardianAlert} onDismiss={dismissAlert} />}
      <InstallPrompt uid={user?.uid} />
      <BottomNavigation onMenuClick={handleToggle} />
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
