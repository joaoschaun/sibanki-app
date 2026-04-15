import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';
// ✅ FIX: Removido useAuth + useFinancialData duplicados → usa AppContext (único listener Firestore)
import { useAppContext } from '../../context/AppContext';
import { Menu, Sun, Moon, Bell, User, LogOut, FileBarChart, Trophy, Calendar, MessageSquarePlus } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { FeedbackModal } from '../ui/FeedbackModal';
import { AppModeToggle } from './AppModeToggle';

interface HeaderProps {
  onMenuClick?: () => void;
  sidebarCollapsed?: boolean;
}

export function Header({ onMenuClick, sidebarCollapsed }: HeaderProps) {
  // ✅ FIX: Usa AppContext — elimina o 2º listener Firestore que causava freeze na UI
  const { user, data } = useAppContext();
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const avatarURL = data?.avatarURL ?? user?.photoURL ?? null;

  useEffect(() => {
    // ✅ FIX: mousedown (em vez de click) — detecta fora antes do React processar o evento
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    signOut(auth);
  };

  return (
    // ✅ FIX: Removido onMouseLeave do header — causava fechamento prematuro do dropdown
    //        ao mover o mouse para o sidebar ou conteúdo principal
    <header className="h-14 bg-[#0a0a0a] border-b border-si-border grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 sm:px-6 shrink-0 relative z-50">
      <div className="flex items-center gap-3 min-w-0 justify-self-start">
        <button
          type="button"
          onClick={onMenuClick}
          className="p-1.5 hover:bg-si-over-2 rounded-md transition-colors shrink-0"
          data-tour="menu"
          aria-label={sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          aria-pressed={sidebarCollapsed}
        >
          <Menu className="w-4 h-4 text-si-4" />
        </button>
        <h1 className="text-xs font-bold tracking-[0.2em] uppercase text-si-3 truncate">Sibanki</h1>
      </div>

      <div className="justify-self-center">
        <AppModeToggle />
      </div>

      <div className="flex items-center gap-2 justify-self-end">
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Mudar para tema escuro' : 'Mudar para tema claro'}
          className="p-2 hover:bg-si-over-2 rounded-md transition-colors"
          aria-label={theme === 'light' ? 'Mudar para tema escuro' : 'Mudar para tema claro'}
        >
          {theme === 'light'
            ? <Moon className="w-4 h-4 text-si-4" />
            : <Sun className="w-4 h-4 text-si-4" />}
        </button>

        <button
          type="button"
          className="p-2 hover:bg-si-over-2 rounded-md relative transition-colors"
          aria-label="Notificações"
          data-tour="notificacoes"
        >
          <Bell className="w-4 h-4 text-si-4" />
          <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-si-3 rounded-full" />
        </button>

        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="w-8 h-8 rounded-full border border-si-border bg-si-over-2 flex items-center justify-center overflow-hidden hover:bg-si-over-3 transition-colors"
            aria-label="Menu da conta"
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
          >
            {avatarURL ? (
              <img src={avatarURL} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[11px] font-bold text-si-3">
                {(user?.displayName || user?.email || 'U').slice(0, 2).toUpperCase()}
              </span>
            )}
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 py-2 bg-si-card border border-si-border-md rounded-xl shadow-xl z-50">
              <Link
                to="/perfil"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-si-3 hover:bg-si-over-2"
              >
                <User className="w-4 h-4" /> Perfil
              </Link>
              <Link
                to="/relatorios"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-si-3 hover:bg-si-over-2"
              >
                <FileBarChart className="w-4 h-4" /> Relatórios
              </Link>
              <Link
                to="/conquistas"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-si-3 hover:bg-si-over-2"
              >
                <Trophy className="w-4 h-4" /> Conquistas
              </Link>
              <Link
                to="/calendario"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-si-3 hover:bg-si-over-2"
              >
                <Calendar className="w-4 h-4" /> Calendário
              </Link>
              <div className="my-1 h-px bg-si-border mx-4" />
              <button
                type="button"
                onClick={() => { setDropdownOpen(false); setFeedbackOpen(true); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-si-3 hover:bg-si-over-2"
              >
                <MessageSquarePlus className="w-4 h-4" /> Feedback
              </button>
              <div className="my-1 h-px bg-si-border mx-4" />
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10"
              >
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </div>
          )}
        </div>
      </div>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </header>
  );
}
