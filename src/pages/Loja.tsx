import { useState, useEffect, useMemo } from 'react';
import {
  Search, ShoppingBag, Coins, Star, ExternalLink,
  Gift, Trophy, Zap, CheckCircle, Loader2, RefreshCw,
  Utensils, Plane, Shirt, Monitor, Home, ShoppingCart,
  Package, ChevronRight, Info, TrendingUp, Clock, Sparkles,
} from 'lucide-react';
import { useSibcoin } from '../hooks/useSibcoin';
import { useAppContext } from '../context/AppContext';
import { updateUserDoc } from '../services/persistUserData';
import {
  fetchAffiliateStoreCatalog,
  trackAffiliateClick,
  type AffiliateCatalogOffer,
} from '../services/affiliateStore';

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Reward {
  id: string;
  title: string;
  cost: number;
  category: 'desconto' | 'voucher' | 'cashback' | 'cripto';
  desc: string;
  emoji: string;
  available: boolean;
}

// ── Constantes ────────────────────────────────────────────────────────────────
const REWARDS: Reward[] = [
  { id: 'r1', title: 'Desconto 5% Loja Sibanki', cost: 200,  category: 'desconto', desc: 'Válido em qualquer compra via Loja',      emoji: '💸', available: true  },
  { id: 'r2', title: 'Voucher R$ 20 Amazon',      cost: 500,  category: 'voucher',  desc: 'Crédito na conta Amazon afiliados',       emoji: '📦', available: true  },
  { id: 'r3', title: 'Cashback dobrado 7 dias',   cost: 300,  category: 'cashback', desc: '2× cashback em todas as lojas parceiras', emoji: '🔥', available: true  },
  { id: 'r4', title: '0.001 BTC',                  cost: 2000, category: 'cripto',   desc: 'Transferido para sua carteira Cripto',   emoji: '₿',  available: false },
  { id: 'r5', title: 'Voucher R$ 50 iFood',        cost: 800,  category: 'voucher',  desc: 'Crédito direto no app iFood',             emoji: '🍔', available: true  },
  { id: 'r6', title: 'Relatório CPF Premium',      cost: 150,  category: 'desconto', desc: 'Um relatório completo no Meu CPF',        emoji: '📋', available: true  },
];

const TIER_CONFIG: Record<string, { label: string; multiplier: number; color: string; next: string; nextAt: number }> = {
  bronze:  { label: 'Bronze',  multiplier: 1,   color: 'text-amber-700',  next: 'Prata',   nextAt: 500   },
  silver:  { label: 'Prata',   multiplier: 1.5, color: 'text-zinc-400',   next: 'Ouro',    nextAt: 1500  },
  gold:    { label: 'Ouro',    multiplier: 2,   color: 'text-amber-400',  next: 'Platina', nextAt: 5000  },
  diamond: { label: 'Diamante',multiplier: 3,   color: 'text-cyan-400',   next: '',        nextAt: 99999 },
};

const CAT_ICONS: Record<string, React.ReactNode> = {
  'Alimentação': <Utensils className="w-3.5 h-3.5" />,
  'Alimentacao': <Utensils className="w-3.5 h-3.5" />,
  'Viagens':     <Plane    className="w-3.5 h-3.5" />,
  'Viagem':      <Plane    className="w-3.5 h-3.5" />,
  'Moda':        <Shirt    className="w-3.5 h-3.5" />,
  'Eletronicos': <Monitor  className="w-3.5 h-3.5" />,
  'Eletrônicos': <Monitor  className="w-3.5 h-3.5" />,
  'Tecnologia':  <Monitor  className="w-3.5 h-3.5" />,
  'Casa':        <Home     className="w-3.5 h-3.5" />,
  'Geral':       <ShoppingCart className="w-3.5 h-3.5" />,
  'Varejo':      <ShoppingCart className="w-3.5 h-3.5" />,
  'Esportes':    <TrendingUp className="w-3.5 h-3.5" />,
};

const SPEND_TO_STORE_CAT: Record<string, string> = {
  'Alimentação': 'Alimentação',
  'Restaurante': 'Alimentação',
  'Viagem':      'Viagens',
  'Viagens':     'Viagens',
  'Vestuário':   'Moda',
  'Roupas':      'Moda',
  'Eletrônico':  'Eletronicos',
  'Eletrônicos': 'Eletronicos',
  'Casa':        'Casa',
  'Mercado':     'Geral',
  'Compras':     'Geral',
};

