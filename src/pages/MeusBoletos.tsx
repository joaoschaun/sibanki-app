/**
 * MeusBoletos — Central de boletos DDA + Open Finance
 *
 * Acao 8 (29/03/2026): integrado ao sistema de missoes SibCoin.
 *   - Dispara 'dda_boleto_detected' na primeira visita com boletos DDA.
 *   - Exibe SibcoinMissionBanner contextual para esta pagina.
 */
import { useState, useMemo, useEffect } from 'react';
import { useSibcoinToast } from '../hooks/useSibcoinToast';
import { SibcoinMissionBanner } from '../components/sibcoin/SibcoinMissionBanner';
import {
  FileText, Bell, Zap, Brain, CheckCircle, AlertTriangle,
  Clock, XCircle, Calendar, Filter, Wifi, Building2,
  ChevronRight, ArrowRight, Info,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

// ── Tipos ────────────────────────────────────────────────────────────────────
interface Boleto {
  id: string;
  beneficiario: string;
  descricao: string;
  valor: number;
  vencimento: string;
  status: 'pendente' | 'pago' | 'vencido' | 'agendado';
  categoria: string;
  source: 'dda' | 'open-finance' | 'manual';
  recorrente: boolean;
}

interface Alerta {
  id: string;
  tipo: 'vencimento' | 'pagamento' | 'novo';
  msg: string;
  valor?: number;
  data: string;
  lido: boolean;
}

// ── Demo data ─────────────────────────────────────────────────────────────────
const TODAY = new Date();
const addDays = (d: number) => new Date(TODAY.getTime() + d * 86400000).toISOString().slice(0, 10);

const DEMO_BOLETOS: Boleto[] = [
  { id: 'b1', beneficiario: 'SABESP',           descricao: 'Conta de água – Mar/26',      valor: 87.40,  vencimento: addDays(3),   status: 'pendente',  categoria: 'Utilidades', source: 'dda', recorrente: true },
  { id: 'b2', beneficiario: 'ENEL SP',           descricao: 'Conta de luz – Mar/26',       valor: 143.20, vencimento: addDays(5),   status: 'pendente',  categoria: 'Utilidades', source: 'dda', recorrente: true },
  { id: 'b3', beneficiario: 'Condomínio EdifA',  descricao: 'Taxa condominial Mar/26',     valor: 620.00, vencimento: addDays(1),   status: 'pendente',  categoria: 'Moradia',    source: 'open-finance', recorrente: true },
  { id: 'b4', beneficiario: 'Escola Período',    descricao: 'Mensalidade Mar/26',          valor: 980.00, vencimento: addDays(-2),  status: 'vencido',   categoria: 'Educação',   source: 'dda', recorrente: true },
  { id: 'b5', beneficiario: 'Claro Internet',    descricao: 'Internet – Mar/26',           valor: 109.90, vencimento: addDays(10),  status: 'agendado',  categoria: 'Telecom',    source: 'dda', recorrente: true },
  { id: 'b6', beneficiario: 'Plano de Saúde',    descricao: 'Amil – Fev/26',               valor: 456.00, vencimento: addDays(-15), status: 'pago',      categoria: 'Saúde',      source: 'open-finance', recorrente: true },
  { id: 'b7', beneficiario: 'Financiamento Auto','descricao': 'Parcela 18/60 – Mar/26',    valor: 734.55, vencimento: addDays(8),   status: 'pendente',  categoria: 'Transporte', source: 'dda', recorrente: true },
  { id: 'b8', beneficiario: 'Academia Gym+',     descricao: 'Mensalidade – Mar/26',        valor: 89.90,  vencimento: addDays(12),  status: 'agendado',  categoria: 'Saúde',      source: 'manual', recorrente: true },
];

const DEMO_ALERTAS: Alerta[] = [
  { id: 'al1', tipo: 'vencimento', msg: 'Condomínio vence amanhã',    valor: 620.00, data: addDays(0), lido: false },
  { id: 'al2', tipo: 'vencimento', msg: 'SABESP vence em 3 dias',     valor: 87.40,  data: addDays(0), lido: false },
  { id: 'al3', tipo: 'pagamento',  msg: 'Escola venceu há 2 dias',    valor: 980.00, data: addDays(-2), lido: false },
  { id: 'al4', tipo: 'novo',       msg: 'Novo boleto ENEL detectado', valor: 143.20, data: addDays(0), lido: true },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  pendente:  { label: 'Pendente',  color: 'bg-amber-500/15 text-amber-400 border-amber-500/20', icon: Clock,         ring: 'border-amber-500/20' },
  pago:      { label: 'Pago',      color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', icon: CheckCircle, ring: 'border-emerald-500/10' },
  vencido:   { label: 'Vencido',   color: 'bg-rose-500/15 text-rose-400 border-rose-500/20',   icon: AlertTriangle, ring: 'border-rose-500/20' },
  agendado:  { label: 'Agendado',  color: 'bg-blue-500/15 text-blue-400 border-blue-500/20',   icon: Calendar,      ring: 'border-blue-500/10' },
};

const SOURCE_CFG = {
  dda:           { label: 'DDA', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  'open-finance': { label: 'Open Finance', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  manual:        { label: 'Manual', color: 'text-si-4', bg: 'bg-si-zinc-8' },
};

const TABS = ['Central', 'Alertas', 'Agendamento', 'Inteligência'] as const;
type Tab = typeof TABS[number];

const fmtBRL = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

// ── Componente ────────────────────────────────────────────────────────────────
export default function MeusBoletos() {
  const { data } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>('Central');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [alertsRead, setAlertsRead] = useState<string[]>([]);

  const ddaStatus = data?.ddaStatus ?? 'nao-ativado';
  const isConnected = ddaStatus === 'ativo';

  const filteredBoletos = useMemo(() =>
    DEMO_BOLETOS.filter((b) => filterStatus === 'todos' || b.status === filterStatus),
  [filterStatus]);

  const pendentes = DEMO_BOLETOS.filter((b) => b.status === 'pendente' || b.status === 'vencido');
  const totalPendente = pendentes.reduce((s, b) => s + b.valor, 0);
  const vencidos = DEMO_BOLETOS.filter((b) => b.status === 'vencido');
  const unreadAlerts = DEMO_ALERTAS.filter((a) => !a.lido && !alertsRead.includes(a.id)).length;

  // Insights gerados localmente (IA real via Vertex na Fase 3)
  const insights = useMemo(() => [
    {
      title: 'Economia possível',
      desc: `Seus boletos recorrentes somam ${fmtBRL(DEMO_BOLETOS.filter((b) => b.recorrente).reduce((s,b)=>s+b.valor,0))}/mês. Negocie o condomínio e telecom para reduzir até 15%.`,
      icon: '💡',
    },
    {
      title: 'Melhor dia para pagamento',
      desc: 'Seu fluxo de caixa é mais forte nos dias 5-10. Agende todos os boletos para essa janela.',
      icon: '📅',
    },
    {
      title: 'Boleto vencido detectado',
      desc: `A Escola venceu há 2 dias (${fmtBRL(980)}). Normalmente há multa de 2% + juros de 0,033%/dia. Pague hoje para minimizar o acréscimo.`,
      icon: '⚠️',
    },
  ], []);

  /**
   * Acao 8 — Trigger SibCoin: dda_boleto_detected
   * Dispara uma vez por dispositivo quando ha boletos com source 'dda'.
   * Guard via localStorage para nao repetir entre sessoes.
   */
  const { triggerWithToast } = useSibcoinToast();
  useEffect(() => {
    const hasDda = DEMO_BOLETOS.some((b) => b.source === 'dda');
    const key = 'sibcoin_dda_boleto_triggered';
    if (hasDda && !localStorage.getItem(key)) {
      localStorage.setItem(key, '1');
      triggerWithToast('dda_boleto_detected');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="w-8 h-8 text-violet-400" />
            Meus Boletos
          </h2>
          <p className="text-si-5 text-sm mt-1">DDA automático · monitoramento e agendamento</p>
        </div>
        {!isConnected && (
          <button className="flex items-center gap-1.5 text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-2 rounded-xl hover:bg-violet-500/20 transition-colors">
            <Wifi className="w-3.5 h-3.5" /> Ativar DDA
          </button>
        )}
      </div>

      {/* DDA banner */}
      {!isConnected && (
        <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-3 flex items-start gap-3">
          <Info className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-violet-300 text-sm font-medium">DDA não ativado — dados de demonstração</p>
            <p className="text-violet-400/70 text-xs mt-0.5">
              O DDA (Débito Direto Autorizado) captura boletos automaticamente via Open Finance ou BaaS.
              Ative para monitoramento em tempo real.
            </p>
          </div>
        </div>
      )}

      {/* SibCoin Mission Banner — Acao 8 */}
      <SibcoinMissionBanner eventType="dda_boleto_detected" />

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-si-card rounded-2xl border border-si-border p-4 text-center">
          <p className="text-xs text-si-5 mb-1">Total boletos</p>
          <p className="text-2xl font-bold text-si-1">{DEMO_BOLETOS.length}</p>
        </div>
        <div className={`bg-si-card rounded-2xl border p-4 text-center ${vencidos.length > 0 ? 'border-rose-500/30' : 'border-si-border'}`}>
          <p className="text-xs text-si-5 mb-1">Vencidos</p>
          <p className={`text-2xl font-bold ${vencidos.length > 0 ? 'text-rose-400' : 'text-si-4'}`}>{vencidos.length}</p>
        </div>
        <div className="bg-si-card rounded-2xl border border-si-border p-4 text-center">
          <p className="text-xs text-si-5 mb-1">A pagar</p>
          <p className="text-2xl font-bold text-amber-400">{fmtBRL(totalPendente)}</p>
        </div>
        <div className={`bg-si-card rounded-2xl border p-4 text-center ${unreadAlerts > 0 ? 'border-amber-500/30' : 'border-si-border'}`}>
          <p className="text-xs text-si-5 mb-1">Alertas</p>
          <p className={`text-2xl font-bold ${unreadAlerts > 0 ? 'text-amber-400' : 'text-si-4'}`}>{unreadAlerts}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-si-card rounded-xl p-1 border border-si-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors relative ${
              activeTab === t ? 'bg-violet-600 text-si-1 shadow' : 'text-si-5 hover:text-si-3'
            }`}
          >
            {t}
            {t === 'Alertas' && unreadAlerts > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadAlerts}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── CENTRAL ── */}
      {activeTab === 'Central' && (
        <div className="space-y-4">
          {/* Status filter */}
          <div className="flex gap-2 flex-wrap">
            {(['todos', 'pendente', 'vencido', 'agendado', 'pago'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                  filterStatus === s
                    ? 'bg-violet-600 text-si-1'
                    : 'bg-si-card border border-si-border-md text-si-4 hover:text-si-2'
                }`}
              >
                <Filter className="w-3 h-3 inline mr-1" />{s}
              </button>
            ))}
          </div>

          <div className="bg-si-card rounded-2xl border border-si-border overflow-hidden">
            <div className="divide-y divide-white/5">
              {filteredBoletos.map((b) => {
                const cfg = STATUS_CFG[b.status];
                const srcCfg = SOURCE_CFG[b.source];
                const StatusIcon = cfg.icon;
                const daysUntil = Math.ceil((new Date(b.vencimento).getTime() - TODAY.getTime()) / 86400000);
                return (
                  <div key={b.id} className={`flex items-start gap-4 px-5 py-4 hover:bg-si-over-1 transition-colors border-l-2 ${cfg.ring}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.color.split(' ').slice(0, 2).join(' ')}`}>
                      <StatusIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-si-1 text-sm">{b.beneficiario}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.color}`}>{cfg.label}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${srcCfg.bg} ${srcCfg.color}`}>{srcCfg.label}</span>
                        {b.recorrente && <span className="text-[10px] text-zinc-600">↻ Recorrente</span>}
                      </div>
                      <p className="text-xs text-si-5 mt-0.5">{b.descricao}</p>
                      <p className="text-xs text-zinc-600 mt-0.5">
                        {b.status === 'pago' ? 'Pago' :
                         b.status === 'vencido' ? `Venceu há ${Math.abs(daysUntil)} dias` :
                         daysUntil === 0 ? 'Vence hoje' :
                         daysUntil === 1 ? 'Vence amanhã' :
                         `Vence em ${daysUntil} dias`} · {new Date(b.vencimento).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-si-1 tabular-nums">{fmtBRL(b.valor)}</p>
                      {b.status !== 'pago' && b.status !== 'agendado' && (
                        <button className="text-xs text-violet-400 hover:underline mt-1 flex items-center gap-1 ml-auto">
                          Pagar <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── ALERTAS ── */}
      {activeTab === 'Alertas' && (
        <div className="bg-si-card rounded-2xl border border-si-border">
          <div className="px-6 py-3 border-b border-si-border flex items-center justify-between">
            <span className="text-sm font-semibold text-si-3">Notificações</span>
            {unreadAlerts > 0 && (
              <button
                onClick={() => setAlertsRead(DEMO_ALERTAS.map((a) => a.id))}
                className="text-xs text-violet-400 hover:underline"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>
          {DEMO_ALERTAS.map((a) => {
            const isRead = a.lido || alertsRead.includes(a.id);
            const iconColor = a.tipo === 'vencimento' ? 'text-amber-400 bg-amber-500/10' :
                              a.tipo === 'pagamento'  ? 'text-rose-400 bg-rose-500/10' : 'text-blue-400 bg-blue-500/10';
            const IconC = a.tipo === 'vencimento' ? Clock : a.tipo === 'pagamento' ? AlertTriangle : Bell;
            return (
              <div
                key={a.id}
                onClick={() => setAlertsRead((p) => [...p, a.id])}
                className={`flex items-center gap-4 px-6 py-4 border-b border-si-border last:border-0 cursor-pointer hover:bg-si-over-1 ${!isRead ? 'bg-white/[0.01]' : ''}`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconColor.split(' ').slice(1).join(' ')}`}>
                  <IconC className={`w-4 h-4 ${iconColor.split(' ')[0]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!isRead ? 'font-semibold text-si-1' : 'text-si-4'}`}>{a.msg}</p>
                  {a.valor && <p className={`text-xs ${!isRead ? 'text-si-3' : 'text-si-5'} tabular-nums`}>{fmtBRL(a.valor)}</p>}
                </div>
                {!isRead && <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
              </div>
            );
          })}
        </div>
      )}

      {/* ── AGENDAMENTO ── */}
      {activeTab === 'Agendamento' && (
        <div className="space-y-4">
          <div className="bg-si-card rounded-2xl border border-si-border p-6">
            <h3 className="font-semibold text-si-1 flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-violet-400" />
              Boletos agendados
            </h3>
            {DEMO_BOLETOS.filter((b) => b.status === 'agendado').map((b) => (
              <div key={b.id} className="flex items-center gap-4 py-3 border-b border-si-border last:border-0">
                <div className="flex-1">
                  <p className="font-medium text-si-2 text-sm">{b.beneficiario}</p>
                  <p className="text-xs text-si-5">{new Date(b.vencimento).toLocaleDateString('pt-BR')}</p>
                </div>
                <p className="font-bold text-blue-400 tabular-nums">{fmtBRL(b.valor)}</p>
                <button className="text-xs text-rose-400 hover:underline">Cancelar</button>
              </div>
            ))}
          </div>

          <div className="bg-si-card rounded-2xl border border-si-border p-6">
            <h3 className="font-semibold text-si-2 text-sm mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-si-5" />
              Métodos de pagamento DDA
            </h3>
            {[
              { method: 'Open Finance',  desc: 'Via Pluggy — autorização imediata',        phase: 'Fase 1',  icon: Wifi },
              { method: 'BaaS parceiro', desc: 'Débito automático via banco parceiro',      phase: 'Fase 2',  icon: Building2 },
              { method: 'SPB Direto',    desc: 'Acesso direto ao Sistema de Pagamentos',   phase: 'Fase 3',  icon: Zap },
            ].map((m) => (
              <div key={m.method} className="flex items-center gap-3 py-3 border-b border-si-border last:border-0">
                <m.icon className="w-4 h-4 text-si-5 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-si-3 text-sm">{m.method}</p>
                  <p className="text-xs text-si-5">{m.desc}</p>
                </div>
                <span className="text-xs text-zinc-600">{m.phase}</span>
                <ChevronRight className="w-4 h-4 text-zinc-700" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── INTELIGÊNCIA ── */}
      {activeTab === 'Inteligência' && (
        <div className="space-y-4">
          <div className="bg-si-card rounded-2xl border border-si-border p-5">
            <h3 className="font-semibold text-si-1 flex items-center gap-2 mb-1">
              <Brain className="w-5 h-5 text-violet-400" />
              Insights financeiros
            </h3>
            <p className="text-xs text-si-5 mb-4">Análise local dos seus boletos · IA real via Vertex na Fase 3</p>
            <div className="space-y-4">
              {insights.map((ins, i) => (
                <div key={i} className="bg-si-over-1 rounded-xl border border-si-border p-4 flex gap-3">
                  <span className="text-2xl shrink-0">{ins.icon}</span>
                  <div>
                    <p className="font-semibold text-si-2 text-sm">{ins.title}</p>
                    <p className="text-xs text-si-5 mt-1 leading-relaxed">{ins.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-si-card rounded-2xl border border-si-border p-5">
            <h3 className="font-semibold text-si-2 text-sm mb-3">Distribuição por categoria</h3>
            {['Moradia', 'Transporte', 'Educação', 'Saúde', 'Telecom', 'Utilidades'].map((cat) => {
              const total = DEMO_BOLETOS.filter((b) => b.categoria === cat).reduce((s, b) => s + b.valor, 0);
              const allTotal = DEMO_BOLETOS.reduce((s, b) => s + b.valor, 0);
              if (total === 0) return null;
              const pct = (total / allTotal) * 100;
              return (
                <div key={cat} className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-si-4">{cat}</span>
                    <span className="text-si-5 tabular-nums">{fmtBRL(total)} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-1.5 bg-si-zinc-8 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
