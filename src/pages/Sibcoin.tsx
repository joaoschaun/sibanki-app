import { useState } from 'react';
import { useSibcoin } from '../hooks/useSibcoin';
import { Coins, Trophy, History, Star, ChevronRight, CheckCircle, Circle, Zap, TrendingUp } from 'lucide-react';

const TIER_CONFIG = {
  bronze:  { emoji: '🥉', label: 'Bronze',  color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200',  next: 500,   nextLabel: 'Prata' },
  silver:  { emoji: '🥈', label: 'Prata',   color: 'text-slate-500',  bg: 'bg-slate-50',  border: 'border-slate-200',  next: 2000,  nextLabel: 'Ouro' },
  gold:    { emoji: '🥇', label: 'Ouro',    color: 'text-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-200', next: 10000, nextLabel: 'Diamante' },
  diamond: { emoji: '💎', label: 'Diamante',color: 'text-cyan-500',   bg: 'bg-cyan-50',   border: 'border-cyan-200',   next: null,  nextLabel: null },
} as const;

const TABS = ['Resumo', 'Missões', 'Histórico'] as const;
type Tab = typeof TABS[number];

export default function Sibcoin() {
  const {
    balance, tier, earned, spent,
    missions, pendingMissions, completedMissionsCount,
    history, fetchMissions,
  } = useSibcoin();

  const [activeTab, setActiveTab] = useState<Tab>('Resumo');

  const cfg = TIER_CONFIG[tier];
  const prevThreshold = tier === 'bronze' ? 0
    : tier === 'silver' ? 500
    : tier === 'gold' ? 2000
    : 10000;
  const progress = cfg.next
    ? Math.min(100, ((balance - prevThreshold) / (cfg.next - prevThreshold)) * 100)
    : 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header hero */}
      <div className="bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 px-6 pt-8 pb-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Coins className="w-7 h-7 text-si-1" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-si-1">SibCoin</h1>
              <p className="text-white/80 text-sm">Seu programa de recompensas</p>
            </div>
          </div>

          {/* Balance card */}
          <div className="bg-si-over-4 backdrop-blur rounded-2xl p-5 mb-4">
            <p className="text-white/70 text-sm mb-1">Saldo atual</p>
            <p className="text-4xl font-bold text-si-1 mb-3">
              {balance.toLocaleString('pt-BR')}
              <span className="text-xl font-medium text-white/70 ml-2">SC</span>
            </p>
            <div className="flex gap-6">
              <div>
                <p className="text-white/60 text-xs">Ganhos</p>
                <p className="text-si-1 font-semibold">{earned.toLocaleString('pt-BR')} SC</p>
              </div>
              <div>
                <p className="text-white/60 text-xs">Gastos</p>
                <p className="text-si-1 font-semibold">{spent.toLocaleString('pt-BR')} SC</p>
              </div>
              <div>
                <p className="text-white/60 text-xs">Missões</p>
                <p className="text-si-1 font-semibold">{completedMissionsCount} completas</p>
              </div>
            </div>
          </div>

          {/* Tier + progress */}
          <div className="bg-si-over-4 backdrop-blur rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{cfg.emoji}</span>
                <div>
                  <p className="text-si-1 font-semibold">{cfg.label}</p>
                  {cfg.next && (
                    <p className="text-white/70 text-xs">
                      {(cfg.next - balance).toLocaleString('pt-BR')} SC até {cfg.nextLabel}
                    </p>
                  )}
                </div>
              </div>
              {cfg.next && (
                <div className="text-right">
                  <p className="text-white/70 text-xs">{cfg.nextLabel}</p>
                  <p className="text-si-1 text-sm font-medium">{cfg.next.toLocaleString('pt-BR')} SC</p>
                </div>
              )}
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            {!cfg.next && (
              <p className="text-white/80 text-xs mt-1 text-center">
                🎉 Nível máximo atingido!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); if (tab === 'Missões') fetchMissions(); }}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* ===== RESUMO ===== */}
        {activeTab === 'Resumo' && (
          <>
            {/* Tier benefits */}
            <div className={`rounded-2xl border p-4 ${cfg.bg} ${cfg.border}`}>
              <div className="flex items-center gap-2 mb-3">
                <Trophy className={`w-5 h-5 ${cfg.color}`} />
                <h2 className={`font-semibold ${cfg.color}`}>Benefícios {cfg.label}</h2>
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                {tier === 'bronze' && <>
                  <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0"/><span>Acesso ao programa de missões</span></li>
                  <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0"/><span>Cashback base na Loja Sibanki</span></li>
                  <li className="flex gap-2"><Circle className="w-4 h-4 text-gray-300 mt-0.5 shrink-0"/><span className="text-gray-400">Desconto em relatórios CPF (Prata+)</span></li>
                </>}
                {tier === 'silver' && <>
                  <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0"/><span>Cashback 1.5× na Loja Sibanki</span></li>
                  <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0"/><span>1 relatório CPF grátis/mês</span></li>
                  <li className="flex gap-2"><Circle className="w-4 h-4 text-gray-300 mt-0.5 shrink-0"/><span className="text-gray-400">Taxa zero em Cripto (Ouro+)</span></li>
                </>}
                {tier === 'gold' && <>
                  <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0"/><span>Cashback 2× na Loja Sibanki</span></li>
                  <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0"/><span>Relatórios CPF ilimitados</span></li>
                  <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0"/><span>Taxa reduzida em Cripto</span></li>
                  <li className="flex gap-2"><Circle className="w-4 h-4 text-gray-300 mt-0.5 shrink-0"/><span className="text-gray-400">Priority support (Diamante)</span></li>
                </>}
                {tier === 'diamond' && <>
                  <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0"/><span>Cashback 3× na Loja Sibanki</span></li>
                  <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0"/><span>Taxa zero em Cripto</span></li>
                  <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0"/><span>Priority support 24/7</span></li>
                  <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0"/><span>Acesso antecipado a novos módulos</span></li>
                </>}
              </ul>
            </div>

            {/* Tier roadmap */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400" />
                Níveis SibCoin
              </h2>
              <div className="space-y-3">
                {(Object.entries(TIER_CONFIG) as [string, typeof TIER_CONFIG[keyof typeof TIER_CONFIG]][]).map(([key, c]) => (
                  <div
                    key={key}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${
                      tier === key ? `${c.bg} ${c.border}` : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    <span className="text-2xl">{c.emoji}</span>
                    <div className="flex-1">
                      <p className={`font-medium text-sm ${tier === key ? c.color : 'text-gray-500'}`}>
                        {c.label}
                        {tier === key && <span className="ml-2 text-xs bg-white/70 px-1.5 py-0.5 rounded-full">atual</span>}
                      </p>
                      <p className="text-xs text-gray-400">
                        {key === 'bronze' ? 'Início' : `A partir de ${c === TIER_CONFIG.diamond ? '10.000' : (TIER_CONFIG as any)[key].next === null ? '—' : ({bronze:0,silver:500,gold:2000,diamond:10000} as any)[key].toLocaleString('pt-BR')} SC`}
                      </p>
                    </div>
                    {tier === key && <ChevronRight className={`w-4 h-4 ${c.color}`} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick pending missions */}
            {pendingMissions.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    Próximas missões
                  </h2>
                  <button
                    onClick={() => { setActiveTab('Missões'); fetchMissions(); }}
                    className="text-xs text-amber-600 hover:underline"
                  >
                    Ver todas
                  </button>
                </div>
                <div className="space-y-2">
                  {pendingMissions.slice(0, 3).map((m) => (
                    <div key={m.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <Coins className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{m.title}</p>
                        <p className="text-xs text-gray-500 truncate">{m.description}</p>
                      </div>
                      <span className="text-xs font-bold text-amber-600 shrink-0">+{m.reward} SC</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== MISSÕES ===== */}
        {activeTab === 'Missões' && (
          <div className="space-y-3">
            {missions.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Carregando missões…</p>
              </div>
            ) : (
              missions.map((m) => {
                const done = (m as any).completed === true;
                return (
                  <div
                    key={m.id}
                    className={`bg-white rounded-2xl border p-4 flex items-start gap-3 ${
                      done ? 'border-green-100 opacity-60' : 'border-gray-100'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      done ? 'bg-green-50' : 'bg-amber-50'
                    }`}>
                      {done
                        ? <CheckCircle className="w-5 h-5 text-green-500" />
                        : <Coins className="w-5 h-5 text-amber-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-gray-800 text-sm">{m.title}</p>
                        <span className={`text-xs font-bold shrink-0 ${done ? 'text-green-600' : 'text-amber-600'}`}>
                          {done ? '✓' : '+'}{m.reward} SC
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
                      {(m as any).progress !== undefined && (
                        <div className="mt-2">
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full"
                              style={{ width: `${Math.min(100, ((m as any).progress / (m as any).target) * 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {(m as any).progress} / {(m as any).target}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ===== HISTÓRICO ===== */}
        {activeTab === 'Histórico' && (
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Nenhuma transação ainda.</p>
                <p className="text-xs mt-1">Complete missões para ganhar SibCoin!</p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-xs text-gray-500">Total ganho</p>
                    <p className="font-bold text-green-600">{earned.toLocaleString('pt-BR')} SC</p>
                  </div>
                  <div className="ml-8">
                    <p className="text-xs text-gray-500">Total gasto</p>
                    <p className="font-bold text-red-500">{spent.toLocaleString('pt-BR')} SC</p>
                  </div>
                </div>
                {[...history].reverse().map((tx, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.amount > 0 ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      <Coins className={`w-5 h-5 ${tx.amount > 0 ? 'text-green-500' : 'text-red-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{tx.description}</p>
                      <p className="text-xs text-gray-400">
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </p>
                    </div>
                    <span className={`text-sm font-bold shrink-0 ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('pt-BR')} SC
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