const REWARD_COLOR: Record<string, string> = {
  desconto: 'bg-emerald-500/10 text-emerald-400',
  voucher:  'bg-blue-500/10 text-blue-400',
  cashback: 'bg-amber-500/10 text-amber-400',
  cripto:   'bg-orange-500/10 text-orange-400',
};

const TABS = ['Lojas', 'Resgatar', 'Histórico'] as const;
type Tab = typeof TABS[number];

// ── Componente principal ──────────────────────────────────────────────────────
export default function Loja() {
  const { user, data, entries } = useAppContext();
  const { balance, tier } = useSibcoin();

  const tierCfg = TIER_CONFIG[tier] ?? TIER_CONFIG.bronze;
  const multiplier = tierCfg.multiplier;

  // Totais por categoria (90 dias)
  const catTotals = useMemo(() => {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const totals: Record<string, number> = {};
    for (const e of entries) {
      if (e.type !== 'despesa') continue;
      if (new Date(e.date).getTime() < cutoff) continue;
      if (!e.category) continue;
      totals[e.category] = (totals[e.category] ?? 0) + Math.abs(e.value);
    }
    return totals;
  }, [entries]);

  // Burn rate diário (para cálculo de impacto no Ld)
  const burnRateDaily = useMemo(() => {
    const totalSpend = Object.values(catTotals).reduce((a, b) => a + b, 0);
    return totalSpend / 90;
  }, [catTotals]);

  const [activeTab, setActiveTab]     = useState<Tab>('Lojas');
  const [search, setSearch]           = useState('');
  const [filterCat, setFilterCat]     = useState('Todos');
  const [offers, setOffers]           = useState<AffiliateCatalogOffer[]>([]);
  const [loading, setLoading]         = useState(true);
  const [isDemo, setIsDemo]           = useState(false);
  const [redeeming, setRedeeming]     = useState<Reward | null>(null);
  const [redeemed, setRedeemed]       = useState<string[]>([]);
  const [redeemBusy, setRedeemBusy]   = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  // Histórico do Firestore
  const sibcoinHistory = useMemo(() => {
    const hist = (data as any)?.sibcoinHistory ?? [];
    return [...hist].reverse().slice(0, 50);
  }, [data]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAffiliateStoreCatalog({ limit: 80 })
      .then((res) => {
        if (cancelled) return;
        setOffers(res.offers);
        setIsDemo(res.source === 'demo');
      })
      .catch(() => { if (!cancelled) setIsDemo(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Recomendação contextual
  const contextualRec = useMemo(() => {
    if (!catTotals || offers.length === 0) return null;
    let topCat = '', topAmt = 0;
    for (const [cat, amt] of Object.entries(catTotals)) {
      if (amt > topAmt) { topAmt = amt; topCat = cat; }
    }
    const storeCat = SPEND_TO_STORE_CAT[topCat];
    if (!storeCat || topAmt < 50) return null;
    const match = offers.find((o) => o.category === storeCat && o.cashbackPct > 0);
    if (!match) return null;
    return { topCat, topAmt, storeCat, offer: match };
  }, [catTotals, offers]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(offers.map((o) => o.category))).sort();
    return ['Todos', ...cats];
  }, [offers]);

  const filtered = useMemo(() => {
    let list = offers;
    if (filterCat !== 'Todos') list = list.filter((o) => o.category === filterCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((o) =>
        o.merchant.toLowerCase().includes(q) ||
        o.desc.toLowerCase().includes(q) ||
        o.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [offers, filterCat, search]);

  const featured = useMemo(() =>
    offers.filter((o) => o.featured || o.cashbackPct >= 5).slice(0, 6),
    [offers]
  );

  // Calcular impacto no Ld de uma compra estimada de R$200
  function ldImpact(cashbackPct: number): string | null {
    if (!burnRateDaily || burnRateDaily === 0) return null;
    const estimatedTicket = 200;
    const cashbackValue = (estimatedTicket * cashbackPct) / 100;
    const daysGained = cashbackValue / burnRateDaily;
    if (daysGained < 0.1) return null;
    return `+${daysGained.toFixed(1)} dias de liberdade`;
  }

  function openOffer(o: AffiliateCatalogOffer) {
    if (!o.targetUrl) return;
    trackAffiliateClick(o);
    window.open(o.targetUrl, '_blank', 'noopener,noreferrer');
  }

  async function confirmRedeem() {
    if (!redeeming || !user?.uid) return;
    if (balance < redeeming.cost) { setRedeemError('Saldo insuficiente.'); setRedeeming(null); return; }
    setRedeemBusy(true); setRedeemError(null);
    try {
      const txn = {
        id: `redeem_${Date.now()}`, type: 'spend' as const,
        amount: redeeming.cost, reason: `Resgate: ${redeeming.title}`,
        date: new Date().toISOString(),
      };
      await updateUserDoc(user.uid, {
        sibcoinBalance: balance - redeeming.cost,
        sibcoinSpent: (data?.sibcoinSpent ?? 0) + redeeming.cost,
        sibcoinHistory: [...((data?.sibcoinHistory ?? []) as unknown[]), txn],
      } as any);
      setRedeemed((prev) => [...prev, redeeming.id]);
      setRedeeming(null);
    } catch (err) {
      setRedeemError(err instanceof Error ? err.message : 'Erro ao processar.');
      setRedeeming(null);
    } finally { setRedeemBusy(false); }
  }

  // Progress para próximo tier
  const tierProgress = useMemo(() => {
    if (!tierCfg.next) return null;
    const tiers = [0, 500, 1500, 5000, 10000];
    const idx = ['bronze', 'silver', 'gold', 'platinum', 'diamond'].indexOf(tier);
    const from = tiers[idx] ?? 0;
    const to   = tierCfg.nextAt;
    const pct  = Math.min(100, Math.round(((balance - from) / (to - from)) * 100));
    return { pct, remaining: Math.max(0, to - balance), nextLabel: tierCfg.next };
  }, [balance, tier, tierCfg]);

  return (
    <div className="space-y-5 pb-10">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6" /> Loja
          </h2>
          <p className="text-si-5 text-xs mt-0.5 uppercase tracking-widest font-bold">
            Cashback em SibCoin · {loading ? 'Carregando…' : `${offers.length} lojas parceiras`}
          </p>
        </div>

        {/* Saldo + tier */}
        <div className="bg-si-card border border-si-border rounded-2xl px-4 py-3 min-w-[160px]">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-si-5 uppercase tracking-widest font-bold">Saldo</span>
            </div>
            <span className={`text-xs font-bold ${tierCfg.color}`}>{tierCfg.label}</span>
          </div>
          <p className="text-xl font-bold text-amber-400 leading-none">
            {balance.toLocaleString('pt-BR')} SC
          </p>
          {multiplier > 1 && (
            <p className="text-xs text-amber-400/70 mt-0.5 font-semibold">{multiplier}× cashback ativo</p>
          )}
          {tierProgress && (
            <div className="mt-2">
              <div className="h-1 bg-si-over-2 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400/60 rounded-full transition-all" style={{ width: `${tierProgress.pct}%` }} />
              </div>
              <p className="text-[10px] text-si-5 mt-1">
                {tierProgress.remaining.toLocaleString('pt-BR')} SC para {tierProgress.nextLabel}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Banner demo */}
      {isDemo && !loading && (
        <div className="flex items-center gap-3 bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3 text-sm text-amber-300">
          <Info className="w-4 h-4 shrink-0" />
          <span>Catálogo de demonstração. Afilie-se às lojas no painel Lomadee/Awin para ver ofertas reais.</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-si-card rounded-xl p-1 border border-si-border">
        {TABS.map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === t ? 'bg-si-over-3 text-si-1' : 'text-si-5 hover:text-si-3'
            }`}
          >{t}</button>
        ))}
      </div>

      {/* ══════════════════════ ABA LOJAS ══════════════════════ */}
      {activeTab === 'Lojas' && (
        <div className="space-y-5">

          {/* Recomendação contextual */}
          {contextualRec && !loading && (
            <button
              onClick={() => { setFilterCat(contextualRec.storeCat); setSearch(contextualRec.offer.merchant); }}
              className="w-full bg-si-card border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4 hover:border-emerald-500/40 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-emerald-400/70 uppercase tracking-widest font-bold">Baseado nos seus gastos</p>
                <p className="text-sm text-si-2 mt-0.5">
                  Você gasta <strong className="text-si-1">R$ {contextualRec.topAmt.toFixed(0)}/mês</strong> em {contextualRec.topCat}
                  {' '}—{' '}
                  <strong className="text-emerald-400">{contextualRec.offer.merchant} tem {(contextualRec.offer.cashbackPct * multiplier).toFixed(1)}% de cashback</strong>
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-si-5 shrink-0" />
            </button>
          )}

          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-si-5" />
            <input
              type="text"
              placeholder="Buscar loja ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-si-card border border-si-border rounded-xl pl-11 pr-4 py-3 text-sm text-si-1 placeholder:text-si-5 focus:outline-none focus:border-si-border-md transition-colors"
            />
          </div>

          {/* Filtros */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((c) => (
              <button key={c} onClick={() => { setFilterCat(c); setSearch(''); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${
                  filterCat === c
                    ? 'bg-si-1 text-si-bg'
                    : 'bg-si-card border border-si-border text-si-4 hover:text-si-2 hover:border-si-border-md'
                }`}
              >
                {CAT_ICONS[c]}
                {c}
              </button>
            ))}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-16 gap-3 text-si-5">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Carregando ofertas...</span>
            </div>
          )}

          {/* Destaques — grid 2 colunas */}
          {!loading && featured.length > 0 && filterCat === 'Todos' && !search && (
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-si-5 mb-3 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Maiores cashbacks
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {featured.map((o) => (
                  <OfferCard key={o.id} offer={o} multiplier={multiplier} onActivate={openOffer} ldImpact={ldImpact(o.cashbackPct)} />
                ))}
              </div>
            </div>
          )}

          {/* Todas as lojas */}
          {!loading && (
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-si-5 mb-3">
                {search || filterCat !== 'Todos'
                  ? `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}`
                  : `Todas as lojas · ${filtered.length}`}
              </p>

              {filtered.length === 0 ? (
                <div className="text-center py-12 text-si-5 space-y-2">
                  <ShoppingBag className="w-8 h-8 mx-auto opacity-30" />
                  <p className="text-sm">Nenhuma loja encontrada</p>
                  <button onClick={() => { setSearch(''); setFilterCat('Todos'); }}
                    className="text-xs text-emerald-400 mt-2 flex items-center gap-1 mx-auto hover:underline"
                  >
                    <RefreshCw className="w-3 h-3" /> Limpar filtros
                  </button>
                </div>
              ) : (
                <div className="bg-si-card rounded-2xl border border-si-border overflow-hidden">
                  <div className="divide-y divide-white/[0.04]">
                    {filtered.map((o) => (
                      <OfferRow key={o.id} offer={o} multiplier={multiplier} onActivate={openOffer} ldImpact={ldImpact(o.cashbackPct)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Como funciona */}
          {!loading && (
            <div className="bg-si-card rounded-2xl border border-si-border p-6 space-y-4">
              <p className="text-[10px] font-bold tracking-widest uppercase text-si-5">Como funciona</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { n: '1', icon: <ExternalLink className="w-4 h-4 text-si-4" />, label: 'Ative a oferta', sub: 'Clique em "Ativar" — você é redirecionado com link rastreado' },
                  { n: '2', icon: <ShoppingCart className="w-4 h-4 text-si-4" />, label: 'Compre normalmente', sub: 'Finalize sua compra no site da loja parceira' },
                  { n: '3', icon: <Coins className="w-4 h-4 text-amber-400" />, label: 'Receba SibCoin', sub: 'Cashback creditado em até 30 dias, multiplicado pelo seu tier' },
                ].map(({ n, icon, label, sub }) => (
                  <div key={n} className="flex gap-3 items-start">
                    <span className="w-7 h-7 rounded-full bg-si-over-2 text-si-3 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{n}</span>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">{icon}<p className="text-sm font-semibold text-si-2">{label}</p></div>
                      <p className="text-xs text-si-5">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════ ABA RESGATAR ══════════════════════ */}
      {activeTab === 'Resgatar' && (
        <div className="space-y-4">

          {/* Saldo hero */}
          <div className="bg-si-card rounded-2xl border border-si-border p-5 flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <Trophy className="w-7 h-7 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-si-5">Saldo disponível</p>
              <p className="text-3xl font-bold text-amber-400 leading-tight">
                {balance.toLocaleString('pt-BR')} <span className="text-lg">SC</span>
              </p>
              <p className="text-xs text-si-5 mt-0.5">≈ R$ {(balance * 0.01).toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-si-5 font-bold">Tier</p>
              <p className={`text-sm font-bold ${tierCfg.color}`}>{tierCfg.label}</p>
              {multiplier > 1 && <p className="text-xs text-amber-400 font-bold mt-0.5">{multiplier}× cashback</p>}
            </div>
          </div>

          {/* Grade de resgates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {REWARDS.map((r) => {
              const canAfford = balance >= r.cost;
              const isRedeemed = redeemed.includes(r.id);
              return (
                <div key={r.id} className={`bg-si-card rounded-2xl border p-5 transition-all ${
                  isRedeemed ? 'border-emerald-500/30 bg-emerald-500/5'
                  : canAfford && r.available ? 'border-si-border-md'
                  : 'border-si-border opacity-55'
                }`}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl leading-none">{r.emoji}</span>
                      <div>
                        <p className="font-semibold text-si-1 text-sm leading-tight">{r.title}</p>
                        <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1 ${REWARD_COLOR[r.category]}`}>
                          {r.category}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-amber-400">{r.cost.toLocaleString('pt-BR')} SC</p>
                      <p className="text-xs text-si-5">≈ R$ {(r.cost * 0.01).toFixed(2)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-si-5 mb-4">{r.desc}</p>
                  {isRedeemed ? (
                    <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                      <CheckCircle className="w-4 h-4" /> Resgatado!
                    </div>
                  ) : (
                    <button
                      onClick={() => canAfford && r.available && setRedeeming(r)}
                      disabled={!canAfford || !r.available}
                      className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors ${
                        canAfford && r.available
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25'
                          : 'bg-si-over-1 text-si-5 cursor-not-allowed'
                      }`}
                    >
                      {!r.available ? 'Em breve'
                        : !canAfford ? `Faltam ${(r.cost - balance).toLocaleString('pt-BR')} SC`
                        : 'Resgatar'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {redeemError && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-400 text-sm">{redeemError}</div>
          )}
          <p className="text-xs text-si-5 text-center">1 SibCoin = R$ 0,01 · Processamento em até 3 dias úteis</p>
        </div>
      )}

      {/* ══════════════════════ ABA HISTÓRICO ══════════════════════ */}
      {activeTab === 'Histórico' && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Saldo atual',     value: `${balance.toLocaleString('pt-BR')} SC`, color: 'text-amber-400' },
              { label: 'Tier',            value: tierCfg.label,                            color: tierCfg.color   },
              { label: 'Multiplicador',   value: `${multiplier}×`,                          color: 'text-si-2'     },
              { label: 'Transações',      value: String(sibcoinHistory.length),             color: 'text-si-2'     },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-si-card border border-si-border rounded-xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-si-5 mb-1">{label}</p>
                <p className={`text-lg font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Lista histórico do Firestore */}
          <div className="bg-si-card rounded-2xl border border-si-border">
            {sibcoinHistory.length === 0 ? (
              <div className="text-center py-16 text-si-5 space-y-2">
                <Gift className="w-9 h-9 mx-auto opacity-25" />
                <p className="text-sm">Nenhuma transação ainda.</p>
                <p className="text-xs">Acumule SibCoin fazendo compras e resgatando recompensas!</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {sibcoinHistory.map((txn: any, idx: number) => {
                  const isSpend = txn.type === 'spend';
                  return (
                    <div key={txn.id ?? idx} className="flex items-center gap-4 px-5 py-4">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isSpend ? 'bg-rose-500/10' : 'bg-emerald-500/10'}`}>
                        {isSpend ? <Gift className="w-4 h-4 text-rose-400" /> : <Coins className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-si-2 truncate">{txn.reason ?? (isSpend ? 'Resgate' : 'Recompensa')}</p>
                        <p className="text-xs text-si-5 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {txn.date ? new Date(txn.date).toLocaleDateString('pt-BR') : '—'}
                        </p>
                      </div>
                      <span className={`text-sm font-bold shrink-0 ${isSpend ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {isSpend ? '−' : '+'}{Math.abs(txn.amount ?? 0).toLocaleString('pt-BR')} SC
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal confirmação */}
      {redeeming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-si-card border border-si-border-md rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="text-center mb-5">
              <span className="text-5xl">{redeeming.emoji}</span>
              <h3 className="font-bold text-xl text-si-1 mt-3">{redeeming.title}</h3>
              <p className="text-sm text-si-5 mt-1">{redeeming.desc}</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4 flex items-center justify-between">
              <span className="text-sm text-si-4">Custo do resgate</span>
              <span className="font-bold text-amber-400">{redeeming.cost.toLocaleString('pt-BR')} SC</span>
            </div>
            <div className="flex gap-3">
              <button onClick={confirmRedeem} disabled={redeemBusy}
                className="flex-1 py-3 rounded-xl bg-si-1 text-si-bg font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {redeemBusy ? 'Processando...' : 'Confirmar resgate'}
              </button>
              <button onClick={() => setRedeeming(null)}
                className="px-5 py-3 rounded-xl bg-si-over-2 border border-si-border text-si-4 text-sm"
              >Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

interface OfferCardProps {
  offer: AffiliateCatalogOffer;
  multiplier: number;
  onActivate: (o: AffiliateCatalogOffer) => void;
  ldImpact?: string | null;
}

function OfferCard({ offer, multiplier, onActivate, ldImpact }: OfferCardProps) {
  const effective = (offer.cashbackPct * multiplier).toFixed(1);
  return (
    <div className="bg-si-card rounded-2xl border border-si-border hover:border-si-border-md transition-all group flex flex-col">
      <div className="p-4 flex items-start gap-3 flex-1">
        <StoreLogo offer={offer} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className="font-bold text-si-1 text-sm leading-tight">{offer.merchant}</span>
            {offer.cashbackPct >= 5 && (
              <span className="text-[9px] font-bold bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5" /> TOP
              </span>
            )}
          </div>
          <p className="text-xs text-si-5 truncate">{offer.desc}</p>
          <span className="text-[10px] text-si-5/60 font-medium mt-1 inline-block">{offer.network}</span>
        </div>
      </div>
      <div className="px-4 pb-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-emerald-400 leading-none">{effective}%</p>
            <p className="text-[10px] text-si-5 uppercase tracking-widest font-bold">cashback</p>
          </div>
          {ldImpact && (
            <div className="text-right">
              <p className="text-[10px] text-blue-400/80 font-semibold">{ldImpact}</p>
              <p className="text-[9px] text-si-5">por R$200 comprados</p>
            </div>
          )}
        </div>
        <button
          onClick={() => onActivate(offer)}
          disabled={!offer.targetUrl}
          className="w-full py-2 rounded-xl text-xs font-bold text-si-1 bg-si-over-2 border border-si-border hover:border-si-border-md flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
        >
          Ativar oferta <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function OfferRow({ offer, multiplier, onActivate, ldImpact }: OfferCardProps) {
  const effective = (offer.cashbackPct * multiplier).toFixed(1);
  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-si-over-1/40 transition-colors">
      <StoreLogo offer={offer} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-si-1 text-sm">{offer.merchant}</p>
          <span className="text-[9px] text-si-5/50 font-medium hidden sm:inline">{offer.network}</span>
        </div>
        <p className="text-xs text-si-5 truncate">{offer.desc}</p>
        {ldImpact && <p className="text-[10px] text-blue-400/70 font-semibold mt-0.5">{ldImpact} por R$200</p>}
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right">
          <p className="text-xl font-bold text-emerald-400 leading-none">{effective}%</p>
          <p className="text-[9px] text-si-5 uppercase tracking-widest font-bold">cashback</p>
        </div>
        <button
          onClick={() => onActivate(offer)}
          disabled={!offer.targetUrl}
          className="flex items-center gap-1 text-xs font-bold text-si-1 bg-si-over-2 border border-si-border px-3 py-2 rounded-lg hover:border-si-border-md transition-colors disabled:opacity-40"
        >
          Ativar <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function StoreLogo({ offer, size }: { offer: AffiliateCatalogOffer; size: 'sm' | 'md' | 'lg' }) {
  const dim = { sm: 'w-10 h-10', md: 'w-12 h-12', lg: 'w-14 h-14' }[size];
  if (offer.logoUrl) {
    return (
      <img
        src={offer.logoUrl}
        alt={offer.merchant}
        className={`${dim} rounded-xl object-contain bg-white p-1 shrink-0`}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return (
    <div className={`${dim} rounded-xl bg-si-over-2 border border-si-border flex items-center justify-center shrink-0 text-xl`}>
      {offer.logo || <Package className="w-5 h-5 text-si-5" />}
    </div>
  );
}
