import {
  LayoutDashboard,
  Wallet,
  CreditCard,
  Receipt,
  Repeat,
  Target,
  PieChart,
  TrendingUp as Growth,
  Users,
  MessageCircle,
  BookOpen,
  User,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  userName?: string | null;
  userEmail?: string | null;
  avatarURL?: string | null;
  score: number;
}

export function Sidebar({ userName, userEmail, avatarURL, score }: SidebarProps) {
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', sub: 'Visão geral', path: '/' },
    { icon: Wallet, label: 'Contas', sub: 'Saldos', path: '/contas' },
    { icon: CreditCard, label: 'Cartões', sub: 'Faturas', path: '/cartoes' },
    { icon: Receipt, label: 'Lançamentos', sub: 'Receitas e despesas', path: '/lancamentos' },
    { icon: Repeat, label: 'Recorrentes', sub: 'Fixos mensais', path: '/recorrentes' },
    { icon: Target, label: 'Planejamento', sub: 'Metas', path: '/planejamento' },
    { icon: PieChart, label: 'Orçamento', sub: 'Limites por categoria', path: '/orcamento' },
    { icon: Growth, label: 'Crescimento', hasArrow: true, path: '/crescimento' },
    { icon: Users, label: 'Social', hasArrow: true, path: '/social' },
    { icon: MessageCircle, label: 'Consultor IA', sub: 'Assistente financeiro', path: '/consultor-ia' },
    { icon: BookOpen, label: 'Educação', sub: 'Dicas financeiras', path: '/educacao' },
    { icon: User, label: 'Perfil', sub: 'Nome e foto', path: '/perfil' },
    { icon: Settings, label: 'Configurações', sub: 'Backup e dados', path: '/configuracoes' },
  ];

  return (
    <aside className="w-[280px] bg-[#0a0f18] border-r border-white/5 flex flex-col shrink-0">
      <div className="p-8 flex flex-col items-center text-center border-b border-white/5">
        <div className="relative mb-4">
          <div className="w-20 h-20 rounded-full border-2 border-blue-500/30 bg-[#111f30] flex items-center justify-center text-2xl font-bold text-zinc-400 overflow-hidden">
            {avatarURL ? (
              <img src={avatarURL} alt="" className="w-full h-full object-cover" />
            ) : (
              (userName || 'U').slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-4 border-[#0a0f18]" />
        </div>
        <h2 className="font-bold text-lg">{userName || 'Usuário'}</h2>
        <p className="text-xs text-zinc-500 mb-4 truncate w-full px-2">{userEmail || '...'}</p>
        <div className="flex gap-2">
          <span className="bg-green-500/10 text-green-500 text-[10px] font-bold px-2 py-1 rounded-full border border-green-500/20">
            Score: {score}
          </span>
          <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold px-2 py-1 rounded-full">
            GRATUITO
          </span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item, i) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={i}
              to={item.path}
              className={cn(
                'w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group',
                isActive ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-zinc-500 hover:bg-white/5'
              )}
            >
              <item.icon className={cn('w-5 h-5', isActive ? 'text-blue-400' : 'text-zinc-500')} />
              <div className="flex-1 text-left">
                <div className="text-sm font-bold">{item.label}</div>
                {item.sub && <div className="text-[10px] opacity-60">{item.sub}</div>}
              </div>
              {item.hasArrow && <ChevronDown className="w-4 h-4 opacity-40" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-6">
        <button className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-emerald-400 text-black font-bold text-sm shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-transform">
          Upgrade para Pro
        </button>
      </div>
    </aside>
  );
}
