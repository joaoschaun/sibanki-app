import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useFinancialData } from '../hooks/useFinancialData';
import { addInvestment, updateInvestment, deleteInvestment, addEntry, updateUserDoc } from '../services/persistUserData';
import type { Entry, Investment, InvestorProfileAnswers, InvestorProfile } from '../types/userData';
import { INVESTMENT_TYPES, DEFAULT_ACCOUNTS } from '../constants/defaults';
import { Modal } from '../components/ui/Modal';
import { TrendingUp, Plus, Pencil, Trash2, Calculator } from 'lucide-react';
import { fetchB3Quote } from '../services/brapi';

export default function Growth() {
  const { user } = useAuth();
  const { investments, accounts, entries, loading, data, investorProfile } = useFinancialData(user?.uid);
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
    ticker: string;
    name: string;
    price: number;
    change: number;
    changePct: number;
    type?: string;
    sector?: string;
    dy?: number;
    pe?: number;
  } | null>(null);

  const [simInitial, setSimInitial] = useState('1000');
  const [simMonthly, setSimMonthly] = useState('200');
  const [simRate, setSimRate] = useState('10');
  const [simMonths, setSimMonths] = useState('60');
  const [goalAmount, setGoalAmount] = useState('100000');
  const [goalRate, setGoalRate] = useState('10');
  const [goalYears, setGoalYears] = useState('15');
  const [goalInitial, setGoalInitial] = useState('0');

  const totalAplicado = investments.reduce((s, i) => s + (i.valor ?? 0), 0);
  const totalAtual = investments.reduce((s, i) => s + (i.atual ?? i.valor ?? 0), 0);

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
        type: 'receita',
        date: provDate,
        desc: provDesc.trim() || 'Provento',
        category: 'Proventos',
        value: Math.round(v * 100) / 100,
        account: provConta || undefined,
      };
      await addEntry(user.uid, entries, data);
      setAddProventoOpen(false);
      setProvDesc('');
      setProvValor('');
      setProvConta('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar provento.');
    } finally {
      setBusy(false);
    }
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
        date: formDate,
        tipo: formTipo,
        nome: formNome.trim(),
        valor: Math.round(valor * 100) / 100,
        atual: Math.round(atual * 100) / 100,
        conta: formConta || undefined,
      });
      setAddOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar investimento.');
    } finally {
      setBusy(false);
    }
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
    setError(null);
    setBusy(true);
    try {
      await updateInvestment(user.uid, investments, editingAtual.id, {
        ...editingAtual,
        atual: Math.round(atual * 100) / 100,
      });
      setEditingAtual(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!user?.uid) return;
    setError(null);
    setBusy(true);
    try {
      await deleteInvestment(user.uid, investments, id);
      setDeletingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir.');
    } finally {
      setBusy(false);
    }
  };

  const sorted = [...investments].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const proventos = [...entries]
    .filter((e) => e.type === 'receita' && (e.category === 'Proventos' || e.category === 'Dividendos'))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

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

    return {
      profile,
      score: normalized,
      version: 1,
      updatedAt: new Date().toISOString(),
      answers,
    };
  })();

  const handleSearchB3 = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = b3Ticker.trim().toUpperCase();
    if (!t) return;
    setB3Error(null);
    setB3Loading(true);
    try {
      const quote = await fetchB3Quote(t);
      setB3Data(quote);
    } catch (err) {
      setB3Error(err instanceof Error ? err.message : 'Erro ao consultar B3.');
      setB3Data(null);
    } finally {
      setB3Loading(false);
    }
  };

  const simResult = (() => {
    const P = parseFloat(simInitial.replace(',', '.')) || 0;
    const PMT = parseFloat(simMonthly.replace(',', '.')) || 0;
    const rateYear = parseFloat(simRate.replace(',', '.')) || 0;
    const n = Math.max(0, Math.min(600, parseInt(simMonths, 10) || 0));
    if (n === 0) return null;
    const i = rateYear / 100 / 12;
    let FV = P * Math.pow(1 + i, n);
    if (PMT > 0 && i > 0) FV += PMT * ((Math.pow(1 + i, n) - 1) / i);
    else if (PMT > 0) FV += PMT * n;
    return { FV, totalInvested: P + PMT * n };
  })();

  const goalResult = (() => {
    const target = parseFloat(goalAmount.replace(',', '.')) || 0;
    const rateYear = parseFloat(goalRate.replace(',', '.')) || 0;
    const years = parseFloat(goalYears.replace(',', '.')) || 0;
    const initial = parseFloat(goalInitial.replace(',', '.')) || 0;
    if (target <= 0 || rateYear <= 0 || years <= 0) return null;
    const n = Math.round(years * 12);
    const i = rateYear / 100 / 12;
    const base = target - initial * Math.pow(1 + i, n);
    if (base <= 0 || i <= 0 || n <= 0) {
      return { monthly: 0, totalInvested: initial, years };
    }
    const PMT = base * i / (Math.pow(1 + i, n) - 1);
    return {
      monthly: PMT,
      totalInvested: initial + PMT * n,
      years,
    };
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold">Crescimento</h2>
          <p className="text-zinc-500 text-sm">Investimentos e proventos – mesmo dados do app atual</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAddProventoOpen(true)}
            className="bg-white/5 hover:bg-white/10 text-zinc-100 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 border border-white/10"
          >
            <Plus className="w-4 h-4" /> Registrar provento
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Registrar investimento
          </button>
        </div>
      </div>

      {error && !addOpen && !editingAtual && deletingId === null && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {investments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#0a0f18] rounded-2xl border border-white/5 p-6">
            <p className="text-zinc-500 text-sm">Total aplicado</p>
            <p className="text-2xl font-bold text-zinc-100">
              R$ {totalAplicado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-[#0a0f18] rounded-2xl border border-white/5 p-6">
            <p className="text-zinc-500 text-sm">Valor atual</p>
            <p className={`text-2xl font-bold ${totalAtual >= totalAplicado ? 'text-emerald-400' : 'text-rose-400'}`}>
              R$ {totalAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      )}

      <div className="bg-[#0a0f18] rounded-2xl border border-white/5 overflow-hidden">
        {investments.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            Nenhum investimento. Clique em &quot;Registrar investimento&quot; para adicionar.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {sorted.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between gap-4 p-6 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-zinc-100 truncate">{inv.nome || '—'}</p>
                    <p className="text-xs text-zinc-500">
                      {inv.tipo || '—'} · {inv.date ? new Date(inv.date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                      {inv.conta ? ` · ${inv.conta}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-sm text-zinc-500">Aplicado: R$ {(inv.valor ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="font-bold text-zinc-100">
                      Atual: R$ {(inv.atual ?? inv.valor ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditAtual(inv)}
                      className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white"
                      title="Atualizar valor"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(inv.id)}
                      className="p-2 rounded-lg hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <section className="bg-[#0a0f18] rounded-2xl border border-white/5 p-6">
        <h3 className="font-semibold text-zinc-100 mb-3">Proventos</h3>
        <p className="text-zinc-500 text-sm mb-4">
          Lista de proventos registrados como receitas na categoria &quot;Proventos&quot; ou &quot;Dividendos&quot;.
        </p>
        {proventos.length === 0 ? (
          <p className="text-zinc-500 text-sm">Nenhum provento ainda. Use &quot;Registrar provento&quot; para adicionar.</p>
        ) : (
          <div className="max-h-72 overflow-y-auto border border-white/5 rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-500 border-b border-white/5">
                  <th className="px-4 py-2">Data</th>
                  <th className="px-4 py-2">Descrição</th>
                  <th className="px-4 py-2">Conta</th>
                  <th className="px-4 py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {proventos.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-2 text-zinc-300">
                      {p.date ? new Date(p.date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-200">{p.desc || p.category || 'Provento'}</td>
                    <td className="px-4 py-2 text-zinc-400">{p.account || '—'}</td>
                    <td className="px-4 py-2 text-right font-bold text-emerald-400">
                      R$ {Number(p.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-[#0a0f18] rounded-2xl border border-white/5 p-6">
        <h3 className="font-semibold text-zinc-100 mb-3">Análise B3 (cotações)</h3>
        <p className="text-zinc-500 text-sm mb-4">
          Consulte dados de ações, FIIs e ETFs na B3 usando a integração oficial do app com a Brapi. Esta análise é informativa e não constitui recomendação de investimento.
        </p>
        <form onSubmit={handleSearchB3} className="flex flex-wrap gap-3 items-center mb-4">
          <div className="flex-1 min-w-[160px]">
            <label htmlFor="b3-ticker" className="block text-xs font-medium text-zinc-500 mb-1">
              Ticker (ex: PETR4, ITUB4, BOVA11)
            </label>
            <input
              id="b3-ticker"
              type="text"
              value={b3Ticker}
              onChange={(e) => setB3Ticker(e.target.value.toUpperCase())}
              className="w-full px-3 py-2.5 rounded-xl bg-[#05080d] border border-white/10 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
              placeholder="Digite um ticker da B3"
            />
          </div>
          <button
            type="submit"
            disabled={b3Loading}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold disabled:opacity-50"
          >
            {b3Loading ? 'Buscando…' : 'Buscar'}
          </button>
        </form>
        {b3Error && (
          <p className="text-sm text-rose-400 mb-3">
            {b3Error}
          </p>
        )}
        {b3Data ? (
          <div className="border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Ticker</p>
                <p className="text-lg font-bold text-zinc-100">
                  {b3Data.ticker}{' '}
                  <span className="text-zinc-400 text-xs font-normal ml-1">{b3Data.type || ''}</span>
                </p>
                <p className="text-sm text-zinc-400 truncate max-w-[260px]">{b3Data.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500">Preço atual</p>
                <p className="text-xl font-bold text-zinc-100">
                  R$ {b3Data.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p
                  className={`text-xs font-semibold ${
                    b3Data.changePct > 0 ? 'text-emerald-400' : b3Data.changePct < 0 ? 'text-rose-400' : 'text-zinc-400'
                  }`}
                >
                  {b3Data.changePct > 0 ? '+' : ''}
                  {b3Data.changePct.toFixed(2)}% ({b3Data.change.toFixed(2)})
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {b3Data.sector && (
                <div>
                  <p className="text-xs text-zinc-500">Setor</p>
                  <p className="text-zinc-200">{b3Data.sector}</p>
                </div>
              )}
              {typeof b3Data.dy === 'number' && (
                <div>
                  <p className="text-xs text-zinc-500">Dividend Yield</p>
                  <p className="text-zinc-200">{b3Data.dy.toFixed(2)}%</p>
                </div>
              )}
              {typeof b3Data.pe === 'number' && (
                <div>
                  <p className="text-xs text-zinc-500">P/L</p>
                  <p className="text-zinc-200">{b3Data.pe.toFixed(2)}</p>
                </div>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Dados fornecidos por Brapi. Use apenas para fins informativos e sempre complemente com sua própria análise.
            </p>
          </div>
        ) : null}
      </section>

      <section className="bg-[#0a0f18] rounded-2xl border border-white/5 p-6 max-w-xl">
        <h3 className="font-semibold text-zinc-100 mb-3">Perfil do investidor</h3>
        {currentProfile ? (
          <div className="mb-6">
            <p className="text-sm text-zinc-400 mb-1">Perfil atual:</p>
            <p className="text-xl font-bold text-emerald-400 capitalize">
              {currentProfile.profile}
            </p>
            <p className="text-xs text-zinc-500">
              Score: {currentProfile.score} · Atualizado em{' '}
              {new Date(currentProfile.updatedAt).toLocaleDateString('pt-BR')}
            </p>
            <p className="text-xs text-zinc-500 mt-2">
              Esse perfil é um indicativo de adequação ao risco. Não é recomendação de investimento.
            </p>
          </div>
        ) : (
          <p className="text-zinc-500 text-sm mb-4">
            Responda às perguntas abaixo para descobrir seu perfil de investidor (conservador, moderado ou arrojado).
          </p>
        )}
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!user?.uid) return;
            setError(null);
            setBusy(true);
            try {
              await updateUserDoc(user.uid, { investorProfile: perfilCalculado });
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Erro ao salvar perfil.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1" htmlFor="inv-obj">Objetivo principal com investimentos</label>
            <select
              id="inv-obj"
              value={answers.objetivos}
              onChange={(e) => setAnswers((a) => ({ ...a, objetivos: e.target.value as InvestorProfileAnswers['objetivos'] }))}
              className="w-full px-3 py-2.5 rounded-xl bg-[#05080d] border border-white/10 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
            >
              <option value="preservar-capital">Preservar capital e acompanhar a renda fixa</option>
              <option value="crescimento">Crescimento de patrimônio no médio/longo prazo</option>
              <option value="especulacao">Máximo retorno aceitando fortes oscilações</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1" htmlFor="inv-horizonte">Horizonte de investimento</label>
            <select
              id="inv-horizonte"
              value={answers.horizonte}
              onChange={(e) => setAnswers((a) => ({ ...a, horizonte: e.target.value as InvestorProfileAnswers['horizonte'] }))}
              className="w-full px-3 py-2.5 rounded-xl bg-[#05080d] border border-white/10 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
            >
              <option value="<2">Menos de 2 anos</option>
              <option value="2-5">Entre 2 e 5 anos</option>
              <option value=">5">Mais de 5 anos</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1" htmlFor="inv-queda">
              Como você reagiria a uma queda de 20% em 12 meses?
            </label>
            <select
              id="inv-queda"
              value={answers.toleranciaQueda}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, toleranciaQueda: e.target.value as InvestorProfileAnswers['toleranciaQueda'] }))
              }
              className="w-full px-3 py-2.5 rounded-xl bg-[#05080d] border border-white/10 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
            >
              <option value="baixa">Venderia boa parte para reduzir o risco</option>
              <option value="media">Manteria a estratégia, ajustando pouco</option>
              <option value="alta">Aproveitaria para aumentar as posições</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1" htmlFor="inv-exp">Experiência com investimentos</label>
            <select
              id="inv-exp"
              value={answers.experiencia}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, experiencia: e.target.value as InvestorProfileAnswers['experiencia'] }))
              }
              className="w-full px-3 py-2.5 rounded-xl bg-[#05080d] border border-white/10 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
            >
              <option value="iniciante">Sou iniciante (principalmente poupança / CDB simples)</option>
              <option value="intermediario">Já invisto em fundos e ações</option>
              <option value="avancado">Tenho experiência com derivativos, cripto ou alavancagem</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1" htmlFor="inv-liquidez">Dependência de liquidez</label>
            <select
              id="inv-liquidez"
              value={answers.liquidez}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, liquidez: e.target.value as InvestorProfileAnswers['liquidez'] }))
              }
              className="w-full px-3 py-2.5 rounded-xl bg-[#05080d] border border-white/10 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
            >
              <option value="alta">Posso precisar do dinheiro em até 6 meses</option>
              <option value="media">Posso deixar aplicado entre 1 e 3 anos</option>
              <option value="baixa">Posso investir por mais de 3 anos sem precisar sacar</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1" htmlFor="inv-renda">Renda / capacidade de aporte</label>
            <select
              id="inv-renda"
              value={answers.renda}
              onChange={(e) => setAnswers((a) => ({ ...a, renda: e.target.value as InvestorProfileAnswers['renda'] }))}
              className="w-full px-3 py-2.5 rounded-xl bg-[#05080d] border border-white/10 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
            >
              <option value="baixa">Renda mais apertada, consigo investir pouco por mês</option>
              <option value="media">Consigo investir parte relevante da renda todo mês</option>
              <option value="alta">Tenho alta capacidade de aporte e reserva sólida</option>
            </select>
          </div>
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-zinc-500">
              Perfil sugerido: <span className="font-semibold text-zinc-200 capitalize">{perfilCalculado.profile}</span>
              {' '}· score {perfilCalculado.score}
            </p>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold disabled:opacity-50"
            >
              {busy ? 'Salvando…' : currentProfile ? 'Atualizar perfil' : 'Salvar perfil'}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-[#0a0f18] rounded-2xl border border-white/5 p-6 max-w-xl">
        <h3 className="font-semibold text-zinc-100 flex items-center gap-2 mb-4">
          <Calculator className="w-5 h-5 text-blue-400" />
          Simulador de juros compostos
        </h3>
        <p className="text-zinc-500 text-sm mb-4">
          Calcule o montante futuro com valor inicial, aportes mensais e taxa anual.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 mb-6">
          <div>
            <label htmlFor="sim-initial" className="block text-xs font-medium text-zinc-500 mb-1">Valor inicial (R$)</label>
            <input
              id="sim-initial"
              type="text"
              inputMode="decimal"
              value={simInitial}
              onChange={(e) => setSimInitial(e.target.value.replace(/[^0-9,.-]/, ''))}
              className="w-full px-4 py-2.5 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
          <div>
            <label htmlFor="sim-monthly" className="block text-xs font-medium text-zinc-500 mb-1">Aporte mensal (R$)</label>
            <input
              id="sim-monthly"
              type="text"
              inputMode="decimal"
              value={simMonthly}
              onChange={(e) => setSimMonthly(e.target.value.replace(/[^0-9,.-]/, ''))}
              className="w-full px-4 py-2.5 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
          <div>
            <label htmlFor="sim-rate" className="block text-xs font-medium text-zinc-500 mb-1">Taxa ao ano (%)</label>
            <input
              id="sim-rate"
              type="text"
              inputMode="decimal"
              value={simRate}
              onChange={(e) => setSimRate(e.target.value.replace(/[^0-9,.-]/, ''))}
              className="w-full px-4 py-2.5 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
          <div>
            <label htmlFor="sim-months" className="block text-xs font-medium text-zinc-500 mb-1">Prazo (meses)</label>
            <input
              id="sim-months"
              type="text"
              inputMode="numeric"
              value={simMonths}
              onChange={(e) => setSimMonths(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-2.5 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
        </div>
        {simResult && (
          <div className="pt-4 border-t border-white/5">
            <p className="text-zinc-500 text-sm">Montante estimado ao final do prazo</p>
            <p className="text-2xl font-bold text-emerald-400">
              R$ {simResult.FV.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Total investido: R$ {simResult.totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}
      </section>

      <section className="bg-[#0a0f18] rounded-2xl border border-white/5 p-6 max-w-xl">
        <h3 className="font-semibold text-zinc-100 flex items-center gap-2 mb-4">
          <Calculator className="w-5 h-5 text-emerald-400" />
          Quanto investir por mês para atingir uma meta
        </h3>
        <p className="text-zinc-500 text-sm mb-4">
          Informe o valor alvo, prazo em anos, taxa anual estimada e um valor inicial (se já tiver aplicado). O simulador estima o aporte mensal necessário.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 mb-6">
          <div>
            <label htmlFor="goal-amount" className="block text-xs font-medium text-zinc-500 mb-1">
              Meta (R$)
            </label>
            <input
              id="goal-amount"
              type="text"
              inputMode="decimal"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value.replace(/[^0-9,.-]/, ''))}
              className="w-full px-4 py-2.5 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
          <div>
            <label htmlFor="goal-initial" className="block text-xs font-medium text-zinc-500 mb-1">
              Valor inicial (R$)
            </label>
            <input
              id="goal-initial"
              type="text"
              inputMode="decimal"
              value={goalInitial}
              onChange={(e) => setGoalInitial(e.target.value.replace(/[^0-9,.-]/, ''))}
              className="w-full px-4 py-2.5 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
          <div>
            <label htmlFor="goal-rate" className="block text-xs font-medium text-zinc-500 mb-1">
              Taxa ao ano (%)
            </label>
            <input
              id="goal-rate"
              type="text"
              inputMode="decimal"
              value={goalRate}
              onChange={(e) => setGoalRate(e.target.value.replace(/[^0-9,.-]/, ''))}
              className="w-full px-4 py-2.5 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
          <div>
            <label htmlFor="goal-years" className="block text-xs font-medium text-zinc-500 mb-1">
              Prazo (anos)
            </label>
            <input
              id="goal-years"
              type="text"
              inputMode="decimal"
              value={goalYears}
              onChange={(e) => setGoalYears(e.target.value.replace(/[^0-9,.-]/, ''))}
              className="w-full px-4 py-2.5 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
        </div>
        {goalResult && (
          <div className="pt-4 border-t border-white/5">
            <p className="text-zinc-500 text-sm">Aporte mensal estimado necessário</p>
            <p className="text-2xl font-bold text-emerald-400">
              R$ {goalResult.monthly.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Prazo: {goalResult.years.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} anos · Total investido (aprox.): R${' '}
              {goalResult.totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}
      </section>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Registrar investimento">
        <form onSubmit={handleAdd} className="space-y-4">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-rose-400 text-sm">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="inv-date" className="block text-xs font-medium text-zinc-500 mb-1">Data</label>
            <input
              id="inv-date"
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="inv-tipo" className="block text-xs font-medium text-zinc-500 mb-1">Tipo</label>
            <select
              id="inv-tipo"
              value={formTipo}
              onChange={(e) => setFormTipo(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500"
            >
              {INVESTMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="inv-nome" className="block text-xs font-medium text-zinc-500 mb-1">Nome / ativo</label>
            <input
              id="inv-nome"
              type="text"
              value={formNome}
              onChange={(e) => setFormNome(e.target.value)}
              placeholder="Ex: Tesouro Selic, PETR4"
              className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="inv-valor" className="block text-xs font-medium text-zinc-500 mb-1">Valor aplicado (R$)</label>
            <input
              id="inv-valor"
              type="text"
              inputMode="decimal"
              value={formValor}
              onChange={(e) => setFormValor(e.target.value.replace(/[^0-9,.-]/, ''))}
              placeholder="0,00"
              className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="inv-atual" className="block text-xs font-medium text-zinc-500 mb-1">Valor atual (R$) – opcional</label>
            <input
              id="inv-atual"
              type="text"
              inputMode="decimal"
              value={formAtual}
              onChange={(e) => setFormAtual(e.target.value.replace(/[^0-9,.-]/, ''))}
              placeholder="Igual ao aplicado se não preencher"
              className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="inv-conta" className="block text-xs font-medium text-zinc-500 mb-1">Conta (opcional)</label>
            <select
              id="inv-conta"
              value={formConta}
              onChange={(e) => setFormConta(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500"
            >
              <option value="">—</option>
              {accounts.length > 0 ? accounts.map((a) => (
                <option key={a} value={a}>{a}</option>
              )) : DEFAULT_ACCOUNTS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm"
            >
              {busy ? 'Salvando…' : 'Registrar'}
            </button>
            <button type="button" onClick={() => setAddOpen(false)} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 font-medium text-sm hover:bg-white/10">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={addProventoOpen} onClose={() => setAddProventoOpen(false)} title="Registrar provento">
        <form onSubmit={handleAddProvento} className="space-y-4">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2 text-rose-400 text-sm">
              {error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="prov-date" className="block text-xs font-medium text-zinc-500 mb-1">Data do provento</label>
              <input
                id="prov-date"
                type="date"
                value={provDate}
                onChange={(e) => setProvDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="prov-account" className="block text-xs font-medium text-zinc-500 mb-1">Conta de crédito</label>
              <select
                id="prov-account"
                value={provConta}
                onChange={(e) => setProvConta(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">Selecione</option>
                {(accounts.length ? accounts : DEFAULT_ACCOUNTS).map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="prov-desc" className="block text-xs font-medium text-zinc-500 mb-1">Descrição</label>
            <input
              id="prov-desc"
              type="text"
              value={provDesc}
              onChange={(e) => setProvDesc(e.target.value)}
              placeholder="Ex: Dividendos PETR4"
              className="w-full px-3 py-2.5 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="prov-value" className="block text-xs font-medium text-zinc-500 mb-1">Valor (R$)</label>
            <input
              id="prov-value"
              type="text"
              inputMode="decimal"
              value={provValor}
              onChange={(e) => setProvValor(e.target.value.replace(/[^0-9,.-]/, ''))}
              placeholder="0,00"
              className="w-full px-3 py-2.5 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 text-sm focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm disabled:opacity-50"
            >
              {busy ? 'Salvando…' : 'Registrar'}
            </button>
            <button
              type="button"
              onClick={() => setAddProventoOpen(false)}
              className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 font-medium text-sm hover:bg-white/10"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editingAtual} onClose={() => setEditingAtual(null)} title="Atualizar valor">
        {editingAtual && (
          <form onSubmit={handleUpdateAtual} className="space-y-4">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-rose-400 text-sm">
                {error}
              </div>
            )}
            <p className="text-zinc-400 text-sm">{editingAtual.nome} – novo valor atual (R$)</p>
            <input
              type="text"
              inputMode="decimal"
              value={editAtualValue}
              onChange={(e) => setEditAtualValue(e.target.value.replace(/[^0-9,.-]/, ''))}
              className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500"
              placeholder="0,00"
            />
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={busy} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm">
                {busy ? 'Salvando…' : 'Salvar'}
              </button>
              <button type="button" onClick={() => setEditingAtual(null)} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 font-medium text-sm hover:bg-white/10">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={deletingId !== null} onClose={() => setDeletingId(null)} title="Excluir investimento">
        <p className="text-zinc-400 text-sm mb-6">
          Tem certeza que deseja excluir este investimento? Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => deletingId != null && handleDelete(deletingId)}
            disabled={busy}
            className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-sm"
          >
            {busy ? 'Excluindo…' : 'Excluir'}
          </button>
          <button type="button" onClick={() => setDeletingId(null)} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 font-medium text-sm hover:bg-white/10">
            Cancelar
          </button>
        </div>
      </Modal>
    </div>
  );
}
