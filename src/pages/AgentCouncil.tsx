import { useState, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { useIntelligence } from '../context/IntelligenceContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import {
  Shield, TrendingUp, Brain, Users, Cpu, Play, Loader2,
  AlertTriangle, CheckCircle2, ChevronDown, Zap, Target,
} from 'lucide-react';

interface AgentResult {
  agente: string;
  diagnostico?: string;
  prioridade?: number;
  nivel_alerta?: string;
  oportunidade?: string;
  saude_habitos?: string;
  situacao_familiar?: string;
  riscos?: string[];
  acoes?: string[];
  sugestoes?: string[];
  padroes_detectados?: string[];
  gatilhos?: string[];
  dica_comportamental?: string;
  sugestoes_familia?: string[];
  meta_fire?: string;
  _provider?: string;
}

interface PlanAction {
  ordem: number;
  acao: string;
  agente_responsavel: string;
  urgencia: string;
  impacto: string;
}

interface Synthesis {
  saude_geral: number;
  resumo: string;
  consenso?: string[];
  conflitos?: string[];
  plano_acao: PlanAction[];
  frase_motivacional?: string;
}

interface CouncilResult {
  agentes: Record<string, AgentResult>;
  sintese: Synthesis;
  executadoEm: string;
  duracaoMs: number;
}

