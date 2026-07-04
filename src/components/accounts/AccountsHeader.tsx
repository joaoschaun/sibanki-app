import { Plus, Wallet, Eye, EyeOff } from 'lucide-react';

interface AccountsHeaderProps {
  assetsTotal: number;
  liabilitiesTotal: number;
  netWorth: number;
  hideValues: boolean;
  onToggleHideValues: () => void;
  onNewAccount: () => void;
  onOpenFinance: () => void;
}

export function AccountsHeader({
  assetsTotal,
  liabilitiesTotal,
  netWorth,
  hideValues,
  onToggleHideValues,
  onNewAccount,
  onOpenFinance,
}: AccountsHeaderProps) {
  const formatVal = (v: number) => {
    if (hideValues) return '••••';
    return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="bg-si-card border border-si-border p-6 rounded-3xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Bloco 1: Net Worth Principal */}
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-blue-500/10 text-blue-400 rounded-2xl shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-si-5 uppercase tracking-wider">Patrimônio Líquido Real</h2>
              <button
                type="button"
                onClick={onToggleHideValues}
                className="p-1 text-si-5 hover:text-si-2 transition-colors rounded-lg hover:bg-si-over-2"
                aria-label={hideValues ? 'Mostrar saldos' : 'Ocultar saldos'}
              >
                {hideValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-3xl font-black text-si-1 tracking-tight mt-0.5">
              {formatVal(netWorth)}
            </p>
          </div>
        </div>

        {/* Bloco 2: Ações */}
        <div className="flex gap-2 w-full md:w-auto shrink-0">
          <button
            onClick={onOpenFinance}
            className="flex-1 md:flex-none px-4 py-2.5 rounded-xl border border-blue-500/30 text-blue-400 font-bold text-sm hover:bg-blue-500/10 transition-colors"
          >
            Open Finance
          </button>
          <button
            onClick={onNewAccount}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Conta</span>
          </button>
        </div>
      </div>

      {/* Grid Secundário: Ativos vs Passivos */}
      <div className="grid grid-cols-2 gap-4 border-t border-si-border/50 pt-5">
        <div className="bg-si-over-1/40 border border-si-border/30 rounded-2xl p-4">
          <span className="block text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Disponibilidades (Ativos)</span>
          <p className="text-lg font-black text-si-2 mt-1">
            {formatVal(assetsTotal)}
          </p>
        </div>
        <div className="bg-si-over-1/40 border border-si-border/30 rounded-2xl p-4">
          <span className="block text-[10px] font-bold text-rose-400 uppercase tracking-widest">Obrigações (Passivos)</span>
          <p className="text-lg font-black text-rose-400 mt-1">
            {hideValues ? '••••' : `- R$ ${liabilitiesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          </p>
        </div>
      </div>
    </div>
  );
}
