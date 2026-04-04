import { useState, useMemo } from 'react';
import { InvestmentInsights } from '../components/ui/InvestmentInsights';
import { useAppContext } from '../context/AppContext';
import { useSibcoinToast } from '../hooks/useSibcoinToast';
import { addInvestment, updateInvestment, deleteInvestment, addEntry, updateUserDoc } from '../services/persistUserData';
import type { Entry, Investment, InvestorProfileAnswers, InvestorProfile } from '../types/userData';
import { INVESTMENT_TYPES, DEFAULT_ACCOUNTS } from '../constants/defaults';
import { Modal } from '../components/ui/Modal';
import { TrendingUp, Plus, Pencil, Trash2, Calculator, ChevronDown, Zap, ArrowRight } from 'lucide-react';
import { SibcoinMissionBanner } from '../components/sibcoin/SibcoinMissionBanner';
import { useNavigate } from 'react-router-dom';
import { fetchB3Quote } from '../services/brapi';
import { PortfolioChart } from '../components/charts/PortfolioChart';
import { ProventosBarChart } from '../components/charts/ProventosBarChart';


export default function Growth() {
  const { user, investments, accounts, entries, loading, investorProfile, hasOpenFinance, dataFreshness, verifiedEntries } = useAppContext();
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
  const [editAtualValue, setEditAtualValue] = useState('');

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
  const [b3Data, setB3Data] = useState<{
    ticker: string; name: string; price: number; change: number;
    changePct: number; type?: string; sector?: string; dy?: number; pe?: number;
  } | null>(null);


  // UI state
  const [showProventos, setShowProventos] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
    setError(null);
    setBusy(true);
    try {
      await addInvestment(user.uid, investments, {
        date: formDate, tipo: formTipo, nome: formNome.trim(),
        valor: Math.round(valor * 100) / 100,
        atual: Math.round(atual * 100) / 100,
        conta: formConta || undefined,
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
    setError(null);
  };

  const handleUpdateAtual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !editingAtual) return;
    const atual = parseFloat(editAtualValue.replace(',', '.')) || 0;
    setError(null); setBusy(true);
    try {
      await updateInvestment(user.uid, investments, editingAtual.id, { ...editingAtual, atual: Math.round(atual * 100) / 100 });
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

  const perfilCalculado: InvestorProfile | null = (() => {
    let score = 0;
    if (answers.objetivos === 'preservar-capital') score += 5;
    if (answers.objetivos === 'crescimento') score += 15;
    if (answers.objetivos === 'especulacao') score += 25;
    if (answers.horizonte === '<2') score += 5;
    if (answers.horizonte === '2-5') score += 10;
    if (answers.horizonte === '>5') score += 20;
    if (answers.toleranciaQueda === 'baixa') score += 5;
    if (answers.toleranciaQueda === 'media') score += 10;
    if (answers.toleranciaQueda === 'alta') score += 20;
    if (answers.experiencia === 'iniciante') score += 5;
    if (answers.experiencia === 'intermediario') score += 10;
    if (answers.experiencia === 'avancado') score += 15;
    if (answers.liquidez === 'alta') score += 5;
    if (answers.liquidez === 'media') score += 10;
    if (answers.liquidez === 'baixa') score += 15;
    if (answers.renda === 'baixa') score += 5;
    if (answers.renda === 'media') score += 10;
    if (answers.renda === 'alta') score += 15;
    const normalized = Math.max(0, Math.min(100, score));
    let profile: InvestorProfile['profile'];
    if (normalized <= 30) profile = 'conservador';
    else if (normalized <= 65) profile = 'moderado';
    else profile = 'arrojado';
    return { profile, score: normalized, version: 1, updatedAt: new Date().toISOString(), answers };
  })();

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

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

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

      <InvestmentInsights
        investments={investments}
        entries={entries}
        investorProfile={investorProfile}
        hasOpenFinance={hasOpenFinance}
        dataFreshness={dataFreshness}
        verifiedEntries={verifiedEntries}
      />

      {error && !addOpen && !editingAtual && deletingId === null && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-rose-400 text-sm">{error}</div>
      )}

      {/* ── KPI Cards ── */}
      {investments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-si-card rounded-2xl border border-si-border p-6">
            <p className="text-si-5 text-sm mb-1">Total aplicado</p>
            <p className="text-2xl font-bold text-si-1">
              R$ {totalAplicado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-si-card rounded-2xl border border-si-border p-6">
            <p className="text-si-5 text-sm mb-1">Valor atual</p>
            <p className={`text-2xl font-bold ${totalAtual >= totalAplicado ? 'text-emerald-400' : 'text-rose-400'}`}>
              R$ {totalAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-si-card rounded-2xl border border-si-border p-6">
            <p className="text-si-5 text-sm mb-1">Rentabilidade</p>
            <p className={`text-2xl font-bold ${rentab >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {rentab >= 0 ? '+' : ''}{rentab.toFixed(2)}%
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              {rentab >= 0 ? '+' : ''}R$ {(totalAtual - totalAplicado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      )}

      {/* ── Charts ── */}
      {portfolioAlloc.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="bg-si-card rounded-2xl border border-si-border p-6">
            <h3 className="font-semibold text-si-1 mb-3">Alocação por tipo</h3>
            <PortfolioChart data={portfolioAlloc} height={220} />
          </div>
          {proventosChart.length > 0 && (
            <div className="bg-si-card rounded-2xl border border-si-border p-6">
              <h3 className="font-semibold text-si-1 mb-3">Proventos mensais</h3>
              <ProventosBarChart data={proventosChart.map((p) => ({ label: p.mes, valor: p.value }))} height={220} />
            </div>
          )}
        </div>
      )}

      {/* ── Investment List ── */}
      <div className="bg-si-card rounded-2xl border border-si-border overflow-hidden">
        {investments.length === 0 ? (
          <div className="p-12 text-center text-si-5">
            Nenhum investimento ainda. Clique em &quot;Novo investimento&quot; para começar.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {sorted.map((inv) => {
              const lucro = (inv.atual ?? inv.valor ?? 0) - (inv.valor ?? 0);
              const pct = inv.valor && inv.valor > 0 ? (lucro / inv.valor) * 100 : 0;
              return (
                <div key={inv.id} className="flex items-center justify-between gap-4 p-5 hover:bg-si-over-1 transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-si-1 truncate">{inv.nome || '—'}</p>
                      <p className="text-xs text-si-5">
                        {inv.tipo || '—'} · {inv.date ? new Date(inv.date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                        {inv.conta ? ` · ${inv.conta}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="font-bold text-si-1">
                        R$ {(inv.atual ?? inv.valor ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className={`text-xs font-semibold ${pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                        <span className="text-zinc-600 font-normal ml-1">
                          de R$ {(inv.valor ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => openEditAtual(inv)}
                        className="p-2 rounded-lg hover:bg-si-over-3 text-si-4 hover:text-si-1" title="Atualizar valor">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => setDeletingId(inv.id)}
                        className="p-2 rounded-lg hover:bg-rose-500/20 text-si-4 hover:text-rose-400" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Proventos – Colapsável ── */}
      <div className="bg-si-card rounded-2xl border border-si-border overflow-hidden">
        <button type="button" onClick={() => setShowProventos(!showProventos)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-si-over-1 transition-colors">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-si-1">Proventos recebidos</h3>
            {proventos.length > 0 && (
              <span className="text-xs font-semibold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                {proventos.length}
              </span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-si-5 transition-transform duration-200 ${showProventos ? 'rotate-180' : ''}`} />
        </button>
        {showProventos && (
          <div className="px-6 pb-6 border-t border-si-border">
            <p className="text-si-5 text-sm my-4">
              Receitas registradas nas categorias &quot;Proventos&quot; ou &quot;Dividendos&quot;.
            </p>
            {proventos.length === 0 ? (
              <p className="text-si-5 text-sm">Nenhum provento ainda. Use o botão &quot;Provento&quot; para adicionar.</p>
            ) : (
              <div className="max-h-72 overflow-y-auto border border-si-border rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-si-5 border-b border-si-border">
                      <th className="px-4 py-2">Data</th>
                      <th className="px-4 py-2">Descrição</th>
                      <th className="px-4 py-2">Conta</th>
                      <th className="px-4 py-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proventos.map((p) => (
                      <tr key={p.id} className="border-b border-si-border last:border-0">
                        <td className="px-4 py-2 text-si-3">
                          {p.date ? new Date(p.date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="px-4 py-2 text-si-2">{p.desc || p.category || 'Provento'}</td>
                        <td className="px-4 py-2 text-si-4">{p.account || '—'}</td>
                        <td className="px-4 py-2 text-right font-bold text-emerald-400">
                          R$ {Number(p.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Botão Ver Mais ── */}
      <div className="flex justify-center pt-2">
        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-2.5 px-7 py-3 rounded-2xl border font-semibold text-sm transition-all duration-200 ${
            showAdvanced
              ? 'border-blue-500/50 bg-blue-500/10 text-blue-300 hover:bg-blue-500/15'
              : 'border-si-border-md bg-si-over-1 text-si-4 hover:text-si-2 hover:bg-white/[0.06] hover:border-si-border-xl'
          }`}>
          <Zap className="w-4 h-4" />
          {showAdvanced ? 'Ocultar ferramentas avançadas' : 'Ver análises e simuladores'}
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* ── Ferramentas Avançadas ── */}
      {showAdvanced && (
        <div className="space-y-6">

          {/* B3 */}
          <section className="bg-si-card rounded-2xl border border-si-border p-6">
            <h3 className="font-semibold text-si-1 mb-1">Análise B3 (cotações)</h3>
            <p className="text-si-5 text-sm mb-4">Consulte ações, FIIs e ETFs em tempo real. Dados via Brapi — apenas informativo.</p>
            <form onSubmit={handleSearchB3} className="flex flex-wrap gap-3 items-end mb-4">
              <div className="flex-1 min-w-[160px]">
                <label htmlFor="b3-ticker" className={labelCls}>Ticker (ex: PETR4, ITUB4, BOVA11)</label>
                <input id="b3-ticker" type="text" value={b3Ticker}
                  onChange={(e) => setB3Ticker(e.target.value.toUpperCase())}
                  className={inputCls} placeholder="Digite um ticker" />
              </div>
              <button type="submit" disabled={b3Loading}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-si-1 text-sm font-bold disabled:opacity-50">
                {b3Loading ? 'Buscando…' : 'Buscar'}
              </button>
            </form>
            {b3Error && <p className="text-sm text-rose-400 mb-3">{b3Error}</p>}
            {b3Data && (
              <div className="border border-si-border-md rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-xs text-si-5 uppercase tracking-wide">Ticker</p>
                    <p className="text-lg font-bold text-si-1">{b3Data.ticker} <span className="text-si-4 text-xs font-normal">{b3Data.type || ''}</span></p>
                    <p className="text-sm text-si-4 truncate max-w-[260px]">{b3Data.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-si-5">Preço atual</p>
                    <p className="text-xl font-bold text-si-1">R$ {b3Data.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className={`text-xs font-semibold ${b3Data.changePct > 0 ? 'text-emerald-400' : b3Data.changePct < 0 ? 'text-rose-400' : 'text-si-4'}`}>
                      {b3Data.changePct > 0 ? '+' : ''}{b3Data.changePct.toFixed(2)}% ({b3Data.change.toFixed(2)})
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  {b3Data.sector && <div><p className="text-xs text-si-5">Setor</p><p className="text-si-2">{b3Data.sector}</p></div>}
                  {typeof b3Data.dy === 'number' && <div><p className="text-xs text-si-5">Dividend Yield</p><p className="text-si-2">{b3Data.dy.toFixed(2)}%</p></div>}
                  {typeof b3Data.pe === 'number' && <div><p className="text-xs text-si-5">P/L</p><p className="text-si-2">{b3Data.pe.toFixed(2)}</p></div>}
                </div>
                <p className="text-[11px] text-zinc-600 mt-1">Dados por Brapi. Não é recomendação de investimento.</p>
              </div>
            )}
          </section>

          {/* Perfil do Investidor */}
          <section className="bg-si-card rounded-2xl border border-si-border p-6">
            <h3 className="font-semibold text-si-1 mb-1">Perfil do investidor</h3>
            {currentProfile ? (
              <div className="mb-5 flex items-center gap-4 bg-si-over-1 border border-si-border rounded-xl p-4">
                <div>
                  <p className="text-xs text-si-5">Perfil atual</p>
                  <p className="text-xl font-bold text-emerald-400 capitalize">{currentProfile.profile}</p>
                  <p className="text-xs text-si-5">Score {currentProfile.score} · Atualizado em {new Date(currentProfile.updatedAt).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            ) : (
              <p className="text-si-5 text-sm mb-4">Responda para descobrir seu perfil de risco.</p>
            )}
            <form className="space-y-4" onSubmit={async (e) => {
              e.preventDefault();
              if (!user?.uid) return;
              setError(null); setBusy(true);
              try { await updateUserDoc(user.uid, { investorProfile: perfilCalculado }); }
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
                    <option value="<2">Menos de 2 anos</option>
                    <option value="2-5">2 a 5 anos</option>
                    <option value=">5">Mais de 5 anos</option>
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
                <button type="submit" disabled={busy}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-si-1 text-sm font-bold disabled:opacity-50">
                  {busy ? 'Salvando…' : currentProfile ? 'Atualizar perfil' : 'Salvar perfil'}
                </button>
              </div>
            </form>
          </section>

          {/* ── Link para Ferramentas ── */}
          <section className="bg-si-card rounded-2xl border border-si-border p-6">
            <div className="flex items-center gap-3 mb-3">
              <Calculator className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold text-si-1">Simuladores e calculadoras</h3>
            </div>
            <p className="text-si-5 text-sm mb-4">
              Juros compostos, FIRE, renda fixa, renda passiva e preço médio foram movidos para a seção de Ferramentas — acessíveis de qualquer lugar do app.
            </p>
            <button
              type="button"
              onClick={() => navigate('/ferramentas')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-si-1 font-bold text-sm transition-colors"
            >
              <Calculator className="w-4 h-4" />
              Abrir Ferramentas
              <ArrowRight className="w-4 h-4" />
            </button>
          </section>
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
          <div>
            <label htmlFor="inv-nome" className={labelCls}>Nome / ativo</label>
            <input id="inv-nome" type="text" value={formNome} onChange={(e) => setFormNome(e.target.value)}
              placeholder="Ex: Tesouro Selic, PETR4"
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              required />
          </div>
          <div>
            <label htmlFor="inv-valor" className={labelCls}>Valor aplicado (R$)</label>
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

      {/* ── Modal: Atualizar Valor Atual ── */}
      <Modal open={!!editingAtual} onClose={() => setEditingAtual(null)} title="Atualizar valor atual">
        {editingAtual && (
          <form onSubmit={handleUpdateAtual} className="space-y-4">
            {error && <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-rose-400 text-sm">{error}</div>}
            <p className="text-si-4 text-sm">{editingAtual.nome} – novo valor atual (R$)</p>
            <input type="text" inputMode="decimal" value={editAtualValue}
              onChange={(e) => setEditAtualValue(e.target.value.replace(/[^0-9,.-]/, ''))}
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
              placeholder="0,00" />
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

    </div>
  );
}
