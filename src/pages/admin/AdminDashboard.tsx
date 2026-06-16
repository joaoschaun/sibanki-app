import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, TrendingUp, ShieldAlert, Award, Star, Activity, 
  CheckCircle2, AlertTriangle
} from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db, fnsUS } from '../../firebase';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell
} from 'recharts';
import {
  gridStyle, axisStyle, tooltipStyle, fmtBRL
} from '../../components/charts/chartConfig';

interface AdminUser {
  id: string;
  email?: string;
  name?: string;
  plan?: string;
  updated?: string | null;
  entriesCount?: number;
  openFinanceStatus?: string;
}

interface AdminData {
  counts: { total: number; pro: number; familia: number; free: number };
  mrr: number;
  series: { date: string; registrations: number; dau: number }[];
  users: AdminUser[];
}

interface FeedbackDoc {
  id: string;
  category: string;
  title: string;
  userEmail: string;
  status: string;
  createdAt: any;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<AdminData | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchData() {
      try {
        setLoading(true);
        // 1. Dados agregados de usuários (Admin SDK — ignora as rules)
        const getData = httpsCallable<unknown, AdminData>(fnsUS, 'adminGetData');
        const res = await getData({});

        // 2. Feedbacks recentes (rule permite leitura por admin)
        const fbQuery = query(collection(db, 'feedbacks'), orderBy('createdAt', 'desc'), limit(5));
        const fbSnap = await getDocs(fbQuery);
        const fbList: FeedbackDoc[] = [];
        fbSnap.forEach((doc) => {
          fbList.push({ id: doc.id, ...doc.data() } as FeedbackDoc);
        });

        if (active) {
          setData(res.data);
          setFeedbacks(fbList);
          setError(null);
        }
      } catch (err: any) {
        console.error('[AdminDashboard] Fetch error:', err);
        if (active) {
          setError('Erro ao carregar dados do painel administrativo.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    fetchData();
    return () => {
      active = false;
    };
  }, []);

  // KPIs (dados reais via adminGetData)
  const kpis = useMemo(() => {
    const c = data?.counts || { total: 0, pro: 0, familia: 0, free: 0 };
    const thisMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
    const newThisMonth = (data?.series || [])
      .filter((s) => s.date.substring(0, 7) === thisMonthStr)
      .reduce((sum, s) => sum + (s.registrations || 0), 0);
    return { total: c.total, pro: c.pro, familia: c.familia, free: c.free, mrr: data?.mrr ?? 0, newThisMonth };
  }, [data]);

  // Cadastros — série real dos últimos 15 dias
  const signupData = useMemo(() => {
    return (data?.series || []).slice(-15).map((s) => {
      const p = s.date.split('-');
      return { label: `${p[2]}/${p[1]}`, cadastros: s.registrations };
    });
  }, [data]);

  // Plan distribution for Pie Chart
  const planPieData = useMemo(() => {
    return [
      { name: 'Gratuito', value: kpis.free, color: '#9090b0' },
      { name: 'Pro', value: kpis.pro, color: '#4F8CFF' },
      { name: 'Família', value: kpis.familia, color: '#8b5cf6' },
    ].filter((p) => p.value > 0);
  }, [kpis]);

  // System alerts (a partir dos usuários reais retornados)
  const alerts = useMemo(() => {
    const list = [];
    const us = data?.users || [];
    const proNoOf = us.filter(
      (u) => (u.plan === 'pro' || u.plan === 'familia') && u.openFinanceStatus !== 'ativo'
    );
    if (proNoOf.length > 0) {
      list.push({
        id: 'pro-no-of',
        type: 'warning',
        text: `${proNoOf.length} assinantes premium não conectaram Open Finance.`,
      });
    }

    const noEntries = us.filter((u) => (u.entriesCount ?? 0) === 0);
    if (noEntries.length > 0) {
      list.push({
        id: 'no-entries',
        type: 'info',
        text: `${noEntries.length} usuários cadastrados não possuem lançamentos.`,
      });
    }

    return list;
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-si-border border-t-si-3 rounded-full animate-spin" />
          <span className="text-[10px] font-bold tracking-[0.2em] text-si-4 uppercase">Carregando painel...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-6 text-center space-y-4 max-w-lg mx-auto">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
        <h2 className="text-sm font-bold tracking-[0.18em] text-si-1 uppercase">Erro Operacional</h2>
        <p className="text-xs text-si-3">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-si-over-2 hover:bg-si-over-3 border border-si-border rounded-lg text-[10px] font-bold tracking-[0.15em] uppercase text-si-1"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-xl font-black tracking-[-0.02em] text-si-1">DASHBOARD GERAL</h1>
        <p className="text-xs text-si-4 font-medium mt-1">Visão analítica e governança do Sibanki em tempo real</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-si-card border border-si-border-md rounded-xl p-4 flex flex-col justify-between min-h-[100px]">
          <span className="text-[10px] font-bold tracking-[0.18em] text-si-4 uppercase flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Total Usuários
          </span>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-si-1">{kpis.total}</span>
            <span className="block text-[10px] text-emerald-500 mt-1 font-semibold">+{kpis.newThisMonth} este mês</span>
          </div>
        </div>

        <div className="bg-si-card border border-si-border-md rounded-xl p-4 flex flex-col justify-between min-h-[100px]">
          <span className="text-[10px] font-bold tracking-[0.18em] text-si-4 uppercase flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-blue-500" /> Assinantes Pro
          </span>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-blue-500">{kpis.pro}</span>
            <span className="block text-[10px] text-si-4 mt-1">
              {kpis.total > 0 ? Math.round((kpis.pro / kpis.total) * 100) : 0}% da base
            </span>
          </div>
        </div>

        <div className="bg-si-card border border-si-border-md rounded-xl p-4 flex flex-col justify-between min-h-[100px]">
          <span className="text-[10px] font-bold tracking-[0.18em] text-si-4 uppercase flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-purple-500" /> Assinantes Família
          </span>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-purple-500">{kpis.familia}</span>
            <span className="block text-[10px] text-si-4 mt-1">
              {kpis.total > 0 ? Math.round((kpis.familia / kpis.total) * 100) : 0}% da base
            </span>
          </div>
        </div>

        <div className="bg-si-card border border-si-border-md rounded-xl p-4 flex flex-col justify-between min-h-[100px]">
          <span className="text-[10px] font-bold tracking-[0.18em] text-si-4 uppercase flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> MRR Estimado
          </span>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-emerald-500">{fmtBRL(kpis.mrr)}</span>
            <span className="block text-[10px] text-si-4 mt-1">Faturamento recorrente</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-si-card border border-si-border-md rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold tracking-[0.18em] text-si-3 uppercase">Cadastros Recentes (Últimos 15 dias)</h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={signupData}>
                <defs>
                  <linearGradient id="cadastrosGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F8CFF" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4F8CFF" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" {...gridStyle} vertical={false} />
                <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                <Tooltip 
                  contentStyle={tooltipStyle} 
                  cursor={{ stroke: 'rgba(255,255,255,0.06)' }}
                  labelStyle={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}
                />
                <Area
                  type="monotone"
                  dataKey="cadastros"
                  name="Cadastros"
                  stroke="#4F8CFF"
                  strokeWidth={2}
                  fill="url(#cadastrosGrad)"
                  dot={{ r: 3, fill: '#4F8CFF', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#4F8CFF' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-si-card border border-si-border-md rounded-xl p-5 flex flex-col justify-between">
          <h3 className="text-xs font-bold tracking-[0.18em] text-si-3 uppercase">Distribuição de Planos</h3>
          <div className="h-44 w-full flex items-center justify-center relative">
            {planPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {planPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    itemStyle={{ fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-[10px] text-si-4 font-bold tracking-[0.15em] uppercase">Sem dados</span>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold tracking-tight text-si-1">{kpis.total}</span>
              <span className="text-[8px] font-bold tracking-[0.15em] text-si-4 uppercase mt-0.5">Usuários</span>
            </div>
          </div>
          <div className="space-y-2.5 mt-2">
            {planPieData.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-si-3 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}
                </span>
                <span className="font-mono text-si-2">{p.value} ({kpis.total > 0 ? Math.round((p.value / kpis.total) * 100) : 0}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alertas & Feedbacks Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas do Sistema */}
        <div className="bg-si-card border border-si-border-md rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold tracking-[0.18em] text-si-3 uppercase flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-red-500" /> Alertas Operacionais
          </h3>
          <div className="space-y-3 min-h-[160px]">
            {alerts.length > 0 ? (
              alerts.map((al) => (
                <div 
                  key={al.id} 
                  className={`flex items-start gap-3 p-3 rounded-lg border text-xs ${
                    al.type === 'warning' 
                      ? 'bg-amber-950/10 border-amber-500/20 text-amber-300' 
                      : 'bg-blue-950/10 border-blue-500/20 text-blue-300'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{al.text}</span>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-40 border border-dashed border-si-border rounded-lg text-si-4 text-[10px] font-bold tracking-[0.15em] uppercase">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2" /> Sistema Operando Sem Alertas
              </div>
            )}
          </div>
        </div>

        {/* Atividade Recente / Feedbacks */}
        <div className="bg-si-card border border-si-border-md rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold tracking-[0.18em] text-si-3 uppercase flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-purple-500" /> Feedbacks Recentes
            </h3>
            <div className="space-y-3 mt-4">
              {feedbacks.length > 0 ? (
                feedbacks.map((fb) => (
                  <div key={fb.id} className="p-3 bg-si-over-1 border border-si-border rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[8px] font-bold tracking-[0.15em] px-2 py-0.5 rounded-full uppercase ${
                        fb.category === 'erro' 
                          ? 'bg-red-950/30 text-red-500 border border-red-500/10' 
                          : fb.category === 'critica'
                            ? 'bg-amber-950/30 text-amber-500 border border-amber-500/10'
                            : 'bg-blue-950/30 text-blue-500 border border-blue-500/10'
                      }`}>
                        {fb.category}
                      </span>
                      <span className="text-[9px] text-si-4 font-mono">
                        {fb.createdAt ? new Date(fb.createdAt.toDate ? fb.createdAt.toDate() : fb.createdAt).toLocaleDateString('pt-BR') : '—'}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-si-1 leading-tight truncate">{fb.title}</p>
                    <p className="text-[10px] text-si-4 truncate font-medium">{fb.userEmail}</p>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-32 border border-dashed border-si-border rounded-lg text-si-4 text-[10px] font-bold tracking-[0.15em] uppercase">
                  Sem feedbacks recentes
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/feedbacks')}
            className="w-full mt-4 py-2.5 bg-si-over-2 hover:bg-si-over-3 border border-si-border rounded-lg text-[10px] font-bold tracking-[0.18em] uppercase text-si-1 transition-all duration-200"
          >
            Ver Todos os Feedbacks
          </button>
        </div>
      </div>
    </div>
  );
}
