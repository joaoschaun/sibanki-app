import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Receipt,
  TrendingUp,
  MessageCircle,
  Wallet,
  CreditCard,
  Target,
  PieChart,
  FileBarChart,
  Calendar,
  ShoppingBag,
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

// ── Navegação principal — as 4 ações que importam ─────────────────────────────
const primaryNav: NavItem[] = [
  { icon: LayoutDashboard, label: 'Painel',        path: '/dashboard' },
  { icon: Receipt,         label: 'Lançamentos',   path: '/lancamentos' },
  { icon: TrendingUp,      label: 'Investimentos', path: '/crescimento' },
  { icon: MessageCircle,   label: 'Assistente',    path: '/consultor-ia' },
];

// ── Secundário — finanças e planejamento ──────────────────────────────────────
const secondaryNav: NavItem[] = [
  { icon: Wallet,       label: 'Contas',       path: '/contas' },
  { icon: CreditCard,   label: 'Crédito',      path: '/credito' },
  { icon: PieChart,     label: 'Orçamento',    path: '/orcamento' },
  { icon: Target,       label: 'Metas',        path: '/planejamento' },
  { icon: ShoppingBag,  label: 'Loja',         path: '/loja' },
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
      'px-3 py-2 w-full text-[11px] font-semibold tracking-[0.08em] uppercase',
      active
        ? 'bg-si-over-2 text-si-1'
        : 'text-si-5 hover:text-si-3 hover:bg-si-over-1'
    );

  const itemCollapsed = (active: boolean) =>
    cn(
      itemBase,
      'justify-center w-8 h-8 mx-auto',
      active
        ? 'text-si-1 bg-si-over-2'
        : 'text-si-5 hover:text-si-3 hover:bg-si-over-1'
    );

  const iconCls = (active: boolean) =>
    cn('w-3.5 h-3.5 shrink-0', active ? 'text-si-1' : '');

  const initials = (userName || 'U').slice(0, 2).toUpperCase();

  return (
    <aside
      className={cn(
        'flex flex-col shrink-0 border-r border-si-border bg-[#0a0a0a]',
        'transition-[width] duration-200 ease-out overflow-hidden',
        collapsed ? 'w-[52px]' : 'w-[200px]'
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
            'rounded-full border border-si-border bg-si-over-2',
            'flex items-center justify-center font-bold text-si-3 shrink-0 overflow-hidden',
            collapsed ? 'w-7 h-7 text-[10px]' : 'w-6 h-6 text-[10px]'
          )}
        >
          {avatarURL ? (
            <img src={avatarURL} alt="" className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        {!collapsed && (
          <span className="text-[11px] font-semibold text-si-4 tracking-wide uppercase truncate">
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
            const tourMap: Record<string, string> = { '/dashboard': 'dashboard', '/lancamentos': 'lancamentos', '/consultor-ia': 'consultor' };
            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={collapsed ? itemCollapsed(active) : itemExpanded(active)}
                {...(tourMap[item.path] ? { 'data-tour': tourMap[item.path] } : {})}
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
                          'px-3 py-1.5 w-full text-[10px] font-semibold tracking-[0.08em] uppercase',
                          active
                            ? 'text-si-2 bg-si-over-1'
                            : 'text-si-5 hover:text-si-3 hover:bg-si-over-1'
                        )}
                      >
                        <item.icon className="w-3 h-3 shrink-0" />
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
              {...(item.path === '/perfil' ? { 'data-tour': 'perfil' } : {})}
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
