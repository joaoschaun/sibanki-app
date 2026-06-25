/**
 * OpenFinanceInvestSync — Widget de sincronização de investimentos via Open Finance.
 *
 * ESTADO ATUAL: "coming soon" — Pluggy suporta contas INVESTMENT mas requer
 *   ativação adicional pelo suporte para o app_id do Sibanki.
 *
 * Quando ativado:
 *   1. Lista posições em openFinanceInvestments[] do usuário.
 *   2. Botão "Sincronizar" chama pluggySyncInvestments CF.
 *   3. CF popula users/{uid}.openFinanceInvestments[] + .openFinanceInvestmentsSyncedAt.
 *   4. Widget exibe posições importadas + opção de mesclar com investimento manual.
 *
 * Firestore path:
 *   users/{uid}.openFinanceInvestments[]
 *   users/{uid}.openFinanceInvestmentsSyncedAt
 *
 * CF (stub): pluggySyncInvestments (southamerica-east1)
 *   Endpoint Pluggy: GET /accounts?type=INVESTMENT&itemId={itemId}
 *                    GET /investments?accountId={accountId}
 *
 * Exibido em: Growth.tsx — aba "Open Finance" (sub-seção de investimentos).
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { fnsBR } from '../../firebase';
import {
  Link2, RefreshCw, Loader2, CheckCircle2, AlertTriangle,
  TrendingUp, Clock, ExternalLink,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import type { OpenFinanceInvestment } from '../../types/userData';

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function OpenFinanceInvestSync() {
  const navigate = useNavigate();
  const { user, data, hasOpenFinance } = useAppContext();

  const investments: OpenFinanceInvestment[] = data?.openFinanceInvestments ?? [];
  const syncedAt = data?.openFinanceInvestmentsSyncedAt;

  const [syncing, setSyncing]   = useState(false);
  const [syncMsg, setSyncMsg]   = useState('');
  const [syncError, setSyncError] = useState('');

  // Totais
  const total = investments.reduce((s, i) => s + i.valorAtual, 0);
  const pnl   = investments.reduce((s, i) => s + (i.pnl ?? 0), 0);

  const handleSync = async () => {
    if (!user?.uid) return;
    setSyncing(true);
    setSyncMsg('');
    setSyncError('');
    try {
      const fn  = httpsCallable<{ uid: string }, any>(fnsBR, 'pluggySyncInvestments');
      const { data: result } = await fn({ uid: user.uid });
      setSyncMsg(
        result?.count
          ? `${result.count} posições importadas.`
          : 'Nenhuma posição encontrada. Verifique se sua corretora suporta Open Finance.',
      );
    } catch (e: any) {
      // CF ainda em stub — erro esperado até ativação Pluggy
      if (e?.code === 'functions/not-found' || e?.code === 'functions/unimplemented') {
        setSyncError('Sincronização de investimentos via Open Finance ainda não está ativa. Em breve!');
      } else {
        setSyncError(`Erro: ${e?.message ?? 'Tente novamente.'}`);
      }
    } finally {
      setSyncing(false);
    }
  };

  // ── Se não tem Open Finance conectado ──
  if (!hasOpenFinance) {
    return (
      <div className="bg-si-card border border-si-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <Link2 className="w-4 h-4 text-zinc-500" />
          <p className="text-sm font-bold text-zinc-300">Investimentos via Open Finance</p>
        </div>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Conecte sua corretora via Open Finance para importar automaticamente suas posições de ações, FIIs, ETFs e renda fixa.
        </p>
        <button
          type="button"
          onClick={() => navigate('/configuracoes#open-finance')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm font-bold text-zinc-300 hover:bg-white/[0.09] transition-colors"
        >
          <Link2 className="w-3.5 h-3.5" /> Conectar Open Finance
          <ExternalLink className="w-3 h-3 text-zinc-600 ml-auto" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-si-card border border-si-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <Link2 className="w-4 h-4 text-blue-400" />
          <div>
            <p className="text-sm font-bold text-zinc-200">Investimentos Open Finance</p>
            {syncedAt && (
              <p className="text-[11px] text-zinc-600 flex items-center gap-1 mt-0.5">
                <Clock className="w-2.5 h-2.5" />
                Última sync: {fmtDate(syncedAt)}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[11px] font-bold text-zinc-300 hover:bg-white/[0.09] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {syncing
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <RefreshCw className="w-3.5 h-3.5" />}
          {syncing ? 'Sincronizando…' : 'Sincronizar'}
        </button>
      </div>

      {/* Status messages */}
      {syncMsg && (
        <div className="flex items-center gap-2 px-5 py-3 bg-emerald-500/5 border-b border-emerald-500/10">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-300">{syncMsg}</p>
        </div>
      )}
      {syncError && (
        <div className="flex items-start gap-2 px-5 py-3 bg-amber-500/5 border-b border-amber-500/10">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300 leading-relaxed">{syncError}</p>
        </div>
      )}

      {/* Coming soon banner — enquanto Pluggy não ativa investment accounts */}
      {investments.length === 0 && !syncMsg && (
        <div className="px-5 py-6 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto">
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-300">Em breve</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto leading-relaxed">
              Importação automática de posições de ações, FIIs e renda fixa das corretoras conectadas via Open Finance.
            </p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 text-left space-y-1.5">
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">O que será importado</p>
            {['Ações e FIIs (custodiados na B3)', 'ETFs e fundos de investimento', 'Renda fixa (CDB, LCI, LCA, Tesouro)', 'Cripto (quando disponível pela corretora)'].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-zinc-600" />
                <p className="text-[11px] text-zinc-500">{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de posições quando disponível */}
      {investments.length > 0 && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 divide-x divide-white/[0.06]">
            <div className="px-5 py-3">
              <p className="text-[11px] text-zinc-500 uppercase tracking-widest">Total importado</p>
              <p className="text-lg font-bold text-white mt-0.5">{fmtBRL(total)}</p>
            </div>
            <div className="px-5 py-3">
              <p className="text-[11px] text-zinc-500 uppercase tracking-widest">P&L</p>
              <p className={`text-lg font-bold mt-0.5 ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {pnl >= 0 ? '+' : ''}{fmtBRL(pnl)}
              </p>
            </div>
          </div>

          {/* Posições */}
          <div className="divide-y divide-white/[0.04]">
            {investments.map((inv) => (
              <div key={inv.pluggyId} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-zinc-200 truncate">{inv.nome}</p>
                  <p className="text-[11px] text-zinc-500">{inv.institutionName} · {inv.tipo}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-zinc-200">{fmtBRL(inv.valorAtual)}</p>
                  {inv.pnlPct != null && (
                    <p className={`text-[11px] font-bold ${inv.pnlPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {inv.pnlPct >= 0 ? '+' : ''}{inv.pnlPct.toFixed(1)}%
                    </p>
                  )}
                </div>
                {inv.mergedIntoManual && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                )}
              </div>
            ))}
          </div>

          <div className="px-5 py-3 border-t border-white/[0.06]">
            <p className="text-[11px] text-zinc-600">
              {investments.length} posições importadas · Sincronizado {fmtDate(syncedAt)}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
