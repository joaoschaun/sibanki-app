import { useState, useEffect, useMemo } from 'react';
import { Activity, Calendar, BarChart2 } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { fnsUS } from '../../firebase';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from 'recharts';
import { gridStyle, axisStyle, tooltipStyle } from '../../components/charts/chartConfig';

interface AdminData {
  counts: { total: number; pro: number; familia: number; free: number };
  series: { date: string; registrations: number; dau: number }[];
  moduleUsage: { key: string; count: number }[];
}

const MODULE_LABELS: Record<string, string> = {
  assistente: 'Assistente', painel: 'Painel', lancamentos: 'Lançamentos', contas: 'Contas',
  credito: 'Crédito', investimentos: 'Investimentos', orcamento: 'Orçamento', metas: 'Metas',
  recorrentes: 'Recorrentes', loja: 'Loja', familia: 'Família', credi_amigo: 'Credi Amigo',
  consorcio: 'Consórcio', relatorios: 'Relatórios', calendario: 'Calendário', educacao: 'Educação',
  ferramentas: 'Ferramentas', fire: 'FIRE', meu_cpf: 'Meu CPF', sibcoin: 'SibCoin',
  filiados: 'Filiados', perfil: 'Perfil', configuracoes: 'Configurações',
};

export default function AdminMetricas() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const getData = httpsCallable<unknown, AdminData>(fnsUS, 'adminGetData');
        const res = await getData({});
        if (active) setData(res.data);
      } catch (err) {
        console.error('[AdminMetricas] Error:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // Uso REAL por módulo — eventos module_viewed agregados (últimos 30d).
  const moduleUsageData = useMemo(() => {
    return (data?.moduleUsage || []).map((m) => ({
      name: MODULE_LABELS[m.key] || m.key,
      value: m.count,
    }));
  }, [data]);

  // DAU REAL — usuários distintos por dia em platform_events (últimos 30d).
  const dauData = useMemo(() => {
    return (data?.series || []).map((s) => {
      const p = s.date.split('-');
      return { label: `${p[2]}/${p[1]}`, usuarios: s.dau };
    });
  }, [data]);

  const totalUsers = data?.counts.total ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-si-border border-t-si-3 rounded-full animate-spin" />
          <span className="text-[10px] font-bold tracking-[0.2em] text-si-4 uppercase">Carregando métricas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-xl font-black tracking-[-0.02em] text-si-1">MÉTRICAS & DADOS</h1>
        <p className="text-xs text-si-4 font-medium mt-1">Análise de engajamento, retenção e comportamento dos usuários</p>
      </div>

      {/* Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DAU */}
        <div className="bg-si-card border border-si-border-md rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold tracking-[0.18em] text-si-3 uppercase flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-blue-500" /> Usuários Ativos Diários (DAU)
          </h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dauData}>
                <CartesianGrid strokeDasharray="3 3" {...gridStyle} vertical={false} />
                <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={30} />
                <Tooltip 
                  contentStyle={tooltipStyle} 
                  cursor={{ fill: 'var(--si-over-1)', opacity: 0.2 }}
                />
                <Bar dataKey="usuarios" fill="#4F8CFF" radius={[4, 4, 0, 0]} name="DAU" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Module Usage */}
        <div className="bg-si-card border border-si-border-md rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold tracking-[0.18em] text-si-3 uppercase flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-emerald-500" /> Uso Estimado por Módulo
          </h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={moduleUsageData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" {...gridStyle} horizontal={false} />
                <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={axisStyle} axisLine={false} tickLine={false} width={80} />
                <Tooltip 
                  contentStyle={tooltipStyle}
                  cursor={{ fill: 'var(--si-over-1)', opacity: 0.2 }}
                />
                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} name="Acessos estimados">
                  {moduleUsageData.map((_, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === 0 ? '#10b981' : index === 1 ? '#06b6d4' : '#8b5cf6'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Cohort Table */}
      <div className="bg-si-card border border-si-border-md rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold tracking-[0.18em] text-si-3 uppercase flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-purple-500" /> Análise de Cohort — Retenção de Usuários
          </h3>
          <span className="text-[9px] font-bold text-si-4 bg-si-over-1 border border-si-border px-2 py-0.5 rounded uppercase">
            30 dias
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-si-border text-si-4 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Coorte (Mês)</th>
                <th className="py-3 px-4">Novos Usuários</th>
                <th className="py-3 px-4">Retenção D1</th>
                <th className="py-3 px-4">Retenção D7</th>
                <th className="py-3 px-4">Retenção D30</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-si-border/50 text-si-3">
              <tr className="hover:bg-si-over-1">
                <td className="py-3 px-4 font-bold text-si-1">Junho 2026</td>
                <td className="py-3 px-4 font-mono">{totalUsers}</td>
                <td className="py-3 px-4 text-si-4 font-mono">—</td>
                <td className="py-3 px-4 text-si-4 font-mono">—</td>
                <td className="py-3 px-4 text-si-4 font-mono">—</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded bg-si-over-2 text-si-3 font-semibold uppercase text-[9px] tracking-wider">
                    Ativo
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-si-over-1">
                <td className="py-3 px-4 font-bold text-si-1">Maio 2026</td>
                <td className="py-3 px-4 font-mono">0</td>
                <td className="py-3 px-4 text-si-4 font-mono">—</td>
                <td className="py-3 px-4 text-si-4 font-mono">—</td>
                <td className="py-3 px-4 text-si-4 font-mono">—</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded bg-si-over-2 text-si-4 font-semibold uppercase text-[9px] tracking-wider">
                    Fechado
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-si-4 leading-relaxed mt-2">
          * A retenção de coorte mede a porcentagem de novos usuários de um determinado mês que retornaram para usar a plataforma nos intervalos de 1 dia (D1), 7 dias (D7) e 30 dias (D30).
        </p>
      </div>
    </div>
  );
}
