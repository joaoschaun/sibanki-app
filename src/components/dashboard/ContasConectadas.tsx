import { Link } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { Building2, Plus } from 'lucide-react';
import { cn } from '../../utils/cn';

export function ContasConectadas() {
  const {
    accounts = [],
    accountBalances = {},
    accountMeta = {},
    hasOpenFinance,
  } = useAppContext();

  const totalBalance = accounts.reduce((sum, name) => sum + (accountBalances[name] ?? 0), 0);

  const getBankColor = (bankName: string) => {
    const name = bankName.toLowerCase();
    if (name.includes('itau')) return 'border-t-2 border-orange-500';
    if (name.includes('bradesco')) return 'border-t-2 border-red-600';
    if (name.includes('nubank')) return 'border-t-2 border-purple-600';
    if (name.includes('banco do brasil') || name.includes('bb')) return 'border-t-2 border-yellow-400';
    if (name.includes('santander')) return 'border-t-2 border-red-500';
    return 'border-t border-si-border';
  };

  const getAccountTypeLabel = (name: string) => {
    const meta = accountMeta[name];
    return meta?.tipo ?? 'Conta corrente';
  };

  return (
    <Card surface="raised" className="w-full p-5 border border-si-border relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-si-4" />
          <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-si-4">
            Contas conectadas
          </span>
          <span className={cn(
            "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border",
            hasOpenFinance
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-si-over-2 text-si-4 border border-si-border"
          )}>
            {hasOpenFinance ? 'ao vivo' : 'manual'}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[9px] text-si-4 uppercase tracking-wider block mb-0.5">consolidado</span>
          <span className={cn(
            "text-base font-bold",
            totalBalance >= 0 ? "text-si-1" : "text-rose-400"
          )}>
            R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Grid of accounts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {accounts.map((name) => {
          const balance = accountBalances[name] ?? 0;
          return (
            <div
              key={name}
              className={cn(
                "p-3 rounded-xl bg-si-card border border-si-border flex flex-col justify-between transition-all duration-300 hover:scale-[1.01] hover:bg-si-over-2",
                getBankColor(name)
              )}
            >
              <div>
                <span className="text-[10px] text-si-4 uppercase tracking-wider font-medium block">
                  {getAccountTypeLabel(name)}
                </span>
                <span className="text-xs font-bold text-si-2 truncate block mt-0.5">
                  {name}
                </span>
              </div>
              <span className={cn(
                "text-sm font-bold mt-2 block",
                balance >= 0 ? "text-si-1" : "text-rose-400"
              )}>
                R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          );
        })}

        {/* Add Connection CTA tile */}
        <Link
          to="/configuracoes#open-finance"
          className="p-3 rounded-xl bg-si-over-1 border border-dashed border-si-border flex flex-col items-center justify-center text-center gap-1.5 hover:bg-si-over-2 transition-all group"
        >
          <div className="w-6 h-6 rounded-full bg-si-over-2 flex items-center justify-center border border-si-border group-hover:bg-si-over-3">
            <Plus className="w-3.5 h-3.5 text-si-3" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-si-2 uppercase tracking-wide block">
              Conectar banco
            </span>
            <span className="text-[9px] text-si-4 block mt-0.5">
              Open Finance 100% seguro
            </span>
          </div>
        </Link>
      </div>
    </Card>
  );
}
