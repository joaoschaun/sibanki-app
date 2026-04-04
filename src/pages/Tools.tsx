import { useState } from 'react';
import {
  Calculator, TrendingUp, Flame, PiggyBank, Target, DollarSign,
  ChevronDown, ChevronUp, Home,
} from 'lucide-react';
import { analyzeFgtsAmortization } from '../utils/decisionEngine';

// ── tipos ──────────────────────────────────────────────────────────────────
type ToolId = 'compostos' | 'meta' | 'rendafixa' | 'rendapassiva' | 'fire' | 'precomedio' | 'fgts' | 'portabilidade';

interface ToolCard {
  id: ToolId;
  icon: React.ElementType;
  color: string;
  title: string;
  desc: string;
}

const TOOLS: ToolCard[] = [
  { id: 'compostos',    icon: Calculator,  color: '#4F8CFF', title: 'Juros Compostos',    desc: 'Simule montante futuro com aportes mensais' },
  { id: 'meta',         icon: Target,      color: '#10B981', title: 'Atingir Meta',        desc: 'Descubra quanto investir por mês' },
  { id: 'rendafixa',    icon: PiggyBank,   color: '#06B6D4', title: 'Renda Fixa',          desc: 'CDB, LCI/LCA — rendimento bruto' },
  { id: 'rendapassiva', icon: DollarSign,  color: '#8B5CF6', title: 'Renda Passiva',       desc: 'Capital necessário para renda mensal' },
  { id: 'fire',         icon: Flame,       color: '#F59E0B', title: 'FIRE',                desc: 'Independência financeira e aposentadoria' },
  { id: 'precomedio',   icon: TrendingUp,  color: '#10B981', title: 'Pre\u00e7o M\u00e9dio',         desc: 'Calcule novo PM ap\u00f3s aporte em a\u00e7\u00e3o' },
  { id: 'fgts',         icon: Home,        color: '#F97316', title: 'Simulador FGTS',      desc: 'Vale usar FGTS para amortizar seu financiamento?' },
  { id: 'portabilidade',icon: TrendingUp,  color: '#8B5CF6', title: 'Portabilidade de Cr\u00e9dito', desc: 'Compare sua taxa atual com o mercado e calcule a economia' },
];

// ── helpers ────────────────────────────────────────────────────────────────
const inputCls = 'w-full px-4 py-2.5 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500 text-sm';
const labelCls = 'block text-xs font-medium text-si-5 mb-1';

function ResultBox({ color, label, value, sub }: { color: string; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-si-over-1 border border-si-border rounded-xl p-4 mt-4">
      <p className="text-si-5 text-sm">{label}</p>
      <p className="text-2xl font-bold mt-0.5" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-si-5 mt-1">{sub}</p>}
    </div>
  );
}

function useNumber(initial: string) {
  const [val, setVal] = useState(initial);
  const n = parseFloat(val.replace(',', '.')) || 0;
  return [val, setVal, n] as const;
}

// ── Simulador Juros Compostos ──────────────────────────────────────────────
function SimCompostos() {
  const [ini, setIni, P] = useNumber('1000');
  const [men, setMen, PMT] = useNumber('200');
  const [rate, setRate, r] = useNumber('10');
  const [months, setMonths] = useState('60');
  const n = Math.max(0, Math.min(600, parseInt(months) || 0));
  const i = r / 100 / 12;
  let FV = P * Math.pow(1 + i, n);
  if (PMT > 0 && i > 0) FV += PMT * ((Math.pow(1 + i, n) - 1) / i);
  else if (PMT > 0) FV += PMT * n;
  const invested = P + PMT * n;
  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className={labelCls}>Valor inicial (R$)</label><input className={inputCls} value={ini} onChange={e => setIni(e.target.value.replace(/[^0-9,.-]/,''))} /></div>
        <div><label className={labelCls}>Aporte mensal (R$)</label><input className={inputCls} value={men} onChange={e => setMen(e.target.value.replace(/[^0-9,.-]/,''))} /></div>
        <div><label className={labelCls}>Taxa ao ano (%)</label><input className={inputCls} value={rate} onChange={e => setRate(e.target.value.replace(/[^0-9,.-]/,''))} /></div>
        <div><label className={labelCls}>Prazo (meses)</label><input className={inputCls} inputMode="numeric" value={months} onChange={e => setMonths(e.target.value.replace(/\D/g,''))} /></div>
      </div>
      {n > 0 && <ResultBox color="#4F8CFF" label="Montante estimado" value={fmt(FV)} sub={`Total investido: ${fmt(invested)} · Juros: ${fmt(FV - invested)}`} />}
    </div>
  );
}

