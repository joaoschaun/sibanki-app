/**
 * PriceAlertModal — Modal para configurar um alerta de preço.
 *
 * Usado em:
 *   - PortfolioListItem (expanded) → botão "Alerta"
 *   - WatchlistPanel → botão "Alerta" por item
 *   - Análise B3 tab → botão "Criar alerta" no card de cotação
 *
 * Salva via usePriceAlerts.setAlert().
 * O job checkPriceAlerts (telegramBot.js) verifica seg-sex, 10h-18h.
 *
 * TODO: quando push for wired no backend, exibir checkbox de canal.
 */

import { useState, useEffect } from 'react';
import { Bell, X, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { usePriceAlerts } from '../../hooks/usePriceAlerts';

interface Props {
  ticker: string;
  /** Nome display opcional (ex: "Petrobras PN"). */
  nome?: string;
  /** Preço atual, para pré-preencher campo de preço. */
  currentPrice?: number;
  onClose: () => void;
}

export function PriceAlertModal({ ticker, nome, currentPrice, onClose }: Props) {
  const { alertsForTicker, setAlert, deleteAlert } = usePriceAlerts();
  const existing = alertsForTicker(ticker);

  const [condition, setCondition] = useState<'>' | '<'>('>');
  const [price, setPrice]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  // Pré-preenche com preço atual ±5%
  useEffect(() => {
    if (currentPrice && !price) {
      const suggestion = condition === '>'
        ? (currentPrice * 1.05).toFixed(2)
        : (currentPrice * 0.95).toFixed(2);
      setPrice(suggestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condition]);

  const handleSave = async () => {
    const priceNum = parseFloat(price.replace(',', '.'));
    if (isNaN(priceNum) || priceNum <= 0) return;

    setSaving(true);
    try {
      await setAlert({
        ticker: ticker.toUpperCase(),
        nome,
        condition,
        price: priceNum,
        channels: ['telegram', 'push'],
      });
      setSaved(true);
      setTimeout(onClose, 800);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteAlert(id);
  };

  const fmtBRL = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-[#111111] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-amber-400" />
            <div>
              <p className="text-sm font-bold text-white">{ticker}</p>
              {nome && <p className="text-[10px] text-zinc-500">{nome}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-5">
          {/* Condição */}
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
              Notificar quando
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCondition('>')}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                  condition === '>'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                    : 'bg-white/[0.04] border-white/[0.06] text-zinc-400 hover:bg-white/[0.07]'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Subir acima
              </button>
              <button
                type="button"
                onClick={() => setCondition('<')}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                  condition === '<'
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-400'
                    : 'bg-white/[0.04] border-white/[0.06] text-zinc-400 hover:bg-white/[0.07]'
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                Cair abaixo
              </button>
            </div>
          </div>

          {/* Preço-alvo */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">
              Preço-alvo (R$)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 text-sm font-bold">R$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={currentPrice ? currentPrice.toFixed(2) : '0,00'}
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>
            {currentPrice && (
              <p className="text-[10px] text-zinc-600 mt-1.5">
                Preço atual: {fmtBRL(currentPrice)}
              </p>
            )}
          </div>

          {/* Info canais */}
          <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/15 rounded-xl p-3">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-200/70 leading-relaxed">
              Alertas são verificados seg–sex, 10h–18h. Você receberá notificação via Telegram e push quando o preço atingir o alvo.
            </p>
          </div>
        </div>

        {/* Alertas existentes */}
        {existing.length > 0 && (
          <div className="px-5 pb-4 space-y-2">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Alertas ativos para {ticker}
            </p>
            {existing.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/[0.03] border border-white/[0.05]"
              >
                <div className="flex items-center gap-2">
                  {a.condition === '>' ? (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  <span className="text-xs text-zinc-300 font-bold">
                    {a.condition === '>' ? 'Acima de' : 'Abaixo de'} {fmtBRL(a.price)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(a.id)}
                  className="p-1 rounded hover:bg-rose-500/10 text-zinc-600 hover:text-rose-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06] flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-sm font-bold text-zinc-400 hover:bg-white/[0.04] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || saved || !price}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              saved
                ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                : 'bg-white/[0.08] border border-white/[0.12] text-white hover:bg-white/[0.12] disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            {saved ? '✓ Salvo' : saving ? 'Salvando…' : 'Criar alerta'}
          </button>
        </div>
      </div>
    </div>
  );
}
