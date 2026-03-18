import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../../hooks/useAuth';
import { useFinancialData } from '../../hooks/useFinancialData';
import { Menu, Download, Eye, Sun, Bell, User, LogOut } from 'lucide-react';

export function Header() {
  const { user } = useAuth();
  const { data } = useFinancialData(user?.uid);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const avatarURL = data?.avatarURL ?? user?.photoURL ?? null;

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    signOut(auth);
  };

  return (
    <header
      className="h-20 bg-[#0a0f18]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-8 shrink-0"
      onMouseLeave={() => setDropdownOpen(false)}
    >
      <div className="flex items-center gap-4">
        <button type="button" className="p-2 hover:bg-white/5 rounded-lg" aria-label="Menu">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-black tracking-tighter text-white">Sibanki</h1>
      </div>

      <div className="flex items-center gap-3">
        {[Download, Eye, Sun, Bell].map((Icon, i) => (
          <button
            key={i}
            type="button"
            className="p-2.5 hover:bg-white/5 rounded-xl border border-white/5 relative"
            aria-label={Icon === Bell ? 'Notificações' : undefined}
          >
            <Icon className="w-5 h-5 text-zinc-400" />
            {Icon === Bell && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#0a0f18]" />
            )}
          </button>
        ))}

        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="w-10 h-10 rounded-full border-2 border-white/10 bg-[#111f30] flex items-center justify-center overflow-hidden hover:border-blue-500/50 transition-colors"
            aria-label="Menu da conta"
            aria-haspopup="true"
          >
            {avatarURL ? (
              <img src={avatarURL} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-zinc-400">
                {(user?.displayName || user?.email || 'U').slice(0, 2).toUpperCase()}
              </span>
            )}
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 py-2 bg-[#0a0f18] border border-white/10 rounded-xl shadow-xl z-50">
              <Link
                to="/perfil"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
              >
                <User className="w-4 h-4" /> Perfil
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
