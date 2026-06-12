import { useState } from 'react';
import {
  Receipt, TrendingUp, Wallet, CreditCard, Target, PieChart,
  FileBarChart, Calendar, User, Settings, MoreHorizontal, ChevronDown,
  Handshake, Users, Heart, MessageCircle, LayoutDashboard, ShoppingBag,
  Coins, BookOpen, Wrench, Flame, ShieldCheck, Zap, RefreshCw,
  type LucideIcon,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTenant } from '../../hooks/useTenant';
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
  tour?: string;
}

/**
 * Sidebar 2.0 — UM modo só (S1 da auditoria visual de 12/06/2026).
 *
 * Antes: modo simples/completo com auto-expansão por rota — o menu mudava de
 * forma sozinho ao navegar. Agora: 6 itens core sempre visíveis + grupo "Mais"
 * colapsável controlado APENAS pelo usuário (estado persistido). Se a rota
 * ativa estiver dentro de "Mais" fechado, o botão "Mais" acende — sem reabrir.
 */

// ── Core — sempre visível ─────────────────────────────────────────────────────
const coreNav: NavItem[] = [
  { icon: MessageCircle,   label: 'Assistente',    path: '/consultor-ia', tour: 'consultor' },
  { icon: LayoutDashboard, label: 'Painel',         path: '/dashboard',    tour: 'dashboard' },
  { icon: Receipt,         label: 'Lançamentos',   path: '/lancamentos',  tour: 'lancamentos' },
  { icon: Wallet,          label: 'Contas',         path: '/contas' },
  { icon: CreditCard,      label: 'Crédito',        path: '/credito' },
  { icon: TrendingUp,      label: 'Investimentos',  path: '/crescimento' },
];

// ── Mais — todo o resto, colapsável ───────────────────────────────────────────
const maisNav: NavItem[] = [
  { icon: PieChart,     label: 'Orçamento',   path: '/orcamento'       },
  { icon: Target,       label: 'Metas',       path: '/planejamento'    },
  { icon: RefreshCw,    label: 'Recorrentes', path: '/recorrentes'     },
  { icon: ShoppingBag,  label: 'Loja',        path: '/loja'            },
  { icon: Heart,        label: 'Família',     path: '/casal'           },
  { icon: Handshake,    label: 'Credi Amigo', path: '/credi-amigo'     },
  { icon: Users,        label: 'Consórcio',   path: '/consorcio-amigo' },
  { icon: FileBarChart, label: 'Relatórios',  path: '/relatorios'      },
  { icon: Calendar,     label: 'Calendário',  path: '/calendario'      },
  { icon: BookOpen,     label: 'Educação',    path: '/educacao'        },
  { icon: Wrench,       label: 'Ferramentas', path: '/ferramentas'     },
  { icon: Flame,        label: 'FIRE',        path: '/fire'            },
  { icon: ShieldCheck,  label: 'Meu CPF',     path: '/meu-cpf'         },
  { icon: Coins,        label: 'SibCoin',     path: '/sibcoin'         },
  { icon: Zap,          label: 'Filiados',    path: '/filiados'        },
];

