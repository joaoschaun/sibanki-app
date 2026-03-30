import { useState } from 'react';
import {
  ShoppingBag, Coins, Tag, Star, ExternalLink, ChevronRight,
  Gift, Percent, Package, Trophy, Zap, CheckCircle,
} from 'lucide-react';
import { useSibcoin } from '../hooks/useSibcoin';

// ── Tipos ────────────────────────────────────────────────────────────────────
interface Offer {
  id: string;
  merchant: string;
  desc: string;
  cashbackPct: number;
  category: string;
  logo: string;
  network: string;
  featured?: boolean;
}

interface Reward {
  id: string;
  title: string;
  cost: number;
  category: 'desconto' | 'voucher' | 'cashback' | 'cripto';
  desc: string;
  emoji: string;
  available: boolean;
}

// ── Dados ────────────────────────────────────────────────────────────────────
const OFFERS: Offer[] = [
  { id: '1', merchant: 'Amazon',          desc: '3% de cashback em eletrônicos',      cashbackPct: 3,   category: 'Eletrônicos',  logo: '📦', network: 'Amazon Afiliados', featured: true },
  { id: '2', merchant: 'Shopee',          desc: '2.5% em tudo na Shopee',             cashbackPct: 2.5, category: 'Geral',        logo: '🛍️', network: 'Lomadee' },
  { id: '3', merchant: 'Netshoes',        desc: '5% em calçados e roupas esportivas', cashbackPct: 5,   category: 'Moda',         logo: '👟', network: 'AWIN', featured: true },
  { id: '4', merchant: 'iFood',           desc: '2% em pedidos acima de R$ 50',       cashbackPct: 2,   category: 'Alimentação',  logo: '🍔', network: 'AWIN' },
  { id: '5', merchant: 'Booking.com',     desc: '4% em hospedagens',                  cashbackPct: 4,   category: 'Viagens',      logo: '✈️', network: 'Actionpay' },
  { id: '6', merchant: 'Americanas',      desc: '1.8% em todas as categorias',        cashbackPct: 1.8, category: 'Geral',        logo: '🛒', network: 'Lomadee' },
  { id: '7', merchant: 'Magazine Luiza',  desc: '2.2% em eletrodomésticos',           cashbackPct: 2.2, category: 'Casa',         logo: '🏠', network: 'ML Afiliados' },
  { id: '8', merchant: 'Uber Eats',       desc: '1.5% em entrega de comida',          cashbackPct: 1.5, category: 'Alimentação',  logo: '🚗', network: 'Actionpay' },
];

const REWARDS: Reward[] = [
  { id: 'r1', title: 'Desconto 5% Loja Sibanki', cost: 200,  category: 'desconto', desc: 'Válido em qualquer compra via Loja', emoji: '💸', available: true },
  { id: 'r2', title: 'Voucher R$ 20 Amazon',      cost: 500,  category: 'voucher',  desc: 'Crédito na conta Amazon afiliados',   emoji: '📦', available: true },
  { id: 'r3', title: 'Cashback dobrado 7 dias',   cost: 300,  category: 'cashback', desc: '2× cashback em todas as lojas',       emoji: '🔥', available: true },
  { id: 'r4', title: '0.001 BTC',                  cost: 2000, category: 'cripto',   desc: 'Transferido para sua carteira Cripto', emoji: '₿',  available: false },
  { id: 'r5', title: 'Voucher R$ 50 iFood',        cost: 800,  category: 'voucher',  desc: 'Crédito direto no app iFood',         emoji: '🍔', available: true },
  { id: 'r6', title: 'Relatório CPF Premium',      cost: 150,  category: 'desconto', desc: 'Um relatório completo no Meu CPF',    emoji: '📋', available: true },
];