// ── Simulador Atingir Meta ─────────────────────────────────────────────────
function SimMeta() {
  const [goal, setGoal, target] = useNumber('100000');
  const [ini, setIni, initial] = useNumber('0');
  const [rate, setRate, r] = useNumber('10');
  const [years, setYears, y] = useNumber('15');
  const n = Math.round(y * 12);
  const i = r / 100 / 12;
  const base = target - initial * Math.pow(1 + i, n);
  const PMT = base > 0 && i > 0 && n > 0 ? base * i / (Math.pow(1 + i, n) - 1) : 0;
  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className={labelCls}>Meta (R$)</label><input className={inputCls} value={goal} onChange={e => setGoal(e.target.value.replace(/[^0-9,.-]/,''))} /></div>
        <div><label className={labelCls}>Valor inicial (R$)</label><input className={inputCls} value={ini} onChange={e => setIni(e.target.value.replace(/[^0-9,.-]/,''))} /></div>
        <div><label className={labelCls}>Taxa ao ano (%)</label><input className={inputCls} value={rate} onChange={e => setRate(e.target.value.replace(/[^0-9,.-]/,''))} /></div>
        <div><label className={labelCls}>Prazo (anos)</label><input className={inputCls} value={years} onChange={e => setYears(e.target.value.replace(/[^0-9,.-]/,''))} /></div>
      </div>
      {target > 0 && r > 0 && y > 0 && <ResultBox color="#10B981" label="Aporte mensal necessário" value={fmt(PMT)} sub={`Prazo: ${y.toLocaleString('pt-BR', {maximumFractionDigits:1})} anos · Total investido: ${fmt(initial + PMT * n)}`} />}
    </div>
  );
}

// ── Simulador Renda Fixa ───────────────────────────────────────────────────
function SimRendaFixa() {
  const [ini, setIni, P] = useNumber('10000');
  const [rate, setRate, r] = useNumber('12');
  const [months, setMonths] = useState('24');
  const n = Math.max(0, parseInt(months) || 0);
  const mRate = r / 100 / 12;
  const gross = n > 0 ? P * Math.pow(1 + mRate, n) : 0;
  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className={labelCls}>Valor inicial (R$)</label><input className={inputCls} value={ini} onChange={e => setIni(e.target.value.replace(/[^0-9,.-]/,''))} /></div>
        <div><label className={labelCls}>Taxa ao ano (%)</label><input className={inputCls} value={rate} onChange={e => setRate(e.target.value.replace(/[^0-9,.-]/,''))} /></div>
        <div><label className={labelCls}>Prazo (meses)</label><input className={inputCls} inputMode="numeric" value={months} onChange={e => setMonths(e.target.value.replace(/\D/g,''))} /></div>
      </div>
      {P > 0 && n > 0 && <ResultBox color="#06B6D4" label="Valor bruto estimado" value={fmt(gross)} sub={`Aplicado: ${fmt(P)} · Rendimento: ${fmt(gross - P)}`} />}
    </div>
  );
}

// ── Simulador Renda Passiva ────────────────────────────────────────────────
function SimRendaPassiva() {
  const [target, setTarget, T] = useNumber('2000');
  const [yld, setYld, Y] = useNumber('0.8');
  const capital = Y > 0 ? T / (Y / 100) : 0;
  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className={labelCls}>Renda mensal desejada (R$)</label><input className={inputCls} value={target} onChange={e => setTarget(e.target.value.replace(/[^0-9,.-]/,''))} /></div>
        <div><label className={labelCls}>Rendimento mensal (%)</label><input className={inputCls} value={yld} onChange={e => setYld(e.target.value.replace(/[^0-9,.-]/,''))} /></div>
      </div>
      {T > 0 && Y > 0 && <ResultBox color="#8B5CF6" label="Capital necessário" value={fmt(capital)} sub={`Para gerar ${fmt(T)}/mês com ${Y.toLocaleString('pt-BR',{maximumFractionDigits:2})}% ao mês`} />}
    </div>
  );
}

