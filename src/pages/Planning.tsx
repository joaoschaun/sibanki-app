import { useState, useMemo } from 'react';
import { GenericPageSkeleton } from '../components/ui/PageSkeleton';
import { useAppContext } from '../context/AppContext';
import { useSibcoinToast } from '../hooks/useSibcoinToast';
import { addGoal, updateGoal, deleteGoal, addEntry, ValidationError } from '../services/persistUserData';
import type { Goal } from '../types/userData';
import { Modal } from '../components/ui/Modal';
import { Plus, Pencil, Trash2, Target, Shield, TrendingUp, Zap, Sparkles, Coins } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { SibcoinMissionBanner } from '../components/sibcoin/SibcoinMissionBanner';

const GOAL_ICONS = ['🎯', '🛡️', '✈️', '🏠', '🚗', '💼', '🎓', '❤️'];
const GOAL_COLORS = [
  { value: '#4F8CFF', label: 'Azul' },
  { value: '#10b981', label: 'Verde' },
  { value: '#f59e0b', label: 'Âmbar' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#8b5cf6', label: 'Roxo' },
  { value: '#ec4899', label: 'Rosa' },
];

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Planning() {
  const { user, goals, loading, entries, data, financialProfile } = useAppContext();
  const { triggerWithToast } = useSibcoinToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

  // ── Dados compartilhados ────────────────────────────────────────────────────
  const currentMonthKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const totalGasto = useMemo(() => {
    return entries.reduce((s, e) =>
      e.type === 'despesa' && e.date?.startsWith(currentMonthKey) ? s + (Number(e.value) || 0) : s, 0);
  }, [entries, currentMonthKey]);

  const receitaMes = useMemo(() =>
    entries.reduce((s, e) =>
      e.type === 'receita' && e.date?.startsWith(currentMonthKey) ? s + (Number(e.value) || 0) : s, 0),
    [entries, currentMonthKey]);

  const economia = useMemo(() =>
    Math.max(0, receitaMes - totalGasto),
    [receitaMes, totalGasto]);

  const burnRateDiario = useMemo(() => {
    const expensesMonthly = financialProfile?.cashflow?.expenses || parseFloat((data as any)?.cadastroCompleto?.gastosEstimados) || 3000;
    return expensesMonthly / 30;
  }, [financialProfile, data]);

  const [formTitle, setFormTitle] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formCurrent, setFormCurrent] = useState('');
  const [formIcon, setFormIcon] = useState('🎯');
  const [formColor, setFormColor] = useState('#4F8CFF');
  const [formDeadline, setFormDeadline] = useState('');

  const openAdd = () => {
    setFormTitle('');
    setFormTarget('');
    setFormCurrent('0');
    setFormIcon('🎯');
    setFormColor('#4F8CFF');
    setFormDeadline('');
    setError(null);
    setAddOpen(true);
  };

  const openEdit = (g: Goal) => {
    setEditing(g);
    setFormTitle(g.title ?? '');
    setFormTarget(String(g.target ?? 0));
    setFormCurrent(String(g.current ?? 0));
    setFormIcon(String((g as Goal & { icon?: string }).icon ?? '🎯'));
    setFormColor(String((g as Goal & { color?: string }).color ?? '#4F8CFF'));
    setFormDeadline(String((g as Goal & { deadline?: string }).deadline ?? ''));
    setError(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !formTitle.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const targetNum = parseFloat(formTarget.replace(',', '.')) || 0;
      const currentNum = parseFloat(formCurrent.replace(',', '.')) || 0;
      await addGoal(user.uid, goals, {
        title: formTitle.trim(),
        target: Math.round(targetNum * 100) / 100,
        current: Math.round(currentNum * 100) / 100,
        icon: formIcon,
        color: formColor,
        deadline: formDeadline || undefined,
      });
      triggerWithToast('goal_created'); // fire-and-forget SibCoin (shows toast on mission complete)
      setAddOpen(false);
    } catch (err) {
      if (err instanceof ValidationError) setError(err.errors.join('\n'));
      else setError(err instanceof Error ? err.message : 'Erro inesperado ao salvar meta.');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !editing) return;
    setError(null);
    setBusy(true);
    try {
      const targetNum = parseFloat(formTarget.replace(',', '.')) || 0;
      const currentNum = parseFloat(formCurrent.replace(',', '.')) || 0;
      await updateGoal(user.uid, goals, String(editing.id), {
        title: formTitle.trim(),
        target: Math.round(targetNum * 100) / 100,
        current: Math.round(currentNum * 100) / 100,
        icon: formIcon,
        color: formColor,
        deadline: formDeadline || undefined,
      });
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user?.uid) return;
    setError(null);
    setBusy(true);
    try {
      await deleteGoal(user.uid, goals, id);
      setDeletingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir.');
    } finally {
      setBusy(false);
    }
  };

  const handleAporteRapido = async (goalId: string, valor: number) => {
    if (!user?.uid || valor <= 0) return;
    const targetGoal = goals.find((g) => String(g.id) === goalId);
    if (!targetGoal) return;
    setBusy(true);
    setError(null);
    try {
      const nextCurrent = (targetGoal.current ?? 0) + valor;
      await updateGoal(user.uid, goals, goalId, {
        current: Math.round(nextCurrent * 100) / 100,
      });

      const today = new Date().toISOString().slice(0, 10);
      await addEntry(user.uid, entries, {
        type: 'despesa',
        desc: `Aporte: ${targetGoal.title}`,
        category: 'Investimentos',
        value: valor,
        date: today,
        account: 'Aporte Manual',
      });

      triggerWithToast('goal_created');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao realizar aporte.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <GenericPageSkeleton />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Planejamento</h2>
          <p className="text-si-5 text-sm">Crie e acompanhe suas metas financeiras</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="bg-blue-600 hover:bg-blue-500 text-si-1 px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nova meta
        </button>
      </div>

      {error && !addOpen && !editing && deletingId === null && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-rose-400 text-sm">
          {error}
        </div>
      )}

      <SibcoinMissionBanner eventType="goal_created" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {goals.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={<Target className="w-7 h-7" />}
              title="Nenhuma meta financeira"
              description="Defina metas para organizar seus objetivos — reserva de emergência, viagem, investimento ou qualquer sonho que queira alcançar."
              actionLabel="+ Nova meta"
              onAction={openAdd}
            />
          </div>
        ) : (
          goals.map((g) => {
            const gid = String(g.id);
            const target = g.target ?? 0;
            const current = g.current ?? 0;
            const pct = target > 0 ? Math.min(100, (100 * current) / target) : 0;
            const icon = String((g as Goal & { icon?: string }).icon ?? '🎯');
            const color = String((g as Goal & { color?: string }).color ?? '#4F8CFF');
            const deadline = String((g as Goal & { deadline?: string }).deadline ?? '');
            
            const isExpanded = expandedGoalId === gid;

            // 1. Cálculos de Tempo e Projeção
            let tempoMensagem = '';
            let statusCor = 'text-si-5 bg-si-over-2';
            let statusText = 'Sem Ritmo';
            let prazoMeses = 0;
            let mesesParaBater = 0;

            if (target > current) {
              const restante = target - current;
              if (economia > 0) {
                mesesParaBater = restante / economia;
                if (deadline) {
                  prazoMeses = Math.max(1, (new Date(deadline + 'T12:00:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30.4));
                  if (mesesParaBater <= prazoMeses) {
                    statusCor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                    statusText = 'No Ritmo';
                    const dataPrevista = new Date();
                    dataPrevista.setMonth(dataPrevista.getMonth() + Math.round(mesesParaBater));
                    const mesesAntes = Math.max(0, prazoMeses - mesesParaBater);
                    tempoMensagem = `No ritmo atual, você completará em ${dataPrevista.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} (${mesesAntes.toFixed(1)} meses antes do prazo ✓).`;
                  } else {
                    statusCor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                    statusText = 'Gargalo';
                    const difMensal = (restante / prazoMeses) - economia;
                    tempoMensagem = `Economia mensal insuficiente. Você precisa poupar +${fmtBRL(difMensal)}/mês para cumprir o prazo original.`;
                  }
                } else {
                  statusCor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                  statusText = 'Ativo';
                  tempoMensagem = `Com economia de ${fmtBRL(economia)}/mês, você baterá a meta em ${mesesParaBater.toFixed(1)} meses.`;
                }
              } else {
                statusCor = 'text-orange-400 bg-orange-500/10 border-orange-500/20';
                statusText = 'Estagnado';
                tempoMensagem = 'Ritmo zerado. Aporte economias mensais para reativar esta meta.';
              }
            } else {
              statusCor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
              statusText = 'Concluído';
              tempoMensagem = 'Parabéns! Meta completamente alcançada! 🎉';
            }

            // 2. Equivalente Ld
            const rateDiario = burnRateDiario > 0 ? burnRateDiario : 100;
            const ldAlvo = target / rateDiario;
            const ldAtual = current / rateDiario;

            // 3. Projeção CDI (0.8% a.m.)
            let jurosGanhos = 0;
            let esforcoEconomizadoPct = 0;
            const nMeses = deadline ? Math.max(1, Math.round(prazoMeses)) : 12;
            const pmt = target > current ? (target - current) / nMeses : 0;
            let fv = current;
            const rate = 0.008; // 0.8% a.m.
            for (let i = 0; i < nMeses; i++) {
              fv = (fv + pmt) * (1 + rate);
            }
            jurosGanhos = Math.max(0, fv - (current + pmt * nMeses));
            esforcoEconomizadoPct = target > 0 ? Math.round((jurosGanhos / target) * 100) : 0;

            return (
              <div
                key={gid}
                className="bg-si-card rounded-2xl border border-si-border p-6 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl shrink-0 flex items-center justify-center" style={{ backgroundColor: `${color}33`, color }}>
                      <span className="text-lg leading-none">{icon}</span>
                    </div>
                    <h3 className="font-bold text-si-1 truncate">{g.title || 'Meta'}</h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(g)}
                      className="p-2 rounded-lg hover:bg-si-over-3 text-si-4 hover:text-si-1"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(gid)}
                      className="p-2 rounded-lg hover:bg-rose-500/20 text-si-4 hover:text-rose-400"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-si-5">Progresso</span>
                    <span className="font-bold text-si-1">
                      R$ {current.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R${' '}
                      {target.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {deadline && (
                    <p className="text-xs text-si-5 mb-2">
                      Prazo: {new Date(deadline + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </p>
                  )}
                  <div className="h-2 rounded-full bg-si-over-2 overflow-hidden mb-4">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>

                  {/* Botão de Expansão de Inteligência */}
                  <button
                    type="button"
                    onClick={() => setExpandedGoalId(isExpanded ? null : gid)}
                    className={`w-full py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all ${
                      isExpanded
                        ? 'bg-blue-600/10 border-blue-500/30 text-blue-400'
                        : 'bg-si-over-2 border-si-border-md text-si-4 hover:bg-si-over-3 hover:text-si-2'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isExpanded ? 'Ocultar Projeções IA' : 'Ver Projeções e Aceleração'}
                  </button>

                  {/* Sub-painel IA Expandido */}
                  {isExpanded && (
                    <div className="pt-4 mt-4 border-t border-white/[0.04] space-y-4">
                      
                      {/* Projeção Temporal */}
                      <div className="flex items-start gap-2.5">
                        <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-si-2">Previsão de Tempo</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${statusCor}`}>
                              {statusText}
                            </span>
                          </div>
                          <p className="text-si-5 text-xs mt-1 leading-relaxed">{tempoMensagem}</p>
                        </div>
                      </div>

                      {/* Conexão Soberania */}
                      <div className="flex items-start gap-2.5">
                        <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-semibold text-si-2">Equivalência de Soberania (Ld)</span>
                          <p className="text-si-5 text-xs mt-1 leading-relaxed">
                            Alvo: <strong className="text-emerald-400">{ldAlvo.toFixed(0)} dias</strong> · Garantido: <strong className="text-emerald-400">{ldAtual.toFixed(0)} dias</strong> de blindagem patrimonial.
                          </p>
                        </div>
                      </div>

                      {/* Aceleração CDI */}
                      {target > current && (
                        <div className="flex items-start gap-2.5">
                          <TrendingUp className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs font-semibold text-si-2">Aceleração CDI (100%)</span>
                            <p className="text-si-5 text-xs mt-1 leading-relaxed">
                              Rendimento projetado: <strong className="text-blue-400">{fmtBRL(jurosGanhos)}</strong> em {nMeses} meses (paga <strong className="text-blue-400">{esforcoEconomizadoPct}%</strong> do esforço próprio).
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Aporte Rápido */}
                      {economia > 5 && target > current && (
                        <div className="p-3 rounded-xl bg-violet-950/10 border border-violet-500/20 text-xs space-y-2">
                          <p className="text-violet-300 leading-relaxed">
                            Você economizou <strong className="text-violet-400">{fmtBRL(economia)}</strong> este mês. Destinar sobra para acelerar esta meta?
                          </p>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleAporteRapido(gid, economia)}
                            className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <Coins className="w-3.5 h-3.5" /> Aportar Sobra de {fmtBRL(economia)}
                          </button>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Nova meta">
        <form onSubmit={handleAdd} className="space-y-4">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-rose-400 text-sm">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="goal-title" className="block text-xs font-medium text-si-5 mb-1">Título</label>
            <input
              id="goal-title"
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Ex: Reserva de emergência"
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="goal-target" className="block text-xs font-medium text-si-5 mb-1">Valor alvo (R$)</label>
            <input
              id="goal-target"
              type="text"
              inputMode="decimal"
              value={formTarget}
              onChange={(e) => setFormTarget(e.target.value.replace(/[^0-9,.-]/, ''))}
              placeholder="0,00"
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="goal-current" className="block text-xs font-medium text-si-5 mb-1">Valor atual (R$)</label>
            <input
              id="goal-current"
              type="text"
              inputMode="decimal"
              value={formCurrent}
              onChange={(e) => setFormCurrent(e.target.value.replace(/[^0-9,.-]/, ''))}
              placeholder="0,00"
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="goal-deadline" className="block text-xs font-medium text-si-5 mb-1">Prazo</label>
            <input
              id="goal-deadline"
              type="date"
              value={formDeadline}
              onChange={(e) => setFormDeadline(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-si-5 mb-1">Ícone</label>
            <div className="flex flex-wrap gap-2">
              {GOAL_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setFormIcon(ic)}
                  className={`w-9 h-9 rounded-xl border text-base ${formIcon === ic ? 'border-blue-400 bg-blue-500/20' : 'border-si-border-md bg-si-over-2'}`}
                  title={`Ícone ${ic}`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-si-5 mb-1">Cor</label>
            <div className="flex flex-wrap gap-2">
              {GOAL_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setFormColor(c.value)}
                  className="w-8 h-8 rounded-full border-2 border-transparent"
                  style={{ backgroundColor: c.value, borderColor: formColor === c.value ? '#fff' : 'transparent' }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-si-1 font-bold text-sm"
            >
              {busy ? 'Salvando…' : 'Adicionar'}
            </button>
            <button type="button" onClick={() => setAddOpen(false)} className="px-6 py-3 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 font-medium text-sm hover:bg-si-over-3">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar meta">
        {editing && (
          <form onSubmit={handleUpdate} className="space-y-4">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-rose-400 text-sm">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="edit-goal-title" className="block text-xs font-medium text-si-5 mb-1">Título</label>
              <input
                id="edit-goal-title"
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="edit-goal-target" className="block text-xs font-medium text-si-5 mb-1">Valor alvo (R$)</label>
              <input
                id="edit-goal-target"
                type="text"
                inputMode="decimal"
                value={formTarget}
                onChange={(e) => setFormTarget(e.target.value.replace(/[^0-9,.-]/, ''))}
                className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="edit-goal-current" className="block text-xs font-medium text-si-5 mb-1">Valor atual (R$)</label>
              <input
                id="edit-goal-current"
                type="text"
                inputMode="decimal"
                value={formCurrent}
                onChange={(e) => setFormCurrent(e.target.value.replace(/[^0-9,.-]/, ''))}
                className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="edit-goal-deadline" className="block text-xs font-medium text-si-5 mb-1">Prazo</label>
              <input
                id="edit-goal-deadline"
                type="date"
                value={formDeadline}
                onChange={(e) => setFormDeadline(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-si-5 mb-1">Ícone</label>
              <div className="flex flex-wrap gap-2">
                {GOAL_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setFormIcon(ic)}
                    className={`w-9 h-9 rounded-xl border text-base ${formIcon === ic ? 'border-blue-400 bg-blue-500/20' : 'border-si-border-md bg-si-over-2'}`}
                    title={`Ícone ${ic}`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-si-5 mb-1">Cor</label>
              <div className="flex flex-wrap gap-2">
                {GOAL_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setFormColor(c.value)}
                    className="w-8 h-8 rounded-full border-2 border-transparent"
                    style={{ backgroundColor: c.value, borderColor: formColor === c.value ? '#fff' : 'transparent' }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={busy} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-si-1 font-bold text-sm">
                {busy ? 'Salvando…' : 'Salvar'}
              </button>
              <button type="button" onClick={() => setEditing(null)} className="px-6 py-3 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 font-medium text-sm hover:bg-si-over-3">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={deletingId !== null} onClose={() => setDeletingId(null)} title="Excluir meta">
        <p className="text-si-4 text-sm mb-6">
          Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => deletingId != null && handleDelete(deletingId)}
            disabled={busy}
            className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-si-1 font-bold text-sm"
          >
            {busy ? 'Excluindo…' : 'Excluir'}
          </button>
          <button type="button" onClick={() => setDeletingId(null)} className="px-6 py-3 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 font-medium text-sm hover:bg-si-over-3">
            Cancelar
          </button>
        </div>
      </Modal>
    </div>
  );
}
