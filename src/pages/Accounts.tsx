import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  addAccount,
  updateAccountBalance,
  deleteAccount,
  updateAccountMeta,
  renameAccount,
} from '../services/persistUserData';
import { Modal } from '../components/ui/Modal';
import { Wallet, Plus, Pencil, List, Trash2, Eye, EyeOff, ChevronLeft, Smartphone, Building2 } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { PageTransition } from '../components/ui/PageTransition';

interface BankTheme {
  name: string;
  keywords: string[];
  bg: string;
  text: string;
  logoText: string;
}

const BANKS_REGISTRY: BankTheme[] = [
  { name: 'Nubank', keywords: ['nu', 'nubank'], bg: '#8A05BE', text: '#FFFFFF', logoText: 'nu' },
  { name: 'Itaú', keywords: ['itau', 'itaú'], bg: '#EC7000', text: '#FFFFFF', logoText: 'Itaú' },
  { name: 'Inter', keywords: ['inter', 'banco inter'], bg: '#FF7A00', text: '#FFFFFF', logoText: 'inter' },
  { name: 'Bradesco', keywords: ['bradesco'], bg: '#CC092F', text: '#FFFFFF', logoText: 'bradesco' },
  { name: 'Santander', keywords: ['santander'], bg: '#EC0000', text: '#FFFFFF', logoText: 'Santander' },
  { name: 'Caixa', keywords: ['caixa', 'cef'], bg: '#005CA9', text: '#FFFFFF', logoText: 'CAIXA' },
  { name: 'Banco do Brasil', keywords: ['bb', 'banco do brasil'], bg: '#FDF10B', text: '#000000', logoText: 'bb' },
];

function identifyBank(accountName: string): BankTheme | null {
  const lower = accountName.toLowerCase();
  for (const bank of BANKS_REGISTRY) {
    if (bank.keywords.some(k => lower.includes(k))) return bank;
  }
  return null;
}

