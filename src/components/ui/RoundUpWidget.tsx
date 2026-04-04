import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { investirCofre, updateRoundUpConfig } from '../../services/persistUserData';
import { PiggyBank, Settings, Target } from 'lucide-react';
import { Modal } from './Modal';
import type { RoundUpConfig } from '../../types/userData';

export function RoundUpWidget() {
  const { user, data, goals } = useAppContext();
  const cfg = (data as any)?.roundUpConfig as RoundUpConfig | undefined;
  const [configOpen, setConfigOpen] = useState(false);
  const [investOpen, setInvestOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  if (!cfg?.enabled) return null;

  const cofre = cfg.cofreTotal ?? 0;
  const lastEntries = (cfg.cofreHistory ?? []).slice(-3);

  const handleInvest = async () => {
    if (!user?.uid || !selectedGoal || !amount) return;
    const val = parseFloat(amount);
    if (val <= 0 || val > cofre) return;
    setBusy(true);
    try {
      await investirCofre(user.uid, goals, selectedGoal, val);
      setInvestOpen(false); setAmount(''); setSelectedGoal('');
    } finally { setBusy(false); }
  };

  const handleToggle = async (enabled: boolean) => {
    if (!user?.uid) return;
    await updateRoundUpConfig(user.uid, { enabled });
  };

  const handleRoundTo = async (roundTo: 1 | 5 | 10) => {
    if (!user?.uid) return;
    await updateRoundUpConfig(user.uid, { roundTo });
  };

  return (
    <>
      <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-6 h-6 text-emerald-400" />
            <h3 className="font-bold text-si-1">Cofre de Arredondamento</h3>
          </div>
          <button type="button" onClick={() => setConfigOpen(true)} className="text-si-5 hover:text-si-3" title="Configurar">
            <Settings className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-3xl font-bold text-emerald-400">R$ {cofre.toFixed(2)}</p>
            <p className="text-xs text-si-5 mt-0.5">
              Arredondando para R$ {cfg.roundTo},00
            </p>
          </div>
          {cofre > 0 && goals.length > 0 && (
            <button
              type="button"
              onClick={() => { setAmount(String(cofre)); setInvestOpen(true); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 text-emerald-400 text-xs font-bold hover:bg-emerald-600/30"
            >
              <Target className="w-3.5 h-3.5" /> Investir em meta
            </button>
          )}
        </div>

        {lastEntries.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-si-border">
            {lastEntries.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-xs">
                <span className="text-si-5">R$ {e.originalValue.toFixed(2)} → R$ {e.roundedValue.toFixed(2)}</span>
                <span className="text-emerald-400 font-medium">+R$ {e.diff.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={configOpen} onClose={() => setConfigOpen(false)} title="Configurar Arredondamento">
        <div className="space-y-4">
          <p className="text-si-5 text-sm">
            A cada despesa, o sistema arredonda o valor para cima e guarda a diferença no cofre.
            Ex: gasto de R$ 47,30 arredondado para R$ 50 = R$ 2,70 no cofre.
          </p>
          <div>
            <label className="text-sm text-si-3 block mb-2">Arredondar para o próximo:</label>
            <div className="flex gap-2">
              {([1, 5, 10] as const).map((v) => (
                <button key={v} type="button"
                  onClick={() => handleRoundTo(v)}
                  className={`flex-1 py-2 rounded-xl border text-sm font-bold ${cfg.roundTo === v
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-si-over-2 border-si-border-md text-si-3 hover:bg-si-over-3'
                  }`}>
                  R$ {v}
                </button>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => { handleToggle(false); setConfigOpen(false); }}
            className="w-full px-4 py-2 rounded-xl bg-rose-600/20 text-rose-400 text-sm font-bold hover:bg-rose-600/30">
            Desativar arredondamento
          </button>
        </div>
      </Modal>

      <Modal open={investOpen} onClose={() => setInvestOpen(false)} title="Investir cofre em meta">
        <div className="space-y-4">
          <p className="text-si-5 text-sm">
            Transfira o valor acumulado no cofre para uma das suas metas financeiras.
          </p>
          <div>
            <label className="text-sm text-si-3 block mb-1">Meta destino</label>
            <select value={selectedGoal} onChange={(e) => setSelectedGoal(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-si-bg border border-si-border-md text-si-1 text-sm">
              <option value="">Selecione...</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>{g.title} (R$ {g.current.toFixed(2)} / R$ {g.target.toFixed(2)})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-si-3 block mb-1">Valor (máx: R$ {cofre.toFixed(2)})</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              min="0.01" max={cofre} step="0.01"
              className="w-full px-3 py-2 rounded-xl bg-si-bg border border-si-border-md text-si-1 text-sm" />
          </div>
          <button type="button" onClick={handleInvest}
            disabled={busy || !selectedGoal || !amount || parseFloat(amount) <= 0}
            className="w-full px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm disabled:opacity-50">
            {busy ? 'Transferindo...' : 'Transferir para meta'}
          </button>
        </div>
      </Modal>
    </>
  );
}

export function RoundUpToggle() {
  const { user, data } = useAppContext();
  const cfg = (data as any)?.roundUpConfig as RoundUpConfig | undefined;
  const enabled = cfg?.enabled ?? false;

  const handleToggle = async () => {
    if (!user?.uid) return;
    await updateRoundUpConfig(user.uid, {
      enabled: !enabled,
      roundTo: cfg?.roundTo || 1,
      cofreTotal: cfg?.cofreTotal || 0,
    });
  };

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-si-bg border border-si-border-md">
      <div className="flex items-center gap-2">
        <PiggyBank className="w-4 h-4 text-emerald-400" />
        <div>
          <span className="text-sm text-si-3 block">Arredondamento de troco</span>
          <span className="text-xs text-si-5">Cada despesa arredonda para cima e guarda a diferença</span>
        </div>
      </div>
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={enabled}
        className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-si-over-3'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}
