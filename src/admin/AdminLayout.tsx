import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutGrid, BarChart3, Users, Flag, ToggleRight, CreditCard,
  MessageSquare, Share2, Calendar, Sparkles, LogOut, Activity, Coins,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/metricas', label: 'Métricas', icon: BarChart3 },
  { to: '/usuarios', label: 'Usuários', icon: Users },
  { to: '/health', label: 'Health Check', icon: Activity },
  { to: '/sibcoin', label: 'SibCoin', icon: Coins },
  { to: '/flags', label: 'Feature Flags', icon: Flag },
  { to: '/modulos', label: 'Módulos', icon: ToggleRight },
  { to: '/planos', label: 'Planos', icon: CreditCard },
  { to: '/feedbacks', label: 'Feedbacks', icon: MessageSquare },
  { to: '/social', label: 'Redes Sociais', icon: Share2 },
  { to: '/calendario', label: 'Calendário', icon: Calendar },
  { to: '/brand', label: 'Brand', icon: Sparkles },
];

export function AdminLayout() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar do admin */}
      <aside className="w-[210px] shrink-0 border-r border-si-border bg-si-card flex flex-col">
        <div className="h-[56px] flex items-center px-4 border-b border-si-border">
          <span className="text-sm font-black tracking-[-0.01em] text-si-1">Sibanki</span>
          <span className="ml-2 text-[9px] font-bold tracking-[0.18em] text-si-4 uppercase">Admin</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-[1px]">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[11px] font-semibold tracking-[0.04em] uppercase transition-colors ${
                  isActive ? 'bg-si-over-2 text-si-1' : 'text-si-5 hover:text-si-3 hover:bg-si-over-1'
                }`
              }
            >
              <n.icon className="w-[14px] h-[14px] shrink-0" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-2 border-t border-si-border">
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="flex w-full items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[11px] font-semibold tracking-[0.04em] uppercase text-si-5 hover:text-si-3 hover:bg-si-over-1 transition-colors"
          >
            <LogOut className="w-[14px] h-[14px] shrink-0" /> Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-[1180px] mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
