import { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, Star, Award, CreditCard, ChevronRight, CheckCircle 
} from 'lucide-react';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { gridStyle, axisStyle, tooltipStyle, fmtBRL, fmtAxis } from '../../components/charts/chartConfig';

interface UserDoc {
  id: string;
  name?: string;
  email?: string;
  plan?: string;
}

export default function AdminPlanos() {
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailQuery, setEmailQuery] = useState('');
  const [targetPlan, setTargetPlan] = useState('free');
  const [updating, setUpdating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchUsers() {
      try {
        setLoading(true);
        const snap = await getDocs(collection(db, 'users'));
        const list: UserDoc[] = [];
        snap.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as UserDoc);
        });
        if (active) {
          setUsers(list);
        }
      } catch (err) {
        console.error('[AdminPlanos] Fetch error:', err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    fetchUsers();
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const total = users.length;
    const pro = users.filter((u) => u.plan === 'pro').length;
    const familia = users.filter((u) => u.plan === 'familia').length;
    const free = total - pro - familia;
    const mrr = pro * 29.9 + familia * 39.9;
    const arr = mrr * 12;
    const conversionRate = total > 0 ? ((pro + familia) / total) * 100 : 0;

    return { total, pro, familia, free, mrr, arr, conversionRate };
  }, [users]);

  // MRR history chart (simulating growth data over 6 months)
  const mrrData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    // Simulation based on current MRR
    const current = stats.mrr;
    return months.map((m, idx) => {
      const growthFactor = (idx + 5) / 10; // Growth progression
      return {
        name: m,
        mrr: Math.round(current * growthFactor),
      };
    });
  }, [stats.mrr]);

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailQuery.trim().toLowerCase();
    if (!cleanEmail) return;

    setUpdating(true);
    try {
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);
      if (snap.empty) {
        showToast('Nenhum usuário encontrado com este e-mail.');
        return;
      }

      const userDoc = snap.docs[0];
      await updateDoc(doc(db, 'users', userDoc.id), {
        plan: targetPlan,
      });

      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.email?.toLowerCase() === cleanEmail ? { ...u, plan: targetPlan } : u))
      );

      showToast(`Plano de ${cleanEmail} alterado para ${targetPlan}.`);
      setEmailQuery('');
    } catch (err) {
      console.error('[AdminPlanos] Update plan error:', err);
      showToast('Erro ao atualizar plano.');
    } finally {
      setUpdating(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-si-border border-t-si-3 rounded-full animate-spin" />
          <span className="text-[10px] font-bold tracking-[0.2em] text-si-4 uppercase">Carregando planos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-xl font-black tracking-[-0.02em] text-si-1">PLANOS & BILLING</h1>
        <p className="text-xs text-si-4 font-medium mt-1">Gestão de faturamento, MRR e conversões de assinaturas</p>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-si-card border border-si-border-md rounded-xl p-4 flex flex-col justify-between min-h-[100px]">
          <span className="text-[10px] font-bold tracking-[0.18em] text-si-4 uppercase flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> MRR Atual
          </span>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-emerald-500">{fmtBRL(stats.mrr)}</span>
            <span className="block text-[10px] text-si-4 mt-1">Faturamento mensal recorrente</span>
          </div>
        </div>

        <div className="bg-si-card border border-si-border-md rounded-xl p-4 flex flex-col justify-between min-h-[100px]">
          <span className="text-[10px] font-bold tracking-[0.18em] text-si-4 uppercase flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-blue-500" /> ARR Estimado
          </span>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-si-1">{fmtBRL(stats.arr)}</span>
            <span className="block text-[10px] text-si-4 mt-1">Faturamento anualizado</span>
          </div>
        </div>

        <div className="bg-si-card border border-si-border-md rounded-xl p-4 flex flex-col justify-between min-h-[100px]">
          <span className="text-[10px] font-bold tracking-[0.18em] text-si-4 uppercase flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-purple-500" /> Conversão
          </span>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-purple-500">{stats.conversionRate.toFixed(1)}%</span>
            <span className="block text-[10px] text-si-4 mt-1">Conversão de base paga</span>
          </div>
        </div>

        <div className="bg-si-card border border-si-border-md rounded-xl p-4 flex flex-col justify-between min-h-[100px]">
          <span className="text-[10px] font-bold tracking-[0.18em] text-si-4 uppercase flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-si-4" /> Pagantes / Base
          </span>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-si-1">{stats.pro + stats.familia} / {stats.total}</span>
            <span className="block text-[10px] text-si-4 mt-1">{stats.free} usuários gratuitos</span>
          </div>
        </div>
      </div>

      {/* Funnel & Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MRR Area Chart */}
        <div className="lg:col-span-2 bg-si-card border border-si-border-md rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold tracking-[0.18em] text-si-3 uppercase">Crescimento de MRR (Simulação 6 Meses)</h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mrrData}>
                <defs>
                  <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" {...gridStyle} vertical={false} />
                <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtAxis} tick={axisStyle} axisLine={false} tickLine={false} width={45} />
                <Tooltip 
                  contentStyle={tooltipStyle}
                  formatter={(v) => [`R$ ${Number(v).toFixed(2)}`, 'MRR']}
                />
                <Area
                  type="monotone"
                  dataKey="mrr"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#mrrGrad)"
                  dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Funnel list */}
        <div className="bg-si-card border border-si-border-md rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold tracking-[0.18em] text-si-3 uppercase">Funil de Ativação</h3>
          <div className="space-y-3">
            {[
              { label: 'Cadastros Totais', value: stats.total, color: 'text-si-3 bg-zinc-800/10 border-zinc-700/20' },
              { label: 'Sincronizaram OF (Heurística)', value: Math.round(stats.total * 0.65), color: 'text-blue-500 bg-blue-950/10 border-blue-500/20' },
              { label: 'Engajamento Recorrente', value: Math.round(stats.total * 0.35), color: 'text-purple-500 bg-purple-950/10 border-purple-500/20' },
              { label: 'Conversão para Pago', value: stats.pro + stats.familia, color: 'text-emerald-500 bg-emerald-950/10 border-emerald-500/20' },
            ].map((step, idx) => (
              <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border text-xs font-semibold ${step.color}`}>
                <span className="flex items-center gap-1.5">
                  <ChevronRight className="w-4 h-4 shrink-0" /> {step.label}
                </span>
                <span className="font-mono text-sm">{step.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Plan edit form */}
      <div className="bg-si-card border border-si-border-md rounded-xl p-5">
        <h3 className="text-xs font-bold tracking-[0.18em] text-si-3 uppercase flex items-center gap-1.5 mb-4">
          <Award className="w-4 h-4 text-purple-500" /> Gerenciar Plano de Usuário
        </h3>
        <form onSubmit={handleUpdatePlan} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-[9px] font-bold tracking-[0.15em] text-si-4 uppercase">E-mail do usuário</label>
            <input
              type="email"
              required
              placeholder="usuario@email.com"
              value={emailQuery}
              onChange={(e) => setEmailQuery(e.target.value)}
              className="w-full px-3 py-2 bg-si-bg border border-si-border rounded-lg text-xs text-si-1 outline-none focus:border-si-border-lg transition-colors placeholder:text-si-5"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-bold tracking-[0.15em] text-si-4 uppercase">Plano Destino</label>
            <select
              value={targetPlan}
              onChange={(e) => setTargetPlan(e.target.value)}
              className="w-full px-3 py-2 bg-si-bg border border-si-border rounded-lg text-xs text-si-2 outline-none focus:border-si-border-lg cursor-pointer"
            >
              <option value="free">Gratuito (free)</option>
              <option value="pro">Pro (pro)</option>
              <option value="familia">Família (familia)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={updating}
            className="w-full py-2 px-4 rounded-lg bg-si-over-2 hover:bg-si-over-3 border border-si-border text-xs font-bold tracking-[0.15em] uppercase text-si-1 transition-all duration-200 disabled:opacity-50"
          >
            {updating ? 'Atualizando...' : 'Aplicar Plano'}
          </button>
        </form>
      </div>

      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-emerald-950 border border-emerald-500/20 text-emerald-400 py-3 px-5 rounded-xl text-xs font-bold tracking-wide flex items-center gap-2 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle className="w-4 h-4" /> {toastMessage}
        </div>
      )}
    </div>
  );
}
