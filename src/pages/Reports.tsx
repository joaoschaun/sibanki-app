import { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { generateReportPdf } from '../utils/generateReportPdf';
import { getMD, fmt } from '../utils/reportUtils';
import { isTransferEntry } from '../utils/entryUtils';
import { FileText, TrendingUp, PieChart as PieIcon, Calendar, CreditCard, Target, Share2, FileDown, Bot } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, AreaChart, Area, PieChart, Pie, Cell, Line,
} from 'recharts';
import {
  CHART_COLORS, tooltipStyle, gridStyle, axisStyle, fmtAxis,
  EMERALD, ROSE, BLUE,
} from '../components/charts/chartConfig';

const CHART_TOOLTIP_STYLE = tooltipStyle;
const CHART_GRID = gridStyle;
const CHART_AXIS = { tick: axisStyle, axisLine: false as const, tickLine: false as const };
const CHART_LEGEND_STYLE = { fontSize: 11, color: '#a1a1aa' };

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
type RelTab = 'resumo' | 'patrimonio' | 'categorias' | 'comparativo' | 'cartoes' | 'metas';

export default function Reports() {
  const { user, entries, investments, goals, cards, loading } = useAppContext();
  const [activeTab, setActiveTab] = useState<RelTab>('resumo');
  const [iaLoading, setIaLoading] = useState(false);
  const [compMes1, setCompMes1] = useState('');
  const [compMes2, setCompMes2] = useState('');

  const md = useMemo(() => getMD(entries), [entries]);
  const mk = useMemo(() => Object.keys(md).sort(), [md]);
  const ml = useMemo(() => mk.map((k) => {
    const [, m] = k.split('-').map(Number);
    return `${MESES[m - 1].substring(0, 3)}/${k.slice(2)}`;
  }), [mk]);

  const { rows, totalR, totalD, mR, mD, mA } = useMemo(() => {
    let tR = 0, tD = 0;
    const rows = mk.map((k) => {
      const v = md[k];
      const s = v.r - v.d;
      tR += v.r; tD += v.d;
      const tx = v.r > 0 ? Math.round(((v.r - v.d) / v.r) * 100) : 0;
      const st = s > 0 ? 'Positivo' : s === 0 ? 'Neutro' : 'Negativo';
      const [, month] = k.split('-').map(Number);
      return { key: k, mes: MESES[month - 1] + '/' + k.slice(0, 4), r: v.r, d: v.d, s, tx, st };
    });
    const mR = mk.map((k) => +(md[k].r.toFixed(2)));
    const mD = mk.map((k) => +(md[k].d.toFixed(2)));
    let ac = 0;
    const mA = mk.map((_, i) => { ac += mR[i] - mD[i]; return +ac.toFixed(2); });
    return { rows, totalR: tR, totalD: tD, mR, mD, mA };
  }, [mk, md]);

  const catRanking = useMemo(() => {
    const cd: Record<string, number> = {};
    entries.filter((e) => e.type === 'despesa' && !isTransferEntry(e)).forEach((e) => {
      const c = e.category || 'Outros';
      cd[c] = (cd[c] || 0) + Number(e.value);
    });
    return Object.entries(cd).sort((a, b) => b[1] - a[1]);
  }, [entries]);

  const tabs: { id: RelTab; label: string; icon: typeof FileText }[] = [
    { id: 'resumo',      label: 'Resumo',      icon: FileText },
    { id: 'patrimonio',  label: 'Patrimônio',  icon: TrendingUp },
    { id: 'categorias',  label: 'Categorias',  icon: PieIcon },
    { id: 'comparativo', label: 'Comparativo', icon: Calendar },
    { id: 'cartoes',     label: 'Cartões',     icon: CreditCard },
    { id: 'metas',       label: 'Metas',       icon: Target },
  ];

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-zinc-700/50 text-si-4"><FileText className="w-6 h-6" /></div>
          <div>
            <h2 className="text-3xl font-bold">Relatórios Avançados</h2>
            <p className="text-si-5 text-sm">Análise completa das suas finanças.</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => navigator.clipboard?.writeText(`Receitas: R$${totalR.toFixed(2)}\nDespesas: R$${totalD.toFixed(2)}`)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-si-border-md bg-si-over-2 text-si-3 hover:bg-si-over-3 text-sm">
            <Share2 className="w-4 h-4" /> Compartilhar
          </button>
          <button type="button"
            onClick={() => generateReportPdf({ userName: user?.displayName ?? '', entries, investments, goals })}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-500/30 bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 text-sm">
            <FileDown className="w-4 h-4" /> PDF
          </button>
          <button type="button" onClick={() => { setIaLoading(true); setTimeout(() => setIaLoading(false), 1500); }} disabled={iaLoading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-violet-500/30 bg-violet-500/15 text-violet-300 text-sm disabled:opacity-50">
            <Bot className="w-4 h-4" /> {iaLoading ? 'Gerando...' : 'IA'}
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap border-b border-si-border-md pb-2">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === t.id ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-si-5 hover:bg-si-over-2'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {activeTab === 'resumo' && (
          <>
            <div className="bg-si-card rounded-2xl border border-si-border overflow-hidden">
              <div className="p-4 border-b border-si-border">
                <h3 className="font-bold text-si-1 flex items-center gap-2"><FileText className="w-5 h-5" /> Resumo Mensal</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-si-border-md text-si-4">
                      <th className="text-left p-3">Mês</th>
                      <th className="text-right p-3">Receitas</th>
                      <th className="text-right p-3">Despesas</th>
                      <th className="text-right p-3">Saldo</th>
                      <th className="text-right p-3">Economia</th>
                      <th className="text-left p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.key} className="border-b border-si-border hover:bg-si-over-2">
                        <td className="p-3 font-medium">{r.mes}</td>
                        <td className="p-3 text-right text-emerald-400">{fmt(r.r)}</td>
                        <td className="p-3 text-right text-rose-400">{fmt(r.d)}</td>
                        <td className={`p-3 text-right font-medium ${r.s >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>{fmt(r.s)}</td>
                        <td className="p-3 text-right">{r.tx}%</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            r.st === 'Positivo' ? 'bg-emerald-500/20 text-emerald-400' :
                            r.st === 'Neutro'   ? 'bg-amber-500/20 text-amber-400' :
                                                  'bg-rose-500/20 text-rose-400'}`}>{r.st}</span>
                        </td>
                      </tr>
                    ))}
                    {rows.length > 0 && (
                      <tr className="bg-si-over-2 font-bold">
                        <td className="p-3">Total</td>
                        <td className="p-3 text-right text-emerald-400">{fmt(totalR)}</td>
                        <td className="p-3 text-right text-rose-400">{fmt(totalD)}</td>
                        <td className={`p-3 text-right ${totalR - totalD >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>{fmt(totalR - totalD)}</td>
                        <td className="p-3 text-right">{totalR > 0 ? Math.round(((totalR - totalD) / totalR) * 100) : 0}%</td>
                        <td className="p-3" />
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {mk.length > 0 && (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="bg-si-card rounded-2xl border border-si-border p-4">
                  <h4 className="text-sm font-bold text-si-3 mb-3">Receitas vs Despesas</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={ml.map((l,i) => ({ mes: l, Receita: mR[i], Despesa: mD[i] }))} barGap={2} barCategoryGap="30%">
                      <CartesianGrid {...CHART_GRID} vertical={false} />
                      <XAxis dataKey="mes" {...CHART_AXIS} />
                      <YAxis tickFormatter={fmtAxis} {...CHART_AXIS} width={52} />
                      <Tooltip formatter={(v: any) => [fmt(Number(v??0)), '']} contentStyle={CHART_TOOLTIP_STYLE} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={CHART_LEGEND_STYLE} />
                      <Bar dataKey="Receita" fill={EMERALD} radius={[4,4,0,0]} maxBarSize={28} />
                      <Bar dataKey="Despesa" fill={ROSE}    radius={[4,4,0,0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-si-card rounded-2xl border border-si-border p-4">
                  <h4 className="text-sm font-bold text-si-3 mb-3">Saldo acumulado</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={ml.map((l,i) => ({ mes: l, Saldo: mA[i] }))}>
                      <defs>
                        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={BLUE} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={BLUE} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid {...CHART_GRID} vertical={false} />
                      <XAxis dataKey="mes" {...CHART_AXIS} />
                      <YAxis tickFormatter={fmtAxis} {...CHART_AXIS} width={52} />
                      <Tooltip formatter={(v: any) => [fmt(Number(v??0)), 'Saldo']} contentStyle={CHART_TOOLTIP_STYLE} />
                      <Area type="monotone" dataKey="Saldo" stroke={BLUE} strokeWidth={2} fill="url(#sg)" dot={{ fill: BLUE, r: 3, strokeWidth: 0 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}
        {activeTab === 'categorias' && (
          <div className="bg-si-card rounded-2xl border border-si-border p-6">
            <h3 className="font-bold text-si-1 mb-4 flex items-center gap-2"><PieIcon className="w-5 h-5" /> Distribuição por categoria</h3>
            {catRanking.length === 0 ? <p className="text-si-5">Nenhuma despesa registrada.</p> : (
              <div className="grid lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={catRanking.slice(0,8).map(([name,value]) => ({name,value}))}
                      cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2} dataKey="value"
                      label={({name, percent}: any) => `${name} ${((percent??0)*100).toFixed(0)}%`}
                      labelLine={{ stroke: 'rgba(255,255,255,0.2)' }}>
                      {catRanking.slice(0,8).map((_,i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => [fmt(v), '']} contentStyle={CHART_TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart layout="vertical" data={catRanking.slice(0,8).map(([name,value]) => ({name,value}))} margin={{right:16}}>
                    <CartesianGrid {...CHART_GRID} horizontal={false} />
                    <XAxis type="number" tickFormatter={fmtAxis} {...CHART_AXIS} />
                    <YAxis type="category" dataKey="name" {...CHART_AXIS} width={80} tick={{ fill:'#71717a', fontSize:10 }} />
                    <Tooltip formatter={(v: any) => [fmt(v), '']} contentStyle={CHART_TOOLTIP_STYLE} />
                    <Bar dataKey="value" radius={[0,4,4,0]} maxBarSize={20}>
                      {catRanking.slice(0,8).map((_,i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
        {activeTab === 'patrimonio' && (
          <div className="bg-si-card rounded-2xl border border-si-border p-6">
            <h3 className="font-bold text-si-1 mb-2 flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Evolução patrimonial</h3>
            <p className="text-si-5 text-sm mb-4">Saldo acumulado, receitas e despesas ao longo dos meses.</p>
            {mk.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={ml.map((l,i) => ({mes:l, Saldo:mA[i], Receita:mR[i], Despesa:mD[i]}))}>
                  <defs>
                    <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BLUE} stopOpacity={0.35}/>
                      <stop offset="95%" stopColor={BLUE} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...CHART_GRID} vertical={false} />
                  <XAxis dataKey="mes" {...CHART_AXIS} />
                  <YAxis tickFormatter={fmtAxis} {...CHART_AXIS} width={56} />
                  <Tooltip formatter={(v: any) => [fmt(v), '']} contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={CHART_LEGEND_STYLE} />
                  <Area type="monotone" dataKey="Saldo" stroke={BLUE} strokeWidth={2} fill="url(#pg)" dot={{ fill:BLUE, r:3, strokeWidth:0 }} />
                  <Line type="monotone" dataKey="Receita" stroke={EMERALD} strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="Despesa" stroke={ROSE}    strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <p className="text-si-5 text-sm">Nenhum dado disponível.</p>}
          </div>
        )}

        {activeTab === 'comparativo' && (
          <div className="bg-si-card rounded-2xl border border-si-border p-6">
            <h3 className="font-bold text-si-1 mb-4 flex items-center gap-2"><Calendar className="w-5 h-5" /> Comparativo entre meses</h3>
            {mk.length >= 2 ? (() => {
              const k1 = compMes1 || mk[0];
              const k2 = compMes2 || mk[mk.length - 1];
              const [,m1] = k1.split('-').map(Number);
              const [,m2] = k2.split('-').map(Number);
              const key1 = MESES[m1-1].slice(0,3);
              const key2 = MESES[m2-1].slice(0,3);
              const data = [
                { label:'Receita',  [key1]: md[k1]?.r??0, [key2]: md[k2]?.r??0 },
                { label:'Despesa',  [key1]: md[k1]?.d??0, [key2]: md[k2]?.d??0 },
                { label:'Saldo',    [key1]: (md[k1]?.r??0)-(md[k1]?.d??0), [key2]: (md[k2]?.r??0)-(md[k2]?.d??0) },
              ];
              return (<>
                <div className="flex gap-4 flex-wrap mb-6">
                  {[{state: compMes1||mk[0], setter: setCompMes1, label:'Mês 1'},{state: compMes2||mk[mk.length-1], setter: setCompMes2, label:'Mês 2'}].map(({state, setter, label}) => (
                    <div key={label}>
                      <p className="text-xs text-si-5 mb-1">{label}</p>
                      <select value={state} onChange={(e) => setter(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-si-bg border border-si-border-md text-si-2 text-sm" aria-label={label}>
                        {mk.map((k) => { const [,m]=k.split('-').map(Number); return <option key={k} value={k}>{MESES[m-1]}/{k.slice(0,4)}</option>; })}
                      </select>
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data} barGap={4} barCategoryGap="30%">
                    <CartesianGrid {...CHART_GRID} vertical={false} />
                    <XAxis dataKey="label" {...CHART_AXIS} />
                    <YAxis tickFormatter={fmtAxis} {...CHART_AXIS} width={56} />
                    <Tooltip formatter={(v: any) => [fmt(v), '']} contentStyle={CHART_TOOLTIP_STYLE} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={CHART_LEGEND_STYLE} />
                    <Bar dataKey={key1} fill={BLUE}   radius={[4,4,0,0]} maxBarSize={32} />
                    <Bar dataKey={key2} fill={EMERALD} radius={[4,4,0,0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </>);
            })() : <p className="text-si-5 text-sm">Adicione lançamentos em pelo menos 2 meses para comparar.</p>}
          </div>
        )}
        {activeTab === 'cartoes' && (
          <div className="bg-si-card rounded-2xl border border-si-border p-6">
            <h3 className="font-bold text-si-1 mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5" /> Relatório de Cartões</h3>
            {cards.length === 0 ? (
              <div className="text-center py-12 text-si-5">
                <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Nenhum cartão cadastrado</p>
                <Link to="/cartoes" className="inline-block mt-4 text-blue-400 hover:underline text-sm">Ir para Cartões</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {cards.map((c) => {
                  const purchases = (c as any).purchases ?? [];
                  const total = purchases.reduce((s: number, p: any) => s + Number(p.value||0), 0);
                  return (
                    <div key={c.id} className="p-4 rounded-xl bg-si-over-2 border border-si-border-md">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-si-2">{c.name}</span>
                        <span className="text-si-4">{fmt(total)}</span>
                      </div>
                      <p className="text-xs text-si-5 mt-1">{purchases.length} compras</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'metas' && (
          <div className="bg-si-card rounded-2xl border border-si-border p-6">
            <h3 className="font-bold text-si-1 mb-4 flex items-center gap-2"><Target className="w-5 h-5" /> Relatório de Metas</h3>
            {goals.length === 0 ? <p className="text-si-5">Nenhuma meta cadastrada.</p> : (
              <div className="space-y-4">
                {goals.map((g) => {
                  const pct = g.target > 0 ? Math.min(100,(g.current/g.target)*100) : 0;
                  return (
                    <div key={g.id} className="p-4 rounded-xl bg-si-over-2 border border-si-border-md">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium text-si-2">{g.title}</span>
                        <span className="text-si-4">{fmt(g.current)} / {fmt(g.target)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-si-over-3 overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{width:`${pct}%`}} />
                      </div>
                      <p className="text-xs text-si-5 mt-1">{pct.toFixed(1)}% concluído</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
