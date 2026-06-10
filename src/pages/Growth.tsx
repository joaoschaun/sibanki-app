import { useState, useMemo, useRef, useEffect } from 'react';
import { GrowthSkeleton } from '../components/ui/PageSkeleton';
import { InvestmentInsights } from '../components/ui/InvestmentInsights';
import { useAppContext } from '../context/AppContext';
import { useSibcoinToast } from '../hooks/useSibcoinToast';
import { addInvestment, updateInvestment, deleteInvestment, addEntry, updateUserDoc } from '../services/persistUserData';
import type { Entry, Investment, InvestorProfileAnswers, InvestorProfile } from '../types/userData';
import { INVESTMENT_TYPES, DEFAULT_ACCOUNTS } from '../constants/defaults';
import { Modal } from '../components/ui/Modal';
import { TrendingUp, Plus, Pencil, Trash2, Calculator, ChevronDown, Zap, ArrowRight, Search, ShieldCheck, Bitcoin, Bell, Eye, Link2 } from 'lucide-react';
import { SibcoinMissionBanner } from '../components/sibcoin/SibcoinMissionBanner';
import { useNavigate } from 'react-router-dom';
import { fetchB3Quote, searchB3Tickers } from '../services/brapi';
import type { B3SearchResult, B3Quote } from '../services/brapi';
import { trackPlatformEvent } from '../services/platformEvents';
import {
  calculateGrahamIntrinsicValue,
  calculateBazinPriceCeiling,
  calculateSolidezScore,
  calculateInvestorProfile,
} from '../utils/sovereigntyEngine';
import { PortfolioChart } from '../components/charts/PortfolioChart';
import { ProventosBarChart } from '../components/charts/ProventosBarChart';
import { PriceChart } from '../components/charts/PriceChart';
import Cripto from './Cripto';
// ── Módulo de investimentos v2 ────────────────────────────────────────────────
import { useMarketRates } from '../hooks/useMarketRates';
import { usePortfolioSync } from '../hooks/usePortfolioSync';
import { usePortfolioMetrics, savePortfolioSnapshot } from '../hooks/usePortfolioMetrics';
import { PortfolioSyncBar } from '../components/investment/PortfolioSyncBar';
import { BenchmarkPanel } from '../components/investment/BenchmarkPanel';
import { RebalancingPanel } from '../components/investment/RebalancingPanel';
import { IrPanel } from '../components/investment/IrPanel';
import { PortfolioEvolutionChart } from '../components/investment/PortfolioEvolutionChart';
import { PortfolioListItem } from '../components/investment/PortfolioListItem';
import { WatchlistPanel } from '../components/investment/WatchlistPanel';
import { OpenFinanceInvestSync } from '../components/investment/OpenFinanceInvestSync';
import { PriceAlertModal } from '../components/investment/PriceAlertModal';

const RV_TYPES = ['Ações', 'FIIs', 'ETFs'];

