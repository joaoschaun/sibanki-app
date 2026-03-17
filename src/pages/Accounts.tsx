import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useFinancialData } from '../hooks/useFinancialData';
import {
  addAccount,
  updateAccountBalance,
  deleteAccount,
  updateAccountMeta,
  renameAccount,
} from '../services/persistUserData';
import { Modal } from '../components/ui/Modal';
import { Wallet, Plus, Pencil, List, Trash2 } from 'lucide-react';

const TIPOS_CONTA = ['Conta corrente', 'Poupança', 'Carteira', 'Investimento', 'Outros'];
const CORES_CONTA = [
  { value: '#4F8CFF', label: 'Azul' },
  { value: '#10b981', label: 'Verde' },
  { value: '#f59e0b', label: 'Âmbar' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#8b5cf6', label: 'Roxo' },
  { value: '#ec4899', label: 'Rosa' },
];

export default function Accounts() {
  const { user } = useAuth();
  const { accounts, accountBalances, accountMeta, entries, loading } = useFinancialData(user?.uid);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [adjustAccount, setAdjustAccount] = useState<string | null>(null);
  const [adjustValue, setAdjustValue] = useState('');
  const [extratoAccount, setExtratoAccount] = useState<string | null>(null);
  const [editAccount, setEditAccount] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTipo, setEditTipo] = useState('');
  const [editCor, setEditCor] = useState('');
  const [editIncluir, setEditIncluir] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = accounts.length > 0 ? accounts : ['Nenhuma conta cadastrada'];
  const total = list
    .filter((name) => name !== 'Nenhuma conta cadastrada' && accountMeta[name]?.incluirNaSoma !== false)
    .reduce((sum, name) => sum + (accountBalances[name] ?? 0), 0);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!user?.uid || !n) return;
    if (accounts.includes(n)) {
      setError('Já existe uma conta com esse nome.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const value = parseFloat(initialBalance.replace(',', '.')) || 0;
      await addAccount(user.uid, accounts, accountBalances, n, value);
      setModalOpen(false);
      setName('');
      setInitialBalance('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar conta.');
    } finally {
      setBusy(false);
    }
  };

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !adjustAccount) return;
    const value = parseFloat(adjustValue.replace(',', '.')) || 0;
    setError(null);
    setBusy(true);
    try {
      await updateAccountBalance(user.uid, accountBalances, adjustAccount, Math.round(value * 100) / 100);
      setAdjustAccount(null);
      setAdjustValue('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar saldo.');
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (accountName: string) => {
    setEditAccount(accountName);
    setEditName(accountName);
    const meta = accountMeta[accountName];
    setEditTipo(meta?.tipo ?? 'Conta corrente');
    setEditCor(meta?.cor ?? '#4F8CFF');
    setEditIncluir(meta?.incluirNaSoma !== false);
    setError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !editAccount) return;
    const newName = editName.trim();
    if (!newName) return;
    setError(null);
    setBusy(true);
    try {
      const meta = accountMeta ?? {};
      if (newName !== editAccount) {
        await renameAccount(user.uid, accounts, accountBalances, meta, entries, editAccount, newName);
      }
      const metaComNovoNome = newName !== editAccount
        ? { ...meta, [newName]: meta[editAccount] ?? {} }
        : meta;
      await updateAccountMeta(user.uid, metaComNovoNome, newName, {
        tipo: editTipo,
        cor: editCor,
        incluirNaSoma: editIncluir,
      });
      setEditAccount(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.uid || !deleteConfirm) return;
    setBusy(true);
    try {
      await deleteAccount(user.uid, accounts, accountBalances, accountMeta ?? {}, deleteConfirm);
      setDeleteConfirm(null);
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
          <h2 className="text-3xl font-bold">Contas</h2>
          <p className="text-zinc-500 text-sm">Saldos por conta – mesmo dados do app atual</p>
        </div>
        <button
          type="button"
          onClick={() => { setError(null); setModalOpen(true); }}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nova conta
        </button>
      </div>

      {error && !modalOpen && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-rose-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((name) => {
          const balance = name !== 'Nenhuma conta cadastrada' ? (accountBalances[name] ?? 0) : 0;
          const meta = name !== 'Nenhuma conta cadastrada' ? accountMeta[name] : undefined;
          const corHex = meta?.cor?.startsWith('#') ? meta.cor : null;
          const colorClass = corHex ? '' : (meta?.cor ?? 'bg-blue-500/20 text-blue-400');
          const isEmpty = accounts.length === 0;

          return (
            <div
              key={name}
              className="bg-[#0a0f18] rounded-2xl border border-white/5 p-6 flex items-center gap-4 group"
            >
              <div
                className={`p-3 rounded-xl ${colorClass}`}
                style={corHex ? { backgroundColor: `${corHex}33`, color: corHex } : undefined}
              >
                <Wallet className="w-6 h-6" />
              </div>
              <button
                type="button"
                onClick={() => !isEmpty && setExtratoAccount(name)}
                className="flex-1 min-w-0 text-left cursor-pointer hover:opacity-90"
              >
                <h3 className="font-bold text-zinc-100 truncate">{name}</h3>
                <p className={`text-lg font-bold ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {!isEmpty
                    ? `R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : '—'}
                </p>
              </button>
              {!isEmpty && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => setExtratoAccount(name)}
                    className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white"
                    title="Ver extrato"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(name)}
                    className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white"
                    title="Editar conta"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAdjustAccount(name); setAdjustValue(String(balance)); setError(null); }}
                    className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white"
                    title="Ajustar saldo"
                  >
                    <Wallet className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDeleteConfirm(name); setError(null); }}
                    className="p-2 rounded-lg hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400"
                    title="Excluir conta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {accounts.length > 0 && (
        <div className="bg-[#0a0f18] rounded-2xl border border-white/5 p-6 flex items-center justify-between">
          <span className="text-zinc-400 font-medium">Saldo total (contas incluídas na soma)</span>
          <span className="text-2xl font-bold text-emerald-400">
            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {accounts.length === 0 && (
        <p className="text-zinc-500 text-sm">
          Nenhuma conta ainda. Clique em &quot;Nova conta&quot; para adicionar.
        </p>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova conta">
        <form onSubmit={handleAdd} className="space-y-4">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-rose-400 text-sm">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="account-name" className="block text-xs font-medium text-zinc-500 mb-1">Nome da conta</label>
            <input
              id="account-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Nubank, Carteira"
              className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="account-balance" className="block text-xs font-medium text-zinc-500 mb-1">Saldo inicial (R$)</label>
            <input
              id="account-balance"
              type="text"
              inputMode="decimal"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value.replace(/[^0-9,.-]/, ''))}
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
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 font-medium text-sm hover:bg-white/10"
            >
              Cancelar
            </button>
        </div>
        </form>
      </Modal>

      <Modal open={!!adjustAccount} onClose={() => setAdjustAccount(null)} title="Ajustar saldo">
        {adjustAccount && (
          <form onSubmit={handleAdjustBalance} className="space-y-4">
            <p className="text-zinc-400 text-sm">Conta: <strong className="text-zinc-100">{adjustAccount}</strong></p>
            <div>
              <label htmlFor="adjust-balance" className="block text-xs font-medium text-zinc-500 mb-1">Novo saldo (R$)</label>
              <input
                id="adjust-balance"
                type="text"
                inputMode="decimal"
                value={adjustValue}
                onChange={(e) => setAdjustValue(e.target.value.replace(/[^0-9,.-]/, ''))}
                className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={busy} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm">
                {busy ? 'Salvando…' : 'Salvar'}
              </button>
              <button type="button" onClick={() => setAdjustAccount(null)} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 font-medium text-sm hover:bg-white/10">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!extratoAccount} onClose={() => setExtratoAccount(null)} title={extratoAccount ? `Extrato · ${extratoAccount}` : ''}>
        {extratoAccount && (() => {
          const movs = entries
            .filter((e) => e.account === extratoAccount)
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          return (
            <div className="max-h-[70vh] overflow-y-auto">
              {movs.length === 0 ? (
                <p className="text-zinc-500 text-sm py-4">Nenhuma movimentação nesta conta.</p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {movs.slice(0, 100).map((e) => (
                    <li key={e.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">{e.desc || e.category || '—'}</p>
                        <p className="text-xs text-zinc-500">
                          {e.date ? new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                          {e.category ? ` · ${e.category}` : ''}
                        </p>
                      </div>
                      <span className={`text-sm font-bold shrink-0 ${e.type === 'receita' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {e.type === 'receita' ? '+' : '-'} R$ {Number(e.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {movs.length > 100 && <p className="text-zinc-500 text-xs py-2">Exibindo as 100 mais recentes.</p>}
            </div>
          );
        })()}
      </Modal>

      <Modal open={!!editAccount} onClose={() => setEditAccount(null)} title="Editar conta">
        {editAccount && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-rose-400 text-sm">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="edit-account-name" className="block text-xs font-medium text-zinc-500 mb-1">Nome</label>
              <input
                id="edit-account-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="edit-account-tipo" className="block text-xs font-medium text-zinc-500 mb-1">Tipo</label>
              <select
                id="edit-account-tipo"
                value={editTipo}
                onChange={(e) => setEditTipo(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500"
              >
                {TIPOS_CONTA.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Cor</label>
              <div className="flex flex-wrap gap-2">
                {CORES_CONTA.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setEditCor(c.value)}
                    className="w-8 h-8 rounded-full border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: c.value, borderColor: editCor === c.value ? '#fff' : 'transparent' }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editIncluir}
                onChange={(e) => setEditIncluir(e.target.checked)}
                className="rounded border-white/20 bg-[#05080d] text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-zinc-300">Incluir na soma</span>
            </label>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={busy} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm">
                {busy ? 'Salvando…' : 'Salvar'}
              </button>
              <button type="button" onClick={() => setEditAccount(null)} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 font-medium text-sm hover:bg-white/10">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Excluir conta">
        {deleteConfirm && (
          <div className="space-y-4">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-rose-400 text-sm">
                {error}
              </div>
            )}
            <p className="text-zinc-300">
              Excluir a conta <strong className="text-zinc-100">{deleteConfirm}</strong>? O saldo e o histórico vinculado a ela não serão removidos dos lançamentos, mas a conta deixará de aparecer na lista.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={busy}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-sm"
              >
                {busy ? 'Excluindo…' : 'Excluir'}
              </button>
              <button type="button" onClick={() => setDeleteConfirm(null)} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 font-medium text-sm hover:bg-white/10">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
