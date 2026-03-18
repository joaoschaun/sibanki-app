import { useEffect } from 'react';

export type SidebarOpenGroup = 'planejamento' | 'crescimento' | 'social' | 'solucoes' | null;
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
  Store,
  Banknote,
  UsersRound,
  Shield,
  LineChart,
  type LucideIcon,
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
  collapsed: boolean;
  openGroup: SidebarOpenGroup;
  setOpenGroup: (g: SidebarOpenGroup) => void;
}

type NavGroupId = SidebarOpenGroup;

interface SubItem {
  label: string;
  path: string;
  icon: LucideIcon;
  sub?: string;
}

const navGroups: { id: NavGroupId; label: string; icon: LucideIcon; items: SubItem[] }[] = [
  {
    id: 'planejamento',
    label: 'Planejamento',
    icon: Target,
    items: [
      { label: 'Metas', path: '/planejamento', icon: Target },
      { label: 'Orçamento', path: '/orcamento', icon: PieChart },
    ],
  },
  {
    id: 'crescimento',
    label: 'Crescimento',
    icon: Growth,
    items: [
      { label: 'Investimentos', path: '/crescimento', icon: Growth },
      { label: 'Consultor IA', path: '/consultor-ia', icon: MessageCircle },
      { label: 'Educação', path: '/educacao', icon: BookOpen },
    ],
  },
  {
    id: 'social',
    label: 'Social',
    icon: Users,
    items: [{ label: 'Comunidade', path: '/social', icon: Users }],
  },
  {
    id: 'solucoes',
    label: 'Soluções',
    icon: Store,
    items: [
      { label: 'Crédito', sub: 'Empréstimo e linhas', path: '/solucoes/credito', icon: Banknote },
      { label: 'Consórcio', sub: 'Grupos e contemplação', path: '/solucoes/consorcio', icon: UsersRound },
      { label: 'Seguro', sub: 'Proteção e coberturas', path: '/solucoes/seguro', icon: Shield },
      { label: 'Investimentos', sub: 'Parceiros e produtos', path: '/solucoes/investimentos', icon: LineChart },
    ],
  },
];

const flatItems: { icon: LucideIcon; label: string; sub?: string; path: string }[] = [
  { icon: LayoutDashboard, label: 'Dashboard', sub: 'Visão geral', path: '/' },
  { icon: Wallet, label: 'Contas', sub: 'Saldos', path: '/contas' },
  { icon: CreditCard, label: 'Cartões', sub: 'Faturas', path: '/cartoes' },
  { icon: Receipt, label: 'Lançamentos', sub: 'Receitas e despesas', path: '/lancamentos' },
  { icon: Repeat, label: 'Recorrentes', sub: 'Fixos mensais', path: '/recorrentes' },
  { icon: User, label: 'Perfil', sub: 'Nome e foto', path: '/perfil' },
  { icon: Settings, label: 'Configurações', sub: 'Backup e dados', path: '/configuracoes' },
];

const SOLUTIONS_PREFIX = '/solucoes/';

function pathMatchesGroup(pathname: string, group: (typeof navGroups)[0]) {
  if (group.id === 'solucoes') return pathname.startsWith('/solucoes');
  return group.items.some((it) => it.path === pathname);
}

const groupDefaultPath: Record<NonNullable<NavGroupId>, string> = {
  planejamento: '/planejamento',
  crescimento: '/crescimento',
  social: '/social',
  solucoes: '/solucoes/credito',
};

