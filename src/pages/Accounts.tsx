import { useState } from 'react';
import { GenericPageSkeleton } from '../components/ui/PageSkeleton';
import { useAppContext } from '../context/AppContext';
import {
  addAccount,
  updateAccountBalance,
  deleteAccount,
  updateAccountMeta,
  renameAccount,
} from '../services/persistUserData';
import { Modal } from '../components/ui/Modal';
import { Building2, Search } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';

import { AccountCard } from '../components/accounts/AccountCard';
import { BankSimulator } from '../components/accounts/BankSimulator';
import { AccountsHeader } from '../components/accounts/AccountsHeader';
import { identifyBank, BANKS } from '../components/banks/bankData';
import { BankLogo } from '../components/banks/BankLogo';

// ==========================================
// Constantes locais da página
// ==========================================

const TIPOS_CONTA = ['Conta corrente', 'Poupança', 'Carteira', 'Investimento', 'Conta digital', 'Conta salário', 'Conta conjunta', 'Outros'];
const MOEDAS = [
  { value: 'BRL', label: '🇧🇷 Real (BRL)' },
  { value: 'USD', label: '🇺🇸 Dólar (USD)' },
  { value: 'EUR', label: '🇪🇺 Euro (EUR)' },
  { value: 'GBP', label: '🇬🇧 Libra (GBP)' },
  { value: 'ARS', label: '🇦🇷 Peso (ARS)' },
];
// ==========================================
// Orquestrador Principal
// ==========================================
export default function Accounts() {
  const { user, accounts, accountBalances, accountMeta, entries, loading, data } = useAppContext();
  
  // States - Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [adjustAccount, setAdjustAccount] = useState<string | null>(null);
  const [extratoAccount, setExtratoAccount] = useState<string | null>(null);
  const [detailAccount, setDetailAccount] = useState<string | null>(null);
  const [editAccount, setEditAccount] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // States - Forms
  const [selectedBankSlug, setSelectedBankSlug] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [createTipo, setCreateTipo] = useState('Conta corrente');
  const [createCor, setCreateCor] = useState('#4F8CFF');
  const [createIncluir, setCreateIncluir] = useState(true);
  const [createCurrency, setCreateCurrency] = useState('BRL');
  const [createAgency, setCreateAgency] = useState('');
  const [createAccountNumber, setCreateAccountNumber] = useState('');
  const [createCheque, setCreateCheque] = useState(false);
  const [createChequeLimite, setCreateChequeLimite] = useState('');
  const [createChequeJuros, setCreateChequeJuros] = useState('');
  
  const [adjustValue, setAdjustValue] = useState('');
  
  const [editName, setEditName] = useState('');
  const [editTipo, setEditTipo] = useState('');
  const [editCor, setEditCor] = useState('');
  const [editIncluir, setEditIncluir] = useState(true);
  const [editCurrency, setEditCurrency] = useState('BRL');
  const [editAgency, setEditAgency] = useState('');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  const [editCheque, setEditCheque] = useState(false);
  const [editChequeLimite, setEditChequeLimite] = useState('');
  const [editChequeJuros, setEditChequeJuros] = useState('');
  const [editBankSlug, setEditBankSlug] = useState('');

  // Status
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectBank = (slug: string) => {
    setSelectedBankSlug(slug);
    if (slug === 'custom' || !slug) {
      setName('');
      setCreateCor('#4F8CFF');
    } else {
      const selected = BANKS.find(b => (b.slug || b.name) === slug);
      if (selected) {
        setName(selected.name);
        setCreateCor(selected.primary);
      }
    }
  };

  const getAccountBank = (accountName: string) => {
    const meta = accountMeta[accountName];
    if (meta?.bankSlug) {
      const found = BANKS.find(b => b.slug === meta.bankSlug);
      if (found) return found;
    }
    return identifyBank(accountName);
  };

  const filteredBanks = searchQuery.trim()
    ? BANKS.filter(b => b.name !== 'Carteira' && (
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
      ))
    : BANKS.filter(b => b.name !== 'Carteira');

  // ==========================================
  // Derived Data
  // ==========================================
  const validAccounts = accounts.length > 0 ? accounts : [];
  
  const totalBalance = validAccounts
    .filter((name) => accountMeta[name]?.incluirNaSoma !== false)
    .reduce((sum, name) => sum + (accountBalances[name] ?? 0), 0);

  // Variação mensal por conta (receitas - despesas do mês corrente, excluindo transferências)
  const currentYM = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();
  const monthlyDeltaByAccount: Record<string, number> = {};
  for (const acct of validAccounts) {
    const monthEntries = entries.filter(
      (e) => e.account === acct && e.date?.startsWith(currentYM) && !e.isTransfer
    );
    const receitas = monthEntries.filter((e) => e.type === 'receita').reduce((s, e) => s + (Number(e.value) || 0), 0);
    const despesas = monthEntries.filter((e) => e.type === 'despesa').reduce((s, e) => s + (Number(e.value) || 0), 0);
    monthlyDeltaByAccount[acct] = Math.round((receitas - despesas) * 100) / 100;
  }

  const detailMovs = detailAccount ? entries.filter((e) => e.account === detailAccount) : [];
  const detailReceitas = detailMovs.filter((e) => e.type === 'receita').reduce((s, e) => s + (Number(e.value) || 0), 0);
  const detailDespesas = detailMovs.filter((e) => e.type === 'despesa').reduce((s, e) => s + (Number(e.value) || 0), 0);
  const detailTransfers = detailMovs.filter((e) => e.category === 'Transferencia' || Boolean((e as { isTransfer?: boolean }).isTransfer)).length;

  // ==========================================
  // Handlers
  // ==========================================
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
        currency: createCurrency !== 'BRL' ? createCurrency : undefined,
        agency: createAgency.trim() || undefined,
        accountNumber: createAccountNumber.trim() || undefined,
        temChequeEspecial: createCheque || undefined,
        chequeEspecialLimite: createCheque && createChequeLimite ? parseFloat(createChequeLimite.replace(',', '.')) : undefined,
        chequeEspecialJurosPct: createCheque && createChequeJuros ? parseFloat(createChequeJuros.replace(',', '.')) : undefined,
        bankSlug: (selectedBankSlug && selectedBankSlug !== 'custom') ? selectedBankSlug : undefined,
      });
      setModalOpen(false);
      setName('');
      setSelectedBankSlug('');
      setSearchQuery('');
      setInitialBalance('');
      setCreateTipo('Conta corrente');
      setCreateCor('#4F8CFF');
      setCreateIncluir(true);
      setCreateCurrency('BRL');
      setCreateAgency('');
      setCreateAccountNumber('');
      setCreateCheque(false);
      setCreateChequeLimite('');
      setCreateChequeJuros('');
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
    setEditCurrency(meta?.currency ?? 'BRL');
    setEditAgency(meta?.agency ?? '');
    setEditAccountNumber(meta?.accountNumber ?? '');
    setEditCheque(meta?.temChequeEspecial ?? false);
    setEditChequeLimite(meta?.chequeEspecialLimite ? String(meta.chequeEspecialLimite) : '');
    setEditChequeJuros(meta?.chequeEspecialJurosPct ? String(meta.chequeEspecialJurosPct) : '');
    setEditBankSlug(meta?.bankSlug ?? '');
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
        currency: editCurrency !== 'BRL' ? editCurrency : undefined,
        agency: editAgency.trim() || undefined,
        accountNumber: editAccountNumber.trim() || undefined,
        temChequeEspecial: editCheque || undefined,
        chequeEspecialLimite: editCheque && editChequeLimite ? parseFloat(editChequeLimite.replace(',', '.')) : undefined,
        chequeEspecialJurosPct: editCheque && editChequeJuros ? parseFloat(editChequeJuros.replace(',', '.')) : undefined,
        bankSlug: editBankSlug || undefined,
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

  // ==========================================
  // Render
  // ==========================================
  if (loading) return <GenericPageSkeleton />;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24">
      {/* Premium Header */}
      <AccountsHeader
        totalBalance={totalBalance}
        onNewAccount={() => { setError(null); setModalOpen(true); }}
        onOpenFinance={() => {
          // Abre o drawer de Open Finance ou navega para a rota de conexão
          const ofBtn = document.querySelector('[data-open-finance-trigger]') as HTMLElement | null;
          if (ofBtn) {
            ofBtn.click();
          } else {
            // fallback: dispara evento customizado para o Sidebar capturar
            window.dispatchEvent(new CustomEvent('sibanki:open-finance'));
          }
        }}
      />

      {error && !modalOpen && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-rose-400 text-sm animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      )}

      {/* Renders the Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {validAccounts.map((accountName, i) => {
          const balance = accountBalances[accountName] ?? 0;
          const meta = accountMeta[accountName];
          const bankTheme = getAccountBank(accountName);
          const corHex = meta?.cor?.startsWith('#') ? meta.cor : null;

          return (
            <div 
              key={accountName}
              className="animate-in fade-in slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}
            >
              <AccountCard
                name={accountName}
                balance={balance}
                corHex={corHex}
                bank={bankTheme}
                isEmpty={false}
                monthlyDelta={monthlyDeltaByAccount[accountName]}
                tipo={meta?.tipo}
                ofStatus={meta?.ofStatus}
                currency={meta?.currency}
                onOpenApp={() => setExtratoAccount(accountName)}
                onOpenDetails={() => setDetailAccount(accountName)}
                onEdit={() => openEdit(accountName)}
                onAdjust={() => { setAdjustAccount(accountName); setAdjustValue(String(balance)); setError(null); }}
                onDelete={() => { setDeleteConfirm(accountName); setError(null); }}
              />
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {validAccounts.length === 0 && (
        <div className="pt-8">
          <EmptyState
            icon={<Building2 className="w-8 h-8" />}
            title="Nenhuma conta conectada"
            description="Adicione suas contas bancárias para acompanhar saldos em tempo real e desbloquear as inteligências visuais do Sibanki."
            actionLabel="+ Adicionar primeira conta"
            onAction={() => { setError(null); setModalOpen(true); }}
          />
        </div>
      )}

      {/* Account Details Panel */}
      {detailAccount && (
        <section className="bg-si-card/80 backdrop-blur-xl rounded-3xl border border-si-border p-6 sm:p-8 mt-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-si-1 tracking-tight">Inspeção Detalhada</h3>
              <p className="text-sm font-medium text-si-5 uppercase tracking-wider mt-1">{detailAccount}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => openEdit(detailAccount)}
                className="px-4 py-2 rounded-xl bg-si-over-1 border border-si-border-md text-si-2 text-sm font-bold hover:bg-si-over-2 transition-colors"
              >
                Editar Conta
              </button>
              <button
                type="button"
                onClick={() => setExtratoAccount(detailAccount)}
                className="px-4 py-2 rounded-xl bg-white border border-white text-zinc-900 text-sm font-bold hover:bg-zinc-100 transition-colors"
              >
                Simular App
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#0f172a]/50 border border-white/5 rounded-2xl p-5">
              <p className="text-[11px] font-bold text-si-5 uppercase tracking-widest mb-2">Classificação</p>
              <p className="text-base font-bold text-si-1">{accountMeta[detailAccount]?.tipo ?? 'Conta corrente'}</p>
            </div>
            <div className="bg-[#0f172a]/50 border border-white/5 rounded-2xl p-5">
              <p className="text-[11px] font-bold text-si-5 uppercase tracking-widest mb-2">Consolidação</p>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${accountMeta[detailAccount]?.incluirNaSoma === false ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                <p className="text-base font-bold text-si-1">{accountMeta[detailAccount]?.incluirNaSoma === false ? 'Excluída' : 'Incluída'}</p>
              </div>
            </div>
            <div className="bg-[#0f172a]/50 border border-white/5 rounded-2xl p-5">
              <p className="text-[11px] font-bold text-si-5 uppercase tracking-widest mb-2">Receitas Mês</p>
              <p className="text-base font-bold text-emerald-400">
                R$ {detailReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-[#0f172a]/50 border border-white/5 rounded-2xl p-5">
              <p className="text-[11px] font-bold text-si-5 uppercase tracking-widest mb-2">Despesas Mês</p>
              <p className="text-base font-bold text-rose-400">
                R$ {detailDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <p className="text-xs font-semibold text-si-5 mt-6 uppercase tracking-wider flex items-center gap-2">
            <span>Operações Registradas: {detailMovs.length}</span>
            <span className="w-1 h-1 rounded-full bg-si-5" />
            <span>Transferências: {detailTransfers}</span>
          </p>
        </section>
      )}

      {/* ==========================================
          Modals Area
          ========================================== */}
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova conta associada" size="3xl">
        <form onSubmit={handleAdd} className="space-y-5">
          {error && <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-rose-400 text-sm">{error}</div>}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Coluna Esquerda: Preview do Card + Seleção de Banco */}
            <div className="space-y-4">
              {/* Preview Card */}
              {name && (
                <div className="animate-in fade-in zoom-in-95 duration-300">
                  <span className="block text-[11px] font-bold text-si-5 uppercase tracking-wider mb-2">Visualização do Card</span>
                  <AccountCard
                    name={name}
                    balance={parseFloat(initialBalance.replace(',', '.')) || 0}
                    corHex={createCor}
                    bank={selectedBankSlug && selectedBankSlug !== 'custom' ? BANKS.find(b => b.slug === selectedBankSlug) || null : null}
                    isEmpty={false}
                  />
                </div>
              )}

              {/* Busca e Grade de Bancos */}
              <div className="space-y-3">
                <span className="block text-[11px] font-bold text-si-5 uppercase tracking-wider mb-1">Instituição Bancária</span>
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar banco ou instituição..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-si-over-1 border border-si-border text-si-1 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium text-xs"
                  />
                </div>

                <div className="max-h-44 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-2 border border-si-border/60 rounded-xl p-2 bg-black/10">
                  {filteredBanks.map((b) => {
                    const isClicked = selectedBankSlug === b.slug;
                    return (
                      <button
                        key={b.slug || b.name}
                        type="button"
                        onClick={() => handleSelectBank(b.slug || b.name)}
                        className={`p-2 rounded-xl border transition-all duration-200 flex flex-col items-center justify-center gap-1.5 hover:scale-[1.03] text-center ${
                          isClicked
                            ? 'bg-white/[0.04] border-white/20 text-white shadow-lg font-bold'
                            : 'bg-si-over-1 border-si-border text-zinc-400 hover:text-white hover:border-white/10'
                        }`}
                      >
                        {/* Wrapper circular com design individual para cada marca de acordo com b.logoBg */}
                        <div 
                          className={`w-8 h-8 rounded-full flex items-center justify-center p-1 shadow-inner select-none shrink-0 overflow-hidden ${
                            !b.logoBg ? 'bg-white' : ''
                          }`}
                          style={b.logoBg ? { backgroundColor: b.logoBg } : undefined}
                        >
                          <BankLogo 
                            bank={b} 
                            size={20} 
                            backgroundHex={b.logoBg || '#ffffff'} 
                          />
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider truncate w-full">{b.name}</span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => handleSelectBank('custom')}
                    className={`p-2 rounded-xl border transition-all duration-200 flex flex-col items-center justify-center gap-1.5 hover:scale-[1.03] text-center ${
                      selectedBankSlug === 'custom'
                        ? 'bg-white/[0.04] border-white/20 text-white shadow-lg font-bold'
                        : 'bg-si-over-1 border-si-border text-zinc-400 hover:text-white hover:border-white/10'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700/50 flex items-center justify-center p-1 shadow-inner select-none shrink-0 overflow-hidden">
                      <Building2 className="w-4.5 h-4.5 text-zinc-400" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider truncate w-full">Personalizado</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Campos do Formulário */}
            <div className="space-y-4">
              <div>
                <label htmlFor="account-name" className="block text-[11px] font-bold text-si-5 uppercase tracking-wider mb-2">Identificador da Conta</label>
                <input
                  id="account-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Itaú Personalité, Carteira, Nubank PJ"
                  className="w-full px-4 py-3 rounded-xl bg-si-over-1 border border-si-border text-si-1 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium text-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="account-balance" className="block text-[11px] font-bold text-si-5 uppercase tracking-wider mb-2">Sincronização Inicial (R$)</label>
                <input
                  id="account-balance"
                  type="text"
                  inputMode="decimal"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value.replace(/[^0-9,.-]/, ''))}
                  placeholder="0,00"
                  className="w-full px-4 py-3 rounded-xl bg-si-over-1 border border-si-border text-si-1 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="account-type" className="block text-[11px] font-bold text-si-5 uppercase tracking-wider mb-2">Modelo</label>
                  <select
                    id="account-type"
                    value={createTipo}
                    onChange={(e) => setCreateTipo(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-si-over-1 border border-si-border text-si-1 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium"
                  >
                    {TIPOS_CONTA.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="create-currency" className="block text-[11px] font-bold text-si-5 uppercase tracking-wider mb-2">Moeda</label>
                  <select
                    id="create-currency"
                    value={createCurrency}
                    onChange={(e) => setCreateCurrency(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-si-over-1 border border-si-border text-si-1 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium"
                  >
                    {MOEDAS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="create-agency" className="block text-[11px] font-bold text-si-5 uppercase tracking-wider mb-2">Agência</label>
                  <input
                    id="create-agency"
                    type="text"
                    value={createAgency}
                    onChange={(e) => setCreateAgency(e.target.value)}
                    placeholder="0001-7"
                    className="w-full px-4 py-3 rounded-xl bg-si-over-1 border border-si-border text-si-1 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium"
                  />
                </div>
                <div>
                  <label htmlFor="create-acctnum" className="block text-[11px] font-bold text-si-5 uppercase tracking-wider mb-2">Nº da Conta</label>
                  <input
                    id="create-acctnum"
                    type="text"
                    value={createAccountNumber}
                    onChange={(e) => setCreateAccountNumber(e.target.value)}
                    placeholder="12345-8"
                    className="w-full px-4 py-3 rounded-xl bg-si-over-1 border border-si-border text-si-1 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div className="pt-1">
                 <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl border border-si-border-md bg-si-over-1 hover:bg-si-over-2 transition-colors">
                   <input
                     type="checkbox"
                     checked={createIncluir}
                     onChange={(e) => setCreateIncluir(e.target.checked)}
                     className="w-4 h-4 rounded-md border-si-5 text-blue-600 focus:ring-blue-500 bg-transparent"
                   />
                   <span className="text-xs font-bold uppercase tracking-wider text-si-3 group-hover:text-si-2 transition-colors">Consolidar no Patrimônio</span>
                 </label>
              </div>

              {createTipo === 'Conta corrente' && (
                <div className="space-y-3 pt-1">
                  <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
                    <input
                      type="checkbox"
                      checked={createCheque}
                      onChange={(e) => setCreateCheque(e.target.checked)}
                      className="w-4 h-4 rounded-md text-amber-500 focus:ring-amber-500 bg-transparent"
                    />
                    <span className="text-sm font-medium text-amber-300 group-hover:text-amber-200 transition-colors">Tem Cheque Especial</span>
                  </label>
                  {createCheque && (
                    <div className="grid grid-cols-2 gap-3 pl-2">
                      <div>
                        <label className="block text-[11px] font-bold text-amber-400/70 uppercase tracking-wider mb-1">Limite (R$)</label>
                        <input type="text" inputMode="decimal" value={createChequeLimite} onChange={(e) => setCreateChequeLimite(e.target.value.replace(/[^0-9,.]/, ''))}
                          placeholder="1.000,00"
                          className="w-full px-3 py-2.5 rounded-xl bg-si-over-1 border border-amber-500/30 text-si-1 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-sm font-medium" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-amber-400/70 uppercase tracking-wider mb-1">Juros % a.m.</label>
                        <input type="text" inputMode="decimal" value={createChequeJuros} onChange={(e) => setCreateChequeJuros(e.target.value.replace(/[^0-9,.]/, ''))}
                          placeholder="12,5"
                          className="w-full px-3 py-2.5 rounded-xl bg-si-over-1 border border-amber-500/30 text-si-1 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-sm font-medium" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3.5 rounded-xl bg-si-over-2 text-si-3 hover:text-si-1 font-bold text-sm transition-colors uppercase tracking-wider">Cancelar</button>
            <button type="submit" disabled={busy} className="flex-[2] py-3.5 rounded-xl bg-white hover:bg-zinc-100 disabled:opacity-50 text-zinc-900 font-bold text-sm transition-colors shadow-lg shadow-blue-600/20 uppercase tracking-wider">
              {busy ? 'Processando...' : 'Autenticar Conta'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!adjustAccount} onClose={() => setAdjustAccount(null)} title="Auditoria de Saldo">
        {adjustAccount && (
          <form onSubmit={handleAdjustBalance} className="space-y-5">
            <p className="text-si-4 text-sm font-medium bg-si-over-1 p-4 rounded-xl border border-si-border">
              Alterar registro da conta financeira: <strong className="text-white block mt-1 text-lg">{adjustAccount}</strong>
            </p>
            <div>
              <label htmlFor="adjust-balance" className="block text-[11px] font-bold text-si-5 uppercase tracking-wider mb-2">Atualizar Registro (R$)</label>
              <input
                id="adjust-balance"
                type="text"
                inputMode="decimal"
                value={adjustValue}
                onChange={(e) => setAdjustValue(e.target.value.replace(/[^0-9,.-]/, ''))}
                className="w-full px-5 py-4 rounded-xl bg-si-bg border border-si-border text-si-1 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-black text-2xl tracking-tighter"
                autoFocus
              />
            </div>
            <div className="flex gap-3 pt-3">
              <button type="button" onClick={() => setAdjustAccount(null)} className="flex-1 py-3.5 rounded-xl bg-si-over-2 text-si-3 hover:text-si-1 font-bold text-sm transition-colors uppercase tracking-wider">Descartar</button>
              <button type="submit" disabled={busy} className="flex-[2] py-3.5 rounded-xl bg-white hover:bg-zinc-100 disabled:opacity-50 text-zinc-900 font-bold text-sm transition-colors shadow-lg shadow-blue-600/20 uppercase tracking-wider">
                {busy ? 'Calculando...' : 'Confirmar Ajuste'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <BankSimulator 
         open={!!extratoAccount} 
         onClose={() => setExtratoAccount(null)} 
         accountName={extratoAccount}
         balance={extratoAccount ? (accountBalances[extratoAccount] ?? 0) : 0}
         entries={entries}
         userName={user?.displayName || data?.name || null}
         bank={extratoAccount ? (getAccountBank(extratoAccount) as any) : null}
       />

      <Modal open={!!editAccount} onClose={() => setEditAccount(null)} title="Configurações Locais" size="3xl">
        {editAccount && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {error && <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-rose-400 text-sm">{error}</div>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Coluna Esquerda: Preview do Card + Vincular Banco */}
              <div className="space-y-4">
                {editName && (
                  <div className="animate-in fade-in zoom-in-95 duration-300">
                    <span className="block text-[11px] font-bold text-si-5 uppercase tracking-wider mb-2">Visualização do Card</span>
                    <AccountCard
                      name={editName}
                      balance={parseFloat(String(accountBalances[editAccount] ?? 0)) || 0}
                      corHex={editCor}
                      bank={editBankSlug && editBankSlug !== 'custom' ? BANKS.find(b => b.slug === editBankSlug) || null : null}
                      isEmpty={false}
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="edit-bank-select" className="block text-[11px] font-bold text-si-5 uppercase tracking-wider mb-2">Vincular Instituição (Logo/Cores)</label>
                  <select
                    id="edit-bank-select"
                    value={editBankSlug}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditBankSlug(val);
                      if (val && val !== 'custom') {
                        const bk = BANKS.find(b => b.slug === val);
                        if (bk) {
                          setEditCor(bk.primary);
                        }
                      }
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-si-over-1 border border-si-border text-si-1 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium"
                  >
                    <option value="">Nenhum / Sem Vínculo</option>
                    {BANKS.filter(b => b.name !== 'Carteira').map((b) => (
                      <option key={b.slug || b.name} value={b.slug || b.name}>
                        {b.name}
                      </option>
                    ))}
                    <option value="custom">Outro / Personalizado</option>
                  </select>
                </div>
              </div>

              {/* Coluna Direita: Dados Adicionais */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-si-5 uppercase tracking-wider mb-2">Apelido (Label)</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-si-over-1 border border-si-border text-si-1 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-si-5 uppercase tracking-wider mb-2">Modelo</label>
                    <select
                      value={editTipo}
                      onChange={(e) => setEditTipo(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-si-over-1 border border-si-border text-si-1 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium"
                    >
                      {TIPOS_CONTA.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-si-5 uppercase tracking-wider mb-2">Moeda</label>
                    <select value={editCurrency} onChange={(e) => setEditCurrency(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-si-over-1 border border-si-border text-si-1 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-medium">
                      {MOEDAS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-si-5 uppercase tracking-wider mb-2">Agência</label>
                    <input type="text" value={editAgency} onChange={(e) => setEditAgency(e.target.value)} placeholder="0001-7"
                      className="w-full px-3 py-2.5 rounded-xl bg-si-over-1 border border-si-border text-si-1 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-medium" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-si-5 uppercase tracking-wider mb-2">Nº da Conta</label>
                    <input type="text" value={editAccountNumber} onChange={(e) => setEditAccountNumber(e.target.value)} placeholder="12345-8"
                      className="w-full px-3 py-2.5 rounded-xl bg-si-over-1 border border-si-border text-si-1 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-medium" />
                  </div>
                </div>

                <div className="flex flex-col justify-center">
                   <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl border border-si-border-md bg-si-over-1 hover:bg-si-over-2 transition-colors">
                     <input
                       type="checkbox"
                       checked={editIncluir}
                       onChange={(e) => setEditIncluir(e.target.checked)}
                       className="w-4 h-4 rounded-md border-si-5 text-blue-600 focus:ring-blue-500 bg-transparent"
                     />
                     <span className="text-xs font-bold text-si-3 group-hover:text-si-1 uppercase tracking-wider transition-colors">Consolidar no Patrimônio</span>
                   </label>
                </div>

                {editTipo === 'Conta corrente' && (
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
                      <input type="checkbox" checked={editCheque} onChange={(e) => setEditCheque(e.target.checked)}
                        className="w-4 h-4 rounded-md text-amber-500 focus:ring-amber-500 bg-transparent" />
                      <span className="text-sm font-medium text-amber-300">Tem Cheque Especial</span>
                    </label>
                    {editCheque && (
                      <div className="grid grid-cols-2 gap-3 pl-2">
                        <div>
                          <label className="block text-[11px] font-bold text-amber-400/70 uppercase tracking-wider mb-1">Limite (R$)</label>
                          <input type="text" inputMode="decimal" value={editChequeLimite} onChange={(e) => setEditChequeLimite(e.target.value.replace(/[^0-9,.]/, ''))} placeholder="1.000,00"
                            className="w-full px-3 py-2.5 rounded-xl bg-si-over-1 border border-amber-500/30 text-si-1 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-sm font-medium" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-amber-400/70 uppercase tracking-wider mb-1">Juros % a.m.</label>
                          <input type="text" inputMode="decimal" value={editChequeJuros} onChange={(e) => setEditChequeJuros(e.target.value.replace(/[^0-9,.]/, ''))} placeholder="12,5"
                            className="w-full px-3 py-2.5 rounded-xl bg-si-over-1 border border-amber-500/30 text-si-1 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-sm font-medium" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3 pt-4 w-full">
              <button type="button" onClick={() => setEditAccount(null)} className="flex-1 py-3 rounded-xl bg-si-over-2 text-si-3 hover:text-si-1 font-bold text-sm transition-colors uppercase tracking-wider">Cancelar</button>
              <button type="submit" disabled={busy} className="flex-[2] py-3 rounded-xl bg-white hover:bg-zinc-100 disabled:opacity-50 text-zinc-900 font-bold text-sm transition-colors shadow-lg shadow-blue-600/20 uppercase tracking-wider">
                {busy ? 'Salvando...' : 'Aplicar Preferências'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Danger Zone">
        {deleteConfirm && (
          <div className="space-y-4">
            {error && <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-rose-400 text-sm">{error}</div>}
            <div className="bg-rose-500/10 border border-rose-500/30 p-5 rounded-2xl">
              <p className="text-rose-200 text-sm leading-relaxed mb-4">
                Você está prestes a quebrar o vínculo com a instituição: <strong className="text-white text-base block mt-2">{deleteConfirm}</strong>
              </p>
              <p className="text-rose-400/80 text-xs font-semibold tracking-wider uppercase">
                Atenção: Os registros de histórico (Extrato/Lançamentos) continuarão existindo isoladamente por segurança, mas a conta será limpa deste painel.
              </p>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setDeleteConfirm(null)} className="flex-[2] py-3.5 rounded-xl bg-si-over-2 text-si-3 hover:text-si-1 font-bold text-sm transition-colors uppercase tracking-wider">Retornar Seguro</button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={busy}
                className="flex-1 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-sm transition-colors shadow-lg shadow-rose-600/20 uppercase tracking-wider"
              >
                {busy ? '...' : 'Destruir'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
