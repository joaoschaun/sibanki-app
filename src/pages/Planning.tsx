import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useFinancialData } from '../hooks/useFinancialData';
import { addGoal, updateGoal, deleteGoal } from '../services/persistUserData';
import type { Goal } from '../types/userData';
import { Modal } from '../components/ui/Modal';
import { Target, Plus, Pencil, Trash2 } from 'lucide-react';

export default function Planning() {
  const { user } = useAuth();
  const { goals, loading } = useFinancialData(user?.uid);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formCurrent, setFormCurrent] = useState('');

  const openAdd = () => {
    setFormTitle('');
    setFormTarget('');
    setFormCurrent('0');
    setError(null);
    setAddOpen(true);
  };

  const openEdit = (g: Goal) => {
    setEditing(g);
    setFormTitle(g.title ?? '');
    setFormTarget(String(g.target ?? 0));
    setFormCurrent(String(g.current ?? 0));
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
      });
      setAddOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar meta.');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Planejamento</h2>
          <p className="text-zinc-500 text-sm">Metas financeiras – mesmo dados do app atual</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nova meta
        </button>
      </div>

      {error && !addOpen && !editing && deletingId === null && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-rose-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {goals.length === 0 ? (
          <div className="col-span-full bg-[#0a0f18] rounded-2xl border border-white/5 p-12 text-center text-zinc-500">
            Nenhuma meta. Clique em &quot;Nova meta&quot; para criar uma.
          </div>
        ) : (
          goals.map((g) => {
            const gid = String(g.id);
            const pct = (g.target ?? 0) > 0 ? Math.min(100, (100 * (g.current ?? 0)) / (g.target ?? 0)) : 0;
            return (
              <div
                key={gid}
                className="bg-[#0a0f18] rounded-2xl border border-white/5 p-6 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
                      <Target className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-zinc-100 truncate">{g.title || 'Meta'}</h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(g)}
                      className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(gid)}
                      className="p-2 rounded-lg hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-500">Progresso</span>
                    <span className="font-bold text-zinc-100">
                      R$ {(g.current ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R${' '}
                      {(g.target ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
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
            <label htmlFor="goal-title" className="block text-xs font-medium text-zinc-500 mb-1">Título</label>
            <input
              id="goal-title"
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Ex: Reserva de emergência"
              className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="goal-target" className="block text-xs font-medium text-zinc-500 mb-1">Valor alvo (R$)</label>
            <input
              id="goal-target"
              type="text"
              inputMode="decimal"
              value={formTarget}
              onChange={(e) => setFormTarget(e.target.value.replace(/[^0-9,.-]/, ''))}
              placeholder="0,00"
              className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="goal-current" className="block text-xs font-medium text-zinc-500 mb-1">Valor atual (R$)</label>
            <input
              id="goal-current"
              type="text"
              inputMode="decimal"
              value={formCurrent}
              onChange={(e) => setFormCurrent(e.target.value.replace(/[^0-9,.-]/, ''))}
              placeholder="0,00"
              className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm"
            >
              {busy ? 'Salvando…' : 'Adicionar'}
            </button>
            <button type="button" onClick={() => setAddOpen(false)} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 font-medium text-sm hover:bg-white/10">
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
              <label htmlFor="edit-goal-title" className="block text-xs font-medium text-zinc-500 mb-1">Título</label>
              <input
                id="edit-goal-title"
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="edit-goal-target" className="block text-xs font-medium text-zinc-500 mb-1">Valor alvo (R$)</label>
              <input
                id="edit-goal-target"
                type="text"
                inputMode="decimal"
                value={formTarget}
                onChange={(e) => setFormTarget(e.target.value.replace(/[^0-9,.-]/, ''))}
                className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="edit-goal-current" className="block text-xs font-medium text-zinc-500 mb-1">Valor atual (R$)</label>
              <input
                id="edit-goal-current"
                type="text"
                inputMode="decimal"
                value={formCurrent}
                onChange={(e) => setFormCurrent(e.target.value.replace(/[^0-9,.-]/, ''))}
                className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={busy} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm">
                {busy ? 'Salvando…' : 'Salvar'}
              </button>
              <button type="button" onClick={() => setEditing(null)} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 font-medium text-sm hover:bg-white/10">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={deletingId !== null} onClose={() => setDeletingId(null)} title="Excluir meta">
        <p className="text-zinc-400 text-sm mb-6">
          Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => deletingId != null && handleDelete(deletingId)}
            disabled={busy}
            className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-sm"
          >
            {busy ? 'Excluindo…' : 'Excluir'}
          </button>
          <button type="button" onClick={() => setDeletingId(null)} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 font-medium text-sm hover:bg-white/10">
            Cancelar
          </button>
        </div>
      </Modal>
    </div>
  );
}