const AGENT_CONFIG: Record<string, { icon: typeof Shield; label: string; color: string; bgColor: string }> = {
  guardiao: { icon: Shield, label: 'Guardião', color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20' },
  estrategista: { icon: TrendingUp, label: 'Estrategista', color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20' },
  comportamental: { icon: Brain, label: 'Comportamental', color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/20' },
  familiar: { icon: Users, label: 'Familiar', color: 'text-pink-400', bgColor: 'bg-pink-500/10 border-pink-500/20' },
};

function StatusBadge({ value, type: _type }: { value: string; type: 'alert' | 'opportunity' | 'habits' | 'family' }) {
  const colors: Record<string, string> = {
    verde: 'bg-emerald-500/20 text-emerald-400',
    amarelo: 'bg-amber-500/20 text-amber-400',
    vermelho: 'bg-rose-500/20 text-rose-400',
    alta: 'bg-emerald-500/20 text-emerald-400',
    media: 'bg-amber-500/20 text-amber-400',
    baixa: 'bg-si-over-3 text-si-4',
    forte: 'bg-emerald-500/20 text-emerald-400',
    moderada: 'bg-amber-500/20 text-amber-400',
    fraca: 'bg-rose-500/20 text-rose-400',
    organizada: 'bg-emerald-500/20 text-emerald-400',
    parcial: 'bg-amber-500/20 text-amber-400',
    desorganizada: 'bg-rose-500/20 text-rose-400',
    individual: 'bg-blue-500/20 text-blue-400',
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors[value] || 'bg-si-over-3 text-si-4'}`}>
      {value}
    </span>
  );
}

function UrgencyBadge({ urgencia }: { urgencia: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    imediata: { label: 'Imediata', cls: 'bg-rose-500/20 text-rose-400' },
    esta_semana: { label: 'Esta semana', cls: 'bg-amber-500/20 text-amber-400' },
    este_mes: { label: 'Este mês', cls: 'bg-blue-500/20 text-blue-400' },
  };
  const m = map[urgencia] || { label: urgencia, cls: 'bg-si-over-3 text-si-4' };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.cls}`}>{m.label}</span>;
}

function ScoreRing({ score }: { score: number }) {
  const r = 45;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444';
  return (
    <svg viewBox="0 0 100 100" className="w-28 h-28">
      <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-si-over-3" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 50 50)" className="transition-all duration-1000" />
      <text x="50" y="48" textAnchor="middle" className="fill-si-1 text-2xl font-bold" style={{ fontSize: 24 }}>{score}</text>
      <text x="50" y="64" textAnchor="middle" className="fill-si-5" style={{ fontSize: 10 }}>saúde</text>
    </svg>
  );
}

export default function AgentCouncil() {
  const { user, entries, accounts, accountBalances, goals, investments, budgets, cards, creditObligations, loading: dataLoading } = useAppContext();
  const intelligence = useIntelligence();
  const [result, setResult] = useState<CouncilResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const buildContext = useCallback(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthEntries = (entries || []).filter((e) => e.date?.startsWith(ym) && !e.isTransfer);
    const rec = monthEntries.filter((e) => e.type === 'receita').reduce((s, e) => s + (e.value || 0), 0);
    const desp = monthEntries.filter((e) => e.type === 'despesa').reduce((s, e) => s + (e.value || 0), 0);
    const totalBalance = Object.values(accountBalances || {}).reduce((s, v) => s + v, 0);
    const totalInvest = (investments || []).reduce((s, i) => s + (i.atual || i.valor || 0), 0);

    const catTotals: Record<string, number> = {};
    monthEntries.filter((e) => e.type === 'despesa').forEach((e) => {
      const cat = e.category || 'Outros';
      catTotals[cat] = (catTotals[cat] || 0) + (e.value || 0);
    });
    const topCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([cat, val]) => `${cat}: R$${val.toFixed(2)}`).join(', ');

    const goalsSummary = (goals || []).map((g) => `${g.title}: R$${g.current.toFixed(0)}/${g.target.toFixed(0)} (${Math.round(g.current / g.target * 100)}%)`).join('; ');
    const freedom = intelligence?.freedom;
    const spread = intelligence?.spread;

    return `RESUMO FINANCEIRO:
- Receita mês: R$${rec.toFixed(2)} | Despesa mês: R$${desp.toFixed(2)} | Saldo: R$${(rec - desp).toFixed(2)}
- Taxa de poupança: ${rec > 0 ? ((rec - desp) / rec * 100).toFixed(1) : 0}%
- Saldo em contas: R$${totalBalance.toFixed(2)}
- Investimentos: R$${totalInvest.toFixed(2)}
- Contas: ${(accounts || []).join(', ') || 'nenhuma'}
- Cartões: ${(cards || []).length} cartão(ões)
- Dívidas/crédito: ${(creditObligations || []).length} obrigação(ões)
- Metas: ${goalsSummary || 'nenhuma'}
- Top categorias despesa: ${topCats || 'nenhuma'}
- Orçamentos: ${Object.keys(budgets || {}).length} categorias
- Dias de liberdade (Ld): ${freedom?.days ?? '?'} dias (${freedom?.status ?? '?'})
- Spread Gap (Sg): ${spread?.spreadGap != null ? (spread.spreadGap * 100).toFixed(2) + '%' : '?'} (${spread?.verdict ?? '?'})
- Total de lançamentos no mês: ${monthEntries.length}
- Lançamentos totais: ${(entries || []).length}`;
  }, [entries, accounts, accountBalances, goals, investments, budgets, cards, creditObligations, intelligence]);

  const handleRun = async () => {
    if (!user?.uid) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const context = buildContext();
      const callable = httpsCallable<{ financialContext: string }, CouncilResult>(functions, 'agentCouncil');
      const res = await callable({ financialContext: context });
      setResult(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao executar o conselho de agentes.');
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Cpu className="w-8 h-8 text-cyan-400" />
            Conselho de Agentes
          </h2>
          <p className="text-si-5 text-sm mt-1">
            4 agentes de IA especializados analisam sua situação financeira simultaneamente
            e um orquestrador sintetiza o plano de ação ideal.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRun}
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm disabled:opacity-50 shadow-lg shadow-cyan-500/20"
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Agentes analisando...</>
          ) : (
            <><Play className="w-5 h-5" /> Convocar Conselho</>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-rose-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {!result && !loading && (
        <div className="text-center py-16 space-y-4">
          <div className="flex justify-center gap-4">
            {Object.entries(AGENT_CONFIG).map(([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <div key={key} className={`w-20 h-20 rounded-2xl border flex items-center justify-center ${cfg.bgColor}`}>
                  <Icon className={`w-8 h-8 ${cfg.color}`} />
                </div>
              );
            })}
          </div>
          <p className="text-si-4 text-lg font-medium">Pronto para analisar</p>
          <p className="text-si-5 text-sm max-w-lg mx-auto">
            Ao convocar o conselho, 4 agentes especializados vão analisar sua situação em paralelo:
            <strong className="text-red-400"> Guardião</strong> (riscos),
            <strong className="text-blue-400"> Estrategista</strong> (oportunidades),
            <strong className="text-purple-400"> Comportamental</strong> (hábitos) e
            <strong className="text-pink-400"> Familiar</strong> (família).
            Um orquestrador sintetiza tudo em um plano único.
          </p>
        </div>
      )}

      {loading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(AGENT_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <div key={key} className={`rounded-2xl border p-5 ${cfg.bgColor} animate-pulse`}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={`w-5 h-5 ${cfg.color}`} />
                  <span className={`font-bold text-sm ${cfg.color}`}>{cfg.label}</span>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-si-over-3 rounded w-3/4" />
                  <div className="h-3 bg-si-over-3 rounded w-1/2" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {result && (
        <>
          {/* Síntese */}
          <section className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-6">
              <ScoreRing score={result.sintese.saude_geral} />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-bold text-si-1 text-lg">Decisão do Conselho</h3>
                </div>
                <p className="text-si-3 text-sm">{result.sintese.resumo}</p>
                {result.sintese.frase_motivacional && (
                  <p className="text-cyan-400 text-xs italic">"{result.sintese.frase_motivacional}"</p>
                )}
                <p className="text-si-5 text-xs">
                  Analisado em {(result.duracaoMs / 1000).toFixed(1)}s · {new Date(result.executadoEm).toLocaleTimeString('pt-BR')}
                </p>
              </div>
            </div>

            {result.sintese.consenso && result.sintese.consenso.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-si-4 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Consenso entre agentes
                </p>
                {result.sintese.consenso.map((c, i) => (
                  <p key={i} className="text-sm text-si-3 pl-5">• {c}</p>
                ))}
              </div>
            )}

            {result.sintese.conflitos && result.sintese.conflitos.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> Conflitos resolvidos
                </p>
                {result.sintese.conflitos.map((c, i) => (
                  <p key={i} className="text-sm text-si-4 pl-5">• {c}</p>
                ))}
              </div>
            )}
          </section>

          {/* Plano de Ação */}
          {result.sintese.plano_acao && result.sintese.plano_acao.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-si-2 flex items-center gap-2">
                <Target className="w-5 h-5 text-cyan-400" />
                Plano de Ação Unificado
              </h3>
              <div className="space-y-2">
                {result.sintese.plano_acao.map((action) => {
                  const agentCfg = AGENT_CONFIG[action.agente_responsavel];
                  const AgentIcon = agentCfg?.icon || Cpu;
                  return (
                    <div key={action.ordem} className="bg-si-card rounded-xl border border-si-border p-4 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-si-over-2 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-si-3">{action.ordem}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-si-1 text-sm font-medium">{action.acao}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex items-center gap-1">
                            <AgentIcon className={`w-3.5 h-3.5 ${agentCfg?.color || 'text-si-4'}`} />
                            <span className="text-xs text-si-5">{agentCfg?.label || action.agente_responsavel}</span>
                          </div>
                          <UrgencyBadge urgencia={action.urgencia} />
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            action.impacto === 'alto' ? 'bg-emerald-500/15 text-emerald-400' :
                            action.impacto === 'medio' ? 'bg-amber-500/15 text-amber-400' : 'bg-si-over-3 text-si-4'
                          }`}>
                            {action.impacto}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Cards dos Agentes */}
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-si-2">Análise Individual dos Agentes</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(AGENT_CONFIG).map(([key, cfg]) => {
                const agent = result.agentes[key];
                if (!agent) return null;
                const Icon = cfg.icon;
                const isExpanded = expandedAgent === key;

                return (
                  <div key={key} className={`rounded-2xl border p-5 ${cfg.bgColor} transition-all`}>
                    <button
                      type="button"
                      onClick={() => setExpandedAgent(isExpanded ? null : key)}
                      className="w-full flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-5 h-5 ${cfg.color}`} />
                        <span className={`font-bold text-sm ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {agent.nivel_alerta && <StatusBadge value={agent.nivel_alerta} type="alert" />}
                        {agent.oportunidade && <StatusBadge value={agent.oportunidade} type="opportunity" />}
                        {agent.saude_habitos && <StatusBadge value={agent.saude_habitos} type="habits" />}
                        {agent.situacao_familiar && <StatusBadge value={agent.situacao_familiar} type="family" />}
                        <ChevronDown className={`w-4 h-4 text-si-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    <p className="text-si-3 text-sm mt-2">{agent.diagnostico}</p>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-si-border space-y-2 text-sm">
                        {agent.riscos?.map((r, i) => (
                          <p key={i} className="text-rose-400 flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {r}
                          </p>
                        ))}
                        {agent.acoes?.map((a, i) => (
                          <p key={i} className="text-si-3 flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400" /> {a}
                          </p>
                        ))}
                        {agent.sugestoes?.map((s, i) => (
                          <p key={i} className="text-si-3 flex items-start gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-400" /> {s}
                          </p>
                        ))}
                        {agent.padroes_detectados?.map((p, i) => (
                          <p key={i} className="text-si-4 flex items-start gap-1.5">
                            <Brain className="w-3.5 h-3.5 mt-0.5 shrink-0 text-purple-400" /> {p}
                          </p>
                        ))}
                        {agent.gatilhos?.map((g, i) => (
                          <p key={i} className="text-amber-400 text-xs">Gatilho: {g}</p>
                        ))}
                        {agent.dica_comportamental && (
                          <p className="text-purple-300 text-xs italic">"{agent.dica_comportamental}"</p>
                        )}
                        {agent.sugestoes_familia?.map((s, i) => (
                          <p key={i} className="text-pink-300 flex items-start gap-1.5">
                            <Users className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {s}
                          </p>
                        ))}
                        {agent.meta_fire && (
                          <p className="text-blue-300 text-xs">Meta FIRE: {agent.meta_fire}</p>
                        )}
                        <p className="text-si-5 text-xs">Prioridade: {agent.prioridade}/10 · Provider: {agent._provider}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