export default function Growth() {
  const { user, investments, accounts, entries, loading, investorProfile, hasOpenFinance, dataFreshness, verifiedEntries, data } = useAppContext();
  const isPro = (data as any)?.plan === 'pro' || (data as any)?.plan === 'familia';
  const { triggerWithToast } = useSibcoinToast();
  const navigate = useNavigate();
  const [addOpen, setAddOpen] = useState(false);
  const [editingAtual, setEditingAtual] = useState<Investment | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formTipo, setFormTipo] = useState('Renda Fixa');
  const [formNome, setFormNome] = useState('');
  const [formValor, setFormValor] = useState('');
  const [formAtual, setFormAtual] = useState('');
  const [formConta, setFormConta] = useState('');
  const [formProventos, setFormProventos] = useState('');
  const [formQtd, setFormQtd] = useState('');
  const [formPrecoCompra, setFormPrecoCompra] = useState('');
  const [tickerSuggestions, setTickerSuggestions] = useState<B3SearchResult[]>([]);
  const [tickerSearchBusy, setTickerSearchBusy] = useState(false);
  // DY anual (%) retornado pela cotação ao selecionar ticker — usado para estimar proventos mensais
  const [formDyAnual, setFormDyAnual] = useState<number | null>(null);
  const tickerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editAtualValue, setEditAtualValue] = useState('');
  const [editProventosValue, setEditProventosValue] = useState('');

  const [addProventoOpen, setAddProventoOpen] = useState(false);
  const [provDate, setProvDate] = useState(new Date().toISOString().slice(0, 10));
  const [provDesc, setProvDesc] = useState('');
  const [provConta, setProvConta] = useState('');
  const [provValor, setProvValor] = useState('');

  const [answers, setAnswers] = useState<InvestorProfileAnswers>({
    objetivos: 'preservar-capital',
    horizonte: '>5',
    toleranciaQueda: 'media',
    experiencia: 'iniciante',
    liquidez: 'media',
    renda: 'media',
  });

  const currentProfile: InvestorProfile | undefined = investorProfile;

  const [b3Ticker, setB3Ticker] = useState('');
  const [b3Loading, setB3Loading] = useState(false);
  const [b3Error, setB3Error] = useState<string | null>(null);
  const [b3Data, setB3Data] = useState<B3Quote | null>(null);


  // UI state
  const [showProventos, setShowProventos] = useState(false);
  const [activeTab, setActiveTab] = useState<'carteira' | 'analise_b3' | 'cripto' | 'simuladores' | 'perfil' | 'watchlist' | 'open_finance_inv'>('carteira');
  // Alerta de preço: ticker selecionado para abrir modal
  const [alertModalTicker, setAlertModalTicker] = useState<{ ticker: string; nome?: string; currentPrice?: number } | null>(null);
  const [isRefakingSuitability, setIsRefakingSuitability] = useState(false);

  const [calcInitial, setCalcInitial] = useState('10000');
  const [calcMonthly, setCalcMonthly] = useState('500');
  const [calcRate, setCalcRate] = useState('10');
  const [calcPeriod, setCalcPeriod] = useState('10');
  const [calcPeriodType, setCalcPeriodType] = useState<'anos' | 'meses'>('anos');

  const calcResult = useMemo(() => {
    const p = parseFloat(calcInitial.replace(',', '.')) || 0;
    const m = parseFloat(calcMonthly.replace(',', '.')) || 0;
    const r = parseFloat(calcRate.replace(',', '.')) || 0;
    const t = parseFloat(calcPeriod.replace(',', '.')) || 0;

    const totalMonths = calcPeriodType === 'anos' ? t * 12 : t;
    const monthlyRate = Math.pow(1 + r / 100, 1 / 12) - 1;

    let totalAcumulado = p;
    for (let i = 0; i < totalMonths; i++) {
      totalAcumulado = totalAcumulado * (1 + monthlyRate) + m;
    }

    const totalInvestido = p + (m * totalMonths);
    const totalJuros = Math.max(0, totalAcumulado - totalInvestido);

    return {
      totalAcumulado: Math.round(totalAcumulado * 100) / 100,
      totalInvestido: Math.round(totalInvestido * 100) / 100,
      totalJuros: Math.round(totalJuros * 100) / 100,
    };
  }, [calcInitial, calcMonthly, calcRate, calcPeriod, calcPeriodType]);

  const totalAplicado = investments.reduce((s, i) => s + (i.valor ?? 0), 0);
  const totalAtual = investments.reduce((s, i) => s + (i.atual ?? i.valor ?? 0), 0);
  const rentab = totalAplicado > 0 ? ((totalAtual - totalAplicado) / totalAplicado) * 100 : 0;

  const openAdd = () => {
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormTipo('Renda Fixa');
    setFormNome('');
    setFormValor('');
    setFormAtual('');
    setFormConta('');
    setFormProventos('');
    setFormQtd('');
    setFormPrecoCompra('');
    setTickerSuggestions([]);
    setFormDyAnual(null);
    setError(null);
    setAddOpen(true);
  };

  const handleAddProvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    const v = parseFloat(provValor.replace(',', '.')) || 0;
    if (v <= 0) return;
    setError(null);
    setBusy(true);
    try {
      const data: Omit<Entry, 'id'> = {
        type: 'receita', date: provDate,
        desc: provDesc.trim() || 'Provento',
        category: 'Proventos',
        value: Math.round(v * 100) / 100,
        account: provConta || undefined,
      };
      await addEntry(user.uid, entries, data);
      setAddProventoOpen(false);
      setProvDesc(''); setProvValor(''); setProvConta('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar provento.');
    } finally { setBusy(false); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !formNome.trim()) return;
    const valor = parseFloat(formValor.replace(',', '.')) || 0;
    if (valor <= 0) return;
    const atual = parseFloat(formAtual.replace(',', '.')) || valor;
    const proventosVal = formProventos ? parseFloat(formProventos.replace(',', '.')) : 0;
    setError(null);
    setBusy(true);
    try {
      const qtdVal = parseFloat(formQtd.replace(',', '.')) || 0;
      const precoVal = parseFloat(formPrecoCompra.replace(',', '.')) || 0;
      await addInvestment(user.uid, investments, {
        date: formDate, tipo: formTipo, nome: formNome.trim(),
        valor: Math.round(valor * 100) / 100,
        atual: Math.round(atual * 100) / 100,
        conta: formConta || undefined,
        proventosMensais: Math.round(proventosVal * 100) / 100,
        ...(qtdVal > 0 && { qtd: qtdVal }),
        ...(precoVal > 0 && { precoCompra: Math.round(precoVal * 100) / 100 }),
        // DY anual real da Brapi (% a.a.) para ponderar renda passiva no InvestmentInsights
        ...(formDyAnual && formDyAnual > 0 && { dy: formDyAnual }),
      });
      triggerWithToast('investment_added'); // fire-and-forget SibCoin (shows toast on mission complete)
      setAddOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar investimento.');
    } finally { setBusy(false); }
  };

  const openEditAtual = (inv: Investment) => {
    setEditingAtual(inv);
    setEditAtualValue(String(inv.atual ?? inv.valor ?? 0));
    setEditProventosValue(inv.proventosMensais !== undefined && inv.proventosMensais !== null ? String(inv.proventosMensais) : '');
    setError(null);
  };

  const handleUpdateAtual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !editingAtual) return;
    const atual = parseFloat(editAtualValue.replace(',', '.')) || 0;
    const proventosVal = editProventosValue ? parseFloat(editProventosValue.replace(',', '.')) : 0;
    setError(null); setBusy(true);
    try {
      await updateInvestment(user.uid, investments, editingAtual.id, {
        ...editingAtual,
        atual: Math.round(atual * 100) / 100,
        proventosMensais: Math.round(proventosVal * 100) / 100,
      });
      setEditingAtual(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar.');
    } finally { setBusy(false); }
  };

  const handleDelete = async (id: number) => {
    if (!user?.uid) return;
    setError(null); setBusy(true);
    try {
      await deleteInvestment(user.uid, investments, id);
      setDeletingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir.');
    } finally { setBusy(false); }
  };

  // ── Módulo de investimentos v2 ─────────────────────────────────────────────
  const rates      = useMarketRates();
  const portfolioSync = usePortfolioSync();
  const metrics    = usePortfolioMetrics(investments, entries, investorProfile, rates.cdiMonthly, rates.selicAnnual);

  // Salva snapshot do valor atual mensalmente para o gráfico de evolução
  useEffect(() => {
    if (metrics.totalAtual > 0) savePortfolioSnapshot(metrics.totalAtual);
  }, [metrics.totalAtual]);

  const b3AssetCount = investments.filter((inv) =>
    ['ações', 'fiis', 'etf', 'etfs', 'fii', 'ação', 'acao', 'renda variável'].some(
      (t) => (inv.tipo || '').toLowerCase().includes(t)
    )
  ).length;

  const sorted = [...investments].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const proventos = [...entries]
    .filter((e) => e.type === 'receita' && (e.category === 'Proventos' || e.category === 'Dividendos'))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const portfolioAlloc = useMemo(() => {
    const byType: Record<string, number> = {};
    for (const inv of investments) {
      const tipo = inv.tipo || 'Outros';
      byType[tipo] = (byType[tipo] ?? 0) + (inv.atual ?? inv.valor ?? 0);
    }
    const total = Object.values(byType).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(byType).map(([name, value]) => ({
      name, value: +value.toFixed(2), pct: +((value / total) * 100).toFixed(1),
    }));
  }, [investments]);

  const proventosChart = useMemo(() => {
    const byMonth: Record<string, number> = {};
    for (const p of proventos) {
      const m = (p.date ?? '').slice(0, 7);
      if (!m) continue;
      byMonth[m] = (byMonth[m] ?? 0) + Number(p.value);
    }
    return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([key, value]) => {
      const [, month] = key.split('-').map(Number);
      const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      return { mes: months[month - 1], value: +value.toFixed(2) };
    });
  }, [proventos]);

  // Cálculo de perfil desacoplado — função pura em sovereigntyEngine.ts (testável)
  const perfilCalculado: InvestorProfile | null = useMemo(
    () => calculateInvestorProfile(answers),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(answers)]
  );

  const isRV = RV_TYPES.includes(formTipo);

  const handleTickerInput = (val: string) => {
    setFormNome(val);
    if (!isRV || val.length < 2) { setTickerSuggestions([]); return; }
    if (tickerDebounceRef.current) clearTimeout(tickerDebounceRef.current);
    tickerDebounceRef.current = setTimeout(async () => {
      setTickerSearchBusy(true);
      try { setTickerSuggestions(await searchB3Tickers(val)); }
      catch { setTickerSuggestions([]); }
      finally { setTickerSearchBusy(false); }
    }, 350);
  };

  const selectTicker = async (t: B3SearchResult) => {
    setFormNome(t.ticker);
    setTickerSuggestions([]);
    if (t.ticker) {
      try {
        const quote = await fetchB3Quote(t.ticker);
        const preco = quote.price.toFixed(2);
        setFormPrecoCompra(preco);
        const qtd = parseFloat(formQtd.replace(',', '.')) || 0;
        if (qtd > 0) {
          setFormValor((qtd * quote.price).toFixed(2));
          setFormAtual((qtd * quote.price).toFixed(2));
        }
        // Armazena DY para uso na estimativa de renda passiva, se disponível
        if (quote.dy && quote.dy > 0) {
          setFormDyAnual(quote.dy);
        } else {
          setFormDyAnual(null);
        }
        void trackPlatformEvent('ticker_quote_success', { ticker: t.ticker });
      } catch (err) {
        // Telemetria leve — não interrompe o fluxo
        void trackPlatformEvent('ticker_quote_failed', {
          ticker: t.ticker,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  };

  const syncValorFromQtdPreco = (qtdStr: string, precoStr: string) => {
    const q = parseFloat(qtdStr.replace(',', '.'));
    const p = parseFloat(precoStr.replace(',', '.'));
    if (q > 0 && p > 0) {
      const total = (q * p).toFixed(2);
      setFormValor(total);
      setFormAtual(total);
    }
  };

  const searchB3Quote = async () => {
    const t = b3Ticker.trim().toUpperCase();
    if (!t) return;
    setB3Error(null); setB3Loading(true);
    try {
      const quote = await fetchB3Quote(t);
      setB3Data(quote);
    } catch (err) {
      setB3Error(err instanceof Error ? err.message : 'Erro ao consultar B3.');
      setB3Data(null);
    } finally { setB3Loading(false); }
  };

  const handleSearchB3 = async (e: React.FormEvent) => { e.preventDefault(); await searchB3Quote(); };

  if (loading) return <GrowthSkeleton />;

  const inputCls = 'w-full px-4 py-2.5 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500 text-sm';
  const labelCls = 'block text-xs font-medium text-si-5 mb-1';

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold">Crescimento</h2>
          <p className="text-si-5 text-sm">Carteira de investimentos e patrimônio</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => setAddProventoOpen(true)}
            className="bg-si-over-2 hover:bg-si-over-3 text-si-1 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 border border-si-border-md">
            <Plus className="w-4 h-4" /> Provento
          </button>
          <button type="button" onClick={openAdd}
            className="bg-blue-600 hover:bg-blue-500 text-si-1 px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Novo investimento
          </button>
        </div>
      </div>

      <SibcoinMissionBanner eventType="investment_added" />

      {/* Sub-navegação do cockpit */}
      <div className="flex items-center gap-2 border-b border-si-border pb-4 flex-wrap">
        {(
          [
            { id: 'carteira', label: 'Minha Carteira', icon: TrendingUp },
            { id: 'analise_b3', label: 'Análise B3', icon: Search },
            { id: 'watchlist', label: 'Watchlist', icon: Eye },
            { id: 'cripto', label: 'Cripto', icon: Bitcoin },
            { id: 'simuladores', label: 'Simuladores', icon: Calculator },
            { id: 'perfil', label: 'Perfil de Investidor', icon: ShieldCheck },
            { id: 'open_finance_inv', label: 'OF Investimentos', icon: Link2 },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold tracking-[0.1em] uppercase border transition-all ${
                active
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-si-over-1 text-si-4 hover:bg-si-over-2 hover:text-si-2 border-si-border'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {error && !addOpen && !editingAtual && deletingId === null && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-rose-400 text-sm">{error}</div>
      )}

      {/* ── Minha Carteira Tab ── */}
      {activeTab === 'carteira' && (
        <div key="carteira" className="space-y-5 tab-animate">

          {/* 1. Raio X — sem paywall (liberado em fase de construção) */}
          <InvestmentInsights
            investments={investments}
            entries={entries}
            investorProfile={investorProfile}
            hasOpenFinance={hasOpenFinance}
            dataFreshness={dataFreshness}
            verifiedEntries={verifiedEntries}
          />

          {/* 2. Sync de cotações */}
          {investments.length > 0 && (
            <PortfolioSyncBar
              sync={portfolioSync}
              uid={user?.uid ?? ''}
              investments={investments}
              b3Count={b3AssetCount}
            />
          )}

          {/* 3. KPI Cards expandidos */}
          {investments.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total aplicado', value: `R$ ${metrics.totalAplicado.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, sub: '', color: 'text-si-1' },
                { label: 'Valor atual', value: `R$ ${metrics.totalAtual.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, sub: '', color: metrics.totalAtual >= metrics.totalAplicado ? 'text-emerald-400' : 'text-rose-400' },
                { label: 'P&L total', value: `${metrics.totalPnl >= 0 ? '+' : ''}R$ ${Math.abs(metrics.totalPnl).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, sub: `${metrics.rentabPct >= 0 ? '+' : ''}${metrics.rentabPct.toFixed(1)}%`, color: metrics.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400' },
                { label: 'Renda passiva/mês', value: `R$ ${metrics.rendaPassivaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, sub: `YoC ${metrics.yieldOnCost.toFixed(1)}% a.a.`, color: 'text-si-1' },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-si-card rounded-2xl border border-si-border p-4">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{kpi.label}</p>
                  <p className={`text-xl font-black ${kpi.color}`}>{kpi.value}</p>
                  {kpi.sub && <p className="text-[10px] text-zinc-500 mt-0.5">{kpi.sub}</p>}
                </div>
              ))}
            </div>
          )}

          {/* 4. Charts: Alocação + Evolução */}
          {portfolioAlloc.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="bg-si-card rounded-2xl border border-si-border p-5">
                <h3 className="font-semibold text-si-1 mb-3 text-sm">Alocação por tipo</h3>
                <PortfolioChart data={portfolioAlloc} height={200} />
              </div>
              <PortfolioEvolutionChart history={metrics.investedHistory} />
            </div>
          )}

          {/* 5. Benchmark + Rebalanceamento lado a lado */}
          {investments.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              <BenchmarkPanel
                rentabAnualizadaPct={metrics.rentabAnualizadaPct}
                cdiAnualPct={metrics.cdiAnualPct}
                selicAnualPct={metrics.selicAnualPct}
                totalAplicado={metrics.totalAplicado}
                totalAtual={metrics.totalAtual}
              />
              <RebalancingPanel
                allocation={metrics.allocation}
                totalAtual={metrics.totalAtual}
                profile={investorProfile?.profile ?? 'moderado'}
              />
            </div>
          )}

          {/* 6. IR estimado */}
          {metrics.ir.ganhoTotal > 0 && <IrPanel ir={metrics.ir} />}

          {/* 7. Lista de ativos — expandível com gráfico inline */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Ativos ({investments.length}) — clique para expandir
              </h3>
            </div>
            {investments.length === 0 ? (
              <div className="bg-si-card rounded-2xl border border-si-border p-12 text-center text-si-5">
                Nenhum investimento ainda. Clique em &quot;Novo investimento&quot; para começar.
              </div>
            ) : (
              <div className="space-y-1">
                {sorted.map((inv) => (
                  <PortfolioListItem
                    key={inv.id}
                    investment={inv}
                    onEdit={openEditAtual}
                    onDelete={(id) => setDeletingId(id)}
                    onAlert={(ticker, nome, currentPrice) =>
                      setAlertModalTicker({ ticker, nome, currentPrice })
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {/* 8. Proventos */}
          {proventosChart.length > 0 && (
            <div className="bg-si-card rounded-2xl border border-si-border p-5">
              <h3 className="font-semibold text-si-1 mb-3 text-sm">Proventos mensais</h3>
              <ProventosBarChart data={proventosChart.map((p) => ({ label: p.mes, valor: p.value }))} height={180} />
            </div>
          )}

        </div>
      )}

      {/* ── Análise B3 Tab ── */}
      {activeTab === 'analise_b3' && (
        <section key="analise_b3" className="bg-si-card rounded-2xl border border-si-border p-6 space-y-6 tab-animate">
          <div>
            <h3 className="font-semibold text-si-1 text-lg">Análise B3 (cotações)</h3>
            <p className="text-si-5 text-xs">Consulte ações, FIIs e ETFs em tempo real. Dados fundamentalistas integrados e normalizados pelo Sovereignty Engine.</p>
          </div>

          <form onSubmit={handleSearchB3} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="b3-ticker" className={labelCls}>Ticker (ex: PETR4, ITUB4, BOVA11)</label>
              <input id="b3-ticker" type="text" value={b3Ticker}
                onChange={(e) => setB3Ticker(e.target.value.toUpperCase())}
                className={inputCls} placeholder="Digite um ticker" />
            </div>
            <button type="submit" disabled={b3Loading}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-si-1 text-sm font-bold disabled:opacity-50 transition-colors">
              {b3Loading ? 'Buscando…' : 'Buscar cotação'}
            </button>
          </form>

          {b3Error && <p className="text-sm text-rose-400">{b3Error}</p>}

          {b3Data && (
            <div className="border border-si-border-md rounded-2xl p-5 flex flex-col gap-5 bg-si-bg/30">
              {/* Header do Ativo */}
              <div className="flex items-center justify-between gap-4 flex-wrap border-b border-si-border pb-4">
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Ativo Consultado</p>
                  <p className="text-xl font-black text-si-1">{b3Data.ticker} <span className="text-si-4 text-xs font-normal normal-case ml-2">({b3Data.type || 'Ações'})</span></p>
                  <p className="text-sm text-si-4 truncate max-w-[400px]">{b3Data.name}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Preço atual</p>
                  <p className="text-2xl font-black text-si-1">R$ {b3Data.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p className={`text-xs font-bold ${b3Data.changePct > 0 ? 'text-emerald-400' : b3Data.changePct < 0 ? 'text-rose-400' : 'text-si-4'}`}>
                    {b3Data.changePct > 0 ? '+' : ''}{b3Data.changePct.toFixed(2)}% ({b3Data.change.toFixed(2)})
                  </p>
                  <button
                    type="button"
                    onClick={() => setAlertModalTicker({ ticker: b3Data.ticker, nome: b3Data.name, currentPrice: b3Data.price })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[10px] font-bold text-amber-400 hover:bg-amber-500/15 transition-colors ml-auto"
                  >
                    <Bell className="w-3 h-3" /> Criar alerta
                  </button>
                </div>
              </div>

              {/* Gráfico de Preço — TradingView Lightweight Charts */}
              <div className="rounded-xl overflow-hidden border border-si-border">
                <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Histórico de Preço (120 dias)</span>
                  <span className="text-[10px] text-zinc-600">velas diárias</span>
                </div>
                <PriceChart ticker={b3Data.ticker} height={240} />
              </div>

              {/* Grid de Indicadores Básicos */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-xs bg-[#111] p-4 rounded-xl border border-white/[0.04]">
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Setor</p>
                  <p className="text-si-2 font-medium truncate">{b3Data.sector || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Div. Yield</p>
                  <p className="text-si-2 font-bold">{typeof b3Data.dy === 'number' ? `${b3Data.dy.toFixed(2)}%` : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">P/L</p>
                  <p className="text-si-2 font-bold">{typeof b3Data.pe === 'number' ? b3Data.pe.toFixed(2) : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">P/VP</p>
                  <p className="text-si-2 font-bold">{typeof b3Data.pvp === 'number' ? b3Data.pvp.toFixed(2) : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">LPA</p>
                  <p className="text-si-2 font-bold">{typeof b3Data.lpa === 'number' ? `R$ ${b3Data.lpa.toFixed(2)}` : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">VPA</p>
                  <p className="text-si-2 font-bold">{typeof b3Data.vpa === 'number' ? `R$ ${b3Data.vpa.toFixed(2)}` : '—'}</p>
                </div>
              </div>

              {/* Motores de Avaliação Fundamentalista */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Graham Card */}
                {(() => {
                  const graham = calculateGrahamIntrinsicValue(b3Data.price, b3Data.lpa, b3Data.vpa);
                  if (graham.status === 'invalido') return null;
                  return (
                    <div className="bg-[#111] border border-white/[0.04] p-5 rounded-2xl flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Valor Intrínseco (Graham)</span>
                        <span className="text-lg font-black text-si-1">R$ {graham.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="mt-4">
                        {graham.status === 'desconto' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 uppercase tracking-wider border border-emerald-500/20">
                            ✓ {graham.marginOfSafety.toFixed(0)}% desconto
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-bold bg-rose-500/10 text-rose-400 uppercase tracking-wider border border-rose-500/20">
                            ⚠ Sem margem de segurança
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Bazin Card */}
                {(() => {
                  const bazin = calculateBazinPriceCeiling(b3Data.price, b3Data.dy);
                  if (bazin.status === 'invalido') return null;
                  return (
                    <div className="bg-[#111] border border-white/[0.04] p-5 rounded-2xl flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Preço Teto (Bazin @ 6%)</span>
                        <span className="text-lg font-black text-si-1">R$ {bazin.precoTeto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="mt-4">
                        {bazin.status === 'compra' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 uppercase tracking-wider border border-emerald-500/20">
                            ✓ Compra (+{bazin.upside.toFixed(0)}% upside)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 uppercase tracking-wider border border-amber-500/20">
                            ⚠ Acima do teto
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Solidez Contábil Card */}
                {(() => {
                  const solidez = calculateSolidezScore({
                    roe: b3Data.roe,
                    margemLiquida: b3Data.margemLiquida,
                    dividaEbitda: b3Data.dividaEbitda,
                    pe: b3Data.pe,
                    pvp: b3Data.pvp,
                    dy: b3Data.dy
                  });
                  const verdictColors = {
                    alta: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                    media: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                    baixa: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  };
                  const verdictLabels = {
                    alta: 'Alta Solidez',
                    media: 'Solidez Moderada',
                    baixa: 'Risco Elevado'
                  };
                  return (
                    <div className="bg-[#111] border border-white/[0.04] p-5 rounded-2xl flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Solidez Contábil</span>
                        <span className="text-lg font-black text-si-1">{solidez.score} / 9 <span className="text-xs font-semibold text-zinc-500">pontos</span></span>
                      </div>
                      <div className="mt-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-bold border uppercase tracking-wider ${verdictColors[solidez.verdict]}`}>
                          {verdictLabels[solidez.verdict]}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Detalhes de Eficiência DuPont e Margens */}
              {(typeof b3Data.roe === 'number' || typeof b3Data.margemLiquida === 'number' || typeof b3Data.dividaEbitda === 'number') && (
                <div className="bg-[#111] p-4 rounded-xl border border-white/[0.04] text-xs flex flex-wrap gap-x-6 gap-y-2">
                  {typeof b3Data.roe === 'number' && (
                    <div className="flex gap-2">
                      <span className="text-zinc-500">Rentabilidade (ROE):</span>
                      <span className={`font-bold ${(b3Data.roe > 0.15 || b3Data.roe > 15) ? 'text-emerald-400' : 'text-zinc-300'}`}>
                        {(Math.abs(b3Data.roe) > 1 ? b3Data.roe : b3Data.roe * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                  {typeof b3Data.margemLiquida === 'number' && (
                    <div className="flex gap-2">
                      <span className="text-zinc-500">Margem Líquida:</span>
                      <span className={`font-bold ${(b3Data.margemLiquida > 0.10 || b3Data.margemLiquida > 10) ? 'text-emerald-400' : 'text-zinc-300'}`}>
                        {(Math.abs(b3Data.margemLiquida) > 1 ? b3Data.margemLiquida : b3Data.margemLiquida * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                  {typeof b3Data.dividaEbitda === 'number' && (
                    <div className="flex gap-2">
                      <span className="text-zinc-500">Dívida/EBITDA:</span>
                      <span className={`font-bold ${b3Data.dividaEbitda < 2.5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {b3Data.dividaEbitda.toFixed(2)}x
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              <p className="text-[10px] text-zinc-600 mt-1">Dados fundamentalistas calculados e normalizados pelo Sovereignty Engine.</p>
            </div>
          )}
        </section>
      )}

      {/* ── Cripto Tab ── */}
      {activeTab === 'cripto' && (
        <div key="cripto" className="tab-animate">
          <Cripto />
        </div>
      )}

      {/* ── Watchlist Tab ── */}
      {activeTab === 'watchlist' && (
        <div key="watchlist" className="tab-animate">
          <WatchlistPanel />
        </div>
      )}

      {/* ── Open Finance Investimentos Tab ── */}
      {activeTab === 'open_finance_inv' && (
        <div key="open_finance_inv" className="tab-animate space-y-5">
          <div>
            <h3 className="text-sm font-bold text-zinc-200">Investimentos via Open Finance</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Posições importadas automaticamente das suas corretoras conectadas.
            </p>
          </div>
          <OpenFinanceInvestSync />
        </div>
      )}

      {/* ── Simuladores Tab ── */}
      {activeTab === 'simuladores' && (
        <div key="simuladores" className="grid gap-6 md:grid-cols-3 tab-animate">
          {/* Lado Esquerdo: Simulador Juros Compostos (ocupa 2 colunas) */}
          <div className="bg-si-card border border-si-border rounded-2xl p-6 md:col-span-2 space-y-4">
            <div>
              <h3 className="font-semibold text-si-1 text-lg flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-400" />
                Simulador de Juros Compostos
              </h3>
              <p className="text-si-5 text-xs">Simule o crescimento do seu patrimônio com aportes mensais recorrentes.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Aporte Inicial (R$)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={calcInitial}
                  onChange={(e) => setCalcInitial(e.target.value.replace(/[^0-9,.-]/, ''))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Aporte Mensal (R$)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={calcMonthly}
                  onChange={(e) => setCalcMonthly(e.target.value.replace(/[^0-9,.-]/, ''))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Taxa de Juros (% a.a.)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={calcRate}
                  onChange={(e) => setCalcRate(e.target.value.replace(/[^0-9,.-]/, ''))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Período</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={calcPeriod}
                    onChange={(e) => setCalcPeriod(e.target.value.replace(/[^0-9]/, ''))}
                    className="flex-1 px-4 py-2 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500 text-sm"
                  />
                  <select
                    value={calcPeriodType}
                    onChange={(e) => setCalcPeriodType(e.target.value as 'anos' | 'meses')}
                    className="px-3 py-2 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500 text-xs font-bold uppercase"
                  >
                    <option value="anos">Anos</option>
                    <option value="meses">Meses</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Resultado do Simulador */}
            <div className="bg-[#111] border border-white/[0.04] p-5 rounded-2xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-0.5">Total Acumulado</span>
                  <span className="text-xl font-black text-emerald-400">
                    R$ {calcResult.totalAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-0.5">Total Investido</span>
                  <span className="text-base font-bold text-zinc-300">
                    R$ {calcResult.totalInvestido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-0.5">Juros Ganhos</span>
                  <span className="text-base font-bold text-blue-400">
                    R$ {calcResult.totalJuros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Barra Progressiva de Composição */}
              {calcResult.totalAcumulado > 0 && (
                <div className="space-y-1">
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden flex">
                    <div
                      className="bg-zinc-500 transition-all duration-300"
                      style={{ width: `${(calcResult.totalInvestido / calcResult.totalAcumulado) * 100}%` }}
                    />
                    <div
                      className="bg-blue-500 transition-all duration-300"
                      style={{ width: `${(calcResult.totalJuros / calcResult.totalAcumulado) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-zinc-500 rounded-full" /> Investido ({((calcResult.totalInvestido / calcResult.totalAcumulado) * 100).toFixed(0)}%)</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> Juros ({((calcResult.totalJuros / calcResult.totalAcumulado) * 100).toFixed(0)}%)</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Lado Direito: Link para Central de Ferramentas */}
          <div className="bg-si-card border border-si-border rounded-2xl p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-si-1 text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-400" />
                Central de Ferramentas
              </h3>
              <p className="text-si-5 text-sm leading-relaxed">
                Acesse todos os simuladores avançados unificados na central de ferramentas do Sibanki.
              </p>
              <ul className="text-xs text-zinc-400 space-y-1.5 pt-2 list-disc list-inside">
                <li>Simulador de Independência (FIRE)</li>
                <li>Simulador de Renda Fixa</li>
                <li>Projeções de Renda Passiva</li>
                <li>Simulação de Imposto de Renda (IR)</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => navigate('/ferramentas')}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-si-1 font-bold text-sm transition-colors"
            >
              <Calculator className="w-4 h-4" />
              Abrir Ferramentas
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Perfil do Investidor Tab ── */}
      {activeTab === 'perfil' && (
        <div key="perfil" className="space-y-6 tab-animate">
          {currentProfile && !isRefakingSuitability ? (
            <div className="bg-si-card border border-si-border rounded-2xl p-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Lado Esquerdo: Perfil Calculado */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl shrink-0 ${
                      currentProfile.profile === 'conservador' ? 'text-emerald-400 bg-emerald-500/10' :
                      currentProfile.profile === 'arrojado' ? 'text-purple-400 bg-purple-500/10' : 'text-blue-400 bg-blue-500/10'
                    }`}>
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Seu perfil calculado</p>
                      <h3 className={`text-2xl font-black uppercase ${
                        currentProfile.profile === 'conservador' ? 'text-emerald-400' :
                        currentProfile.profile === 'arrojado' ? 'text-purple-400' : 'text-blue-400'
                      }`}>
                        {currentProfile.profile}
                      </h3>
                      <p className="text-xs text-zinc-500">Score de Suitability: {currentProfile.score} / 100</p>
                    </div>
                  </div>

                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {currentProfile.profile === 'conservador' && 'Foco em preservar seu patrimônio. Você prioriza liquidez diária e prefere evitar perdas, mesmo que isso limite os retornos no longo prazo.'}
                    {currentProfile.profile === 'moderado' && 'Equilíbrio entre segurança e rentabilidade. Você aceita oscilações moderadas no curto prazo em busca de ganhos superiores no longo prazo.'}
                    {currentProfile.profile === 'arrojado' && 'Maximização de retornos no longo prazo. Você possui conhecimento de mercado e tolera oscilações expressivas de patrimônio em busca de alta rentabilidade.'}
                  </p>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setIsRefakingSuitability(true)}
                      className="px-4 py-2 rounded-xl bg-si-over-2 hover:bg-si-over-3 border border-si-border text-xs font-bold text-si-1 transition-all uppercase tracking-wider"
                    >
                      Refazer Questionário
                    </button>
                  </div>
                </div>

                {/* Lado Direito: Diretrizes de Alocação e Alinhamento */}
                <div className="space-y-4 border-t border-si-border md:border-t-0 md:border-l md:pl-6 pt-6 md:pt-0">
                  <div>
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Diretrizes de Alocação Sugeridas</h4>
                    <ul className="space-y-2 text-xs text-zinc-300">
                      {currentProfile.profile === 'conservador' && (
                        <>
                          <li className="flex justify-between border-b border-si-border pb-1"><span>Renda Fixa Pós-Fixada:</span> <span className="font-bold text-emerald-400">80% - 100%</span></li>
                          <li className="flex justify-between border-b border-si-border pb-1"><span>Inflação (IPCA+):</span> <span className="font-bold text-zinc-400">0% - 15%</span></li>
                          <li className="flex justify-between border-b border-si-border pb-1"><span>Renda Variável (Ações/FIIs):</span> <span className="font-bold text-zinc-400">0% - 10%</span></li>
                        </>
                      )}
                      {currentProfile.profile === 'moderado' && (
                        <>
                          <li className="flex justify-between border-b border-si-border pb-1"><span>Renda Fixa:</span> <span className="font-bold text-emerald-400">50% - 70%</span></li>
                          <li className="flex justify-between border-b border-si-border pb-1"><span>Ações & FIIs:</span> <span className="font-bold text-blue-400">20% - 40%</span></li>
                          <li className="flex justify-between border-b border-si-border pb-1"><span>Global / Multimercado:</span> <span className="font-bold text-zinc-400">5% - 15%</span></li>
                        </>
                      )}
                      {currentProfile.profile === 'arrojado' && (
                        <>
                          <li className="flex justify-between border-b border-si-border pb-1"><span>Renda Fixa:</span> <span className="font-bold text-zinc-400">20% - 30%</span></li>
                          <li className="flex justify-between border-b border-si-border pb-1"><span>Renda Variável (Ações/FIIs):</span> <span className="font-bold text-purple-400">50% - 70%</span></li>
                          <li className="flex justify-between border-b border-si-border pb-1"><span>Cripto & Internacional:</span> <span className="font-bold text-emerald-400">10% - 20%</span></li>
                        </>
                      )}
                    </ul>
                  </div>

                  {/* Checklist de Alinhamento */}
                  {(() => {
                    const totalAtual = investments.reduce((s, i) => s + (i.atual ?? i.valor ?? 0), 0);
                    const variavelTipos = ['ações', 'fiis', 'etf', 'cripto', 'renda variável', 'criptoativos'];
                    const variavelTotal = investments
                      .filter((i) => variavelTipos.some((t) => (i.tipo || '').toLowerCase().includes(t)))
                      .reduce((s, i) => s + (i.atual ?? i.valor ?? 0), 0);
                    const variavelPct = totalAtual > 0 ? (variavelTotal / totalAtual) * 100 : 0;

                    let alignmentStatus: 'aligned' | 'warning_high' | 'warning_low' = 'aligned';
                    let alignmentMsg = '';
                    const p = currentProfile.profile;
                    if (p === 'conservador') {
                      if (variavelPct > 20) {
                        alignmentStatus = 'warning_high';
                        alignmentMsg = `Exposição acima do recomendado: você possui ${variavelPct.toFixed(1)}% em Renda Variável (sugerido: até 20%).`;
                      } else {
                        alignmentMsg = `Carteira adequada: sua exposição ao risco está em ${variavelPct.toFixed(1)}% (sugerido: até 20%).`;
                      }
                    } else if (p === 'moderado') {
                      if (variavelPct > 55) {
                        alignmentStatus = 'warning_high';
                        alignmentMsg = `Exposição de risco elevada: você possui ${variavelPct.toFixed(1)}% em Renda Variável (sugerido: 20-50%).`;
                      } else if (variavelPct < 15 && totalAtual > 0) {
                        alignmentStatus = 'warning_low';
                        alignmentMsg = `Subexposição: você possui apenas ${variavelPct.toFixed(1)}% em Renda Variável (sugerido: 20-50%).`;
                      } else {
                        alignmentMsg = `Carteira alinhada: exposição ao risco de ${variavelPct.toFixed(1)}% está na faixa sugerida (20-50%).`;
                      }
                    } else { // arrojado
                      if (variavelPct < 35 && totalAtual > 0) {
                        alignmentStatus = 'warning_low';
                        alignmentMsg = `Carteira muito conservadora: apenas ${variavelPct.toFixed(1)}% em Renda Variável (sugerido: acima de 50%).`;
                      } else {
                        alignmentMsg = `Carteira arrojada: exposição de ${variavelPct.toFixed(1)}% adequada ao seu perfil de tolerância (sugerido: >50%).`;
                      }
                    }

                    return (
                      <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
                        alignmentStatus === 'aligned' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        <p className="font-bold uppercase tracking-wider mb-1">
                          {alignmentStatus === 'aligned' ? '✓ Alinhamento Correto' : '⚠ Rebalanceamento Sugerido'}
                        </p>
                        <p className="text-zinc-300">{alignmentMsg}</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-si-card rounded-2xl border border-si-border p-6">
              <h3 className="font-semibold text-si-1 mb-1">Perfil do investidor (Suitability)</h3>
              <p className="text-si-5 text-sm mb-4">Responda às perguntas abaixo para traçar seu nível de tolerância a oscilações e receber diretrizes contábeis adequadas.</p>
              <form className="space-y-4" onSubmit={async (e) => {
                e.preventDefault();
                if (!user?.uid) return;
                setError(null); setBusy(true);
                try { 
                  await updateUserDoc(user.uid, { investorProfile: perfilCalculado }); 
                  setIsRefakingSuitability(false);
                }
                catch (err) { setError(err instanceof Error ? err.message : 'Erro ao salvar perfil.'); }
                finally { setBusy(false); }
              }}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls} htmlFor="inv-obj">Objetivo principal</label>
                    <select id="inv-obj" value={answers.objetivos}
                      onChange={(e) => setAnswers((a) => ({ ...a, objetivos: e.target.value as InvestorProfileAnswers['objetivos'] }))} className={inputCls}>
                      <option value="preservar-capital">Preservar capital</option>
                      <option value="crescimento">Crescimento patrimonial</option>
                      <option value="especulacao">Máximo retorno (alto risco)</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="inv-horizonte">Horizonte</label>
                    <select id="inv-horizonte" value={answers.horizonte}
                      onChange={(e) => setAnswers((a) => ({ ...a, horizonte: e.target.value as InvestorProfileAnswers['horizonte'] }))} className={inputCls}>
                      <option value="&lt;2">Menos de 2 anos</option>
                      <option value="2-5">2 a 5 anos</option>
                      <option value="&gt;5">Mais de 5 anos</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="inv-queda">Reação a queda de 20%</label>
                    <select id="inv-queda" value={answers.toleranciaQueda}
                      onChange={(e) => setAnswers((a) => ({ ...a, toleranciaQueda: e.target.value as InvestorProfileAnswers['toleranciaQueda'] }))} className={inputCls}>
                      <option value="baixa">Venderia para reduzir risco</option>
                      <option value="media">Manteria a estratégia</option>
                      <option value="alta">Aumentaria as posições</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="inv-exp">Experiência</label>
                    <select id="inv-exp" value={answers.experiencia}
                      onChange={(e) => setAnswers((a) => ({ ...a, experiencia: e.target.value as InvestorProfileAnswers['experiencia'] }))} className={inputCls}>
                      <option value="iniciante">Iniciante (poupança/CDB)</option>
                      <option value="intermediario">Fundos e ações</option>
                      <option value="avancado">Derivativos, cripto, alavancagem</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="inv-liquidez">Necessidade de liquidez</label>
                    <select id="inv-liquidez" value={answers.liquidez}
                      onChange={(e) => setAnswers((a) => ({ ...a, liquidez: e.target.value as InvestorProfileAnswers['liquidez'] }))} className={inputCls}>
                      <option value="alta">Posso precisar em até 6 meses</option>
                      <option value="media">Posso deixar de 1 a 3 anos</option>
                      <option value="baixa">Posso investir por mais de 3 anos</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="inv-renda">Capacidade de aporte</label>
                    <select id="inv-renda" value={answers.renda}
                      onChange={(e) => setAnswers((a) => ({ ...a, renda: e.target.value as InvestorProfileAnswers['renda'] }))} className={inputCls}>
                      <option value="baixa">Investimento limitado</option>
                      <option value="media">Parte relevante da renda</option>
                      <option value="alta">Alta capacidade com reserva sólida</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-si-5">Sugerido: <span className="font-semibold text-si-2 capitalize">{perfilCalculado.profile}</span> · score {perfilCalculado.score}</p>
                  <div className="flex gap-2">
                    <button type="submit" disabled={busy}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-si-1 text-sm font-bold disabled:opacity-50">
                      {busy ? 'Salvando…' : currentProfile ? 'Atualizar perfil' : 'Salvar perfil'}
                    </button>
                    {currentProfile && (
                      <button type="button" onClick={() => setIsRefakingSuitability(false)}
                        className="px-5 py-2.5 rounded-xl bg-si-over-2 border border-si-border text-si-3 text-sm font-semibold hover:bg-si-over-3">
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Registrar Investimento ── */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Registrar investimento">
        <form onSubmit={handleAdd} className="space-y-4">
          {error && <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-rose-400 text-sm">{error}</div>}
          <div>
            <label htmlFor="inv-date" className={labelCls}>Data</label>
            <input id="inv-date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label htmlFor="inv-tipo" className={labelCls}>Tipo</label>
            <select id="inv-tipo" value={formTipo} onChange={(e) => setFormTipo(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500">
              {INVESTMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="relative">
            <label htmlFor="inv-nome" className={labelCls}>Nome / ativo {isRV && <span className="text-zinc-500">(ticker, ex: PETR4)</span>}</label>
            <input id="inv-nome" type="text" value={formNome} onChange={(e) => handleTickerInput(e.target.value)}
              placeholder={isRV ? 'Ex: PETR4, BOVA11, MXRF11' : 'Ex: Tesouro Selic, CDB Nubank'}
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              autoComplete="off"
              required />
            {isRV && tickerSuggestions.length > 0 && (
              <ul className="absolute z-50 left-0 right-0 mt-1 bg-si-card border border-si-border-md rounded-xl shadow-xl overflow-hidden">
                {tickerSearchBusy && <li className="px-4 py-2 text-xs text-si-5">Buscando…</li>}
                {tickerSuggestions.map((s) => (
                  <li key={s.ticker}>
                    <button type="button" onClick={() => selectTicker(s)}
                      className="w-full text-left px-4 py-2 hover:bg-si-over-2 text-sm flex items-center gap-3">
                      <span className="font-bold text-si-1 w-20 shrink-0">{s.ticker}</span>
                      <span className="text-si-4 truncate">{s.name}</span>
                      {s.type && <span className="ml-auto text-[10px] text-si-5 uppercase">{s.type}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {isRV && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="inv-qtd" className={labelCls}>Quantidade</label>
                <input id="inv-qtd" type="text" inputMode="decimal" value={formQtd}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9,.]/, '');
                    setFormQtd(v);
                    syncValorFromQtdPreco(v, formPrecoCompra);
                  }}
                  placeholder="0"
                  className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label htmlFor="inv-preco-compra" className={labelCls}>Preço de compra (R$)</label>
                <input id="inv-preco-compra" type="text" inputMode="decimal" value={formPrecoCompra}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9,.-]/, '');
                    setFormPrecoCompra(v);
                    syncValorFromQtdPreco(formQtd, v);
                  }}
                  placeholder="0,00"
                  className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          )}
          <div>
            <label htmlFor="inv-valor" className={labelCls}>Valor aplicado (R$){isRV && formQtd && formPrecoCompra && <span className="text-blue-400 ml-1">— calculado</span>}</label>
            <input id="inv-valor" type="text" inputMode="decimal" value={formValor}
              onChange={(e) => setFormValor(e.target.value.replace(/[^0-9,.-]/, ''))} placeholder="0,00"
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              required />
          </div>

          <div>
            <label htmlFor="inv-atual" className={labelCls}>Valor atual (R$) – opcional</label>
            <input id="inv-atual" type="text" inputMode="decimal" value={formAtual}
              onChange={(e) => setFormAtual(e.target.value.replace(/[^0-9,.-]/, ''))}
              placeholder="Igual ao aplicado se não preencher"
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label htmlFor="inv-proventos" className={labelCls}>Proventos mensais estimados (R$) – opcional</label>
            <input id="inv-proventos" type="text" inputMode="decimal" value={formProventos}
              onChange={(e) => setFormProventos(e.target.value.replace(/[^0-9,.-]/, ''))}
              placeholder="Ex: 50,00"
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label htmlFor="inv-conta" className={labelCls}>Conta (opcional)</label>
            <select id="inv-conta" value={formConta} onChange={(e) => setFormConta(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500">
              <option value="">—</option>
              {accounts.length > 0
                ? accounts.map((a) => <option key={a} value={a}>{a}</option>)
                : DEFAULT_ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={busy}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-si-1 font-bold text-sm">
              {busy ? 'Salvando…' : 'Registrar'}
            </button>
            <button type="button" onClick={() => setAddOpen(false)}
              className="px-6 py-3 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 font-medium text-sm hover:bg-si-over-3">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Registrar Provento ── */}
      <Modal open={addProventoOpen} onClose={() => setAddProventoOpen(false)} title="Registrar provento">
        <form onSubmit={handleAddProvento} className="space-y-4">
          {error && <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2 text-rose-400 text-sm">{error}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="prov-date" className={labelCls}>Data do provento</label>
              <input id="prov-date" type="date" value={provDate} onChange={(e) => setProvDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-si-bg border border-si-border-md text-si-1 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="prov-account" className={labelCls}>Conta de crédito</label>
              <select id="prov-account" value={provConta} onChange={(e) => setProvConta(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-si-bg border border-si-border-md text-si-1 text-sm focus:outline-none focus:border-blue-500">
                <option value="">Selecione</option>
                {(accounts.length ? accounts : DEFAULT_ACCOUNTS).map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="prov-desc" className={labelCls}>Descrição</label>
            <input id="prov-desc" type="text" value={provDesc} onChange={(e) => setProvDesc(e.target.value)}
              placeholder="Ex: Dividendos PETR4"
              className="w-full px-3 py-2.5 rounded-xl bg-si-bg border border-si-border-md text-si-1 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label htmlFor="prov-value" className={labelCls}>Valor (R$)</label>
            <input id="prov-value" type="text" inputMode="decimal" value={provValor}
              onChange={(e) => setProvValor(e.target.value.replace(/[^0-9,.-]/, ''))} placeholder="0,00"
              className="w-full px-3 py-2.5 rounded-xl bg-si-bg border border-si-border-md text-si-1 text-sm focus:outline-none focus:border-blue-500"
              required />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={busy}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-si-1 font-bold text-sm disabled:opacity-50">
              {busy ? 'Salvando…' : 'Registrar'}
            </button>
            <button type="button" onClick={() => setAddProventoOpen(false)}
              className="px-6 py-3 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 font-medium text-sm hover:bg-si-over-3">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Editar Investimento ── */}
      <Modal open={!!editingAtual} onClose={() => setEditingAtual(null)} title="Editar investimento">
        {editingAtual && (
          <form onSubmit={handleUpdateAtual} className="space-y-4">
            {error && <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-rose-400 text-sm">{error}</div>}
            <div>
              <label htmlFor="edit-atual" className={labelCls}>{editingAtual.nome} – valor atual (R$)</label>
              <input id="edit-atual" type="text" inputMode="decimal" value={editAtualValue}
                onChange={(e) => setEditAtualValue(e.target.value.replace(/[^0-9,.-]/, ''))}
                className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
                placeholder="0,00" />
            </div>
            <div>
              <label htmlFor="edit-proventos" className={labelCls}>Proventos mensais estimados (R$) – opcional</label>
              <input id="edit-proventos" type="text" inputMode="decimal" value={editProventosValue}
                onChange={(e) => setEditProventosValue(e.target.value.replace(/[^0-9,.-]/, ''))}
                className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                placeholder="0,00" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={busy}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-si-1 font-bold text-sm">
                {busy ? 'Salvando…' : 'Salvar'}
              </button>
              <button type="button" onClick={() => setEditingAtual(null)}
                className="px-6 py-3 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 font-medium text-sm hover:bg-si-over-3">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Modal: Excluir ── */}
      <Modal open={deletingId !== null} onClose={() => setDeletingId(null)} title="Excluir investimento">
        <p className="text-si-4 text-sm mb-6">Tem certeza que deseja excluir este investimento? Esta ação não pode ser desfeita.</p>
        <div className="flex gap-3">
          <button type="button" onClick={() => deletingId != null && handleDelete(deletingId)} disabled={busy}
            className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-si-1 font-bold text-sm">
            {busy ? 'Excluindo…' : 'Excluir'}
          </button>
          <button type="button" onClick={() => setDeletingId(null)}
            className="px-6 py-3 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 font-medium text-sm hover:bg-si-over-3">
            Cancelar
          </button>
        </div>
      </Modal>

      {/* ── Modal de Alerta de Preço (global na página) ── */}
      {alertModalTicker && (
        <PriceAlertModal
          ticker={alertModalTicker.ticker}
          nome={alertModalTicker.nome}
          currentPrice={alertModalTicker.currentPrice}
          onClose={() => setAlertModalTicker(null)}
        />
      )}

    </div>
  );
}
