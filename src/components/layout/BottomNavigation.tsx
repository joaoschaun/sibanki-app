import { useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, Receipt, MessageCircle, Heart, Menu } from 'lucide-react';
import { clsx } from 'clsx';
import { useModuleFlags } from '../../hooks/useModuleFlags';

interface BottomNavigationProps {
  onMenuClick: () => void;
}

export function BottomNavigation({ onMenuClick }: BottomNavigationProps) {
  const location = useLocation();
  const { isModuleEnabled } = useModuleFlags();

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
      label: 'Assistente',
      path: '/consultor-ia',
      icon: MessageCircle,
      key: 'assistente',
    },
    {
      label: 'Família',
      path: '/casal',
      icon: Heart,
      key: 'familia',
    },
  ].filter((i) => isModuleEnabled(i.key));

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-si-card/90 backdrop-blur-lg border-t border-si-border flex items-center justify-around h-14 lg:hidden pb-[env(safe-area-inset-bottom,0px)] px-2">
      {items.map((item) => {
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
      })}

      {/* Item Menu para abrir a Sidebar Drawer lateral com as demais abas */}
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
