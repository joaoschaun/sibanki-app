import { useState } from 'react';
import {
  Shield, AlertTriangle, Eye, Lock, Activity,
  TrendingUp, TrendingDown, Bell, CheckCircle,
  ChevronRight, RefreshCw, Info,
} from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { useAppContext } from '../context/AppContext';
import { ComingSoonOverlay } from '../components/ui/ComingSoonBadge';
import { updateUserDoc } from '../services/persistUserData';

const SCORE_MAX = 1000;

const TABS = ['Score', 'Negativações', 'Consultas', 'Alertas', 'Proteção'] as const;
type Tab = typeof TABS[number];

// ── Score ring SVG ────────────────────────────────────────────────────────────
function ScoreRing({ score, max, isConnected }: { score: number; max: number; isConnected: boolean }) {
  const pct = isConnected ? score / max : 0;
  const r = 72;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  const color = !isConnected ? 'var(--si-zinc-7)' : score < 400 ? '#ef4444' : score < 600 ? '#f59e0b' : score < 750 ? '#3b82f6' : '#10b981';
  const band = !isConnected ? 'Não Conectado' : score < 400 ? 'Muito Baixo' : score < 600 ? 'Regular' : score < 750 ? 'Bom' : 'Excelente';

  return (
    <div className="relative w-44 h-44 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--si-zinc-9)" strokeWidth="14" />
        <circle
          cx="80" cy="80" r={r} fill="none" stroke={color} strokeWidth="14"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-si-1">{isConnected ? score : '—'}</span>
        <span className="text-xs text-si-5">/ {max}</span>
        <span className="text-xs font-semibold mt-1" style={{ color }}>{band}</span>
      </div>
    </div>
  );
}