const NETWORKS = [
  { name: 'AWIN',             merchants: 847, color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
  { name: 'Lomadee',          merchants: 430, color: 'text-green-400',  bg: 'bg-green-500/10'  },
  { name: 'ML Afiliados',     merchants: 210, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { name: 'Amazon Afiliados', merchants: 380, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { name: 'Actionpay',        merchants: 195, color: 'text-purple-400', bg: 'bg-purple-500/10' },
];

const CATEGORIES = ['Todos', 'Eletrônicos', 'Moda', 'Alimentação', 'Viagens', 'Casa', 'Geral'];

const REWARD_CATEGORY_COLOR: Record<string, string> = {
  desconto: 'bg-green-500/10 text-green-400',
  voucher:  'bg-blue-500/10 text-blue-400',
  cashback: 'bg-amber-500/10 text-amber-400',
  cripto:   'bg-orange-500/10 text-orange-400',
};

const TABS = ['Ofertas', 'Resgatar SibCoin', 'Histórico', 'Redes'] as const;
type Tab = typeof TABS[number];

// ── Componente ────────────────────────────────────────────────────────────────
export default function Loja() {
  const { balance, tier } = useSibcoin();
  const [activeTab, setActiveTab] = useState<Tab>('Ofertas');
  const [filterCat, setFilterCat] = useState('Todos');
  const [redeeming, setRedeeming] = useState<Reward | null>(null);
  const [redeemed, setRedeemed] = useState<string[]>([]);

  const filteredOffers = OFFERS.filter((o) => filterCat === 'Todos' || o.category === filterCat);

  const TIER_MULTIPLIER: Record<string, number> = { bronze: 1, silver: 1.5, gold: 2, diamond: 3 };
  const multiplier = TIER_MULTIPLIER[tier] ?? 1;

  const handleRedeem = (r: Reward) => {
    if (balance < r.cost || redeemed.includes(r.id)) return;
    setRedeeming(r);
  };

  const confirmRedeem = () => {
    if (!redeeming) return;
    setRedeemed((prev) => [...prev, redeeming.id]);
    setRedeeming(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-emerald-400" />
            Loja Sibanki
          </h2>
          <p className="text-si-5 text-sm mt-1">Ofertas, cashback e resgates SibCoin</p>
        </div>
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-amber-400">{balance.toLocaleString('pt-BR')} SC</span>
          {multiplier > 1 && (
            <span className="text-xs bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full font-bold">
              {multiplier}× cashback
            </span>
          )}
        </div>
      </div>

      {/* Tier cashback banner */}
      {multiplier > 1 && (
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
          <p className="text-amber-300 text-sm">
            Seu tier <strong>{tier}</strong> dá <strong>{multiplier}× de cashback</strong> em todas as lojas parceiras!
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-si-card rounded-xl p-1 border border-si-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === t ? 'bg-emerald-600 text-si-1 shadow' : 'text-si-5 hover:text-si-3'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── OFERTAS ── */}
      {activeTab === 'Ofertas' && (
        <div className="space-y-4">
          {/* Category filter */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setFilterCat(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filterCat === c
                    ? 'bg-emerald-600 text-si-1'
                    : 'bg-si-card border border-si-border-md text-si-4 hover:text-si-2'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Featured */}
          {filterCat === 'Todos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {OFFERS.filter((o) => o.featured).map((o) => (
                <div key={o.id} className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 rounded-2xl border border-emerald-500/20 p-5 flex items-center gap-4">
                  <span className="text-4xl">{o.logo}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-si-1">{o.merchant}</span>
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <Star className="w-3 h-3" /> Destaque
                      </span>
                    </div>
                    <p className="text-sm text-si-4 mt-0.5">{o.desc}</p>
                    <p className="text-sm font-bold text-emerald-400 mt-1">
                      {(o.cashbackPct * multiplier).toFixed(1)}% cashback em SibCoin
                    </p>
                  </div>
                  <button className="shrink-0 px-4 py-2 rounded-xl bg-emerald-600 text-si-1 text-sm font-bold hover:bg-emerald-500 transition-colors flex items-center gap-1">
                    Ativar <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* All offers */}
          <div className="bg-si-card rounded-2xl border border-si-border overflow-hidden">
            <div className="px-6 py-3 border-b border-si-border flex items-center justify-between">
              <span className="text-sm font-semibold text-si-3">{filteredOffers.length} lojas disponíveis</span>
              <span className="text-xs text-si-5">Via {NETWORKS.length} redes</span>
            </div>
            <div className="divide-y divide-white/5">
              {filteredOffers.map((o) => (
                <div key={o.id} className="flex items-center gap-4 px-6 py-4 hover:bg-si-over-1 group transition-colors">
                  <span className="text-2xl shrink-0">{o.logo}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-si-1">{o.merchant}</p>
                    <p className="text-xs text-si-5 truncate">{o.desc}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">Via {o.network}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-emerald-400">
                      {(o.cashbackPct * multiplier).toFixed(1)}%
                    </p>
                    <p className="text-xs text-zinc-600">em SC</p>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-600/30 flex items-center gap-1">
                    Ir <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── RESGATAR SIBCOIN ── */}
      {activeTab === 'Resgatar SibCoin' && (
        <div className="space-y-4">
          <div className="bg-si-card rounded-2xl border border-si-border p-4 flex items-center gap-4">
            <Coins className="w-8 h-8 text-amber-400" />
            <div>
              <p className="text-sm text-si-5">Seu saldo</p>
              <p className="text-2xl font-bold text-amber-400">{balance.toLocaleString('pt-BR')} SC</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-si-5">Equivalente a</p>
              <p className="text-lg font-semibold text-si-2">R$ {(balance * 0.01).toFixed(2)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {REWARDS.map((r) => {
              const canAfford = balance >= r.cost;
              const isRedeemed = redeemed.includes(r.id);
              return (
                <div
                  key={r.id}
                  className={`bg-si-card rounded-2xl border p-5 transition-all ${
                    isRedeemed ? 'border-emerald-500/30 bg-emerald-500/5'
                    : canAfford && r.available ? 'border-si-border-md hover:border-amber-500/30'
                    : 'border-si-border opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{r.emoji}</span>
                      <div>
                        <p className="font-semibold text-si-1 text-sm leading-tight">{r.title}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${REWARD_CATEGORY_COLOR[r.category]}`}>
                          {r.category}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-amber-400 text-sm">{r.cost.toLocaleString('pt-BR')} SC</p>
                      <p className="text-xs text-zinc-600">≈ R$ {(r.cost * 0.01).toFixed(2)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-si-5 mb-3">{r.desc}</p>
                  {isRedeemed ? (
                    <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                      <CheckCircle className="w-4 h-4" /> Resgatado!
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRedeem(r)}
                      disabled={!canAfford || !r.available}
                      className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors ${
                        canAfford && r.available
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                          : 'bg-si-over-2 text-zinc-600 cursor-not-allowed'
                      }`}
                    >
                      {!r.available ? 'Em breve' : !canAfford ? `Faltam ${(r.cost - balance).toLocaleString('pt-BR')} SC` : 'Resgatar'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* 1 SC = R$ 0.01 note */}
          <p className="text-xs text-zinc-600 text-center">
            1 SibCoin = R$ 0,01 · Resgates processados em até 3 dias úteis
          </p>
        </div>
      )}

      {/* ── HISTÓRICO ── */}
      {activeTab === 'Histórico' && (
        <div className="bg-si-card rounded-2xl border border-si-border">
          {redeemed.length === 0 ? (
            <div className="text-center py-16 text-si-5">
              <Gift className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum resgate ainda.</p>
              <p className="text-xs mt-1">Acumule SibCoin e resgate recompensas!</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {redeemed.map((id) => {
                const r = REWARDS.find((x) => x.id === id);
                if (!r) return null;
                return (
                  <div key={id} className="flex items-center gap-4 px-6 py-4">
                    <span className="text-2xl">{r.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-si-2">{r.title}</p>
                      <p className="text-xs text-si-5">Hoje · Pendente de processamento</p>
                    </div>
                    <span className="text-sm font-bold text-amber-400">−{r.cost.toLocaleString('pt-BR')} SC</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── REDES ── */}
      {activeTab === 'Redes' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {NETWORKS.map((n) => (
              <div key={n.name} className="bg-si-card rounded-2xl border border-si-border p-5 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl ${n.bg} flex items-center justify-center shrink-0`}>
                  <Package className={`w-6 h-6 ${n.color}`} />
                </div>
                <div className="flex-1">
                  <p className={`font-bold ${n.color}`}>{n.name}</p>
                  <p className="text-xs text-si-5">{n.merchants.toLocaleString('pt-BR')} lojistas parceiros</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-400">
                  <Percent className="w-3.5 h-3.5" /> Cashback ativo
                </div>
              </div>
            ))}
          </div>

          <div className="bg-si-card rounded-2xl border border-si-border p-6">
            <h3 className="font-semibold text-si-1 flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-amber-400" />
              Como funciona
            </h3>
            <ol className="space-y-3 text-sm text-si-4">
              <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center shrink-0">1</span>Ative uma oferta na aba Ofertas</li>
              <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center shrink-0">2</span>Você é redirecionado para a loja parceira via link rastreado</li>
              <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center shrink-0">3</span>Faça sua compra normalmente</li>
              <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center shrink-0">4</span>Em até 30 dias o cashback em SibCoin é creditado na sua conta</li>
            </ol>
          </div>
        </div>
      )}

      {/* Redemption confirm modal */}
      {redeeming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-si-card border border-si-border-md rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <span className="text-5xl">{redeeming.emoji}</span>
              <h3 className="font-bold text-xl text-si-1 mt-3">{redeeming.title}</h3>
              <p className="text-sm text-si-5 mt-1">{redeeming.desc}</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4 flex items-center justify-between">
              <span className="text-sm text-si-4">Custo do resgate</span>
              <span className="font-bold text-amber-400">{redeeming.cost.toLocaleString('pt-BR')} SC</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={confirmRedeem}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-colors"
              >
                Confirmar resgate
              </button>
              <button
                onClick={() => setRedeeming(null)}
                className="px-5 py-3 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