// ── Rodapé ────────────────────────────────────────────────────────────────────
const bottomNav: NavItem[] = [
  { icon: User,     label: 'Perfil',        path: '/perfil', tour: 'perfil' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
];

const MAIS_OPEN_KEY = 'sib_sidebar_mais_aberto';

export function Sidebar({
  collapsed,
  openGroup: _openGroup,
  setOpenGroup: _setOpenGroup,
}: SidebarProps) {
  const { branding } = useTenant();
  const location = useLocation();

  const routeInMais = maisNav.some((i) => location.pathname.startsWith(i.path));

  // Estado do "Mais": persistido; abre no primeiro mount se a rota atual está
  // dentro dele (deep link). Depois disso, só o usuário muda — nunca a navegação.
  const [maisOpen, setMaisOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(MAIS_OPEN_KEY) === '1' || routeInMais;
    } catch { return routeInMais; }
  });
  const toggleMais = () => {
    setMaisOpen((v) => {
      const next = !v;
      try { localStorage.setItem(MAIS_OPEN_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  // ── Estilos — tokens CSS (dark + light automático) ────────────────────────
  const base = cn(
    'flex items-center gap-2.5 rounded-lg transition-all duration-150 outline-none',
    'focus-visible:ring-2 focus-visible:ring-si-border-lg'
  );

  const row = (active: boolean) => cn(
    base,
    'px-2.5 py-[7px] w-full text-[11px] font-semibold tracking-[0.06em] uppercase',
    active
      ? 'bg-si-over-2 text-si-1'
      : 'text-si-5 hover:text-si-3 hover:bg-si-over-1'
  );

  const rowCollapsed = (active: boolean) => cn(
    base, 'justify-center w-8 h-8 mx-auto',
    active ? 'bg-si-over-2 text-si-1' : 'text-si-5 hover:text-si-3 hover:bg-si-over-1'
  );

  const iconCls = (active: boolean) =>
    cn('w-[14px] h-[14px] shrink-0', active ? 'text-si-1' : 'text-si-5');

  function NavLink({ item }: { item: NavItem }) {
    const active = isActive(item.path);
    return (
      <Link
        to={item.path}
        title={collapsed ? item.label : undefined}
        className={collapsed ? rowCollapsed(active) : row(active)}
        {...(item.tour ? { 'data-tour': item.tour } : {})}
      >
        <item.icon className={iconCls(active)} />
        {!collapsed && item.label}
      </Link>
    );
  }

  return (
    <aside className={cn(
      'flex flex-col shrink-0 border-r border-si-border bg-si-card',
      'transition-[width] duration-200 ease-out overflow-hidden',
      collapsed ? 'w-[52px]' : 'w-[200px]'
    )}>

      {/* ── Logo ───────────────────────────────────────────────────────────── */}
      <div className={cn(
        'flex items-center border-b border-si-border shrink-0 h-[52px]',
        collapsed ? 'justify-center' : 'px-4'
      )}>
        <Link to="/consultor-ia" className="flex items-center gap-2 min-w-0">
          {collapsed ? (
            <div className="w-6 h-6 rounded-md bg-si-over-3 flex items-center justify-center">
              <span className="text-si-2 text-[11px] font-black">S</span>
            </div>
          ) : (
            <img
              src={branding.logoUrl || '/assets/img/sibanki-logo-clean.png'}
              alt={branding.appName || 'Sibanki'}
              className="h-7 w-auto object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </Link>
      </div>

      {/* ── Navegação ──────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 scrollbar-none">

        {/* Core — sem rótulos de seção, hierarquia pela ordem */}
        <div className="space-y-[1px]">
          {coreNav.map((item) => <NavLink key={item.path} item={item} />)}
        </div>

        {/* Mais — colapsável, nunca muda sozinho */}
        <div className="mt-4">
          {collapsed ? (
            <>
              <div className="h-px bg-si-border my-2 mx-1" />
              <Link to={maisNav[0].path} title="Mais" className={rowCollapsed(routeInMais)}>
                <MoreHorizontal className={cn('w-3.5 h-3.5', routeInMais ? 'text-si-1' : 'text-si-5')} />
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={toggleMais}
                aria-expanded={maisOpen}
                className={cn(row(false), 'justify-between pr-2', routeInMais && !maisOpen && 'text-si-2')}
              >
                <span className="flex items-center gap-2.5">
                  <MoreHorizontal className={cn('w-[14px] h-[14px] shrink-0', routeInMais && !maisOpen ? 'text-si-2' : 'text-si-5')} />
                  Mais
                  {routeInMais && !maisOpen && (
                    <span className="w-1.5 h-1.5 rounded-full bg-si-2" aria-hidden />
                  )}
                </span>
                <ChevronDown className={cn(
                  'w-3 h-3 text-si-5 transition-transform duration-150',
                  maisOpen && 'rotate-180'
                )} />
              </button>

              <div className={cn(
                'overflow-hidden transition-[max-height,opacity] duration-200',
                'pl-2 ml-2 border-l border-si-border',
                maisOpen ? 'max-h-[520px] opacity-100 mt-1' : 'max-h-0 opacity-0 pointer-events-none'
              )}>
                <div className="space-y-[1px]">
                  {maisNav.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                          base,
                          'px-2.5 py-[6px] w-full text-[11px] font-semibold tracking-[0.06em] uppercase',
                          active
                            ? 'text-si-1 bg-si-over-2'
                            : 'text-si-5 hover:text-si-3 hover:bg-si-over-1'
                        )}
                      >
                        <item.icon className={cn('w-3 h-3 shrink-0', active ? 'text-si-1' : 'text-si-5')} />
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
      <div className="border-t border-si-border shrink-0 py-2 px-2 space-y-[1px]">
        {bottomNav.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={collapsed ? rowCollapsed(active) : row(active)}
              {...(item.tour ? { 'data-tour': item.tour } : {})}
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
