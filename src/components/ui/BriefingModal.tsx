import { useState, useEffect } from 'react';
// ✅ FIX: Removido useAuth + useFinancialData diretos → usa AppContext (elimina 3º listener Firestore)
import { useAppContext } from '../../context/AppContext';
import { X, Wallet, Target, Bot } from 'lucide-react';
import { isTransferEntry } from '../../utils/entryUtils';
import { fmt } from '../../utils/reportUtils';

const BRIEFING_KEY = 'sibanki_briefing_shown';

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

export function BriefingModal() {
  // ✅ FIX: Uma única fonte de dados — sem listener paralelo
  const { user, entries, goals, loading } = useAppContext();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || loading) return;
    const today = getTodayKey();
    const shown = localStorage.getItem(BRIEFING_KEY);
    if (shown !== today) {
      setOpen(true);
    }
  }, [user, loading]);

  const handleClose = () => {
    setOpen(false);
    localStorage.setItem(BRIEFING_KEY, getTodayKey());
  };

  if (!open) return null;

  const entriesNoTransfer = entries.filter((e) => !isTransferEntry(e));
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  let receita = 0, despesa = 0;
  for (const e of entriesNoTransfer) {
    if ((e.date ?? '').startsWith(monthKey)) {
      if (e.type === 'receita') receita += Number(e.value);
      else despesa += Number(e.value);
    }
  }
  const saldo = receita - despesa;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4"
      onClick={handleClose}
    >
      <div
        className="bg-si-card rounded-2xl border border-si-border-md max-w-md w-full overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-si-border-md flex items-center justify-between">
          <h2 className="text-xl font-bold text-si-1">Bem-vindo de volta!</h2>
          <button type="button" onClick={handleClose} className="p-2 rounded-lg hover:bg-si-over-2 text-si-4" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-si-over-2 border border-si-border-md text-center">
              <div className="text-xs text-si-5">Receita do mês</div>
              <div className="text-sm font-bold text-emerald-400">{fmt(receita)}</div>
            </div>
            <div className="p-3 rounded-xl bg-si-over-2 border border-si-border-md text-center">
              <div className="text-xs text-si-5">Despesa do mês</div>
              <div className="text-sm font-bold text-rose-400">{fmt(despesa)}</div>
            </div>
            <div className="p-3 rounded-xl bg-si-over-2 border border-si-border-md text-center">
              <div className="text-xs text-si-5">Saldo</div>
              <div className={`text-sm font-bold ${saldo >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>{fmt(saldo)}</div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-pink-500/10 border border-violet-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-5 h-5 text-violet-400" />
              <span className="font-bold text-si-1">Insight do dia</span>
            </div>
            <p className="text-sm text-si-3 leading-relaxed">
              {saldo > 0
                ? 'Seu saldo está positivo este mês. Considere direcionar parte do excedente para investimentos ou metas.'
                : saldo < 0
                  ? 'Suas despesas superam as receitas. Revise gastos e identifique onde cortar.'
                  : 'Você está no zero a zero. Pequenos ajustes podem gerar uma reserva.'}
            </p>
          </div>
          <div className="flex gap-2 text-xs text-si-5">
            <Wallet className="w-4 h-4" />
            <span>{entriesNoTransfer.length} lançamentos</span>
            <Target className="w-4 h-4 ml-2" />
            <span>{goals.length} metas ativas</span>
          </div>
        </div>
        <div className="p-4 border-t border-si-border-md">
          <button type="button" onClick={handleClose} className="w-full py-3 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-sm">
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
