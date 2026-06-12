import { useState, useEffect } from 'react';
import { ShieldAlert, TrendingDown, Clock, X, AlertOctagon } from 'lucide-react';
import type { SovereigntyScoreResult } from '../../utils/sovereigntyEngine';

interface SentinelGuardModalProps {
  open: boolean;
  scoreData: SovereigntyScoreResult | null;
  entryName: string;
  entryValue: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SentinelGuardModal({
  open,
  scoreData,
  entryName,
  entryValue,
  onConfirm,
  onCancel
}: SentinelGuardModalProps) {
  const [delay, setDelay] = useState(0);

  useEffect(() => {
    if (open && scoreData) {
      if (scoreData.verdict === 'auto-sabotagem') {
        setDelay(5);
      } else {
        setDelay(0); // para 'atencao' não tem delay super restritivo, mas podemos por 3? Vamos de 0.
      }
    }
  }, [open, scoreData]);

  useEffect(() => {
    if (delay > 0) {
      const t = setTimeout(() => setDelay(d => d - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [delay]);

  if (!open || !scoreData) return null;

  const isCritical = scoreData.verdict === 'auto-sabotagem';
  
  // Cores dinâmicas para o impacto
  const theme = isCritical 
    ? 'border-rose-600 bg-black shadow-[0_0_50px_rgba(225,29,72,0.3)]' 
    : 'border-orange-500/50 bg-[#0d1421] shadow-2xl shadow-orange-500/10';
    
  const headerTheme = isCritical
    ? 'bg-rose-600'
    : 'bg-orange-500/20 border-b border-orange-500/30';

  const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className={`relative w-full max-w-md rounded-3xl border ${theme} overflow-hidden font-sans origin-center animate-in fade-in zoom-in duration-300`}>
        
        {/* Header Visual */}
        <div className={`flex flex-col items-center justify-center pt-8 pb-5 px-6 ${headerTheme} text-center`}>
          {isCritical ? (
            <AlertOctagon className="w-16 h-16 text-white mb-3 animate-[pulse_2s_infinite]" />
          ) : (
            <ShieldAlert className="w-16 h-16 text-orange-400 mb-3" />
          )}
          <h2 className={`text-2xl font-black uppercase tracking-widest ${isCritical ? 'text-white' : 'text-orange-400'}`}>
            {isCritical ? 'Auto-Sabotagem Detectada' : 'Atenção ao Gasto'}
          </h2>
          <p className={`text-sm mt-2 font-medium ${isCritical ? 'text-rose-100' : 'text-orange-200'}`}>
            Você está prestes a gastar <strong>R$ {fmt(entryValue)}</strong> em "{entryName || 'Sem descrição'}"
          </p>
        </div>

        {/* Corpo de Impacto (A dor) */}
        <div className="p-6 space-y-5 bg-si-card">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex flex-col items-center text-center">
              <Clock className="w-6 h-6 text-rose-400 mb-2" />
              <span className="text-3xl font-black text-rose-400 mb-1">{scoreData.daysLost}</span>
              <span className="text-xs text-rose-300/80 font-medium uppercase tracking-wide">Dias de Liberdade Perdidos</span>
            </div>
            
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex flex-col items-center text-center">
              <TrendingDown className="w-6 h-6 text-orange-400 mb-2" />
              <span className="text-xl font-black text-orange-400 mb-1">R$ {fmt(scoreData.opportunityCost10y)}</span>
              <span className="text-xs text-orange-300/80 font-medium uppercase tracking-wide">Prejuízo Juros Compostos (10 anos)</span>
            </div>
          </div>

          <div className="bg-si-bg border border-si-border rounded-xl p-4 text-center">
            <p className="text-sm text-si-4 leading-relaxed font-medium">
              Antes de confirmar, lembre-se: este lançamento drena diretamente o seu índice de independência, te amarrando por mais <span className="text-rose-400 font-bold">{scoreData.daysLost} dias</span> no mercado de trabalho.
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col gap-3 pt-2">
            <button 
              onClick={onCancel}
              className={`w-full py-4 rounded-xl text-base font-bold transition-all shadow-lg hover:-translate-y-1 ${
                isCritical 
                ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20' 
                : 'bg-white hover:bg-zinc-100 text-zinc-900 shadow-blue-500/20'
              }`}
            >
              Desistir e Reter Capital
            </button>
            <button 
              onClick={onConfirm}
              disabled={delay > 0}
              className={`w-full py-3 rounded-xl border border-si-border-md bg-transparent text-sm font-medium transition-colors ${
                delay > 0 ? 'text-si-6 opacity-60 cursor-not-allowed' : 'text-si-5 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30'
              }`}
            >
              {delay > 0 
                ? `Estou ciente (aguarde ${delay}s)` 
                : 'Piorar minha situação e gastar'}
            </button>
          </div>
        </div>
        
        {/* Botão sutil de X escondido para caso ele insista */}
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 rounded-full bg-black/20 text-white/50 hover:bg-black/40 hover:text-white transition-colors"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
