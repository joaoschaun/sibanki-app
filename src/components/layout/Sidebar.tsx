import { useEffect, useState } from 'react';
import {
  House,
  LayoutDashboard,
  Receipt,
  TrendingUp,
  MessageCircle,
  Wallet,
  CreditCard,
  Repeat,
  Target,
  PieChart,
  FileBarChart,
  Calendar,
  User,
  Settings,
  MoreHorizontal,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type SidebarOpenGroup = 'mais' | null;

interface SidebarProps {
  userName?: string | null;
  userEmail?: string | null;
  avatarURL?: string | null;
  score: number;
  collapsed: boolean;
  openGroup: SidebarOpenGroup;
  setOpenGroup: (g: SidebarOpenGroup) => void;
}

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

// ── Navegação principal — 5 ações que importam ────────────────────────────────
const primaryNav: NavItem[] = [
  { icon: House,           label: 'Início',        path: '/' },
  { icon: LayoutDashboard, label: 'Dashboard',     path: '/dashboard' },
  { icon: Receipt,         label: 'Lançamentos',   path: '/lancamentos' },
  { icon: TrendingUp,      label: 'Investimentos', path: '/crescimento' },
  { icon: MessageCircle,   label: 'Consultor IA',  path: '/consultor-ia' },
];

// ── Secundário — acessível mas não na frente ──────────────────────────────────
const secondaryNav: NavItem[] = [
  { icon: Wallet,       label: 'Contas',       path: '/contas' },
  { icon: CreditCard,   label: 'Cartões',      path: '/cartoes' },
  { icon: Repeat,       label: 'Recorrentes',  path: '/recorrentes' },
  { icon: Target,       label: 'Metas',        path: '/planejamento' },
  { icon: PieChart,     label: 'Orçamento',    path: '/orcamento' },
  { icon: FileBarChart, label: 'Relatórios',   path: '/relatorios' },
  { icon: Calendar,     label: 'Calendário',   path: '/calendario' },
];

// ── Rodapé ────────────────────────────────────────────────────────────────────
const bottomNav: NavItem[] = [
  { icon: User,     label: 'Perfil',        path: '/perfil' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
];

const secondaryPaths = secondaryNav.map((i) => i.path);

export function Sidebar({
  userName,
  userEmail: _userEmail,
  avatarURL,
  score: _score,
  collapsed,
  openGroup: _openGroup,
  setOpenGroup,
}: SidebarProps) {
  const location = useLocation();
  const [maisOpen, setMaisOpen] = useState(false);

  // Fecha accordion quando colapsa
  useEffect(() => {
    if (collapsed) {
      setMaisOpen(false);
      setOpenGroup(null);
    }
  }, [collapsed, setOpenGroup]);

  // Abre "Mais" automaticamente se a rota ativa for secundária
  useEffect(() => {
    if (!collapsed && secondaryPaths.includes(location.pathname)) {
      setMaisOpen(true);
    }
  }, [location.pathname, collapsed]);

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  // ── Estilos ──────────────────────────────────────────────────────────────────
  const itemBase = cn(
    'flex items-center gap-3 rounded-lg transition-all duration-150 outline-none',
    'focus-visible:ring-2 focus-visible:ring-blue-500/40'
  );

  const itemExpanded = (active: boolean) =>
    cn(
      itemBase,
      'px-3 py-2.5 w-full text-sm font-medium',
      active
        ? 'bg-white/[0.08] text-white'
        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
    );

  const itemCollapsed = (active: boolean) =>
    cn(
      itemBase,
      'justify-center w-10 h-10 mx-auto',
      active
        ? 'text-white bg-white/[0.08]'
        : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'
    );

  const iconCls = (active: boolean) =>
    cn('w-4 h-4 shrink-0', active ? 'text-white' : '');

  const initials = (userName || 'U').slice(0, 2).toUpperCase();

  return (
    <aside
      className={cn(
        'flex flex-col shrink-0 border-r border-white/[0.06] bg-[#0d0d0f]',
        'transition-[width] duration-200 ease-out overflow-hidden',
        collapsed ? 'w-[60px]' : 'w-[220px]'
      )}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center border-b border-white/[0.06] shrink-0',
          collapsed ? 'justify-center px-0 py-4' : 'gap-3 px-4 py-4'
        )}
      >
        <div
          className={cn(
            'rounded-full bg-gradient-to-br from-blue-600 to-blue-800',
            'flex items-center justify-center font-semibold text-white shrink-0 overflow-hidden',
            collapsed ? 'w-8 h-8 text-xs' : 'w-7 h-7 text-[11px]'
          )}
        >
          {avatarURL ? (
            <img src={avatarURL} alt="" className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        {!collapsed && (
          <span className="text-sm font-medium text-zinc-200 truncate">
            {userName || 'Usuário'}
          </span>
        )}
      </div>

      {/* ── Navegação principal ─────────────────────────────────────────────── */}
      <nav
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden',
          collapsed ? 'px-2 pt-3' : 'px-3 pt-3'
        )}
      >
        <div className="space-y-0.5">
          {primaryNav.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={collapsed ? itemCollapsed(active) : itemExpanded(active)}
              >
                <item.icon className={iconCls(active)} />
                {!collapsed && item.label}
              </Link>
            );
          })}
        </div>

        {/* ── Mais ────────────────────────────────────────────────────────── */}
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          {collapsed ? (
            <div title="Mais" className={itemCollapsed(false)}>
              <MoreHorizontal className="w-4 h-4 text-zinc-600" />
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setMaisOpen((v) => !v)}
                className={cn(itemExpanded(false), 'w-full justify-between')}
              >
                <span className="flex items-center gap-3">
                  <MoreHorizontal className="w-4 h-4 shrink-0" />
                  Mais
                </span>
                <ChevronDown
                  className={cn(
                    'w-3.5 h-3.5 text-zinc-600 transition-transform duration-150',
                    maisOpen && 'rotate-180'
                  )}
                />
              </button>

              <div
                className={cn(
                  'overflow-hidden transition-[max-height,opacity] duration-200',
                  'pl-3 ml-2 border-l border-white/[0.06]',
                  maisOpen
                    ? 'max-h-96 opacity-100 mt-1'
                    : 'max-h-0 opacity-0 pointer-events-none'
                )}
              >
                <div className="space-y-0.5">
                  {secondaryNav.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                          itemBase,
                          'px-3 py-2 w-full text-sm font-medium',
                          active
                            ? 'text-white bg-white/[0.06]'
                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
                        )}
                      >
                        <item.icon className="w-3.5 h-3.5 shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </nav>

      {/* ── Rodapé ─────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'border-t border-white/[0.06] shrink-0',
          collapsed ? 'px-2 py-3 space-y-0.5' : 'px-3 py-3 space-y-0.5'
        )}
      >
        {bottomNav.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={collapsed ? itemCollapsed(active) : itemExpanded(active)}
            >
              <item.icon className={iconCls(active)} />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