// ── Simulador FIRE ─────────────────────────────────────────────────────────
function SimFire() {
  const [cost, setCost, C] = useNumber('5000');
  const [safe, setSafe, S] = useNumber('4');
  const [capital, setCapital, K] = useNumber('50000');
  const [aporte, setAporte, A] = useNumber('2000');
  const [ret, setRet, R] = useNumber('10');
  const targetCapital = S > 0 ? (C * 12) / (S / 100) : 0;
  let cur = K; let months = 0;
  const mRate = R / 100 / 12;
  while (cur < targetCapital && months < 720) { cur = cur * (1 + mRate) + A; months++; }
  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className={labelCls}>Gasto mensal (R$)</label><input className={inputCls} value={cost} onChange={e => setCost(e.target.value.replace(/[^0-9,.-]/,''))} /></div>
        <div><label className={labelCls}>Taxa segura anual (%)</label><input className={inputCls} value={safe} onChange={e => setSafe(e.target.value.replace(/[^0-9,.-]/,''))} /></div>
        <div><label className={labelCls}>Capital atual (R$)</label><input className={inputCls} value={capital} onChange={e => setCapital(e.target.value.replace(/[^0-9,.-]/,''))} /></div>
        <div><label className={labelCls}>Aporte mensal (R$)</label><input className={inputCls} value={aporte} onChange={e => setAporte(e.target.value.replace(/[^0-9,.-]/,''))} /></div>
        <div><label className={labelCls}>Retorno anual estimado (%)</label><input className={inputCls} value={ret} onChange={e => setRet(e.target.value.replace(/[^0-9,.-]/,''))} /></div>
      </div>
      {C > 0 && S > 0 && <ResultBox color="#F59E0B" label="Capital alvo FIRE" value={fmt(targetCapital)} sub={cur >= targetCapital ? `Tempo estimado: ${(months/12).toLocaleString('pt-BR',{maximumFractionDigits:1})} anos (${months} meses)` : 'Meta não atingida em 60 anos com os parâmetros atuais.'} />}
    </div>
  );
}

// ── Calculadora Preço Médio ────────────────────────────────────────────────
function SimPrecoMedio() {
  const [qtdAtual, setQtdAtual, QA] = useNumber('100');
  const [pmAtual, setPmAtual, PA] = useNumber('25');
  const [qtdNova, setQtdNova, QN] = useNumber('50');
  const [pmNovo, setPmNovo, PN] = useNumber('22');
  const totalQtd = QA + QN;
  const pmNovoCal = totalQtd > 0 ? (QA * PA + QN * PN) / totalQtd : 0;
  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className={labelCls}>Quantidade atual</label><input className={inputCls} value={qtdAtual} onChange={e => setQtdAtual(e.target.value.replace(/[^0-9,.-]/,''))} /></div>
        <div><label className={labelCls}>Preço médio atual (R$)</label><input className={inputCls} value={pmAtual} onChange={e => setPmAtual(e.target.value.replace(/[^0-9,.-]/,''))} /></div>
        <div><label className={labelCls}>Nova compra (quantidade)</label><input className={inputCls} value={qtdNova} onChange={e => setQtdNova(e.target.value.replace(/[^0-9,.-]/,''))} /></div>
        <div><label className={labelCls}>Preço de compra (R$)</label><input className={inputCls} value={pmNovo} onChange={e => setPmNovo(e.target.value.replace(/[^0-9,.-]/,''))} /></div>
      </div>
      {QA > 0 && QN > 0 && <ResultBox color="#10B981" label="Novo preço médio" value={fmt(pmNovoCal)} sub={`Total: ${totalQtd.toLocaleString('pt-BR')} ações · Custo total: ${fmt(QA * PA + QN * PN)}`} />}
    </div>
  );
}

