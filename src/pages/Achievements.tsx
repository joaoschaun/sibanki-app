import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { getMD, getStreak } from '../utils/reportUtils';
import { isTransferEntry } from '../utils/entryUtils';
import { Trophy, Target, Hash, Dumbbell, Medal, Wallet, PiggyBank, Layers, Calendar, CalendarDays, Rocket, TrendingUp, Star, Briefcase, ClipboardList, Leaf } from 'lucide-react';
import type { Entry } from '../types/userData';

const BADGES: {
  id: string;
  lucide: keyof typeof ICONS;
  name: string;
  desc: string;
  check: (ctx: BadgeContext) => boolean;
}[] = [
  { id: 'first', lucide: 'Target', name: 'Primeiro Passo', desc: 'Fez 1 lançamento', check: (c) => c.entries.length >= 1 },
  { id: 'ten', lucide: 'Hash', name: 'Consistente', desc: '10 lançamentos', check: (c) => c.entries.length >= 10 },
  { id: 'fifty', lucide: 'Dumbbell', name: 'Determinado', desc: '50 lançamentos', check: (c) => c.entries.length >= 50 },
  { id: 'hundred', lucide: 'Medal', name: 'Centenário', desc: '100 lançamentos', check: (c) => c.entries.length >= 100 },
  { id: 'income1', lucide: 'Wallet', name: 'Salário!', desc: 'Primeira receita', check: (c) => c.entries.some((e) => e.type === 'receita') },
  { id: 'saver', lucide: 'PiggyBank', name: 'Poupador', desc: 'Mês com saldo positivo', check: (c) => Object.values(c.md).some((x) => x.r > x.d) },
  { id: 'allcat', lucide: 'Layers', name: 'Diversificado', desc: '5+ categorias usadas', check: (c) => {
    const s = new Set<string>();
    c.entries.forEach((e) => s.add(e.category || ''));
    return s.size >= 5;
  }},
  { id: 'week', lucide: 'Calendar', name: 'Semanista', desc: '7 dias seguidos', check: (c) => getStreak(c.entries) >= 7 },
  { id: 'month', lucide: 'CalendarDays', name: 'Mensalista', desc: '30 dias seguidos', check: (c) => getStreak(c.entries) >= 30 },
  { id: 'surplus', lucide: 'Rocket', name: 'Superávit', desc: '3 meses positivos', check: (c) =>
    Object.values(c.md).filter((v) => v.r > v.d).length >= 3 },
  { id: 'invest', lucide: 'TrendingUp', name: 'Investidor', desc: 'Registrou investimento', check: (c) => c.investments.length >= 1 },
  { id: 'metaset', lucide: 'Target', name: 'Planejador', desc: 'Criou uma meta', check: (c) => c.goals.length >= 1 },
  { id: 'inv5', lucide: 'Briefcase', name: 'Carteira Diversa', desc: '5+ investimentos', check: (c) => c.investments.length >= 5 },
  { id: 'budget', lucide: 'ClipboardList', name: 'Orçamentista', desc: 'Definiu orçamento', check: (c) => Object.keys(c.budgets).length >= 1 },
  { id: 'organized', lucide: 'Star', name: 'Organizado', desc: 'Registros em vários meses', check: (c) =>
    Object.keys(c.md).length >= Math.max(new Date().getMonth(), 1) },
];

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Target, Hash, Dumbbell, Medal, Wallet, PiggyBank, Layers, Calendar, CalendarDays, Rocket, TrendingUp, Star, Briefcase, ClipboardList, Leaf,
};

function getLevel(achievedCount: number): string {
  if (achievedCount >= 12) return 'Mestre';
  if (achievedCount >= 9) return 'Expert';
  if (achievedCount >= 6) return 'Avançado';
  if (achievedCount >= 3) return 'Intermediário';
  if (achievedCount >= 1) return 'Iniciante';
  return 'Novato';
}

interface BadgeContext {
  entries: Entry[];
  md: Record<string, { r: number; d: number }>;
  investments: unknown[];
  goals: unknown[];
  budgets: Record<string, unknown>;
}

export default function Achievements() {
  const { entries, investments, goals, budgets, achievements, loading } = useAppContext();

  const entriesNoTransfer = useMemo(() => entries.filter((e) => !isTransferEntry(e)), [entries]);
  const md = useMemo(() => getMD(entries), [entries]);
  const streak = useMemo(() => getStreak(entries), [entries]);

  const ctx: BadgeContext = useMemo(
    () => ({
      entries: entriesNoTransfer,
      md,
      investments: investments ?? [],
      goals: goals ?? [],
      budgets: (budgets as Record<string, unknown>) ?? {},
    }),
    [entriesNoTransfer, md, investments, goals, budgets]
  );

  const { unlocked, count } = useMemo(() => {
    const u: Record<string, { date?: string }> = { ...achievements };
    for (const b of BADGES) {
      if (!u[b.id] && b.check(ctx)) {
        u[b.id] = { date: new Date().toISOString() };
      }
    }
    return { unlocked: u, count: Object.keys(u).length };
  }, [achievements, ctx]);

  const level = getLevel(count);
  const scoreDisplay = count * 100;

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400">
          <Trophy className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-si-1">Conquistas</h2>
          <p className="text-si-5 text-sm">
            Desbloqueie badges, acumule pontos e suba de nível mantendo suas finanças em ordem.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-si-card rounded-xl border border-si-border p-4">
          <div className="text-xs text-si-5">Conquistas</div>
          <div className="text-lg font-bold text-amber-400">{count}/{BADGES.length}</div>
        </div>
        <div className="bg-si-card rounded-xl border border-si-border p-4">
          <div className="text-xs text-si-5">Sequência</div>
          <div className="text-lg font-bold text-emerald-400">{streak} dias</div>
        </div>
        <div className="bg-si-card rounded-xl border border-si-border p-4">
          <div className="text-xs text-si-5">Nível</div>
          <div className="text-lg font-bold text-violet-400">{level}</div>
        </div>
        <div className="bg-si-card rounded-xl border border-si-border p-4">
          <div className="text-xs text-si-5">Score</div>
          <div className="text-lg font-bold text-blue-400">{scoreDisplay}</div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BADGES.map((b) => {
          const u = unlocked[b.id];
          const Icon = ICONS[b.lucide] ?? Trophy;
          return (
            <div
              key={b.id}
              className={`rounded-2xl border p-4 transition-colors ${
                u
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-si-card border-si-border opacity-75'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    u ? 'bg-amber-500/20 text-amber-400' : 'bg-si-over-2 text-si-5'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-si-1">{b.name}</div>
                  <div className="text-sm text-si-5">{b.desc}</div>
                  {u?.date && (
                    <div className="text-xs text-si-5 mt-1">
                      {new Date(u.date).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
