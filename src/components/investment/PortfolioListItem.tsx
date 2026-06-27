/**
 * PortfolioListItem — linha expandível de investimento com mini gráfico inline.
 *
 * Estado normal: nome, tipo, valor aplicado, valor atual, P&L, DY.
 * Estado expandido: PriceChart (120px), métricas detalhadas, ações.
 */
import { useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Trash2, TrendingUp, TrendingDown, Bell } from 'lucide-react';
import { PriceChart } from '../charts/PriceChart';
import { usePriceAlerts } from '../../hooks/usePriceAlerts';
import type { Investment } from '../../types/userData';

interface Props {
  investment: Investment;
  onEdit: (inv: Investment) => void;
  onDelete: (id: number) => void;
  /** Callback para abrir o modal de alerta de preço. */
  onAlert?: (ticker: string, nome?: string, currentPrice?: number) => void;
}

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

const RV_TYPES = ['ações', 'fiis', 'etf', 'etfs', 'fii', 'ação', 'acao', 'renda variável'];

function isB3(inv: Investment) {
  return RV_TYPES.some((t) => (inv.tipo || '').toLowerCase().includes(t));
}

function extractTicker(nome: string): string {
  return nome.trim().split(/\s/)[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function PortfolioListItem({ investment: inv, onEdit, onDelete, onAlert }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { alertsForTicker } = usePriceAlerts();

  const aplicado = inv.valor ?? 0;
  const atual    = inv.atual ?? inv.valor ?? 0;
  const pnl      = atual - aplicado;
  const pnlPct   = aplicado > 0 ? (pnl / aplicado) * 100 : 0;
  const isRV     = isB3(inv);
  const ticker   = isRV ? extractTicker(inv.nome) : null;
  const hasAlerts = ticker ? alertsForTicker(ticker).length > 0 : false;
  const dy       = (inv as any).dy as number | undefined;
  const qtd      = inv.qtd ?? 0;

  const pnlColor = pnl > 0 ? 'text-emerald-400' : pnl < 0 ? 'text-rose-400' : 'text-zinc-400';
  const PnlIcon  = pnl > 0 ? TrendingUp : TrendingDown;

  return (
    <div className="border border-si-border rounded-xl overflow-hidden transition-all">
      {/* ── Linha principal ── */}
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-si-over-1 transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Dot colorido por tipo */}
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: inv.tipo === 'Ações' ? '#60a5fa'
            : inv.tipo === 'FIIs' ? '#34d399'
            : inv.tipo === 'ETFs' ? '#a78bfa'
            : inv.tipo === 'Renda Fixa' ? '#fbbf24'
            : inv.tipo === 'Criptoativos' ? '#f97316'
            : '#6b7280' }}
        />

        {/* Nome + tipo */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-si-1 truncate">{inv.nome}</p>
          <p className="text-[11px] text-zinc-500">{inv.tipo}{qtd > 0 ? ` · ${qtd} cotas` : ''}</p>
        </div>

        {/* Valor atual */}
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-si-1">{fmtBRL(atual)}</p>
          <p className={`text-[11px] font-bold flex items-center gap-0.5 justify-end ${pnlColor}`}>
            <PnlIcon className="w-2.5 h-2.5" />
            {pnl > 0 ? '+' : ''}{fmtBRL(pnl)} ({pnlPct > 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
          </p>
        </div>

        {/* Expand icon */}
        <span className="text-zinc-600 shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {/* ── Detalhes expandidos ── */}
      {expanded && (
        <div className="border-t border-si-border bg-si-bg/40 px-4 pb-4 pt-3 space-y-3">
          {/* Mini gráfico para ativos B3 */}
          {ticker && (
            <div className="rounded-lg overflow-hidden border border-si-border">
              <div className="px-3 pt-2 pb-1 flex items-center justify-between">
                <span className="text-[11px] text-zinc-500 uppercase tracking-widest">{ticker} · 90 dias</span>
              </div>
              <PriceChart ticker={ticker} height={150} />
            </div>
          )}

          {/* Métricas detalhadas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-0.5">Aplicado</p>
              <p className="font-bold text-zinc-300">{fmtBRL(aplicado)}</p>
            </div>
            <div>
              <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-0.5">Valor atual</p>
              <p className="font-bold text-si-1">{fmtBRL(atual)}</p>
            </div>
            {inv.precoCompra != null && (
              <div>
                <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-0.5">Preço médio</p>
                <p className="font-bold text-zinc-300">{fmtBRL(inv.precoCompra)}</p>
              </div>
            )}
            {dy != null && dy > 0 && (
              <div>
                <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-0.5">DY real</p>
                <p className="font-bold text-emerald-400">{dy.toFixed(2)}% a.a.</p>
              </div>
            )}
            {inv.indexer && inv.indexerValue != null && (
              <div>
                <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-0.5">Rentabilidade</p>
                <p className="font-bold text-amber-400">
                  {inv.indexer === 'pre' ? `${inv.indexerValue}% a.a.` :
                   inv.indexer === 'cdi' ? `${inv.indexerValue}% CDI` :
                   inv.indexer === 'ipca' ? `IPCA + ${inv.indexerValue}%` :
                   `${inv.indexerValue}% a.m.`}
                </p>
              </div>
            )}
            {!inv.indexer && inv.taxaAnual != null && (
              <div>
                <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-0.5">Rentabilidade</p>
                <p className="font-bold text-amber-400">{inv.taxaAnual.toFixed(2)}% a.a.</p>
              </div>
            )}
            {Number(inv.proventosMensais) > 0 && (
              <div>
                <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-0.5">Renda/mês</p>
                <p className="font-bold text-emerald-400">{fmtBRL(Number(inv.proventosMensais))}</p>
              </div>
            )}
            {inv.conta && (
              <div>
                <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-0.5">Conta</p>
                <p className="font-bold text-zinc-400 truncate">{inv.conta}</p>
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(inv); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-si-over-2 hover:bg-si-over-3 border border-si-border text-[11px] font-bold text-zinc-300 transition-colors"
            >
              <Pencil className="w-3 h-3" /> Atualizar valor
            </button>
            {ticker && onAlert && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onAlert(ticker, inv.nome, inv.atual ?? undefined); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-colors ${
                  hasAlerts
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-si-over-1 border-si-border text-zinc-400 hover:bg-si-over-2'
                }`}
              >
                <Bell className="w-3 h-3" /> {hasAlerts ? 'Alertas' : 'Criar alerta'}
              </button>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(inv.id); }}
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
