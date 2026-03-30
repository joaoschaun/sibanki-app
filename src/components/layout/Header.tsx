import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';
// ✅ FIX: Removido useAuth + useFinancialData duplicados → usa AppContext (único listener Firestore)
import { useAppContext } from '../../context/AppContext';
import { Menu, Download, Eye, Sun, Moon, Bell, User, LogOut, FileBarChart, Trophy, Calendar } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

interface HeaderProps {
  onMenuClick?: () => void;
  sidebarCollapsed?: boolean;
}

export function Header({ onMenuClick, sidebarCollapsed }: HeaderProps) {
  // ✅ FIX: Usa AppContext — elimina o 2º listener Firestore que causava freeze na UI
  const { user, data } = useAppContext();
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
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
    <header className="h-20 bg-si-card/60 backdrop-blur-xl border-b border-si-border shadow-[0_4px_30px_rgba(0,0,0,0.1)] flex items-center justify-between px-8 shrink-0 relative z-50">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          className="p-2 hover:bg-si-over-3 rounded-lg hover:scale-105 active:scale-95 transition-all"
          aria-label={sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          aria-pressed={sidebarCollapsed}
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-black tracking-tighter text-si-1">Sibanki</h1>
      </div>

      <div className="flex items-center gap-3">
        {([Download, Eye] as const).map((Icon, i) => (
          <button
            key={i}
            type="button"
            className="p-2.5 hover:bg-si-over-3 rounded-xl border border-si-border relative hover:scale-[1.05] active:scale-95 transition-all"
          >
            <Icon className="w-5 h-5 text-si-4" />
          </button>
        ))}

        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Mudar para tema escuro' : 'Mudar para tema claro'}
          className="p-2.5 hover:bg-si-over-3 rounded-xl border border-si-border hover:scale-[1.05] active:scale-95 transition-all"
          aria-label={theme === 'light' ? 'Mudar para tema escuro' : 'Mudar para tema claro'}
        >
          {theme === 'light'
            ? <Moon className="w-5 h-5 text-indigo-500" />
            : <Sun className="w-5 h-5 text-amber-400" />}
        </button>

        <button
          type="button"
          className="p-2.5 hover:bg-si-over-3 rounded-xl border border-si-border relative hover:scale-[1.05] active:scale-95 transition-all"
          aria-label="Notificações"
        >
          <Bell className="w-5 h-5 text-si-4" />
          <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-si-card" />
        </button>

        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="w-10 h-10 rounded-full border-2 border-transparent bg-gradient-to-tr from-blue-500/20 to-emerald-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)] flex items-center justify-center overflow-hidden hover:scale-105 active:scale-95 transition-all"
            aria-label="Menu da conta"
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
          >
            {avatarURL ? (
              <img src={avatarURL} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-si-4">
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
    </header>
  );
}
