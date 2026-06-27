/**
 * SibcoinWidget — Widget do Dashboard para exibir saldo, tier e missões SibCoin.
 */

import { useState, useEffect } from 'react';
import { Coins, ChevronRight, CheckCircle, Lock, Sparkles } from 'lucide-react';
import { useSibcoin, type SibcoinTier } from '../../hooks/useSibcoin';
import { useTheme } from '../../hooks/useTheme';

const TIER_THRESHOLDS: Record<SibcoinTier, number> = {
  bronze: 0, silver: 500, gold: 2000, diamond: 10000,
};

const NEXT_TIER: Record<SibcoinTier, SibcoinTier | null> = {
  bronze: 'silver', silver: 'gold', gold: 'diamond', diamond: null,
};

const TIER_EMOJI: Record<SibcoinTier, string> = {
  bronze: '🥉', silver: '🥈', gold: '🥇', diamond: '💎',
};

function TierProgressBar({ tier, earned }: { tier: SibcoinTier; earned: number }) {
  const nextTier = NEXT_TIER[tier];
  if (!nextTier) {
    return <div className="text-xs text-si-4 text-center py-1">💎 Nível máximo atingido!</div>;
  }
  const current = TIER_THRESHOLDS[tier];
  const next = TIER_THRESHOLDS[nextTier];
  const progress = Math.min(100, Math.round(((earned - current) / (next - current)) * 100));
  const remaining = next - earned;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-si-4">{TIER_EMOJI[tier]} {tier.charAt(0).toUpperCase() + tier.slice(1)}</span>
        <span className="text-si-4">{TIER_EMOJI[nextTier]} {nextTier.charAt(0).toUpperCase() + nextTier.slice(1)}</span>
      </div>
      <div className="w-full bg-si-zinc-8 rounded-full h-1.5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />
      </div>
      <p className="text-xs text-si-5 text-center">
        Faltam <span className="text-yellow-400 font-medium">{remaining.toLocaleString('pt-BR')}</span> SC para {nextTier.charAt(0).toUpperCase() + nextTier.slice(1)}
      </p>
    </div>
  );
}

export function SibcoinWidget({ isCoachActive }: { isCoachActive?: boolean }) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const { balance, tier, tierLabel, earned, missions, pendingMissions, fetchMissions, missionsLoading } = useSibcoin();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!isCoachActive) {
      fetchMissions();
    }
  }, [fetchMissions, isCoachActive]);

  const cardBg = isDark ? 'bg-si-zinc-9 border-zinc-800' : 'bg-white border-zinc-200';
  const textMuted = isDark ? 'text-si-4' : 'text-si-5';

  if (isCoachActive) {
    return (
      <div className={`rounded-2xl border p-5 space-y-4 ${cardBg} grayscale opacity-65 transition-all duration-300`}>
        {/* Header Adormecido */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-si-over-3 flex items-center justify-center">
              <Coins className="w-4 h-4 text-si-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-si-2">SibCoin</p>
              <p className={`text-xs ${textMuted}`}>Adormecido</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-si-4">??? SC</p>
            <p className={`text-xs ${textMuted}`}>Destrave no Coach</p>
          </div>
        </div>

        {/* Mensagem de Teaser do Sibcoin */}
        <div className="bg-si-over-1 border border-si-border rounded-xl p-3.5 text-center text-xs text-si-3 leading-relaxed">
          🔒 Complete o **Modo Coach** para destravar o sistema de gamificação e ganhar seus primeiros **500 SC**.
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-5 space-y-4 ${cardBg}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
            <Coins className="w-4 h-4 text-si-1" />
          </div>
          <div>
            <p className="text-sm font-semibold">SibCoin</p>
            <p className={`text-xs ${textMuted}`}>{TIER_EMOJI[tier]} {tierLabel}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-yellow-400">{balance.toLocaleString('pt-BR')}</p>
          <p className={`text-xs ${textMuted}`}>SC disponíveis</p>
        </div>
      </div>

      {/* Tier Progress */}
      <TierProgressBar tier={tier} earned={earned} />

      {/* Missões */}
      <div>
        <button onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-between text-xs font-medium mb-2">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            Missões disponíveis
            {pendingMissions.length > 0 && (
              <span className="bg-yellow-500/20 text-yellow-400 text-xs px-1.5 py-0.5 rounded-full">
                {pendingMissions.length}
              </span>
            )}
          </span>
          <ChevronRight className={`w-3.5 h-3.5 ${textMuted} transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>

        {expanded && (
          <div className="space-y-2">
            {missionsLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-5 h-5 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
              </div>
            ) : missions.slice(0, 4).map((mission) => (
              <div key={mission.id}
                className={`flex items-center gap-3 p-2.5 rounded-xl ${isDark ? 'bg-si-zinc-8/60' : 'bg-zinc-50'} ${mission.completed ? 'opacity-50' : ''}`}>
                <span className="text-lg leading-none">{mission.iconEmoji || '🎯'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{mission.title}</p>
                  <p className={`text-xs truncate ${textMuted}`}>{mission.description}</p>
                </div>
                {mission.completed
                  ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                  : <span className="text-xs font-bold text-yellow-400 shrink-0">+{mission.reward}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`pt-1 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-100'}`}>
        <div className="flex items-center justify-between">
          <p className={`text-xs ${textMuted}`}>
            Total ganho: <span className="text-yellow-400 font-medium">{earned.toLocaleString('pt-BR')} SC</span>
          </p>
          <div className={`flex items-center gap-1 text-xs ${textMuted}`}>
            <Lock className="w-3 h-3" />
            <span>Bridge Polygon em breve</span>
          </div>
        </div>
      </div>
    </div>
  );
}
