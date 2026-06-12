/**
 * Cripto.tsx — Módulo de Cripto Exchange do Sibanki
 *
 * Ação 16 (29/03/2026): Dados ao vivo via CoinGecko API (gratuita, sem key).
 * Fetch inicial + refresh a cada 60 s para respeitar o rate limit free tier.
 * Fase 2: substituir por dados reais Parfin/Liqi com preços BRL nativos.
 */
import { useState, useEffect, useCallback } from 'react';
import { ComingSoonOverlay } from '../components/ui/ComingSoonBadge';
import {
  Bitcoin, TrendingUp, TrendingDown, RefreshCw, Wallet,
  ArrowRightLeft, Layers, Globe, ChevronRight, Shield, BarChart2,
  Wifi, WifiOff, Loader2,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

// ── CoinGecko API (gratuita, sem autenticação) ────────────────────────────────
// Rate limit free tier: ~10–30 req/min. Fetch a cada 60 s.
const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/coins/markets' +
  '?vs_currency=brl&order=market_cap_desc&per_page=20&page=1' +
  '&ids=bitcoin,ethereum,solana,binancecoin,matic-network,tether,usd-coin,polkadot' +
  '&sparkline=false&price_change_percentage=24h';

type AssetCategory = 'Layer1' | 'Layer2' | 'Stablecoin' | 'DeFi';

type Asset = {
  id: string;
  symbol: string;
  name: string;
  price: number;       // BRL ao vivo
  change24h: number;   // %
  volume24h: number;   // BRL
  imageUrl: string;    // URL da logo oficial CoinGecko
  category: AssetCategory;
  marketCap?: number;
};

// Mapeamento coingecko_id → categoria visual
const CATEGORY_MAP: Record<string, AssetCategory> = {
  bitcoin:         'Layer1',
  ethereum:        'Layer1',
  solana:          'Layer1',
  binancecoin:     'Layer1',
  'matic-network': 'Layer2',
  tether:          'Stablecoin',
  'usd-coin':      'Stablecoin',
  polkadot:        'Layer1',
};

const fmtBRL = (v: number | null | undefined) => {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return 'R$ —';
  return n >= 1_000
    ? `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
};

const CATEGORY_COLOR: Record<string, string> = {
  Layer1:     'bg-blue-500/10 text-blue-400',
  Layer2:     'bg-purple-500/10 text-purple-400',
  Stablecoin: 'bg-green-500/10 text-green-400',
  DeFi:       'bg-orange-500/10 text-orange-400',
};

const TABS = ['Mercado', 'Carteira', 'Trade', 'Staking', 'RWA'] as const;
type Tab = typeof TABS[number];

const ROADMAP = [
  { phase: 'Fase 1', label: 'White-label',  desc: 'Exchange parceira (Parfin / Liqi / HubChain) integrada via SDK', status: 'current' },
  { phase: 'Fase 2', label: 'VASP próprio', desc: 'Registro no Banco Central, carteira custodial Sibanki',           status: 'next'    },
  { phase: 'Fase 3', label: 'Self-custody', desc: 'Self-custody + bridge SibCoin → Polygon ERC-20',                  status: 'future'  },
];

// Portfólio demo — substituir por dados reais do Firestore na Fase 2
const DEMO_PORTFOLIO = [
  { symbol: 'BTC',  qty: 0.00234, avgPrice: 298_000 },
  { symbol: 'ETH',  qty: 0.15,    avgPrice: 16_800  },
  { symbol: 'SOL',  qty: 2.5,     avgPrice: 680      },
  { symbol: 'USDT', qty: 150,     avgPrice: 5.60     },
];

// Fallback textual se a imagem da CoinGecko falhar
const FALLBACK_LOGO: Record<string, string> = {
  BTC: '₿', ETH: 'Ξ', SOL: '◎', BNB: 'B',
  MATIC: '⬡', USDT: '₮', USDC: '$', DOT: '●',
};

// ── Sub-componente: logo com fallback ────────────────────────────────────────
function CryptoLogo({ imageUrl, symbol, size = 'md' }: {
  imageUrl: string; symbol: string; size?: 'sm' | 'md';
}) {
  const [imgError, setImgError] = useState(false);
  const cls = size === 'sm' ? 'w-9 h-9 text-base' : 'w-10 h-10 text-lg';
  return (
    <div className={`${cls} rounded-xl bg-si-zinc-8 flex items-center justify-center shrink-0 overflow-hidden`}>
      {!imgError && imageUrl ? (
        <img src={imageUrl} alt={symbol}
          className="w-6 h-6 object-contain"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="font-bold text-si-3">{FALLBACK_LOGO[symbol] ?? symbol[0]}</span>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Cripto() {
  const { data } = useAppContext();
  const [activeTab,  setActiveTab]  = useState<Tab>('Mercado');
  const [assets,     setAssets]     = useState<Asset[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [spinning,   setSpinning]   = useState(false);
  const [apiError,   setApiError]   = useState(false);
  const [loading,    setLoading]    = useState(true);

  // Ação 16: fetch de preços ao vivo em BRL via CoinGecko (sem key)
  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch(COINGECKO_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw: any[] = await res.json();
      setAssets(raw.map((c) => ({
        id:        c.id,
        symbol:    (c.symbol as string).toUpperCase(),
        name:      c.name,
        price:     Number(c.current_price ?? 0) || 0,
        change24h: Number(c.price_change_percentage_24h ?? 0) || 0,
        volume24h: Number(c.total_volume ?? 0) || 0,
        imageUrl:  typeof c.image === 'string' ? c.image : '',
        category:  CATEGORY_MAP[c.id] ?? 'Layer1',
        marketCap: c.market_cap != null ? Number(c.market_cap) : undefined,
      })));
      setLastUpdate(new Date());
      setApiError(false);
    } catch {
      setApiError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const id = setInterval(fetchPrices, 60_000); // 60 s — respeita rate limit free
    return () => clearInterval(id);
  }, [fetchPrices]);

  const handleRefresh = useCallback(() => {
    setSpinning(true);
    fetchPrices().finally(() => setTimeout(() => setSpinning(false), 600));
  }, [fetchPrices]);

  // Cálculos do portfólio com preços ao vivo
  const portfolioValue = DEMO_PORTFOLIO.reduce((s, h) => {
    const a = assets.find((x) => x.symbol === h.symbol);
    return s + (a ? a.price * h.qty : 0);
  }, 0);
  const portfolioCost   = DEMO_PORTFOLIO.reduce((s, h) => s + h.avgPrice * h.qty, 0);
  const portfolioPnL    = portfolioValue - portfolioCost;
  const portfolioPnLPct = portfolioCost > 0 ? (portfolioPnL / portfolioCost) * 100 : 0;

  const isExchangeConnected = data?.openFinanceStatus === 'ativo';

  return (
    <div className="space-y-6">

      {/* Header Simplificado para Integração */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-si-border">
        <div>
          <h3 className="font-semibold text-si-1 text-base flex items-center gap-2">
            <Bitcoin className="w-5 h-5 text-orange-400" /> Exchange de Criptoativos
          </h3>
          <p className="text-si-5 text-xs">Cotações ao vivo via CoinGecko API</p>
        </div>
        <button onClick={handleRefresh}
          className="flex items-center gap-1.5 text-si-4 hover:text-si-2 text-xs transition-colors bg-si-over-2 hover:bg-si-over-3 border border-si-border px-3 py-1.5 rounded-xl font-semibold uppercase tracking-wider text-[11px]"
        >
          {loading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <RefreshCw className={`w-3.5 h-3.5 ${spinning ? 'animate-spin' : ''}`} />
          }
          <span className="font-mono text-zinc-400">
            {lastUpdate
              ? lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : '—'}
          </span>
        </button>
      </div>

      {/* Banner de status da API */}
      {!loading && (
        apiError ? (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <WifiOff className="w-5 h-5 text-rose-400 shrink-0" />
            <p className="text-rose-300 text-sm">
              Falha ao carregar preços ao vivo — verifique conexão e clique em atualizar
            </p>
          </div>
        ) : !isExchangeConnected ? (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <Wifi className="w-5 h-5 text-blue-400 shrink-0" />
            <p className="text-blue-300 text-sm">
              Cotações ao vivo em BRL via CoinGecko ·
              Carteira real disponível após conectar exchange parceira (Parfin/Liqi)
            </p>
          </div>
        ) : null
      )}

      {/* Tab bar */}
      <div className="flex gap-1 bg-si-card rounded-xl p-1 border border-si-border">
        {TABS.map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === t ? 'bg-white text-zinc-900 shadow' : 'text-si-5 hover:text-si-3'
            }`}
          >{t}</button>
        ))}
      </div>

      {/* ── MERCADO ── */}
      {activeTab === 'Mercado' && (
        <div className="bg-si-card rounded-2xl border border-si-border overflow-hidden">
          <div className="px-6 py-4 border-b border-si-border flex items-center justify-between">
            <span className="text-sm font-semibold text-si-3">Ativos disponíveis</span>
            <span className="text-xs text-si-5">
              {loading ? 'Carregando…' : `${assets.length} pares BRL · ao vivo`}
            </span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {assets.map((a) => (
                <div key={a.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-si-over-1 transition-colors group"
                >
                  <CryptoLogo imageUrl={a.imageUrl} symbol={a.symbol} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-si-1">{a.symbol}</span>
                      <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${CATEGORY_COLOR[a.category]}`}>
                        {a.category}
                      </span>
                    </div>
                    <span className="text-xs text-si-5">{a.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-si-1 tabular-nums">{fmtBRL(a.price)}</p>
                    <p className={`text-xs font-medium flex items-center justify-end gap-0.5 tabular-nums ${
                      a.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {a.change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {a.change24h >= 0 ? '+' : ''}{a.change24h.toFixed(2)}%
                    </p>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 px-3 py-1.5 rounded-lg bg-si-over-2 text-si-2 text-xs font-semibold hover:bg-si-over-3">
                    Comprar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CARTEIRA ── */}
      {activeTab === 'Carteira' && (
        <div className="space-y-4 relative">
          <ComingSoonOverlay />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Valor total', value: fmtBRL(portfolioValue),   cls: 'text-si-1' },
              { label: 'P&L total',   value: (portfolioPnL >= 0 ? '+' : '') + fmtBRL(portfolioPnL), cls: portfolioPnL >= 0 ? 'text-emerald-400' : 'text-rose-400' },
              { label: 'Retorno',     value: (portfolioPnLPct >= 0 ? '+' : '') + portfolioPnLPct.toFixed(2) + '%', cls: portfolioPnLPct >= 0 ? 'text-emerald-400' : 'text-rose-400' },
            ].map((s) => (
              <div key={s.label} className="bg-si-card rounded-2xl border border-si-border p-5">
                <p className="text-xs text-si-5 mb-1">{s.label}</p>
                <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-si-card rounded-2xl border border-si-border overflow-hidden">
            <div className="px-6 py-4 border-b border-si-border flex items-center gap-2">
              <span className="text-sm font-semibold text-si-3">Posições abertas</span>
              <span className="text-xs text-si-5">(dados demo)</span>
            </div>
            {DEMO_PORTFOLIO.map((h) => {
              const a = assets.find((x) => x.symbol === h.symbol);
              if (!a) return null;
              const value = a.price * h.qty;
              const pnl   = (a.price - h.avgPrice) * h.qty;
              const pct   = ((a.price - h.avgPrice) / h.avgPrice) * 100;
              return (
                <div key={h.symbol} className="flex items-center gap-4 px-6 py-4 border-b border-si-border last:border-0">
                  <CryptoLogo imageUrl={a.imageUrl} symbol={a.symbol} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-si-1">{a.symbol}</p>
                    <p className="text-xs text-si-5">{h.qty.toLocaleString('pt-BR', { maximumFractionDigits: 6 })} unid · PM {fmtBRL(h.avgPrice)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-si-1 tabular-nums">{fmtBRL(value)}</p>
                    <p className={`text-xs font-medium tabular-nums ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {pnl >= 0 ? '+' : ''}{fmtBRL(pnl)} ({pct >= 0 ? '+' : ''}{pct.toFixed(2)}%)
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bg-si-card rounded-2xl border border-si-border p-5 flex items-center gap-4">
            <Wallet className="w-8 h-8 text-blue-400 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-si-2">Conectar carteira</p>
              <p className="text-xs text-si-5">Importe posições de exchanges externas via Open Finance</p>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-600" />
          </div>
        </div>
      )}

      {/* ── TRADE ── */}
      {activeTab === 'Trade' && (
        <div className="bg-si-card rounded-2xl border border-si-border p-6 relative">
          <ComingSoonOverlay />
          <h3 className="font-semibold text-si-1 flex items-center gap-2 mb-4">
            <ArrowRightLeft className="w-5 h-5 text-blue-400" />
            Order Book Simplificado
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-si-5 mb-2 uppercase tracking-wide">Compra (BID)</p>
              {(assets[0] && Number.isFinite(Number(assets[0].price))
                ? [0,1,2,3,4].map((i) => Number(assets[0].price) - (i + 1) * 20)
                : [348_480, 348_450, 348_420, 348_390, 348_360]
              ).map((p, i) => (
                <div key={i} className="flex justify-between text-sm py-1">
                  <span className="text-emerald-400 tabular-nums">{Math.round(p).toLocaleString('pt-BR')}</span>
                  <span className="text-si-5 tabular-nums">{(0.01 + Math.random() * 0.05).toFixed(4)}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs text-si-5 mb-2 uppercase tracking-wide">Venda (ASK)</p>
              {(assets[0] && Number.isFinite(Number(assets[0].price))
                ? [0,1,2,3,4].map((i) => Number(assets[0].price) + (i + 1) * 20)
                : [348_520, 348_550, 348_580, 348_610, 348_640]
              ).map((p, i) => (
                <div key={i} className="flex justify-between text-sm py-1">
                  <span className="text-rose-400 tabular-nums">{Math.round(p).toLocaleString('pt-BR')}</span>
                  <span className="text-si-5 tabular-nums">{(0.01 + Math.random() * 0.05).toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-si-border grid grid-cols-2 gap-3">
            <button className="py-3 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-bold text-sm hover:bg-emerald-600/30 transition-colors">
              Comprar BTC
            </button>
            <button className="py-3 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-400 font-bold text-sm hover:bg-rose-600/30 transition-colors">
              Vender BTC
            </button>
          </div>
          <p className="text-center text-xs text-zinc-600 mt-3">Disponível após integração Parfin/Liqi — Fase 2</p>
        </div>
      )}

      {/* ── STAKING ── */}
      {activeTab === 'Staking' && (
        <div className="space-y-4 relative">
          <ComingSoonOverlay />
          {[
            { coin: 'ETH',   apy: '4.2%', minimo: '0.01 ETH',  lock: '7 dias',   symbol: 'ETH'   },
            { coin: 'SOL',   apy: '6.8%', minimo: '0.1 SOL',   lock: '1 dia',    symbol: 'SOL'   },
            { coin: 'MATIC', apy: '8.5%', minimo: '10 MATIC',  lock: 'Flexível', symbol: 'MATIC' },
            { coin: 'DOT',   apy: '12%',  minimo: '5 DOT',     lock: '28 dias',  symbol: 'DOT'   },
          ].map((s) => {
            const a = assets.find((x) => x.symbol === s.symbol);
            return (
              <div key={s.coin} className="bg-si-card rounded-2xl border border-si-border p-5 flex items-center gap-4">
                {a ? <CryptoLogo imageUrl={a.imageUrl} symbol={s.symbol} /> : (
                  <div className="w-10 h-10 rounded-xl bg-si-zinc-8 flex items-center justify-center shrink-0">
                    <span className="font-bold text-si-3 text-sm">{s.coin[0]}</span>
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-si-1">{s.coin} Staking</span>
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">{s.apy} APY</span>
                  </div>
                  <p className="text-xs text-si-5 mt-0.5">Mínimo {s.minimo} · Lock {s.lock}</p>
                </div>
                <button className="px-4 py-2 rounded-xl bg-si-over-2 text-si-2 text-sm font-semibold hover:bg-si-over-3 transition-colors">
                  Fazer stake
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── RWA ── */}
      {activeTab === 'RWA' && (
        <div className="bg-si-card rounded-2xl border border-si-border p-6 relative">
          <ComingSoonOverlay />
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-6 h-6 text-blue-400" />
            <h3 className="font-semibold text-si-1">Real World Assets (RWA)</h3>
          </div>
          <p className="text-si-5 text-sm mb-5">
            Tokenização de ativos reais — imóveis, recebíveis e títulos — acessíveis via blockchain.
          </p>
          {[
            { name: 'Fundo Imobiliário Tokenizado', ticker: 'RBIM11', yield: '11.2% a.a.', type: 'Imóvel',  min: 'R$ 100'   },
            { name: 'Precatório Federal Tokenizado', ticker: 'PREC3',  yield: 'IPCA + 6%',  type: 'Título',  min: 'R$ 500'   },
            { name: 'Recebível Agro Tokenizado',     ticker: 'CRART1', yield: 'CDI + 3%',   type: 'Crédito', min: 'R$ 1.000' },
          ].map((r) => (
            <div key={r.ticker} className="flex items-center gap-4 py-4 border-t border-si-border first:border-0">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-si-2 text-sm">{r.name}</p>
                <p className="text-xs text-si-5">{r.ticker} · {r.type} · Mínimo {r.min}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-400">{r.yield}</p>
                <button className="text-xs text-blue-400 hover:underline mt-0.5">Ver detalhes</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Roadmap (visível em todas as abas) */}
      <div className="bg-si-card rounded-2xl border border-si-border p-6">
        <h3 className="font-semibold text-si-1 flex items-center gap-2 mb-4">
          <BarChart2 className="w-5 h-5 text-blue-400" />
          Roadmap de Independência
        </h3>
        <div className="space-y-3">
          {ROADMAP.map((r) => (
            <div key={r.phase} className={`flex items-start gap-4 p-4 rounded-xl border ${
              r.status === 'current' ? 'bg-blue-500/5 border-blue-500/20'
              : r.status === 'next'  ? 'bg-si-over-1 border-si-border'
              :                        'bg-white/[0.01] border-si-border opacity-60'
            }`}>
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                r.status === 'current' ? 'bg-blue-400' : r.status === 'next' ? 'bg-zinc-400' : 'bg-zinc-600'
              }`} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-si-5">{r.phase}</span>
                  <span className={`text-sm font-semibold ${r.status === 'current' ? 'text-blue-400' : 'text-si-3'}`}>
                    {r.label}
                    {r.status === 'current' && (
                      <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">atual</span>
                    )}
                  </span>
                </div>
                <p className="text-xs text-si-5 mt-0.5">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security badges */}
      <div className="flex gap-3 flex-wrap">
        {['Custódia segregada', 'Seguro FDIC equivalente', 'Auditoria anual', 'Registro BCB (Fase 2)'].map((b) => (
          <span key={b} className="flex items-center gap-1.5 text-xs text-si-5 bg-si-card border border-si-border px-3 py-1.5 rounded-full">
            <Shield className="w-3.5 h-3.5 text-zinc-600" /> {b}
          </span>
        ))}
      </div>

    </div>
  );
}
