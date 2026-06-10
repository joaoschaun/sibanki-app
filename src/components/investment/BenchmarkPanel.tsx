/**
 * BenchmarkPanel — compara a rentabilidade da carteira com CDI, Selic e IBOVESPA.
 *
 * Usa dados reais: rentabilidade anualizada da carteira vs taxas do useMarketRates.
 * Solicita IBOVESPA via brapiQuote quando montado (cache 1h em localStorage).
 */
import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface Props {
  rentabAnualizadaPct: number;
  cdiAnualPct: number;
  selicAnualPct: number;
  totalAplicado: number;
  totalAtual: number;
}

const IBOV_CACHE_KEY  = 'sib_ibov_pct';
const IBOV_CACHE_TIME = 'sib_ibov_pct_at';
const IBOV_TTL_MS     = 60 * 60 * 1000; // 1h

interface Bar {
  label: string;
  sub: string;
  pct: number;
  color: string;
  isPortfolio?: boolean;
}

function deltaIcon(delta: number) {
  if (delta > 0.5) return <TrendingUp className="w-3 h-3 text-emerald-400" />;
  if (delta < -0.5) return <TrendingDown className="w-3 h-3 text-rose-400" />;
  return <Minus className="w-3 h-3 text-zinc-500" />;
}

function deltaLabel(delta: number, vs: string) {
  const abs = Math.abs(delta).toFixed(1);
  if (delta > 0.5) return <span className="text-emerald-400">+{abs}% vs {vs}</span>;
  if (delta < -0.5) return <span className="text-rose-400">-{abs}% vs {vs}</span>;
  return <span className="text-zinc-500">≈ {vs}</span>;
}

export function BenchmarkPanel({ rentabAnualizadaPct, cdiAnualPct, selicAnualPct, totalAplicado, totalAtual }: Props) {
  const [ibovPct, setIbovPct] = useState<number | null>(null);

  useEffect(() => {
    // Cache local de 1h
    try {
      const cached = localStorage.getItem(IBOV_CACHE_KEY);
      const cachedAt = Number(localStorage.getItem(IBOV_CACHE_TIME) ?? 0);
      if (cached && Date.now() - cachedAt < IBOV_TTL_MS) {
        setIbovPct(Number(cached));
        return;
      }
    } catch { /* ok */ }

    // Busca via brapiQuote (Cloud Function)
    const fns = getFunctions(undefined, 'us-central1');
    const brapiQuote = httpsCallable<{ ticker: string }, { results?: Array<{ regularMarketChangePercent?: number }> }>(
      fns, 'brapiQuote'
    );
    brapiQuote({ ticker: '^BVSP' })
      .then((r) => {
        const pct = r.data?.results?.[0]?.regularMarketChangePercent;
        if (pct != null) {
          setIbovPct(Number(pct));
          localStorage.setItem(IBOV_CACHE_KEY, String(pct));
          localStorage.setItem(IBOV_CACHE_TIME, String(Date.now()));
        }
      })
      .catch(() => { /* sem IBOVESPA — não quebra */ });
  }, []);

  const ganhoAbsoluto = totalAtual - totalAplicado;

  // Monta barras
  const allBars: Bar[] = [
    {
      label: 'Sua carteira',
      sub: `${rentabAnualizadaPct >= 0 ? '+' : ''}${rentabAnualizadaPct.toFixed(1)}% a.a.`,
      pct: rentabAnualizadaPct,
      color: rentabAnualizadaPct >= cdiAnualPct ? '#10b981' : '#f43f5e',
      isPortfolio: true,
    },
    {
      label: 'CDI',
      sub: `${cdiAnualPct.toFixed(1)}% a.a.`,
      pct: cdiAnualPct,
      color: '#60a5fa',
    },
    {
      label: 'Selic',
      sub: `${selicAnualPct.toFixed(1)}% a.a.`,
      pct: selicAnualPct,
      color: '#a78bfa',
    },
    ...(ibovPct != null ? [{
      label: 'IBOVESPA',
      sub: `${ibovPct >= 0 ? '+' : ''}${ibovPct.toFixed(1)}% (hoje)`,
      pct: ibovPct,
      color: '#fbbf24',
    }] : []),
  ];

  const maxPct = Math.max(...allBars.map((b) => Math.abs(b.pct)), 5);

  return (
    <div className="bg-si-card border border-si-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Benchmark</h4>
          <p className="text-xs text-zinc-400 mt-0.5">Rentabilidade anualizada vs mercado</p>
        </div>
        <div className="text-right">
          <p className={`text-lg font-black ${ganhoAbsoluto >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {ganhoAbsoluto >= 0 ? '+' : ''}R$ {Math.abs(ganhoAbsoluto).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="text-[10px] text-zinc-600">P&L total</p>
        </div>
      </div>

      {/* Barras comparativas */}
      <div className="space-y-3">
        {allBars.map((bar) => {
          const widthPct = Math.min(100, (Math.abs(bar.pct) / maxPct) * 100);
          return (
            <div key={bar.label}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[11px] font-${bar.isPortfolio ? 'bold' : 'medium'} ${bar.isPortfolio ? 'text-si-1' : 'text-zinc-400'}`}>
                  {bar.label}
                </span>
                <span className="text-[11px] font-bold" style={{ color: bar.color }}>{bar.sub}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${widthPct}%`, backgroundColor: bar.color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Veredicto vs CDI */}
      <div className="pt-1 border-t border-si-border flex items-center gap-2">
        {deltaIcon(rentabAnualizadaPct - cdiAnualPct)}
        <span className="text-[11px] text-zinc-400">
          {deltaLabel(rentabAnualizadaPct - cdiAnualPct, 'CDI')}
          {ibovPct != null && (
            <span className="ml-3">{deltaLabel(rentabAnualizadaPct - ibovPct, 'IBOV')}</span>
          )}
        </span>
      </div>
    </div>
  );
}
