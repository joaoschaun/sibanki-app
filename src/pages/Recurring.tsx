import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { addRecurrent, deleteRecurrent, generateEntriesFromRecurrents } from '../services/persistUserData';
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from '../constants/defaults';
import { Modal } from '../components/ui/Modal';
import { Plus, Trash2, PlayCircle } from 'lucide-react';

const FREQ_OPTIONS = [
  { value: 'mensal', label: 'Mensal' },
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'bimestral', label: 'Bimestral' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
];

export default function Recurring() {
  const { user, recurrents, entries, accounts, categories: userCategories, loading } = useAppContext();
  const categories = userCategories?.length ? userCategories : DEFAULT_CATEGORIES;
  const accountOptions = accounts?.length ? accounts : DEFAULT_ACCOUNTS;

  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generateMessage, setGenerateMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [formType, setFormType] = useState<'receita' | 'despesa'>('despesa');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formAccount, setFormAccount] = useState('');
  const [formDay, setFormDay] = useState('10');
  const [formFreq, setFormFreq] = useState('mensal');

  const activeRecurrents = recurrents.filter((r) => r.active !== false);
  const totalReceita = activeRecurrents.filter((r) => r.type === 'receita').reduce((s, r) => s + r.value, 0);
  const totalDespesa = activeRecurrents.filter((r) => r.type === 'despesa').reduce((s, r) => s + r.value, 0);

  const openAdd = () => {
    setFormType('despesa');
    setFormDesc('');
    setFormCategory('');
    setFormValue('');
    setFormAccount('');
    setFormDay('10');
    setFormFreq('mensal');
    setError(null);
    setModalOpen(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !formDesc.trim()) return;
    const value = parseFloat(formValue.replace(',', '.')) || 0;
    if (value <= 0) {
      setError('Informe um valor maior que zero.');
      return;
    }
    const day = Math.max(1, Math.min(31, parseInt(formDay, 10) || 1));
    setError(null);
    setBusy(true);
    try {
      await addRecurrent(user.uid, recurrents, {
        type: formType,
        desc: formDesc.trim(),
        category: formCategory || undefined,
        value: Math.round(value * 100) / 100,
        account: formAccount || undefined,
        day,
        freq: formFreq,
        active: true,
      });
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!user?.uid) return;
    setError(null);
    setBusy(true);
    try {
      await deleteRecurrent(user.uid, recurrents, id);
      setDeletingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir.');
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateMonth = async () => {
    if (!user?.uid || activeRecurrents.length === 0) return;
    setGenerateMessage(null);
    setError(null);
    setBusy(true);
    try {
      const count = await generateEntriesFromRecurrents(user.uid, entries, recurrents);
      setGenerateMessage({
        type: 'ok',
        text: count > 0 ? `${count} lançamento(s) do mês gerado(s) a partir dos recorrentes.` : 'Nenhum lançamento novo neste mês (já foram gerados ou não há recorrentes ativos para este período).',
      });
      setTimeout(() => setGenerateMessage(null), 5000);
    } catch (err) {
      setGenerateMessage({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao gerar lançamentos.' });
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
          <h2 className="text-3xl font-bold">Recorrentes</h2>
          <p className="text-si-5 text-sm">Lançamentos fixos (aluguel, assinaturas, salário, etc.)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openAdd}
            className="bg-blue-600 hover:bg-blue-500 text-si-1 px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Novo recorrente
          </button>
          {activeRecurrents.length > 0 && (
            <button
              type="button"
              onClick={handleGenerateMonth}
              disabled={busy}
              className="bg-emerald-600/80 hover:bg-emerald-600 text-si-1 px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-50 border border-emerald-500/30"
            >
              <PlayCircle className="w-4 h-4" /> Gerar lançamentos do mês
            </button>
          )}
        </div>
      </div>

      {generateMessage && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${generateMessage.type === 'ok' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}
        >
          {generateMessage.text}
        </div>
      )}

      {error && !modalOpen && deletingId === null && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {activeRecurrents.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-si-card rounded-2xl border border-si-border p-6">
            <p className="text-si-5 text-sm">Receitas fixas</p>
            <p className="text-2xl font-bold text-emerald-400">
              R$ {totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-si-card rounded-2xl border border-si-border p-6">
            <p className="text-si-5 text-sm">Despesas fixas</p>
            <p className="text-2xl font-bold text-rose-400">
              R$ {totalDespesa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-si-card rounded-2xl border border-si-border p-6">
            <p className="text-si-5 text-sm">Saldo fixo</p>
            <p className={`text-2xl font-bold ${totalReceita - totalDespesa >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              R$ {(totalReceita - totalDespesa).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      )}

      <div className="bg-si-card rounded-2xl border border-si-border overflow-hidden">
        {recurrents.length === 0 ? (
          <div className="p-12 text-center text-si-5">
            Nenhum lançamento recorrente. Clique em &quot;Novo recorrente&quot; para cadastrar (ex.: aluguel, assinaturas, salário).
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {recurrents.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-4 p-6 hover:bg-si-over-1 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-bold text-si-1 truncate">{r.desc}</p>
                  <p className="text-xs text-si-5">
                    {r.category ?? '—'} · dia {r.day} · {FREQ_OPTIONS.find((f) => f.value === (r.freq || 'mensal'))?.label ?? r.freq ?? 'Mensal'}
                    {r.account ? ` · ${r.account}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`font-bold ${r.type === 'receita' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    R$ {(r.value ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDeletingId(r.id)}
                    className="p-2 rounded-lg hover:bg-rose-500/20 text-si-4 hover:text-rose-400"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo recorrente">
        <form onSubmit={handleAdd} className="space-y-4">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-rose-400 text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-si-5 mb-1">Tipo</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormType('despesa')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${formType === 'despesa' ? 'bg-rose-600 text-si-1' : 'bg-si-over-2 text-si-4 border border-si-border-md'}`}
              >
                Despesa
              </button>
              <button
                type="button"
                onClick={() => setFormType('receita')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${formType === 'receita' ? 'bg-emerald-600 text-si-1' : 'bg-si-over-2 text-si-4 border border-si-border-md'}`}
              >
                Receita
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="rc-desc" className="block text-xs font-medium text-si-5 mb-1">Descrição</label>
            <input
              id="rc-desc"
              type="text"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Ex: Aluguel, Netflix"
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="rc-category" className="block text-xs font-medium text-si-5 mb-1">Categoria</label>
            <select
              id="rc-category"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
            >
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="rc-value" className="block text-xs font-medium text-si-5 mb-1">Valor (R$)</label>
            <input
              id="rc-value"
              type="text"
              inputMode="decimal"
              value={formValue}
              onChange={(e) => setFormValue(e.target.value.replace(/[^0-9,.-]/, ''))}
              placeholder="0,00"
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="rc-day" className="block text-xs font-medium text-si-5 mb-1">Dia (1–31)</label>
              <input
                id="rc-day"
                type="number"
                min={1}
                max={31}
                value={formDay}
                onChange={(e) => setFormDay(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="rc-freq" className="block text-xs font-medium text-si-5 mb-1">Frequência</label>
              <select
                id="rc-freq"
                value={formFreq}
                onChange={(e) => setFormFreq(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
              >
                {FREQ_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="rc-account" className="block text-xs font-medium text-si-5 mb-1">Conta (opcional)</label>
            <select
              id="rc-account"
              value={formAccount}
              onChange={(e) => setFormAccount(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
            >
              <option value="">—</option>
              {accountOptions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-si-1 font-bold text-sm"
            >
              {busy ? 'Salvando…' : 'Adicionar'}
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-6 py-3 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 font-medium text-sm hover:bg-si-over-3"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={deletingId !== null} onClose={() => setDeletingId(null)} title="Excluir recorrente">
        <p className="text-si-4 text-sm mb-6">Tem certeza que deseja excluir este lançamento recorrente?</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => deletingId != null && handleDelete(deletingId)}
            disabled={busy}
            className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-si-1 font-bold text-sm"
          >
            {busy ? 'Excluindo…' : 'Excluir'}
          </button>
          <button
            type="button"
            onClick={() => setDeletingId(null)}
            className="px-6 py-3 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 font-medium text-sm hover:bg-si-over-3"
          >
            Cancelar
          </button>
        </div>
      </Modal>
    </div>
  );
}
