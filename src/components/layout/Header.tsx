import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';
// ✅ FIX: Removido useAuth + useFinancialData duplicados → usa AppContext (único listener Firestore)
import { useAppContext } from '../../context/AppContext';
import { Menu, Sun, Moon, Bell, User, LogOut, FileBarChart, Calendar, MessageSquarePlus, AlertTriangle, ShieldAlert, Check } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { FeedbackModal } from '../ui/FeedbackModal';
import { usePushNotifications } from '../../hooks/usePushNotifications';

/** Título da página atual no header — substitui o "SIBANKI" estático (S1, 12/06/2026). */
const ROUTE_TITLES: Array<[prefix: string, title: string]> = [
  ['/consultor-ia', 'Assistente'],
  ['/dashboard', 'Painel'],
  ['/lancamentos', 'Lançamentos'],
  ['/contas', 'Contas'],
  ['/credito', 'Crédito'],
  ['/crescimento', 'Investimentos'],
  ['/orcamento', 'Orçamento'],
  ['/planejamento', 'Metas'],
  ['/recorrentes', 'Recorrentes'],
  ['/loja', 'Loja'],
  ['/casal', 'Família'],
  ['/credi-amigo', 'Credi Amigo'],
  ['/consorcio-amigo', 'Consórcio'],
  ['/relatorios', 'Relatórios'],
  ['/calendario', 'Calendário'],
  ['/educacao', 'Educação'],
  ['/ferramentas', 'Ferramentas'],
  ['/fire', 'FIRE'],
  ['/meu-cpf', 'Meu CPF'],
  ['/meus-boletos', 'Meus Boletos'],
  ['/sibcoin', 'SibCoin'],
  ['/filiados', 'Filiados'],
  ['/social', 'Comunidade'],
  ['/perfil', 'Perfil'],
  ['/configuracoes', 'Configurações'],
  ['/conquistas', 'Conquistas'],
  ['/cripto', 'Cripto'],
  ['/solucoes', 'Soluções'],
];

function pageTitle(pathname: string): string {
  const hit = ROUTE_TITLES.find(([p]) => pathname.startsWith(p));
  return hit ? hit[1] : '';
}

interface HeaderProps {
  onMenuClick?: () => void;
  sidebarCollapsed?: boolean;
}

