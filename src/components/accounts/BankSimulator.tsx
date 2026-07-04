import { Modal } from '../ui/Modal';
import { BankTheme } from './AccountCard';
import { Calendar, Tag } from 'lucide-react';
import { BankLogo } from '../banks/BankLogo';
import type { BankData } from '../banks/bankData';

interface BankSimulatorProps {
  open: boolean;
  onClose: () => void;
  accountName: string | null;
  balance: number;
  entries: any[];
  userName: string | null;
  bank: BankTheme | null;
}

export function BankSimulator({ 
  open, 
  onClose, 
  accountName, 
  balance, 
  entries = [], 
  userName,
  bank
}: BankSimulatorProps) {
  // Filtrar e ordenar lançamentos desta conta (mais novos primeiro)
  const accountEntries = entries
    .filter((e) => e.account === accountName)
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });

  const formatCurrency = (val: number) => {
    return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  // Cores da instituição se disponíveis
  const bankPrimary = bank ? ((bank as any).primary ?? (bank as any).bg) : null;
  const bankSecondary = bank ? ((bank as any).secondary ?? (bank as any).bg) : null;
  const bankText = bank ? ((bank as any).text) : '#ffffff';

  const headerStyle = bank
    ? {
        background: `linear-gradient(135deg, ${bankPrimary}E6 0%, ${bankSecondary} 100%)`,
        color: bankText,
        borderColor: `${bankText}20`,
      }
    : {};

  return (
    <Modal open={open} onClose={onClose} title={`Extrato — ${accountName || 'Conta'}`} size="3xl">
      <div className="space-y-6 py-2">
        {/* Topo do Extrato com Identidade Visual */}
        <div 
          style={headerStyle}
          className={`border rounded-3xl p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 relative overflow-hidden transition-all duration-300 ${
            !bank ? 'bg-si-over-1 border-si-border/30 text-si-1' : 'border-white/10 shadow-lg'
          }`}
        >
          {/* Noise Texture para cabeçalhos com banco */}
          {bank && (
            <div
              className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
            />
          )}

          <div className="flex items-center gap-4 relative z-10">
            {bank && (
              <div className="p-2.5 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 shrink-0">
                <BankLogo 
                  bank={bank as unknown as BankData} 
                  size={32} 
                  backgroundHex={bankPrimary ?? undefined} 
                />
              </div>
            )}
            <div>
              <span className={`text-[10px] font-bold uppercase tracking-widest block ${bank ? 'opacity-70' : 'text-si-5'}`}>
                Saldo da Conta
              </span>
              <p className="text-3xl font-black tracking-tight mt-1">{formatCurrency(balance)}</p>
              {userName && (
                <p className="text-xs mt-1 opacity-80">
                  Titular: <span className="font-bold">{userName}</span>
                </p>
              )}
            </div>
          </div>
          
          <div className="text-xs space-y-1 relative z-10 opacity-95 shrink-0 sm:text-right">
            <p>Lançamentos: <span className="font-bold">{accountEntries.length}</span></p>
            <p>Gestão: <span className="font-bold">{bank ? 'Sincronizada' : 'Manual'}</span></p>
          </div>
        </div>

        {/* Lista de Transações */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-si-5 uppercase tracking-wider">Histórico de Lançamentos</h4>
          
          {accountEntries.length === 0 ? (
            <div className="border border-dashed border-si-border rounded-2xl py-12 text-center">
              <p className="text-sm text-si-4">Nenhuma transação registrada nesta conta ainda.</p>
              <p className="text-xs text-si-5 mt-1">Lançamentos adicionados na tela de Transações aparecerão aqui.</p>
            </div>
          ) : (
            <div className="border border-si-border rounded-2xl divide-y divide-si-border/50 max-h-[350px] overflow-y-auto bg-si-card/30">
              {accountEntries.map((entry) => {
                const isRevenue = entry.type === 'receita';
                const entryDate = entry.date ? new Date(entry.date).toLocaleDateString('pt-BR') : '—';

                return (
                  <div key={entry.id} className="p-4 flex items-center justify-between gap-4 hover:bg-si-over-1 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 flex items-center justify-center ${
                        isRevenue ? 'bg-emerald-500/10 text-emerald-400' : 'bg-si-over-2 text-si-3'
                      }`}>
                        <span className="font-bold text-xs">{isRevenue ? '＋' : '－'}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-si-1 truncate">
                          {entry.desc || entry.category || 'Lançamento sem descrição'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-si-5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {entryDate}
                          </span>
                          {entry.category && (
                            <span className="flex items-center gap-1 uppercase tracking-wider text-[10px] font-bold text-si-4 bg-si-over-2 px-1.5 py-0.5 rounded">
                              <Tag className="w-2.5 h-2.5" /> {entry.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className={`text-sm font-black ${isRevenue ? 'text-emerald-400' : 'text-si-1'}`}>
                        {isRevenue ? '+' : '-'} {formatCurrency(entry.value)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé do Extrato */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-si-over-2 hover:bg-si-over-3 rounded-xl text-si-2 hover:text-si-1 font-bold text-xs uppercase tracking-wider transition-colors"
          >
            Fechar Extrato
          </button>
        </div>
      </div>
    </Modal>
  );
}
