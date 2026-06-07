import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, MessageCircle } from 'lucide-react';
import { useUiStore } from '../../store/useUiStore';

/**
 * Painel: fecha o drawer e, se estiver em /consultor-ia, volta à última rota do app.
 * Assistente: abre o drawer (mesmo fluxo do FAB); na página cheia do assistente, não duplica.
 */
export function AppModeToggle() {
  const navigate = useNavigate();
  const location = useLocation();
  const lastVisionPath = useUiStore((s) => s.lastVisionPath);
  const consultantDrawerOpen = useUiStore((s) => s.consultantDrawerOpen);
  const openConsultantDrawer = useUiStore((s) => s.openConsultantDrawer);
  const closeConsultantDrawer = useUiStore((s) => s.closeConsultantDrawer);

  const onConsultorPage = location.pathname === '/consultor-ia';
  const isAssistant = onConsultorPage || consultantDrawerOpen;

  const goVision = () => {
    closeConsultantDrawer();
    if (onConsultorPage) {
      const target =
        lastVisionPath &&
        lastVisionPath !== '/consultor-ia' &&
        lastVisionPath !== '/' &&
        lastVisionPath !== '/login'
          ? lastVisionPath
          : '/dashboard';
      navigate(target);
    } else if (location.pathname !== '/dashboard') {
      navigate('/dashboard');
    }
  };

  const goAssistant = () => {
    if (onConsultorPage) return;
    openConsultantDrawer();
  };

  return (
    <div
      className="flex rounded-lg border border-si-border-md p-0.5 bg-si-card/80"
      role="tablist"
      aria-label="Painel ou Assistente"
    >
      <button
        type="button"
        role="tab"
        aria-selected={!isAssistant}
        onClick={goVision}
        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-[10px] font-bold tracking-[0.12em] uppercase transition-colors ${
          !isAssistant
            ? 'bg-si-over-3 text-si-1 border border-si-border-md'
            : 'text-si-4 hover:text-si-2'
        }`}
      >
        <LayoutDashboard className="w-3.5 h-3.5 shrink-0 opacity-80" aria-hidden />
        <span className="hidden sm:inline">Painel</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={isAssistant}
        onClick={goAssistant}
        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-[10px] font-bold tracking-[0.12em] uppercase transition-colors ${
          isAssistant
            ? 'bg-si-over-3 text-si-1 border border-si-border-md'
            : 'text-si-4 hover:text-si-2'
        }`}
      >
        <MessageCircle className="w-3.5 h-3.5 shrink-0 opacity-80" aria-hidden />
        <span className="hidden sm:inline">Assistente</span>
      </button>
    </div>
  );
}