export function Sidebar({ userName, userEmail, avatarURL, score, collapsed, openGroup, setOpenGroup }: SidebarProps) {
  const location = useLocation();

  useEffect(() => {
    if (collapsed) setOpenGroup(null);
  }, [collapsed, setOpenGroup]);

  const isSolutionsRoute = location.pathname.startsWith(SOLUTIONS_PREFIX);

  const linkActiveClassExpanded = (isActive: boolean) =>
    isActive ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-zinc-500 hover:bg-white/5';

  /** Modo minimizado: sem caixa azul — só ícone em destaque + barra lateral fina */
  const linkCollapsedClass = (isActive: boolean) =>
    cn(
      'relative max-w-full justify-center rounded-none',
      isActive
        ? 'text-blue-400 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-7 before:w-0.5 before:rounded-full before:bg-blue-500'
        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
    );

  return (
    <aside
      className={cn(
        'bg-[#0a0f18] border-r border-white/5 flex flex-col shrink-0 transition-[width] duration-200 ease-out isolate',
        collapsed ? 'w-[72px] max-w-[72px] overflow-x-clip overflow-y-auto' : 'w-[280px] overflow-x-clip'
      )}
      onMouseLeave={() => {
        if (!collapsed) setOpenGroup(null);
      }}
    >
      <div
        className={cn(
          'flex flex-col items-center text-center border-b border-white/5 shrink-0',
          collapsed ? 'p-3' : 'p-8'
        )}
      >
        <div className={cn('relative mb-2', !collapsed && 'mb-4')}>
          <div
            className={cn(
              'rounded-full border-2 border-blue-500/30 bg-[#111f30] flex items-center justify-center font-bold text-zinc-400 overflow-hidden',
              collapsed ? 'w-11 h-11 text-sm' : 'w-20 h-20 text-2xl'
            )}
          >
            {avatarURL ? (
              <img src={avatarURL} alt="" className="w-full h-full object-cover" />
            ) : (
              (userName || 'U').slice(0, 2).toUpperCase()
            )}
          </div>
          {!collapsed && (
            <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-4 border-[#0a0f18]" />
          )}
        </div>
        {!collapsed && (
          <>
            <h2 className="font-bold text-lg">{userName || 'Usuário'}</h2>
            <p className="text-xs text-zinc-500 mb-4 truncate w-full px-2">{userEmail || '...'}</p>
            <div className="flex gap-2 flex-wrap justify-center">
              <span className="bg-green-500/10 text-green-500 text-[10px] font-bold px-2 py-1 rounded-full border border-green-500/20">
                Score: {score}
              </span>
              <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold px-2 py-1 rounded-full">
                GRATUITO
              </span>
            </div>
          </>
        )}
      </div>

      <nav className={cn('flex-1 overflow-y-auto overflow-x-hidden', collapsed ? 'p-2 space-y-1' : 'p-4 space-y-1')}>
        {flatItems.slice(0, 5).map((item, i) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={i}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={cn(
                'w-full flex items-center transition-all group outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
                collapsed ? cn('py-2.5 px-0', linkCollapsedClass(isActive)) : cn('rounded-xl gap-4 px-4 py-3', linkActiveClassExpanded(isActive))
              )}
            >
              <item.icon className={cn('w-5 h-5 shrink-0', isActive ? 'text-blue-400' : '')} />
              {!collapsed && (
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-bold truncate">{item.label}</div>
                  {item.sub && <div className="text-[10px] opacity-60">{item.sub}</div>}
                </div>
              )}
            </Link>
          );
        })}
        {navGroups.map((group) => {
          const isOpen = !collapsed && openGroup === group.id;
          const isGroupActive = pathMatchesGroup(location.pathname, group);
          const groupHighlight =
            collapsed &&
            (isGroupActive || (group.id === 'solucoes' && isSolutionsRoute));
          const groupBtnExpanded = cn(
            'w-full flex items-center rounded-xl transition-all text-left gap-4 px-4 py-3',
            isGroupActive ? 'text-blue-400' : 'text-zinc-500 hover:bg-white/5'
          );

          return (
            <div key={group.id} className={cn('space-y-0.5', collapsed && 'overflow-hidden')}>
              {collapsed ? (
                <Link
                  to={groupDefaultPath[group.id!]}
                  title={group.label}
                  className={cn(
                    'w-full flex items-center transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
                    'py-2.5 px-0',
                    linkCollapsedClass(!!groupHighlight)
                  )}
                >
                  <group.icon
                    className={cn('w-5 h-5 shrink-0 mx-auto', groupHighlight ? 'text-blue-400' : 'text-zinc-500')}
                  />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setOpenGroup(isOpen ? null : group.id)}
                  className={groupBtnExpanded}
                  aria-expanded={isOpen ? 'true' : 'false'}
                  aria-controls={`sidebar-group-${group.id}`}
                >
                  <group.icon className="w-5 h-5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{group.label}</div>
                  </div>
                  <ChevronDown className={cn('w-4 h-4 opacity-40 shrink-0 transition-transform', isOpen && 'rotate-180')} />
                </button>
              )}
              {!collapsed && (
                <div
                  id={`sidebar-group-${group.id}`}
                  className={cn(
                    'overflow-hidden transition-[max-height,opacity] duration-200',
                    isOpen ? 'max-h-[520px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none hidden'
                  )}
                  aria-hidden={!isOpen}
                >
                  <div className="pl-4 ml-4 border-l border-white/10 space-y-0.5 py-1">
                    {group.items.map((sub) => {
                      const isActive =
                        group.id === 'solucoes'
                          ? location.pathname === sub.path
                          : location.pathname === sub.path;
                      return (
                        <Link
                          key={sub.path}
                          to={sub.path}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                            isActive ? 'bg-blue-600/10 text-blue-400' : 'text-zinc-500 hover:bg-white/5'
                          )}
                        >
                          <sub.icon className="w-4 h-4 opacity-70 shrink-0" />
                          <span className="min-w-0">
                            <span className="block font-medium">{sub.label}</span>
                            {sub.sub && <span className="block text-[10px] opacity-60">{sub.sub}</span>}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {flatItems.slice(5).map((item, i) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={i}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={cn(
                'w-full flex items-center transition-all group outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
                collapsed ? cn('py-2.5 px-0', linkCollapsedClass(isActive)) : cn('rounded-xl gap-4 px-4 py-3', linkActiveClassExpanded(isActive))
              )}
            >
              <item.icon className={cn('w-5 h-5 shrink-0', isActive ? 'text-blue-400' : '')} />
              {!collapsed && (
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-bold truncate">{item.label}</div>
                  {item.sub && <div className="text-[10px] opacity-60">{item.sub}</div>}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="p-6 shrink-0">
          <button
            type="button"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-emerald-400 text-black font-bold text-sm shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-transform"
          >
            Upgrade para Pro
          </button>
        </div>
      )}
    </aside>
  );
}
