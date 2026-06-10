import { useEffect, useState } from 'react';
import {
  Receipt, TrendingUp, Wallet, CreditCard, Target, PieChart,
  FileBarChart, Calendar, User, Settings, MoreHorizontal, ChevronDown,
  Handshake, Users, Heart, MessageCircle, LayoutDashboard, ShoppingBag,
  Coins, BookOpen, Wrench, Flame, ShieldCheck, Zap,
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

// ── PRINCIPAL — acesso diário ─────────────────────────────────────────────────
const principalNav: NavItem[] = [
  { icon: MessageCircle,   label: 'Assistente',   path: '/consultor-ia', tour: 'consultor' },
  { icon: LayoutDashboard, label: 'Painel',        path: '/dashboard',    tour: 'dashboard' },
  { icon: Receipt,         label: 'Lançamentos',  path: '/lancamentos',  tour: 'lancamentos' },
  { icon: TrendingUp,      label: 'Investimentos', path: '/crescimento' },
];

// ── GESTÃO — controle financeiro ──────────────────────────────────────────────
const gestaoNav: NavItem[] = [
  { icon: Wallet,     label: 'Contas',    path: '/contas'       },
  { icon: CreditCard, label: 'Crédito',   path: '/credito'      },
  { icon: PieChart,   label: 'Orçamento', path: '/orcamento'    },
  { icon: Target,     label: 'Metas',     path: '/planejamento' },
];

// ── SOCIAL — diferencial viral ────────────────────────────────────────────────
const socialNav: NavItem[] = [
  { icon: ShoppingBag, label: 'Loja',       path: '/loja'            },
  { icon: Handshake,   label: 'Credi Amigo',path: '/credi-amigo'     },
  { icon: Users,       label: 'Consórcio',  path: '/consorcio-amigo' },
  { icon: Heart,       label: 'Casal',      path: '/casal'           },
];

// ── MAIS — acesso ocasional ───────────────────────────────────────────────────
const maisNav: NavItem[] = [
  { icon: FileBarChart, label: 'Relatórios', path: '/relatorios' },
  { icon: Calendar,     label: 'Calendário', path: '/calendario' },
  { icon: BookOpen,     label: 'Educação',   path: '/educacao'   },
  { icon: Wrench,       label: 'Ferramentas',path: '/ferramentas'},
  { icon: Flame,        label: 'FIRE',       path: '/fire'       },
  { icon: ShieldCheck,  label: 'Meu CPF',    path: '/meu-cpf'    },
  { icon: Coins,        label: 'SibCoin',    path: '/sibcoin'    },
  { icon: Zap,          label: 'Filiados',   path: '/filiados'   },
];

// ── RODAPÉ ────────────────────────────────────────────────────────────────────
const bottomNav: NavItem[] = [
  { icon: User,     label: 'Perfil',        path: '/perfil',       tour: 'perfil' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
];

const maisPaths = maisNav.map((i) => i.path);

// ── MODO SIMPLES (Ação #6 — Análise 360) ─────────────────────────────────────
// Por padrão o menu mostra só o essencial (7 itens + rodapé). O restante fica
// atrás de "Menu completo" — persiste em localStorage. Reduz a sobrecarga
// cognitiva do usuário novo sem esconder nada de quem já domina o app.
const SIDEBAR_FULL_KEY = 'sib_sidebar_full';

/** Itens de Gestão visíveis também no modo simples. */
const gestaoSimpleNav: NavItem[] = gestaoNav.filter(
  (i) => i.path === '/contas' || i.path === '/credito',
);
/** Itens ocultos no modo simples (para auto-expandir quando a rota for um deles). */
const hiddenInSimplePaths: string[] = [
  ...gestaoNav.filter((i) => !gestaoSimpleNav.includes(i)).map((i) => i.path),
  ...socialNav.map((i) => i.path),
  ...maisPaths,
];

export function Sidebar({
  collapsed,
  openGroup: _openGroup,
  setOpenGroup,
}: SidebarProps) {
  const { branding } = useTenant();
  const location = useLocation();
  const [maisOpen, setMaisOpen] = useState(false);
  const [fullMenu, setFullMenu] = useState<boolean>(() => {
    try { return localStorage.getItem(SIDEBAR_FULL_KEY) === '1'; } catch { return false; }
  });
  // Rota ativa escondida no modo simples → exibe o menu completo nessa visita.
  const routeNeedsFull = hiddenInSimplePaths.some((p) => location.pathname.startsWith(p));
  const showFull = fullMenu || routeNeedsFull;
  const toggleFullMenu = () => {
    setFullMenu((v) => {
      const next = !v;
      try { localStorage.setItem(SIDEBAR_FULL_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };

  useEffect(() => {
    if (collapsed) { setMaisOpen(false); setOpenGroup(null); }
  }, [collapsed, setOpenGroup]);

  useEffect(() => {
    if (!collapsed && maisPaths.includes(location.pathname)) setMaisOpen(true);
  }, [location.pathname, collapsed]);

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  // ── Estilos — usa tokens CSS (dark + light automático) ───────────────────────
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

  const sectionLabel = cn(
    'text-[10px] font-bold tracking-[0.22em] uppercase text-si-5 px-2.5 mb-1 mt-0.5 select-none'
  );

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

  function Section({ label, items }: { label: string; items: NavItem[] }) {
    return (
      <div className="mt-4">
        {!collapsed
          ? <p className={sectionLabel}>{label}</p>
          : <div className="h-px bg-si-border my-2 mx-1" />
        }
        <div className="space-y-[1px]">
          {items.map((item) => <NavLink key={item.path} item={item} />)}
        </div>
      </div>
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

        {/* PRINCIPAL */}
        {!collapsed && <p className={sectionLabel}>Principal</p>}
        <div className="space-y-[1px]">
          {principalNav.map((item) => <NavLink key={item.path} item={item} />)}
        </div>

        {/* GESTÃO — no modo simples só Contas + Crédito */}
        <Section label="Gestão" items={showFull ? gestaoNav : gestaoSimpleNav} />

        {/* SOCIAL — oculto no modo simples */}
        {showFull && <Section label="Social" items={socialNav} />}

        {/* Toggle Menu simples/completo */}
        {!collapsed && !routeNeedsFull && (
          <button
            type="button"
            onClick={toggleFullMenu}
            className={cn(row(false), 'mt-4 text-si-5')}
          >
            <MoreHorizontal className="w-[14px] h-[14px] shrink-0 text-si-5" />
            {fullMenu ? 'Menu simples' : 'Menu completo'}
          </button>
        )}

        {/* MAIS — accordion (só no menu completo) */}
        {showFull && <div className="mt-4">
          {collapsed ? (
            <>
              <div className="h-px bg-si-border my-2 mx-1" />
              <div title="Mais" className={rowCollapsed(false)}>
                <MoreHorizontal className="w-3.5 h-3.5 text-si-5" />
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setMaisOpen((v) => !v)}
                className={cn(row(false), 'justify-between pr-2')}
              >
                <span className="flex items-center gap-2.5">
                  <MoreHorizontal className="w-[14px] h-[14px] shrink-0 text-si-5" />
                  Mais
                </span>
                <ChevronDown className={cn(
                  'w-3 h-3 text-si-5 transition-transform duration-150',
                  maisOpen && 'rotate-180'
                )} />
              </button>

              <div className={cn(
                'overflow-hidden transition-[max-height,opacity] duration-200',
                'pl-2 ml-2 border-l border-si-border',
                maisOpen ? 'max-h-[400px] opacity-100 mt-1' : 'max-h-0 opacity-0 pointer-events-none'
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
                            ? 'text-si-2 bg-si-over-1'
                            : 'text-si-5 hover:text-si-3 hover:bg-si-over-1'
                        )}
                      >
                        <item.icon className={cn('w-3 h-3 shrink-0', active ? 'text-si-2' : 'text-si-5')} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>}
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