const TIPOS_CONTA = ['Conta corrente', 'Poupança', 'Carteira', 'Investimento', 'Outros'];
const CORES_CONTA = [
  { value: '#4F8CFF', label: 'Azul' },
  { value: '#10b981', label: 'Verde' },
  { value: '#f59e0b', label: 'Âmbar' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#8b5cf6', label: 'Roxo' },
  { value: '#ec4899', label: 'Rosa' },
];

function BankAppSimulator({ open, onClose, accountName, balance, entries, userName, bank }: any) {
  const [hideBalance, setHideBalance] = useState(false);
  
  if (!open || !accountName) return null;
  const movs = entries.filter((e: any) => e.account === accountName).sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
  
  const bg = bank ? bank.bg : '#0f172a';
  const color = bank ? bank.text : '#ffffff';
  
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true">
      <div className="relative w-full max-w-[375px] h-[800px] max-h-[90vh] bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col border-[8px] border-[#1f2937] transition-transform animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
        <div className="absolute top-0 inset-x-0 h-6 bg-transparent flex justify-center z-20">
           <div className="w-1/3 h-5 bg-[#1f2937] rounded-b-xl"></div>
        </div>
        
        <div style={{ backgroundColor: bg, color }} className="pt-12 px-6 pb-6 shrink-0 relative transition-colors">
           <button onClick={onClose} className="absolute left-4 top-10 p-2 hover:bg-black/10 rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6" />
           </button>
           <div className="flex justify-between items-center mt-2">
             <div className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center font-bold text-xl border border-si-border-xl">
               {userName ? userName[0].toUpperCase() : 'U'}
             </div>
             <div className="flex gap-4">
               <button onClick={() => setHideBalance(!hideBalance)} className="p-2 hover:bg-black/10 rounded-full transition-colors">
                 {hideBalance ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
               </button>
             </div>
           </div>
           <div className="mt-6">
             <h2 className="text-lg font-medium opacity-90">Olá, {userName ? userName.split(' ')[0] : 'Usuário'}</h2>
             {bank && <p className="text-sm font-black opacity-75 tracking-tighter uppercase mt-1">{bank.logoText}</p>}
           </div>
        </div>
        
        <div className="flex-1 bg-zinc-50 overflow-y-auto w-full text-zinc-900 pb-8">
           <div className="p-6 border-b border-zinc-200 bg-white">
              <h3 className="text-sm font-medium text-si-5 mb-1">Conta</h3>
              <p className="text-3xl font-bold tracking-tight">
                 {hideBalance ? 'R$ •••••' : `R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              </p>
           </div>
           
           <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-zinc-800">Histórico de Extrato</h3>
              {movs.length === 0 ? (
                 <p className="text-si-5 text-sm">Nenhuma movimentação nesta conta.</p>
              ) : (
                 <div className="space-y-6">
                   {movs.slice(0, 50).map((e: any) => (
                     <div key={e.id} className="flex justify-between items-center">
                        <div className="flex items-start gap-4 min-w-0">
                           <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                               {e.type === 'receita' ? <Wallet className="w-4 h-4 text-emerald-500"/> : <List className="w-4 h-4 text-si-5"/>}
                           </div>
                           <div className="min-w-0 pr-4">
                              <p className="font-semibold text-zinc-800 text-sm truncate">{e.desc || e.category}</p>
                              <p className="text-xs text-si-5 mt-0.5">{e.date ? new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR', {day:'numeric',month:'short'}) : ''}</p>
                           </div>
                        </div>
                        <p className={`font-bold text-sm shrink-0 ${e.type === 'receita' ? 'text-emerald-500' : 'text-zinc-800'}`}>
                           {e.type === 'receita' ? '+' : '-'} R$ {Number(e.value).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </p>
                     </div>
                   ))}
                   {movs.length > 50 && <p className="text-center text-xs text-si-4 mt-4">Exibindo últimas 50 movimentações</p>}
                 </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}

export default function Accounts() {
  const { user, accounts, accountBalances, accountMeta, entries, loading, data } = useAppContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [createTipo, setCreateTipo] = useState('Conta corrente');
  const [createCor, setCreateCor] = useState('#4F8CFF');
  const [createIncluir, setCreateIncluir] = useState(true);
  const [adjustAccount, setAdjustAccount] = useState<string | null>(null);
  const [adjustValue, setAdjustValue] = useState('');
  const [extratoAccount, setExtratoAccount] = useState<string | null>(null);
  const [detailAccount, setDetailAccount] = useState<string | null>(null);
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
  const detailMovs = detailAccount
    ? entries.filter((e) => e.account === detailAccount)
    : [];
  const detailReceitas = detailMovs
    .filter((e) => e.type === 'receita')
    .reduce((s, e) => s + (Number(e.value) || 0), 0);
  const detailDespesas = detailMovs
    .filter((e) => e.type === 'despesa')
    .reduce((s, e) => s + (Number(e.value) || 0), 0);
  const detailTransfers = detailMovs
    .filter((e) => e.category === 'Transferencia' || Boolean((e as { isTransfer?: boolean }).isTransfer))
    .length;

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
      await updateAccountMeta(user.uid, accountMeta ?? {}, n, {
        tipo: createTipo,
        cor: createCor,
        incluirNaSoma: createIncluir,
      });
      setModalOpen(false);
      setName('');
      setInitialBalance('');
      setCreateTipo('Conta corrente');
      setCreateCor('#4F8CFF');
      setCreateIncluir(true);
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
          <p className="text-si-5 text-sm">Saldos por conta – mesmo dados do app atual</p>
        </div>
        <button
          type="button"
          onClick={() => { setError(null); setModalOpen(true); }}
          className="bg-blue-600 hover:bg-blue-500 text-si-1 px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"
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

          const bank = identifyBank(name);
          const blockStyle = bank ? { backgroundColor: bank.bg, color: bank.text, borderColor: bank.bg } : {};

          return (
            <div
              key={name}
              className={`rounded-2xl border p-6 flex flex-col gap-4 group transition-all duration-300 ${!bank ? 'bg-si-card/60 backdrop-blur-xl border-si-border hover:bg-si-over-2' : 'hover:scale-[1.02] shadow-xl overflow-hidden relative'}`}
              style={blockStyle}
            >
              {bank && (
                 <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <Smartphone className="w-24 h-24" />
                 </div>
              )}
              <div className="flex items-center gap-4 relative z-10 w-full">
                <div
                  className={`p-3 rounded-xl ${bank ? 'bg-black/20 text-current' : colorClass}`}
                  style={!bank && corHex ? { backgroundColor: `${corHex}33`, color: corHex } : undefined}
                >
                  <Wallet className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className={`font-bold truncate ${bank ? 'text-current text-xl' : 'text-si-1'}`}>{name}</h3>
                  {bank && <p className="text-xs opacity-80 font-semibold tracking-wider uppercase mt-1">{bank.logoText}</p>}
                </div>
              </div>
              
              <div className="relative z-10 mt-2">
                <p className={`text-sm ${bank ? 'opacity-80' : 'text-si-5'}`}>Saldo atual</p>
                <p className={`text-2xl font-black tracking-tight ${bank ? 'text-current' : (balance >= 0 ? 'text-emerald-400' : 'text-rose-400')}`}>
                  {!isEmpty
                    ? `R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : '—'}
                </p>
              </div>

              {!isEmpty && (
                <div className={`flex items-center gap-2 pt-4 mt-2 border-t relative z-10 ${bank ? 'border-si-border-xl' : 'border-si-border'}`}>
                  {bank && (
                    <button
                      type="button"
                      onClick={() => setExtratoAccount(name)}
                      className="flex-1 py-3 rounded-xl bg-black/20 hover:bg-black/30 text-sm font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      <Smartphone className="w-4 h-4" /> Acessar App
                    </button>
                  )}
                  <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${bank ? 'ml-auto' : 'w-full'}`}>
                    <button type="button" onClick={() => setDetailAccount(name)} className={`p-2 rounded-lg hover:bg-si-over-3 ${bank ? 'text-current hover:bg-black/20' : 'text-si-4 hover:text-si-1'}`} title="Detalhes da conta"><List className="w-4 h-4" /></button>
                    {!bank && <button type="button" onClick={() => setExtratoAccount(name)} className="p-2 rounded-lg hover:bg-si-over-3 text-si-4 hover:text-si-1" title="Simular App / Extrato"><Smartphone className="w-4 h-4" /></button>}
                    <button type="button" onClick={() => openEdit(name)} className={`p-2 rounded-lg hover:bg-si-over-3 ${bank ? 'text-current hover:bg-black/20' : 'text-si-4 hover:text-si-1'}`} title="Editar conta"><Pencil className="w-4 h-4" /></button>
                    <button type="button" onClick={() => { setAdjustAccount(name); setAdjustValue(String(balance)); setError(null); }} className={`p-2 rounded-lg hover:bg-si-over-3 ${bank ? 'text-current hover:bg-black/20' : 'text-si-4 hover:text-si-1'}`} title="Ajustar saldo"><Wallet className="w-4 h-4" /></button>
                    <button type="button" onClick={() => { setDeleteConfirm(name); setError(null); }} className={`p-2 rounded-lg hover:bg-rose-500/20 ${bank ? 'text-current hover:bg-black/20' : 'text-si-4 hover:text-rose-400'}`} title="Excluir conta"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {accounts.length > 0 && (
        <div className="bg-si-card rounded-2xl border border-si-border p-6 flex items-center justify-between">
          <span className="text-si-4 font-medium">Saldo total (contas incluídas na soma)</span>
          <span className="text-2xl font-bold text-emerald-400">
            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {detailAccount && (
        <section className="bg-si-card rounded-2xl border border-si-border p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-si-1">Detalhes da conta</h3>
              <p className="text-sm text-si-4">{detailAccount}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => openEdit(detailAccount)}
                className="px-3 py-2 rounded-lg bg-si-over-2 border border-si-border-md text-si-3 text-sm hover:bg-si-over-3"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => setExtratoAccount(detailAccount)}
                className="px-3 py-2 rounded-lg bg-si-over-2 border border-si-border-md text-si-3 text-sm hover:bg-si-over-3"
              >
                Ver extrato
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-si-bg border border-si-border rounded-xl p-4">
              <p className="text-xs text-si-5">Tipo</p>
              <p className="text-sm font-semibold text-si-1">{accountMeta[detailAccount]?.tipo ?? 'Conta corrente'}</p>
            </div>
            <div className="bg-si-bg border border-si-border rounded-xl p-4">
              <p className="text-xs text-si-5">Incluir no total</p>
              <p className="text-sm font-semibold text-si-1">{accountMeta[detailAccount]?.incluirNaSoma === false ? 'Não' : 'Sim'}</p>
            </div>
            <div className="bg-si-bg border border-si-border rounded-xl p-4">
              <p className="text-xs text-si-5">Receitas</p>
              <p className="text-sm font-semibold text-emerald-400">
                R$ {detailReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-si-bg border border-si-border rounded-xl p-4">
              <p className="text-xs text-si-5">Despesas</p>
              <p className="text-sm font-semibold text-rose-400">
                R$ {detailDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <p className="text-xs text-si-5">
            Movimentações vinculadas: {detailMovs.length} · Transferências: {detailTransfers}
          </p>
        </section>
      )}

      {accounts.length === 0 && (
        <EmptyState
          icon={<Building2 className="w-7 h-7" />}
          title="Nenhuma conta cadastrada"
          description="Adicione suas contas bancárias para acompanhar saldos, movimentações e ter uma visão consolidada das suas finanças."
          actionLabel="+ Nova conta"
          onAction={() => setAddOpen(true)}
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova conta">
        <form onSubmit={handleAdd} className="space-y-4">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-rose-400 text-sm">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="account-name" className="block text-xs font-medium text-si-5 mb-1">Nome da conta</label>
            <input
              id="account-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Nubank, Carteira"
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="account-balance" className="block text-xs font-medium text-si-5 mb-1">Saldo inicial (R$)</label>
            <input
              id="account-balance"
              type="text"
              inputMode="decimal"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value.replace(/[^0-9,.-]/, ''))}
              placeholder="0,00"
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="account-type" className="block text-xs font-medium text-si-5 mb-1">Tipo</label>
            <select
              id="account-type"
              value={createTipo}
              onChange={(e) => setCreateTipo(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
            >
              {TIPOS_CONTA.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-si-5 mb-1">Cor</label>
            <div className="flex flex-wrap gap-2">
              {CORES_CONTA.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCreateCor(c.value)}
                  className="w-8 h-8 rounded-full border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ backgroundColor: c.value, borderColor: createCor === c.value ? '#fff' : 'transparent' }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-si-3">
            <input
              type="checkbox"
              checked={createIncluir}
              onChange={(e) => setCreateIncluir(e.target.checked)}
              className="rounded border-si-border-xl bg-si-bg"
            />
            Incluir esta conta na soma do saldo total
          </label>
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

      <Modal open={!!adjustAccount} onClose={() => setAdjustAccount(null)} title="Ajustar saldo">
        {adjustAccount && (
          <form onSubmit={handleAdjustBalance} className="space-y-4">
            <p className="text-si-4 text-sm">Conta: <strong className="text-si-1">{adjustAccount}</strong></p>
            <div>
              <label htmlFor="adjust-balance" className="block text-xs font-medium text-si-5 mb-1">Novo saldo (R$)</label>
              <input
                id="adjust-balance"
                type="text"
                inputMode="decimal"
                value={adjustValue}
                onChange={(e) => setAdjustValue(e.target.value.replace(/[^0-9,.-]/, ''))}
                className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={busy} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-si-1 font-bold text-sm">
                {busy ? 'Salvando…' : 'Salvar'}
              </button>
              <button type="button" onClick={() => setAdjustAccount(null)} className="px-6 py-3 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 font-medium text-sm hover:bg-si-over-3">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </Modal>

      <BankAppSimulator 
         open={!!extratoAccount} 
         onClose={() => setExtratoAccount(null)} 
         accountName={extratoAccount}
         balance={extratoAccount ? (accountBalances[extratoAccount] ?? 0) : 0}
         entries={entries}
         userName={user?.displayName || data?.name}
         bank={extratoAccount ? identifyBank(extratoAccount) : null}
      />

      <Modal open={!!editAccount} onClose={() => setEditAccount(null)} title="Editar conta">
        {editAccount && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-rose-400 text-sm">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="edit-account-name" className="block text-xs font-medium text-si-5 mb-1">Nome</label>
              <input
                id="edit-account-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="edit-account-tipo" className="block text-xs font-medium text-si-5 mb-1">Tipo</label>
              <select
                id="edit-account-tipo"
                value={editTipo}
                onChange={(e) => setEditTipo(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
              >
                {TIPOS_CONTA.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-si-5 mb-1">Cor</label>
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
                className="rounded border-si-border-xl bg-si-bg text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-si-3">Incluir na soma</span>
            </label>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={busy} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-si-1 font-bold text-sm">
                {busy ? 'Salvando…' : 'Salvar'}
              </button>
              <button type="button" onClick={() => setEditAccount(null)} className="px-6 py-3 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 font-medium text-sm hover:bg-si-over-3">
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
            <p className="text-si-3">
              Excluir a conta <strong className="text-si-1">{deleteConfirm}</strong>? O saldo e o histórico vinculado a ela não serão removidos dos lançamentos, mas a conta deixará de aparecer na lista.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={busy}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-si-1 font-bold text-sm"
              >
                {busy ? 'Excluindo…' : 'Excluir'}
              </button>
              <button type="button" onClick={() => setDeleteConfirm(null)} className="px-6 py-3 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 font-medium text-sm hover:bg-si-over-3">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
