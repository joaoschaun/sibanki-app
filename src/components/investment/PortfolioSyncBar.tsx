/**
 * PortfolioSyncBar — barra de sincronização de cotações com progresso.
 * Mostra botão "Atualizar cotações", progresso e último sync.
 */
import { RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import type { PortfolioSyncState } from '../../hooks/usePortfolioSync';

interface Props {
  sync: PortfolioSyncState;
  uid: string;
  investments: import('../../types/userData').Investment[];
  b3Count: number;
}

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

export function PortfolioSyncBar({ sync, uid, investments, b3Count }: Props) {
  const { syncing, progress, syncedAt, lastError, updatedCount, syncPortfolio } = sync;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-si-card border border-si-border flex-wrap">
      {/* Status */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {lastError ? (
          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        ) : syncedAt ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        ) : (
          <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
        )}
        <span className="text-[11px] text-zinc-400 truncate">
          {lastError
            ? <span className="text-rose-400">{lastError}</span>
            : syncedAt
              ? <><span className="text-emerald-400 font-semibold">{updatedCount > 0 ? `${updatedCount} ativos atualizados` : 'Cotações sincronizadas'}</span> · {relativeTime(syncedAt)}</>
              : <span className="text-zinc-500">Cotações não sincronizadas — preços podem estar desatualizados</span>
          }
        </span>
      </div>

      {/* Barra de progresso */}
      {syncing && progress > 0 && (
        <div className="flex-1 min-w-[120px] h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Botão */}
      <button
        type="button"
        onClick={() => syncPortfolio(uid, investments)}
        disabled={syncing || b3Count === 0}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-si-over-2 hover:bg-si-over-3 border border-si-border text-[11px] font-bold uppercase tracking-wider text-si-2 disabled:opacity-40 transition-all shrink-0"
      >
        <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? `${progress}%` : `Atualizar cotações${b3Count > 0 ? ` (${b3Count})` : ''}`}
      </button>
    </div>
  );
}
