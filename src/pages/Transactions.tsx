import { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useFinancialData } from '../hooks/useFinancialData';
import { addEntry, updateEntry, deleteEntry } from '../services/persistUserData';
import type { Entry } from '../types/userData';
import { Modal } from '../components/ui/Modal';
import { EntryForm } from '../components/transactions/EntryForm';
import { Receipt, Search, Filter, Plus, Pencil, Trash2, X, FileText } from 'lucide-react';
import { generateReportPdf } from '../utils/generateReportPdf';

type FilterType = '' | 'receita' | 'despesa';

export default function Transactions() {
  const { user } = useAuth();
  const { data, entries, loading } = useFinancialData(user?.uid);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const userName = user?.displayName ?? (data?.name as string) ?? '';

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => e.category && set.add(e.category));
    return Array.from(set).sort();
  }, [entries]);

  const accounts = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => e.account && set.add(e.account));
    return Array.from(set).sort();
  }, [entries]);

  const sorted = [...entries]
    .filter(
      (e) =>
        (!search ||
          [e.desc, e.category, e.account].some((s) =>
            String(s ?? '').toLowerCase().includes(search.toLowerCase())
          )) &&
        (!filterType || e.type === filterType) &&
        (!filterCategory || e.category === filterCategory) &&
        (!filterAccount || e.account === filterAccount) &&
        (!filterStart || e.date >= filterStart) &&
        (!filterEnd || e.date <= filterEnd)
    )
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 200);

  const hasActiveFilter =
    filterType !== '' ||
    filterCategory !== '' ||
    filterAccount !== '' ||
    filterStart !== '' ||
    filterEnd !== '';
  const clearFilters = () => {
    setFilterType('');
    setFilterCategory('');
    setFilterAccount('');
    setFilterStart('');
    setFilterEnd('');
    setFilterOpen(false);
  };

  const handleAdd = async (data: Omit<Entry, 'id'>) => {
    if (!user?.uid) return;
    setError(null);
    setBusy(true);
    try {
      await addEntry(user.uid, entries, data);
      setAddOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async (data: Omit<Entry, 'id'>) => {
    if (!user?.uid || !editing) return;
    setError(null);
    setBusy(true);
    try {
      await updateEntry(user.uid, entries, editing.id, data);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!user?.uid) return;
    setError(null);
    setBusy(true);
    try {
      await deleteEntry(user.uid, entries, id);
      setDeletingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold">Lançamentos</h2>
          <p className="text-zinc-500 text-sm">Receitas e despesas – mesmo dados do app atual</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              try {
                generateReportPdf({
                  userName,
                  entries,
                  investments: { length: (data?.investments ?? []).length },
                  goals: { length: (data?.goals ?? []).length },
                });
              } catch (err) {
                console.error(err);
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-zinc-200 hover:bg-white/10"
          >
            <FileText className="w-4 h-4" />
            Gerar PDF
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> Novo lançamento
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-rose-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-4 items-start">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar lançamentos..."
            className="w-full bg-[#0a0f18] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>
        <div className="relative" ref={filterRef}>
          <button
            type="button"
            onClick={() => setFilterOpen((o) => !o)}
            title="Filtrar"
            aria-label="Filtrar lançamentos"
            className={`bg-[#0a0f18] border p-3 rounded-xl transition-colors ${hasActiveFilter ? 'border-blue-500/50 text-blue-400' : 'border-white/5 hover:bg-white/5'}`}
          >
            <Filter className="w-5 h-5" />
          </button>
          {filterOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 py-3 px-4 bg-[#0a0f18] border border-white/10 rounded-xl shadow-xl z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-zinc-500 uppercase">Filtros</span>
                {hasActiveFilter && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Limpar
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Tipo</label>
                  <select
                    id="filter-type"
                    aria-label="Filtrar por tipo"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as FilterType)}
                    className="w-full px-3 py-2 rounded-lg bg-[#05080d] border border-white/10 text-sm text-zinc-100"
                  >
                    <option value="">Todos</option>
                    <option value="receita">Receita</option>
                    <option value="despesa">Despesa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Categoria</label>
                  <select
                    id="filter-category"
                    aria-label="Filtrar por categoria"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#05080d] border border-white/10 text-sm text-zinc-100"
                  >
                    <option value="">Todas</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Conta</label>
                  <select
                    id="filter-account"
                    aria-label="Filtrar por conta"
                    value={filterAccount}
                    onChange={(e) => setFilterAccount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#05080d] border border-white/10 text-sm text-zinc-100"
                  >
                    <option value="">Todas</option>
                    {accounts.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1" htmlFor="filter-start">Data inicial</label>
                    <input
                      id="filter-start"
                      type="date"
                      value={filterStart}
                      onChange={(e) => setFilterStart(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#05080d] border border-white/10 text-sm text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1" htmlFor="filter-end">Data final</label>
                    <input
                      id="filter-end"
                      type="date"
                      value={filterEnd}
                      onChange={(e) => setFilterEnd(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#05080d] border border-white/10 text-sm text-zinc-100"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#0a0f18] rounded-[24px] border border-white/5 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              <th className="px-6 py-4">Descrição</th>
              <th className="px-6 py-4">Categoria</th>
              <th className="px-6 py-4">Data</th>
              <th className="px-6 py-4 text-right">Valor</th>
              <th className="px-6 py-4 w-24 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.map((e) => (
              <tr key={e.id} className="group hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${e.type === 'receita' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}
                    >
                      <Receipt className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{e.desc || e.category || '—'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-400">{e.category || '—'}</td>
                <td className="px-6 py-4 text-sm text-zinc-400">
                  {e.date ? new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                </td>
                <td
                  className={`px-6 py-4 text-sm font-bold text-right ${e.type === 'receita' ? 'text-emerald-400' : 'text-rose-400'}`}
                >
                  {e.type === 'receita' ? '+' : '-'} R${' '}
                  {Number(e.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => setEditing(e)}
                      className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(e.id)}
                      className="p-2 rounded-lg hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 text-sm">
                  {search ? 'Nenhum lançamento encontrado.' : 'Nenhum lançamento. Adicione um novo acima.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        )}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Novo lançamento">
        <EntryForm
          onSubmit={handleAdd}
          onCancel={() => setAddOpen(false)}
        />
        {busy && <p className="mt-3 text-zinc-500 text-sm">Salvando…</p>}
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar lançamento">
        {editing && (
          <EntryForm
            entry={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
          />
        )}
        {busy && <p className="mt-3 text-zinc-500 text-sm">Salvando…</p>}
      </Modal>

      <Modal
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        title="Excluir lançamento"
      >
        <p className="text-zinc-400 text-sm mb-6">
          Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => deletingId !== null && handleDelete(deletingId)}
            disabled={busy}
            className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-sm"
          >
            {busy ? 'Excluindo…' : 'Excluir'}
          </button>
          <button
            type="button"
            onClick={() => setDeletingId(null)}
            className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 font-medium text-sm hover:bg-white/10"
          >
            Cancelar
          </button>
        </div>
      </Modal>
    </div>
  );
}