// ── Simulador FGTS ────────────────────────────────────────────────────────────
function SimFgts() {
  const [fgts,     setFgts]     = useState('30000');
  const [debt,     setDebt]     = useState('150000');
  const [payment,  setPayment]  = useState('1200');
  const [rate,     setRate]     = useState('10.5');
  const [months,   setMonths]   = useState('180');
  const [result,   setResult]   = useState<ReturnType<typeof analyzeFgtsAmortization> | null>(null);

  const fmt = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + '%';

  function simulate() {
    const r = analyzeFgtsAmortization({
      fgtsBalance:           parseFloat(fgts.replace(',', '.'))    || 0,
      remainingDebt:         parseFloat(debt.replace(',', '.'))    || 0,
      currentMonthlyPayment: parseFloat(payment.replace(',', '.')) || 0,
      annualInterestRate:    parseFloat(rate.replace(',', '.')) / 100 || 0,
      remainingMonths:       parseInt(months) || 0,
    });
    setResult(r);
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className={labelCls}>Saldo FGTS (R$)</label>
          <input className={inputCls} value={fgts} onChange={e => setFgts(e.target.value.replace(/[^0-9,.]/g, ''))} placeholder="30000" /></div>
        <div><label className={labelCls}>Saldo devedor restante (R$)</label>
          <input className={inputCls} value={debt} onChange={e => setDebt(e.target.value.replace(/[^0-9,.]/g, ''))} placeholder="150000" /></div>
        <div><label className={labelCls}>Parcela atual (R$)</label>
          <input className={inputCls} value={payment} onChange={e => setPayment(e.target.value.replace(/[^0-9,.]/g, ''))} placeholder="1200" /></div>
        <div><label className={labelCls}>Taxa de juros do financiamento (% a.a.)</label>
          <input className={inputCls} value={rate} onChange={e => setRate(e.target.value.replace(/[^0-9,.]/g, ''))} placeholder="10.5" /></div>
        <div><label className={labelCls}>Meses restantes</label>
          <input className={inputCls} value={months} onChange={e => setMonths(e.target.value.replace(/[^0-9]/g, ''))} placeholder="180" /></div>
      </div>

      <button type="button" onClick={simulate}
        className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold transition-colors">
        Simular amortização
      </button>

      {result && (
        <div className="space-y-4">
          {/* Veredicto */}
          <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            result.worthIt
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}>
            {result.worthIt ? '✅ Vale usar o FGTS para amortizar' : '⚠️ Avalie com cuidado antes de usar o FGTS'}
          </div>

          {/* Métricas */}
          <div className="grid gap-3 sm:grid-cols-3">
            <ResultBox color="#F97316" label="Nova parcela" value={fmt(result.newMonthlyPayment)}
              sub={`Economia: ${fmt(result.monthlySavings)}/mês`} />
            <ResultBox color="#10B981" label="Break-even"   value={`${result.monthsToBreakeven} meses`}
              sub="Tempo para recuperar o FGTS usado" />
            <ResultBox
              color={result.totalSaved10y > 0 ? '#4F8CFF' : '#F87171'}
              label="Ganho líq. 10 anos"
              value={fmt(Math.abs(result.totalSaved10y))}
              sub={result.totalSaved10y >= 0 ? 'a favor da amortização' : 'a favor de manter o FGTS'} />
          </div>

          {/* Narrativa do Arquiteto */}
          <div className="bg-si-over-1 border border-si-border rounded-xl p-4 text-sm text-si-3 whitespace-pre-wrap leading-relaxed">
            {result.narrativa}
          </div>

          {/* Comparativo visual */}
          <div className="grid gap-3 sm:grid-cols-2 text-xs text-si-5">
            <div className="bg-si-over-1 rounded-xl p-3 space-y-1">
              <p className="font-bold text-si-4 mb-2">Sem usar FGTS</p>
              <p>Parcela: <span className="text-si-2 font-semibold">{fmt(result.currentMonthlyPayment)}/mês</span></p>
              <p>FGTS rendendo ~3,5% a.a. → em 10 anos: <span className="text-si-2 font-semibold">{fmt(result.fgtsBalance * Math.pow(1.035, 10))}</span></p>
            </div>
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 space-y-1">
              <p className="font-bold text-emerald-400 mb-2">Usando FGTS agora</p>
              <p>Parcela: <span className="text-emerald-300 font-semibold">{fmt(result.newMonthlyPayment)}/mês</span></p>
              <p>Economia em 10 anos: <span className="text-emerald-300 font-semibold">{fmt(result.monthlySavings * 120)}</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Simulador Portabilidade de Crédito ───────────────────────────────────────
const MARKET_RATES = [
  { label: 'Consignado público',    min: 1.40, max: 2.10 },
  { label: 'Consignado privado',    min: 1.80, max: 2.80 },
  { label: 'CDC bancário',          min: 1.60, max: 2.50 },
  { label: 'Crédito pessoal banco', min: 3.50, max: 6.00 },
  { label: 'Fintech digital',       min: 1.90, max: 3.50 },
  { label: 'Crédito com garantia',  min: 0.80, max: 1.60 },
] as const;

function SimPortabilidade() {
  const [debt,    setDebt]    = useState('20000');
  const [rate,    setRate]    = useState('4.5');
  const [months,  setMonths]  = useState('24');

  const fmt = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const D  = parseFloat(debt.replace(',', '.'))   || 0;
  const r  = parseFloat(rate.replace(',', '.')) / 100 || 0;
  const n  = parseInt(months) || 0;

  // Parcela Price: P = D * r / (1 - (1+r)^-n)
  const calcPayment = (principal: number, monthlyRate: number, nMonths: number) =>
    monthlyRate > 0 && nMonths > 0
      ? (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -nMonths))
      : principal / nMonths;

  const currentPayment = calcPayment(D, r, n);
  const currentTotal   = currentPayment * n;

  const alternatives = MARKET_RATES.map(opt => {
    const midRate    = ((opt.min + opt.max) / 2) / 100;
    const newPayment = calcPayment(D, midRate, n);
    const newTotal   = newPayment * n;
    const saving     = currentTotal - newTotal;
    const worthIt    = midRate < r && saving > 500;
    return { ...opt, midRate, newPayment, newTotal, saving, worthIt };
  }).sort((a, b) => b.saving - a.saving);

  const hasResult = D > 0 && r > 0 && n > 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div><label className={labelCls}>Saldo devedor (R$)</label>
          <input className={inputCls} value={debt}   onChange={e => setDebt(e.target.value.replace(/[^0-9,.]/g,''))}   placeholder="20000" /></div>
        <div><label className={labelCls}>Taxa atual (% a.m.)</label>
          <input className={inputCls} value={rate}   onChange={e => setRate(e.target.value.replace(/[^0-9,.]/g,''))}   placeholder="4.5" /></div>
        <div><label className={labelCls}>Meses restantes</label>
          <input className={inputCls} value={months} onChange={e => setMonths(e.target.value.replace(/[^0-9]/g,''))} placeholder="24" /></div>
      </div>

      {hasResult && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-si-5">Sua parcela atual:</span>
            <span className="font-bold text-rose-300">{fmt(currentPayment)}/mês</span>
            <span className="text-si-5">· Total: {fmt(currentTotal)}</span>
          </div>

          <div className="space-y-2">
            {alternatives.map(opt => (
              <div key={opt.label} className={`rounded-xl border px-4 py-3 flex flex-wrap items-center gap-3 text-sm ${
                opt.worthIt ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-si-over-1 border-si-border'
              }`}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-si-2">{opt.label}</p>
                  <p className="text-xs text-si-5">{opt.min}%–{opt.max}% a.m. · médio {(opt.midRate*100).toFixed(2)}%</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-bold ${opt.worthIt ? 'text-emerald-300' : 'text-si-3'}`}>{fmt(opt.newPayment)}/mês</p>
                  {opt.saving > 0
                    ? <p className="text-xs text-emerald-400">economia {fmt(opt.saving)} total</p>
                    : <p className="text-xs text-rose-400">mais caro</p>}
                </div>
                {opt.worthIt && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                    ✓ Vale portar
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4 text-xs text-si-4 space-y-1">
            <p className="font-bold text-violet-300 text-sm mb-2">⚡ Como fazer a portabilidade</p>
            <p>1. Solicite a proposta de portabilidade diretamente no banco destino (não precisa ir ao banco atual)</p>
            <p>2. O banco destino tem 5 dias úteis para concluir a transferência via sistema BCB</p>
            <p>3. Sua taxa não pode ser maior do que a atual — é garantia legal (Lei 4.595/64)</p>
            <p>4. Compare o CET (Custo Efetivo Total), não apenas a taxa nominal</p>
          </div>
        </div>
      )}
    </div>
  );
}

const TOOL_COMPONENTS: Record<ToolId, React.ElementType> = {
  compostos:     SimCompostos,
  meta:          SimMeta,
  rendafixa:     SimRendaFixa,
  rendapassiva:  SimRendaPassiva,
  fire:          SimFire,
  precomedio:    SimPrecoMedio,
  fgts:          SimFgts,
  portabilidade: SimPortabilidade,
};

// ── Página principal ───────────────────────────────────────────────────────
export default function Tools() {
  const [active, setActive] = useState<ToolId | null>(null);

  const toggle = (id: ToolId) => setActive(prev => prev === id ? null : id);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-3xl font-bold">Ferramentas</h2>
        <p className="text-si-5 text-sm mt-1">Calculadoras e simuladores financeiros</p>
      </div>

      <div className="space-y-3">
        {TOOLS.map((tool) => {
          const isOpen = active === tool.id;
          const Component = TOOL_COMPONENTS[tool.id];
          return (
            <div
              key={tool.id}
              className="bg-si-card rounded-2xl border border-si-border overflow-hidden"
            >
              {/* Cabeçalho clicável */}
              <button
                type="button"
                onClick={() => toggle(tool.id)}
                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-si-over-1 transition-colors text-left"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${tool.color}20`, color: tool.color }}
                >
                  <tool.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-si-1 text-sm">{tool.title}</p>
                  <p className="text-xs text-si-5 mt-0.5">{tool.desc}</p>
                </div>
                {isOpen
                  ? <ChevronUp className="w-4 h-4 text-si-5 shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-si-5 shrink-0" />
                }
              </button>

              {/* Conteúdo expansível */}
              {isOpen && (
                <div className="px-6 pb-6 border-t border-si-border pt-5">
                  <Component />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
