import { useEffect, useMemo, useState } from 'react';

type TransferFormData = {
  from: string;
  to: string;
  date: string;
  value: number;
};

export function TransferForm({
  accounts,
  busy,
  onSubmit,
  onCancel,
}: {
  accounts: string[];
  busy?: boolean;
  onSubmit: (data: TransferFormData) => Promise<void> | void;
  onCancel?: () => void;
}) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [valueStr, setValueStr] = useState('');

  const filteredAccounts = useMemo(() => (accounts || []).filter(Boolean), [accounts]);

  useEffect(() => {
    if (!filteredAccounts.length) return;
    // Preencher defaults se ainda não tiver
    setFrom((cur) => cur || filteredAccounts[0] || '');
    setTo((cur) => {
      if (cur) return cur;
      return filteredAccounts[1] && filteredAccounts[1] !== filteredAccounts[0] ? filteredAccounts[1] : filteredAccounts[0] || '';
    });
  }, [filteredAccounts]);

  const parsedValue = useMemo(() => {
    const num = parseFloat(valueStr.replace(',', '.'));
    return Number.isFinite(num) ? num : NaN;
  }, [valueStr]);

  const [localError, setLocalError] = useState<string | null>(null);

  const submit = async () => {
    setLocalError(null);
    const v = parsedValue;
    if (!from || !to) return setLocalError('Selecione a conta de origem e destino.');
    if (from === to) return setLocalError('A origem e o destino precisam ser diferentes.');
    if (!date) return setLocalError('Selecione uma data.');
    if (!Number.isFinite(v) || v <= 0) return setLocalError('Informe um valor maior que zero.');

    await onSubmit({ from, to, date, value: v });
    setValueStr('');
  };

  return (
    <div className="space-y-4">
      {localError && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2 text-rose-400 text-sm">
          {localError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="transfer-from" className="block text-xs font-medium text-si-5 mb-1">De (Origem)</label>
          <select
            id="transfer-from"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-si-border-lg"
          >
            <option value="">—</option>
            {filteredAccounts.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="transfer-to" className="block text-xs font-medium text-si-5 mb-1">Para (Destino)</label>
          <select
            id="transfer-to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-si-border-lg"
          >
            <option value="">—</option>
            {filteredAccounts.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="transfer-value" className="block text-xs font-medium text-si-5 mb-1">Valor (R$)</label>
          <input
            id="transfer-value"
            type="text"
            inputMode="decimal"
            value={valueStr}
            onChange={(e) => setValueStr(e.target.value.replace(/[^0-9,.-]/g, ''))}
            placeholder="0,00"
            className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-si-border-lg"
          />
        </div>

        <div>
          <label htmlFor="transfer-date" className="block text-xs font-medium text-si-5 mb-1">Data</label>
          <input
            id="transfer-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-si-border-lg"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className="flex-1 py-3 rounded-xl bg-white hover:bg-zinc-100 disabled:opacity-60 disabled:cursor-not-allowed text-zinc-900 font-bold text-sm"
        >
          {busy ? 'Salvando…' : 'Transferir'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 font-medium text-sm hover:bg-si-over-3"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}