// ── Bureaus ───────────────────────────────────────────────────────────────────
const BUREAUS = [
  { name: 'Serasa',     phase: 'Fase 1', status: 'disponível', color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  { name: 'Boa Vista',  phase: 'Fase 1', status: 'disponível', color: 'text-green-400',  bg: 'bg-green-500/10' },
  { name: 'SPC Brasil', phase: 'Fase 1', status: 'disponível', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { name: 'Quod',       phase: 'Fase 2', status: 'em breve',   color: 'text-si-4',   bg: 'bg-si-zinc-8' },
  { name: 'SCPC',       phase: 'Fase 2', status: 'em breve',   color: 'text-si-4',   bg: 'bg-si-zinc-8' },
];

export default function MeuCpf() {
  const { user, data } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>('Score');
  const [alertsRead, setAlertsRead] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const cpf = data?.cpfMonitoring;
  const score = cpf?.score ?? 0;
  const negativacoesCount = cpf?.negativacoesCount ?? 0;
  const consultasCount = cpf?.consultasRecentes ?? 0;
  const isConnected = !!cpf;

  const alerts = cpf?.alertas || [];
  const unreadAlerts = alerts.filter((a) => !a.lido && !alertsRead.includes(a.id)).length;

  const ALERTA_ICON: Record<string, React.ElementType> = {
    negativacao: AlertTriangle, consulta: Eye, 'score-queda': TrendingDown,
    'score-alta': TrendingUp, protecao: Shield,
  };
  const ALERTA_COLOR: Record<string, string> = {
    negativacao: 'text-rose-400 bg-rose-500/10',
    consulta: 'text-blue-400 bg-blue-500/10',
    'score-queda': 'text-orange-400 bg-orange-500/10',
    'score-alta': 'text-emerald-400 bg-emerald-500/10',
    protecao: 'text-indigo-400 bg-indigo-500/10',
  };

  const handleConnect = async () => {
    setBusy(true);
    setLocalError(null);
    try {
      const fn = httpsCallable(functions, 'syncCpfMonitoring');
      await fn({});
    } catch (e: any) {
      setLocalError(e.message || 'Erro ao sincronizar dados do CPF.');
    } finally {
      setBusy(false);
    }
  };

  const toggleProtecao = async () => {
    if (!user?.uid || !cpf) return;
    try {
      await updateUserDoc(user.uid, {
        cpfMonitoring: {
          ...cpf,
          protecaoAtiva: !cpf.protecaoAtiva,
          updatedAt: new Date().toISOString()
        }
      });
    } catch (e) {
      console.error('Erro ao alternar proteção:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="w-8 h-8 text-indigo-400" />
            Meu CPF
          </h2>
          <p className="text-si-5 text-sm mt-1">Score, negativações e monitoramento</p>
        </div>
        {!isConnected && (
          <button
            onClick={handleConnect}
            disabled={busy}
            className="flex items-center gap-1.5 text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-2 rounded-xl hover:bg-indigo-500/20 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} /> {busy ? 'Sincronizando...' : 'Conectar bureau'}
          </button>
        )}
      </div>

      {/* Error Alert */}
      {localError && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 flex items-center gap-3 animate-fade-in">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <p className="text-rose-300 text-sm">{localError}</p>
        </div>
      )}

      {/* Info banner */}
      {!isConnected && !localError && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <Info className="w-5 h-5 text-blue-400 shrink-0" />
          <p className="text-blue-300 text-sm">
            Monitoramento inativo — clique em &quot;Conectar bureau&quot; para puxar dados reais.
          </p>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-si-card rounded-2xl border border-si-border p-4 text-center">
          <p className="text-xs text-si-5 mb-1">Score</p>
          <p className="text-2xl font-bold text-si-1">{isConnected ? score : '—'}</p>
          <p className="text-xs text-emerald-400">{isConnected ? '+15 este mês' : 'Inativo'}</p>
        </div>
        <div className={`bg-si-card rounded-2xl border p-4 text-center ${isConnected && negativacoesCount > 0 ? 'border-rose-500/30' : 'border-si-border'}`}>
          <p className="text-xs text-si-5 mb-1">Negativações</p>
          <p className={`text-2xl font-bold ${isConnected && negativacoesCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {isConnected ? negativacoesCount : '—'}
          </p>
          <p className="text-xs text-si-5">{!isConnected ? 'Inativo' : negativacoesCount === 0 ? 'CPF limpo ✓' : 'Ativas'}</p>
        </div>
        <div className={`bg-si-card rounded-2xl border p-4 text-center ${isConnected && unreadAlerts > 0 ? 'border-amber-500/30' : 'border-si-border'}`}>
          <p className="text-xs text-si-5 mb-1">Alertas</p>
          <p className={`text-2xl font-bold ${isConnected && unreadAlerts > 0 ? 'text-amber-400' : 'text-si-4'}`}>
            {isConnected ? unreadAlerts : '—'}
          </p>
          <p className="text-xs text-si-5">{!isConnected ? 'Inativo' : 'Não lidos'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-si-card rounded-xl p-1 border border-si-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors relative ${
              activeTab === t ? 'bg-white text-zinc-900 shadow' : 'text-si-5 hover:text-si-3'
            }`}
          >
            {t}
            {t === 'Alertas' && isConnected && unreadAlerts > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-black text-[11px] font-bold rounded-full flex items-center justify-center">
                {unreadAlerts}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── SCORE ── */}
      {activeTab === 'Score' && (
        <div className="space-y-4">
          <div className="bg-si-card rounded-2xl border border-si-border p-8">
            <ScoreRing score={score} max={SCORE_MAX} isConnected={isConnected} />
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Muito Baixo', range: '0–399', color: 'bg-rose-500' },
                { label: 'Regular',     range: '400–599', color: 'bg-amber-400' },
                { label: 'Bom',         range: '600–749', color: 'bg-blue-500' },
                { label: 'Excelente',   range: '750–1000', color: 'bg-emerald-500' },
              ].map((b) => (
                <div key={b.label} className="text-center">
                  <div className={`h-1.5 rounded-full ${b.color} mb-1`} />
                  <p className="text-[11px] text-si-5 font-medium">{b.label}</p>
                  <p className="text-[11px] text-zinc-600">{b.range}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-si-card rounded-2xl border border-si-border p-5">
            <h3 className="font-semibold text-si-2 mb-3 text-sm">Fatores que afetam seu score</h3>
            <div className="space-y-3">
              {[
                { label: 'Pontualidade de pagamentos', pct: isConnected ? 78 : 0, impact: 'Alto', color: 'bg-emerald-500' },
                { label: 'Tempo de relacionamento',    pct: isConnected ? 65 : 0, impact: 'Médio', color: 'bg-blue-500' },
                { label: 'Consultas recentes',         pct: isConnected ? 52 : 0, impact: 'Médio', color: 'bg-amber-400' },
                { label: 'Diversidade de crédito',     pct: isConnected ? 40 : 0, impact: 'Baixo', color: 'bg-zinc-500' },
              ].map((f) => (
                <div key={f.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-si-4">{f.label}</span>
                    <span className="text-zinc-600">Impacto {f.impact}</span>
                  </div>
                  <div className="h-1.5 bg-si-zinc-8 rounded-full overflow-hidden">
                    <div className={`h-full ${f.color} rounded-full`} style={{ width: `${f.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── NEGATIVAÇÕES ── */}
      {activeTab === 'Negativações' && (
        <div className="bg-si-card rounded-2xl border border-si-border relative">
          {!isConnected && <ComingSoonOverlay label="Conecte seu CPF para visualizar negativações em tempo real" />}
          {negativacoesCount === 0 ? (
            <div className="text-center py-16 animate-fade-in">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="font-semibold text-emerald-400">CPF sem negativações</p>
              <p className="text-xs text-si-5 mt-1">Seu CPF está limpo nas bases do bureau de crédito.</p>
            </div>
          ) : (
            <div className="animate-fade-in">
              {(cpf?.negativacoes || []).map((n) => (
                <div key={n.id} className="flex items-start gap-4 px-6 py-4 border-b border-si-border last:border-0">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-si-2">{n.credor}</p>
                    <p className="text-xs text-si-5">Vencimento: {new Date(n.vencimento).toLocaleDateString('pt-BR')} · {n.origem}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-rose-400">R$ {n.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                      n.status === 'ativa' ? 'bg-rose-500/20 text-rose-400' :
                      n.status === 'quitada' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-si-zinc-8 text-si-5'
                    }`}>{n.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CONSULTAS ── */}
      {activeTab === 'Consultas' && (
        <div className="bg-si-card rounded-2xl border border-si-border relative">
          {!isConnected && <ComingSoonOverlay label="Conecte seu CPF para visualizar consultas em tempo real" />}
          <div className="px-6 py-3 border-b border-si-border flex items-center justify-between">
            <span className="text-sm font-semibold text-si-3">{consultasCount} consultas nos últimos 90 dias</span>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
              consultasCount <= 3 ? 'bg-emerald-500/10 text-emerald-400' :
              consultasCount <= 6 ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'
            }`}>{consultasCount <= 3 ? 'Normal' : consultasCount <= 6 ? 'Moderado' : 'Elevado'}</span>
          </div>
          {consultasCount === 0 ? (
            <div className="text-center py-12 text-si-5 text-sm animate-fade-in">Nenhuma consulta de crédito registrada recentemente.</div>
          ) : (
            <div className="animate-fade-in">
              {(cpf?.consultas || []).map((c) => (
                <div key={c.id} className="flex items-center gap-4 px-6 py-4 border-b border-si-border last:border-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Eye className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-si-2 text-sm">{c.empresa}</p>
                    <p className="text-xs text-si-5">{c.motivo}</p>
                  </div>
                  <p className="text-xs text-zinc-600">{new Date(c.data).toLocaleDateString('pt-BR')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ALERTAS ── */}
      {activeTab === 'Alertas' && (
        <div className="bg-si-card rounded-2xl border border-si-border relative">
          {!isConnected && <ComingSoonOverlay label="Conecte seu CPF para visualizar alertas em tempo real" />}
          <div className="px-6 py-3 border-b border-si-border flex items-center justify-between">
            <span className="text-sm font-semibold text-si-3">Alertas recentes</span>
            {isConnected && unreadAlerts > 0 && (
              <button
                onClick={() => setAlertsRead(alerts.map((a) => a.id))}
                className="text-xs text-blue-400 hover:underline"
              >
                Marcar todos como lidos
              </button>
            )}
          </div>
          {isConnected && unreadAlerts === 0 && alerts.length === 0 ? (
            <div className="text-center py-12 text-si-5 text-sm animate-fade-in">Nenhum alerta pendente no momento.</div>
          ) : (
            isConnected && (
              <div className="animate-fade-in">
                {alerts.map((a) => {
                  const IconC = ALERTA_ICON[a.tipo] ?? Bell;
                  const colorCls = ALERTA_COLOR[a.tipo] ?? 'text-si-4 bg-si-zinc-8';
                  const isRead = a.lido || alertsRead.includes(a.id);
                  return (
                    <div
                      key={a.id}
                      onClick={() => setAlertsRead((prev) => [...prev, a.id])}
                      className={`flex items-center gap-4 px-6 py-4 border-b border-si-border last:border-0 cursor-pointer hover:bg-si-over-1 transition-colors ${
                        !isRead ? 'bg-white/[0.01]' : ''
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colorCls.split(' ').slice(1).join(' ')}`}>
                        <IconC className={`w-4 h-4 ${colorCls.split(' ')[0]}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!isRead ? 'font-semibold text-si-1' : 'font-medium text-si-4'}`}>
                          {a.descricao}
                        </p>
                        <p className="text-xs text-zinc-600">{new Date(a.detectedAt).toLocaleDateString('pt-BR')}</p>
                      </div>
                      {!isRead && <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}

      {/* ── PROTEÇÃO ── */}
      {activeTab === 'Proteção' && (
        <div className="space-y-4 relative">
          {!isConnected && <ComingSoonOverlay label="Conecte seu CPF para ativar a proteção e alertas" />}
          <div className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 rounded-2xl border border-indigo-500/20 p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-3">
              <Lock className="w-6 h-6 text-indigo-400" />
              <h3 className="font-bold text-si-1">Proteção de CPF</h3>
            </div>
            <p className="text-sm text-si-4 mb-4">
              Bloqueie consultas e concessões de crédito não autorizadas em seu nome de forma automatizada.
            </p>
            <div className="flex items-center justify-between p-3 bg-si-over-2 rounded-xl">
              <span className="text-sm text-si-3">Proteção ativa</span>
              <div
                onClick={toggleProtecao}
                className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${
                  cpf?.protecaoAtiva ? 'bg-indigo-600' : 'bg-zinc-700 hover:bg-zinc-600'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    cpf?.protecaoAtiva ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>
          </div>

          <div className="bg-si-card rounded-2xl border border-si-border p-5 animate-fade-in">
            <h3 className="font-semibold text-si-2 mb-3 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              Bureaus monitorados
            </h3>
            <div className="space-y-3">
              {BUREAUS.map((b) => (
                <div key={b.name} className="flex items-center gap-3 p-3 rounded-xl bg-si-over-1 border border-si-border">
                  <div className={`w-9 h-9 rounded-xl ${b.bg} flex items-center justify-center shrink-0`}>
                    <Shield className={`w-4 h-4 ${b.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-si-2 text-sm">{b.name}</p>
                    <p className="text-xs text-si-5">{b.phase}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    b.status === 'disponível' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-si-zinc-8 text-si-5'
                  }`}>{b.status}</span>
                  {b.status === 'disponível' && <ChevronRight className="w-4 h-4 text-zinc-600" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
