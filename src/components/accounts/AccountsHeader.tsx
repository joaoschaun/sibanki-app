import { Plus, Wallet } from 'lucide-react';

interface AccountsHeaderProps {
  totalBalance: number;
  onNewAccount: () => void;
  onOpenFinance: () => void;
}

export function AccountsHeader({ totalBalance, onNewAccount, onOpenFinance }: AccountsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-si-card border border-si-border p-6 rounded-3xl">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl">
          <Wallet className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-si-5 uppercase tracking-wider">Patrimônio Consolidado</h2>
          <p className="text-2xl font-black text-si-1 tracking-tight">
            R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>
      <div className="flex gap-2 w-full sm:w-auto">
        <button
          onClick={onOpenFinance}
          className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-blue-500/30 text-blue-400 font-bold text-sm hover:bg-blue-500/10 transition-colors"
        >
          Open Finance
        </button>
        <button
          onClick={onNewAccount}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Conta</span>
        </button>
      </div>
    </div>
  );
}
