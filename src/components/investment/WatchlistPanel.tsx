/**
 * WatchlistPanel — Lista de ativos monitorados com análise Graham/Bazin.
 *
 * Exibido como aba "Watchlist" em Growth.tsx (tab Minha Carteira).
 * Cada item mostra:
 *   - Ticker + nome + tipo
 *   - Preço na adição vs preço atual (via brapiQuote, lazy)
 *   - Graham: preço justo + desconto/prêmio
 *   - Bazin: teto + verdict
 *   - RSI + sinal
 *   - Preço-alvo definido pelo usuário + distância %
 *   - Botão "Alerta" → PriceAlertModal
 *   - Botão "Raio-X" → abre Consultor IA com query pré-preenchida
 *   - Botão "Remover"
 *
 * Adicionar item: campo ticker + botão "+" → chama useWatchlist.addItem()
 *   que busca análise automática via marketAssetAnalysis CF.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Bell, Zap, Trash2, RefreshCw, ChevronDown, ChevronUp,
  Target, Eye, Loader2,
} from 'lucide-react';
import { useWatchlist } from '../../hooks/useWatchlist';
import { usePriceAlerts } from '../../hooks/usePriceAlerts';
import { PriceAlertModal } from './PriceAlertModal';
import type { WatchlistItem } from '../../types/userData';

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

const fmtPct = (v: number, sign = true) =>
  `${sign && v > 0 ? '+' : ''}${v.toFixed(1)}%`;

function GrahamBadge({ verdict, discount }: { verdict?: string; discount?: number }) {
  if (!verdict || verdict === 'SEM_DADOS') {
    return <span className="text-[10px] text-zinc-600">Sem dados</span>;
  }
  const color = verdict === 'DESCONTO_ATRATIVO'
    ? 'text-emerald-400'
    : verdict === 'PROXIMO_JUSTO'
      ? 'text-amber-400'
      : 'text-rose-400';

  const label = verdict === 'DESCONTO_ATRATIVO'
    ? 'Desconto atrativo'
    : verdict === 'PROXIMO_JUSTO'
      ? 'Próximo do justo'
      : 'Acima do justo';

  return (
    <span className={`text-[10px] font-bold ${color}`}>
      {label}{discount != null ? ` (${fmtPct(discount)})` : ''}
    </span>
  );
}

function BazinBadge({ verdict, ceiling }: { verdict?: string; ceiling?: number }) {
  if (!verdict || verdict === 'SEM_DADOS') {
    return <span className="text-[10px] text-zinc-600">Sem dados</span>;
  }
  const color = verdict === 'ABAIXO_TETO'
    ? 'text-emerald-400'
    : verdict === 'PROXIMO_TETO'
      ? 'text-amber-400'
      : 'text-rose-400';

  const label = verdict === 'ABAIXO_TETO'
    ? 'Abaixo do teto'
    : verdict === 'PROXIMO_TETO'
      ? 'Próximo do teto'
      : 'Acima do teto';

  return (
    <span className={`text-[10px] font-bold ${color}`}>
      {label}{ceiling ? ` (teto ${fmtBRL(ceiling)})` : ''}
    </span>
  );
}

function RsiBadge({ rsi, signal }: { rsi?: number; signal?: string }) {
  if (rsi == null) return null;
  const color = signal === 'SOBREVENDIDO'
    ? 'text-emerald-400'
    : signal === 'SOBRECOMPRADO'
      ? 'text-rose-400'
      : 'text-zinc-400';
  const label = signal === 'SOBREVENDIDO'
    ? 'Sobrevendido'
    : signal === 'SOBRECOMPRADO'
      ? 'Sobrecomprado'
      : 'Neutro';
  return (
    <span className={`text-[10px] font-bold ${color}`}>RSI {rsi.toFixed(0)} · {label}</span>
  );
}

// ─── Item row ─────────────────────────────────────────────────────────────────

interface ItemRowProps {
  item: WatchlistItem;
  onRemove: (id: string) => void;
  onRefresh: (id: string) => void;
  onAlert: (ticker: string, nome?: string) => void;
  onRaioX: (ticker: string) => void;
}

function ItemRow({ item, onRemove, onRefresh, onAlert, onRaioX }: ItemRowProps) {
  const { alertsForTicker } = usePriceAlerts();
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const hasAlerts = alertsForTicker(item.ticker).length > 0;

  const distToAlvo = item.precoAlvo && item.precoNaAdicao
    ? ((item.precoAlvo - item.precoNaAdicao) / item.precoNaAdicao) * 100
    : null;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh(item.id);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="border border-si-border rounded-xl overflow-hidden">
      {/* Linha principal */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-si-over-1 transition-colors text-left"
      >
        {/* Dot tipo */}
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{
            backgroundColor: item.tipo === 'Ações' ? '#60a5fa'
              : item.tipo === 'FIIs' ? '#34d399'
              : item.tipo === 'ETFs' ? '#a78bfa'
              : item.tipo === 'Criptoativos' ? '#f97316'
              : '#6b7280',
          }}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-si-1">{item.ticker}</p>
            {hasAlerts && <Bell className="w-3 h-3 text-amber-400" />}
          </div>
          <p className="text-[10px] text-zinc-500 truncate">{item.nome} · {item.tipo}</p>
        </div>

        {/* Análise snapshot */}
        <div className="text-right shrink-0 space-y-0.5">
          {item.precoNaAdicao && (
            <p className="text-xs font-bold text-zinc-300">{fmtBRL(item.precoNaAdicao)}</p>
          )}
          {item.precoAlvo && (
            <p className="text-[10px] text-zinc-500 flex items-center gap-1 justify-end">
              <Target className="w-2.5 h-2.5" />
              {fmtBRL(item.precoAlvo)}
              {distToAlvo != null && (
                <span className={distToAlvo >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  ({fmtPct(distToAlvo)})
                </span>
              )}
            </p>
          )}
        </div>

        {expanded ? <ChevronUp className="w-4 h-4 text-zinc-600" /> : <ChevronDown className="w-4 h-4 text-zinc-600" />}
      </button>

      {/* Expandido */}
      {expanded && (
        <div className="border-t border-si-border bg-si-bg/40 px-4 py-4 space-y-4">
          {/* Análise fundamentalista */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 space-y-1">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Graham</p>
              {item.grahamIntrinsicValue && (
                <p className="text-xs text-zinc-300 font-bold">Justo: {fmtBRL(item.grahamIntrinsicValue)}</p>
              )}
              <GrahamBadge verdict={item.grahamVerdict} discount={item.grahamDiscount} />
            </div>

            <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 space-y-1">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Bazin</p>
              <BazinBadge verdict={item.bazinVerdict} ceiling={item.bazinCeiling} />
            </div>

            <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 space-y-1">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Técnico</p>
              <RsiBadge rsi={item.rsi} signal={item.rsiSignal} />
              {item.rsi == null && <span className="text-[10px] text-zinc-600">Sem dados</span>}
            </div>
          </div>

          {/* Notas */}
          {item.notas && (
            <p className="text-xs text-zinc-400 bg-white/[0.02] rounded-lg px-3 py-2 italic">
              {item.notas}
            </p>
          )}

          {/* Atualizado em */}
          {item.updatedAt && (
            <p className="text-[10px] text-zinc-600">
              Atualizado: {new Date(item.updatedAt).toLocaleDateString('pt-BR')}
            </p>
          )}

          {/* Ações */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => onRaioX(item.ticker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-si-over-2 hover:bg-si-over-3 border border-si-border text-[11px] font-bold text-zinc-300 transition-colors"
            >
              <Zap className="w-3 h-3 text-blue-400" /> Raio-X
            </button>
            <button
              type="button"
              onClick={() => onAlert(item.ticker, item.nome)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-colors ${
                hasAlerts
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-si-over-1 border-si-border text-zinc-400 hover:bg-si-over-2'
              }`}
            >
              <Bell className="w-3 h-3" /> {hasAlerts ? 'Alertas ativos' : 'Criar alerta'}
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-si-over-1 hover:bg-si-over-2 border border-si-border text-[11px] font-bold text-zinc-500 transition-colors disabled:opacity-40"
            >
              {refreshing
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <RefreshCw className="w-3 h-3" />}
              Atualizar
            </button>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-si-over-1 hover:bg-rose-500/10 border border-si-border hover:border-rose-500/30 text-[11px] font-bold text-zinc-500 hover:text-rose-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Remover
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Panel principal ──────────────────────────────────────────────────────────

export function WatchlistPanel() {
  const navigate = useNavigate();
  const { items, addItem, removeItem, refreshItem } = useWatchlist();

  const [tickerInput, setTickerInput]   = useState('');
  const [precoAlvoInput, setPrecoAlvo]  = useState('');
  const [adding, setAdding]             = useState(false);
  const [addError, setAddError]         = useState('');

  const [alertModal, setAlertModal] = useState<{ ticker: string; nome?: string } | null>(null);

  const handleAdd = useCallback(async () => {
    const ticker = tickerInput.trim().toUpperCase();
    if (!ticker) return;

    setAdding(true);
    setAddError('');
    try {
      await addItem({
        ticker,
        nome: ticker, // nome será enriquecido via análise
        tipo: 'Ações', // padrão — usuário pode editar
        precoAlvo: precoAlvoInput ? parseFloat(precoAlvoInput.replace(',', '.')) : undefined,
      });
      setTickerInput('');
      setPrecoAlvo('');
    } catch (e: any) {
      setAddError('Erro ao adicionar. Verifique o ticker e tente novamente.');
    } finally {
      setAdding(false);
    }
  }, [tickerInput, precoAlvoInput, addItem]);

  const handleRaioX = (ticker: string) => {
    navigate(`/consultor-ia?q=Faça+um+raio-X+de+${ticker}`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Watchlist</p>
          <p className="text-xs text-zinc-500 mt-0.5">Ativos monitorados — análise Graham/Bazin automática</p>
        </div>
        {items.length > 0 && (
          <span className="text-[10px] text-zinc-600">{items.length} {items.length === 1 ? 'ativo' : 'ativos'}</span>
        )}
      </div>

      {/* Formulário de adição */}
      <div className="bg-si-card border border-si-border rounded-2xl p-4 space-y-3">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Adicionar ativo</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={tickerInput}
            onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Ticker (ex: PETR4)"
            maxLength={12}
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20"
          />
          <input
            type="number"
            value={precoAlvoInput}
            onChange={(e) => setPrecoAlvo(e.target.value)}
            placeholder="Preço-alvo (opcional)"
            step="0.01"
            min="0"
            className="w-40 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || !tickerInput.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.12] text-sm font-bold text-white hover:bg-white/[0.12] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {adding
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Plus className="w-4 h-4" />}
            {adding ? 'Buscando…' : 'Adicionar'}
          </button>
        </div>
        {addError && (
          <p className="text-[11px] text-rose-400">{addError}</p>
        )}
        <p className="text-[10px] text-zinc-600">
          A análise Graham/Bazin/RSI é buscada automaticamente ao adicionar.
        </p>
      </div>

      {/* Lista */}
      {items.length === 0 ? (
        <div className="bg-si-card border border-si-border rounded-2xl p-8 text-center space-y-3">
          <Eye className="w-8 h-8 text-zinc-700 mx-auto" />
          <p className="text-sm font-bold text-zinc-400">Nenhum ativo na watchlist</p>
          <p className="text-xs text-zinc-600 max-w-xs mx-auto">
            Adicione ativos que você está monitorando. A análise Graham/Bazin e RSI será calculada automaticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onRemove={removeItem}
              onRefresh={refreshItem}
              onAlert={(ticker, nome) => setAlertModal({ ticker, nome })}
              onRaioX={handleRaioX}
            />
          ))}
        </div>
      )}

      {/* Modal de alerta */}
      {alertModal && (
        <PriceAlertModal
          ticker={alertModal.ticker}
          nome={alertModal.nome}
          onClose={() => setAlertModal(null)}
        />
      )}
    </div>
  );
}