export function Header({ onMenuClick, sidebarCollapsed }: HeaderProps) {
  // ✅ FIX: Usa AppContext — elimina o 2º listener Firestore que causava freeze na UI
  const { user, data, entries = [], budgets = {}, cards = [] } = useAppContext();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const bellRef = useRef<HTMLDivElement>(null);
  const [bellOpen, setBellOpen] = useState(false);
  const push = usePushNotifications(user?.uid);

  // Calcula alertas ativos baseados nos dados financeiros reais do usuário
  const alertsList = useMemo(() => {
    const list: Array<{ id: string; type: 'warning' | 'error'; title: string; desc: string; link: string }> = [];

    // 1. Alertas de Orçamento
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const catSpent: Record<string, number> = {};
    for (const e of entries) {
      if (e.type === 'despesa' && (e.date || '').startsWith(currentMonth)) {
        const cat = e.category || 'Outros';
        catSpent[cat] = (catSpent[cat] || 0) + (Number(e.value) || 0);
      }
    }

    for (const [cat, limit] of Object.entries(budgets)) {
      const numLimit = Number(limit);
      if (!numLimit || numLimit <= 0) continue;
      const spent = catSpent[cat] || 0;
      const pct = Math.round((spent / numLimit) * 100);

      if (pct >= 100) {
        list.push({
          id: `budget-exceeded-${cat}`,
          type: 'error',
          title: `${cat}: Orçamento estourado!`,
          desc: `Você atingiu ${pct}% do limite de ${cat} (Gasto: R$ ${spent.toFixed(2)} / Limite: R$ ${numLimit.toFixed(2)}).`,
          link: '/orcamento'
        });
      } else if (pct >= 80) {
        list.push({
          id: `budget-warning-${cat}`,
          type: 'warning',
          title: `${cat}: Limite próximo!`,
          desc: `Atenção: você já usou ${pct}% do orçamento de ${cat} (Gasto: R$ ${spent.toFixed(2)} / Limite: R$ ${numLimit.toFixed(2)}).`,
          link: '/orcamento'
        });
      }
    }

    // 2. Alertas de Faturas de Cartão
    for (const card of cards) {
      if (!card.dueDay) continue;
      const dueDate = new Date(now.getFullYear(), now.getMonth(), card.dueDay);
      const diffTime = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays <= 3) {
        const cardName = card.name || card.bandeira || 'Cartão';
        list.push({
          id: `card-due-${card.id || card.name}`,
          type: diffDays === 0 ? 'error' : 'warning',
          title: diffDays === 0 ? `Fatura vence hoje: ${cardName}` : `Fatura vence em ${diffDays} dia(s)`,
          desc: `A fatura do seu cartão ${cardName} vence no dia ${card.dueDay}. Evite multas e juros!`,
          link: '/credito/cartoes'
        });
      }
    }

    return list;
  }, [entries, budgets, cards]);

  useEffect(() => {
    // ✅ FIX: mousedown (em vez de click) — detecta fora antes do React processar o evento
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const avatarURL = data?.avatarURL ?? user?.photoURL ?? null;


  const handleLogout = () => {
    setDropdownOpen(false);
    signOut(auth);
  };

  return (
    // ✅ FIX: Removido onMouseLeave do header — causava fechamento prematuro do dropdown
    //        ao mover o mouse para o sidebar ou conteúdo principal
    <header className="h-14 bg-si-card border-b border-si-border flex items-center justify-between gap-2 px-4 sm:px-6 shrink-0 relative z-50">
      <div className="flex items-center gap-3 min-w-0">
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
        <h1 className="text-[11px] font-bold tracking-[0.2em] uppercase text-si-4 truncate">
          {pageTitle(location.pathname)}
        </h1>
      </div>

      <div className="flex items-center gap-2">
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

        <div className="relative" ref={bellRef}>
          <button
            type="button"
            onClick={() => setBellOpen((o) => !o)}
            className="p-2 hover:bg-si-over-2 rounded-md relative transition-colors min-touch-target active-press"
            aria-label="Notificações"
            data-tour="notificacoes"
          >
            <Bell className="w-4 h-4 text-si-4" />
            {alertsList.length > 0 && (
              <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-si-3 rounded-full animate-pulse" />
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-si-card border border-si-border-md rounded-xl shadow-xl z-50 overflow-hidden">
              {/* Header */}
              <div className="text-[10px] font-bold text-si-4 uppercase tracking-[0.15em] px-4 py-3 border-b border-si-border">
                Alertas e Notificações
              </div>

              {/* List */}
              <div className="max-h-64 overflow-y-auto divide-y divide-si-border">
                {alertsList.length > 0 ? (
                  alertsList.map((alert) => (
                    <Link
                      key={alert.id}
                      to={alert.link}
                      onClick={() => setBellOpen(false)}
                      className="flex items-start gap-3 p-4 hover:bg-si-over-2 transition-colors group"
                    >
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${alert.type === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        {alert.type === 'error' ? (
                          <ShieldAlert className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-si-1 group-hover:text-white transition-colors">{alert.title}</p>
                        <p className="text-[10px] text-si-4 mt-1 leading-relaxed">{alert.desc}</p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2">
                      <Check className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-si-1">Tudo sob controle</p>
                    <p className="text-[10px] text-si-5 mt-1 leading-relaxed">Nenhum alerta de orçamento ou fatura pendente.</p>
                  </div>
                )}
              </div>

              {/* Push Status Section */}
              <div className="p-3 bg-si-over-2 border-t border-si-border flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-[10px] text-si-4 font-semibold uppercase tracking-wider">Push Notifications</span>
                  {push.isEnabled ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Ativo
                    </span>
                  ) : push.supported ? (
                    <button
                      type="button"
                      onClick={() => {
                        push.requestPermission();
                      }}
                      disabled={push.loading}
                      className="px-2 py-1 rounded bg-white hover:bg-zinc-100 text-zinc-950 text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                    >
                      {push.loading ? 'Ativando...' : 'Ativar'}
                    </button>
                  ) : (
                    <span className="text-[10px] text-si-5 font-semibold">Indisponível</span>
                  )}
                </div>
                {push.error && (
                  <p className="text-[9px] text-rose-400 leading-normal border-t border-si-border pt-1.5">
                    Erro: {push.error}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

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
              {/* <Link
                to="/conquistas"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-si-3 hover:bg-si-over-2"
              >
                <Trophy className="w-4 h-4" /> Conquistas
              </Link> */}
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
