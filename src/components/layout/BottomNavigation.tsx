import { useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, Receipt, Wallet, Menu, Mic, Lock } from 'lucide-react';
import { clsx } from 'clsx';
import { useModuleFlags } from '../../hooks/useModuleFlags';
import { useUiStore } from '../../store/useUiStore';
import { useAppContext } from '../../context/AppContext';
import { useMemo } from 'react';

interface BottomNavigationProps {
  onMenuClick: () => void;
}

export function BottomNavigation({ onMenuClick }: BottomNavigationProps) {
  const location = useLocation();
  const { isModuleEnabled } = useModuleFlags();
  const openConsultantDrawer = useUiStore((s) => s.openConsultantDrawer);

  const {
    accounts, entries, goals, creditObligations, investments, financialProfile
  } = useAppContext();

  const coachDismissed = useMemo(
    () => localStorage.getItem('sibanki_coach_dismissed') === 'true',
    []
  );

  const isCoachActive = useMemo(() => {
    if (coachDismissed) return false;
    const hasAccounts = accounts.length > 0;
    const hasMinEntries = entries.filter(e => e.type === 'despesa' || e.type === 'receita').length >= 3;
    const hasGoals = goals.length > 0;
    const hasDebts = creditObligations.length > 0;
    const hasInvestments = investments.length > 0;
    const hasWhatsapp = !!((financialProfile as unknown as Record<string, any>)?.whatsappPhone);
    const allDone = hasAccounts && hasMinEntries && hasGoals && hasDebts && hasInvestments && hasWhatsapp;
    return !allDone;
  }, [accounts, entries, goals, creditObligations, investments, financialProfile, coachDismissed]);

  const items = [
    {
      label: 'Painel',
      path: '/dashboard',
      icon: LayoutDashboard,
      key: 'painel',
    },
    {
      label: 'Lançamentos',
      path: '/lancamentos',
      icon: Receipt,
      key: 'lancamentos',
    },
    {
      label: 'Contas',
      path: '/contas',
      icon: Wallet,
      key: 'contas',
    },
  ].filter((i) => isModuleEnabled(i.key));

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const leftItems = items.slice(0, 2);
  const rightItems = items.slice(2);

  const renderLink = (item: typeof items[0]) => {
    const active = isActive(item.path);
    const Icon = item.icon;

    return (
      <Link
        key={item.path}
        to={item.path}
        className="flex flex-col items-center justify-center flex-1 h-full py-1.5 transition-all outline-none group"
      >
        <div
          className={clsx(
            'flex items-center justify-center rounded-xl px-4 py-1 transition-all duration-200',
            active
              ? 'bg-si-over-2 text-si-1 border border-si-border-md shadow-sm shadow-black/10'
              : 'text-si-5 group-hover:text-si-3'
          )}
        >
          <Icon className="w-[18px] h-[18px] shrink-0" />
        </div>
        <span
          className={clsx(
            'text-[9px] font-bold uppercase tracking-[0.1em] mt-1 transition-colors duration-150',
            active ? 'text-si-1 font-extrabold' : 'text-si-5 group-hover:text-si-3'
          )}
        >
          {item.label}
        </span>
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-si-card/90 backdrop-blur-lg border-t border-si-border flex items-center justify-around h-14 lg:hidden pb-[env(safe-area-inset-bottom,0px)] px-2">
      {/* Itens da Esquerda */}
      {leftItems.map(renderLink)}

      {/* Botão Central de Lançamento Rápido (CECI) */}
      <div className="flex flex-col items-center justify-center flex-1 h-full relative">
        <button
          type="button"
          onClick={isCoachActive ? undefined : openConsultantDrawer}
          disabled={isCoachActive}
          className={clsx(
            "w-11 h-11 -mt-5 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.18)] shrink-0 transition-all duration-150 border",
            isCoachActive 
              ? "bg-zinc-800 text-zinc-500 border-zinc-700/50 cursor-not-allowed opacity-60" 
              : "bg-white text-zinc-950 hover:scale-105 active:scale-95 border-zinc-200/50"
          )}
          title={isCoachActive ? "Desbloqueie no Modo Coach" : "Falar com o Assistente (Lançamento Rápido)"}
        >
          {isCoachActive ? (
            <Lock className="w-[16px] h-[16px]" />
          ) : (
            <Mic className="w-[18px] h-[18px]" />
          )}
        </button>
        <span className={clsx(
          "text-[8px] font-bold uppercase tracking-[0.15em] mt-1 absolute bottom-0.5",
          isCoachActive ? "text-si-5" : "text-si-1"
        )}>
          {isCoachActive ? "Bloqueado" : "Lançar"}
        </span>
      </div>

      {/* Itens da Direita */}
      {rightItems.map(renderLink)}

      {/* Item Menu lateral */}
      <button
        type="button"
        onClick={onMenuClick}
        className="flex flex-col items-center justify-center flex-1 h-full py-1.5 transition-all outline-none group text-si-5 hover:text-si-3"
      >
        <div className="flex items-center justify-center rounded-xl px-4 py-1 hover:bg-si-over-1 transition-all duration-200">
          <Menu className="w-[18px] h-[18px] shrink-0" />
        </div>
        <span className="text-[9px] font-bold uppercase tracking-[0.1em] mt-1">
          Menu
        </span>
      </button>
    </nav>
  );
}
