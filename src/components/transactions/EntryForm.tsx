import { useState } from 'react';
import type { Entry } from '../../types/userData';
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from '../../constants/defaults';

interface EntryFormProps {
  entry?: Entry | null;
  onSubmit: (data: Omit<Entry, 'id'>) => void;
  onCancel: () => void;
}

export function EntryForm({ entry, onSubmit, onCancel }: EntryFormProps) {
  const [type, setType] = useState<'receita' | 'despesa'>(entry?.type ?? 'despesa');
  const [desc, setDesc] = useState(entry?.desc ?? '');
  const [category, setCategory] = useState(entry?.category ?? 'Outros');
  const [value, setValue] = useState(entry?.value !== undefined ? String(entry.value) : '');
  const [date, setDate] = useState(entry?.date ?? new Date().toISOString().slice(0, 10));
  const [account, setAccount] = useState(entry?.account ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numValue = parseFloat(value.replace(',', '.'));
    if (Number.isNaN(numValue) || numValue <= 0) return;
    onSubmit({
      type,
      desc: desc.trim() || category,
      category: category || 'Outros',
      value: Math.round(numValue * 100) / 100,
      date,
      account: account || undefined,
      status: 'pago',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1">Tipo</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType('receita')}
            className={`flex-1 py-2 rounded-xl font-medium text-sm ${type === 'receita' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-zinc-400 border border-white/5'}`}
          >
            Receita
          </button>
          <button
            type="button"
            onClick={() => setType('despesa')}
            className={`flex-1 py-2 rounded-xl font-medium text-sm ${type === 'despesa' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-white/5 text-zinc-400 border border-white/5'}`}
          >
            Despesa
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1">Descrição</label>
        <input
          type="text"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Ex: Supermercado"
          className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="entry-form-category" className="block text-xs font-medium text-zinc-500 mb-1">Categoria</label>
        <select
          id="entry-form-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500"
        >
          {DEFAULT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="entry-form-value" className="block text-xs font-medium text-zinc-500 mb-1">Valor (R$)</label>
        <input
          id="entry-form-value"
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^0-9,.-]/, ''))}
          placeholder="0,00"
          title="Valor em reais"
          className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1">Data</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="entry-form-account" className="block text-xs font-medium text-zinc-500 mb-1">Conta</label>
        <select
          id="entry-form-account"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500"
        >
          <option value="">—</option>
          {DEFAULT_ACCOUNTS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm"
        >
          {entry ? 'Salvar' : 'Adicionar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 font-medium text-sm hover:bg-white/10"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
