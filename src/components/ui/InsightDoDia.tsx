/**
 * InsightDoDia — Insight proativo gerado pelo Gemini
 *
 * Acao 18 (29/03/2026): respeita o Modo Sugestivo configurado pelo usuario.
 *   - suggestiveMode=true  (padrao): busca proactiveInsightApi automaticamente.
 *   - suggestiveMode=false (silencioso): aguarda clique explicito do usuario.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSuggestiveMode } from '../../hooks/useSuggestiveMode';
import { Link } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { Loader2, Lightbulb } from 'lucide-react';
import { functions } from '../../firebase';
import type { Card, Entry, Goal, Recurrent } from '../../types/userData';
import type { OpenFinanceIdentitySnapshot } from '../../types/openFinance';
import type { DataFreshness } from '../../context/AppContext';
import { isTransferEntry } from '../../utils/entryUtils';
import { trackPlatformEvent } from '../../services/platformEvents';

type InsightResult = {
  insight_curto: string;
  detalhe: string;
  acao_sugerida: string;
  deep_link: string;
  relevancia_score: number;
};

function getLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fmtBRL(value: number): string {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  return safe.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function InsightDoDia({
  entries,
  cards,
  goals,
  recurrents,
  accountBalances,
  accountMeta,
  loading,
  // ── Open Finance ──────────────────────────────────────────────────────────
  hasOpenFinance = false,
  verifiedEntries = [],
  openFinanceIdentityByItem = {},
  dataFreshness = 'none',
}: {
  entries: Entry[];
  cards: Card[];
  goals: Goal[];
  recurrents: Recurrent[];
  accountBalances: Record<string, number>;
  accountMeta: Record<string, { incluirNaSoma?: boolean }>;
  loading?: boolean;
  /** Open Finance está ativo e autenticado? */
  hasOpenFinance?: boolean;
  /** Lançamentos confirmados pelo extrato bancário (source='open-finance'). */
  verifiedEntries?: Entry[];
  /** Identidade por item Pluggy (inclui investorProfile). */
  openFinanceIdentityByItem?: Record<string, OpenFinanceIdentitySnapshot>;
  /** Quão recente é o dado bancário. */
  dataFreshness?: DataFreshness;
}) {
  const todayStr = useMemo(() => getLocalDateStr(new Date()), []);
  const [forceNew, setForceNew] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insight, setInsight] = useState<InsightResult | null>(null);
  const [noInsight, setNoInsight] = useState(false);
  const [legacyText, setLegacyText] = useState<string | null>(null);
  const trackedInsightKeyRef = useRef<string | null>(null);

  const mode = useMemo<'legado' | 'gemini'>(() => {
    try {
      const v = window.localStorage.getItem('sibanki_insight_dia_mode');
      return v === 'gemini' ? 'gemini' : 'legado';
    } catch {
      return 'legado';
    }
  }, []);

  const despesasHoje = useMemo(() => {
    return entries.filter((e) => e.type === 'despesa' && e.date === todayStr && !isTransferEntry(e));
  }, [entries, todayStr]);

  /** Acao 18: modo sugestivo — controla fetch proativo */
  const { suggestiveMode } = useSuggestiveMode();

  const snapshot = useMemo(() => {
    const total = despesasHoje.reduce((s, e) => s + (Number(e.value) || 0), 0);

    const catTotals: Record<string, number> = {};
    for (const e of despesasHoje) {
      const cat = (e.category || 'Outros').trim() || 'Outros';
      catTotals[cat] = (catTotals[cat] ?? 0) + (Number(e.value) || 0);
    }
    const topCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topEntries = [...despesasHoje].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0)).slice(0, 5);
    const topCatsLines = topCats.map(([cat, v]) => `- ${cat}: R$ ${fmtBRL(v)}`);
    const topEntriesLines = topEntries.map((e) => {
      const label = (e.desc || e.category || 'Lan\u00e7amento').trim();
      const cat = (e.category || 'Outros').trim();
      return `- ${label} (${cat}): R$ ${fmtBRL(Number(e.value))}`;
    });

    // Contexto mensal
    const mesAtual = todayStr.slice(0, 7);
    let recMes = 0, despMes = 0;
    for (const e of entries) {
      if (isTransferEntry(e)) continue;
      if ((e.date ?? '').slice(0, 7) !== mesAtual) continue;
      const v = Number(e.value) || 0;
      if (e.type === 'receita') recMes += v;
      else if (e.type === 'despesa') despMes += v;
    }
    const saldoMes = recMes - despMes;

    // Saldo dispon\u00edvel nas contas
    let saldoContas = 0;
    for (const [acc, bal] of Object.entries(accountBalances || {})) {
      if (accountMeta?.[acc]?.incluirNaSoma === false) continue;
      saldoContas += Number(bal) || 0;
    }

    // Metas mais pr\u00f3ximas de completar
    const metaLines: string[] = [];
    if (goals && goals.length > 0) {
      const sorted = [...goals]
        .filter((g) => (g.current ?? 0) < (g.target ?? 0))
        .sort((a, b) => (a.target - a.current) - (b.target - b.current))
        .slice(0, 2);
      for (const g of sorted) {
        const pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
        metaLines.push(`- ${g.title}: ${pct}% (faltam R$ ${fmtBRL(g.target - g.current)})`);
      }
    }

    // Recorrentes vencendo em at\u00e9 7 dias
    const hoje = new Date();
    const em7 = new Date(hoje); em7.setDate(hoje.getDate() + 7);
    const recLines: string[] = [];
    if (recurrents && recurrents.length > 0) {
      for (const r of recurrents) {
        const dueDay = Number((r as any).dueDay ?? (r as any).dia ?? 0);
        if (!dueDay) continue;
        const thisMonth = new Date(hoje.getFullYear(), hoje.getMonth(), dueDay);
        if (thisMonth >= hoje && thisMonth <= em7) {
          recLines.push(`- ${(r as any).desc || (r as any).name || 'Recorrente'}: R$ ${fmtBRL(Number((r as any).value ?? (r as any).valor ?? 0))} (dia ${dueDay})`);
        }
      }
    }

    // ── Open Finance: contexto adicional para o LLM ───────────────────────
    const ofLines: string[] = [];
    if (hasOpenFinance) {
      // Qualidade dos dados
      const mesAtualOf = todayStr.slice(0, 7);
      const despMesEntries = entries.filter(
        (e) => !isTransferEntry(e) && e.type === 'despesa' && (e.date ?? '').slice(0, 7) === mesAtualOf,
      );
      const verifiedMes = despMesEntries.filter((e) => e.source === 'open-finance').length;
      const verifiedPct = despMesEntries.length > 0
        ? Math.round((verifiedMes / despMesEntries.length) * 100)
        : 0;
      ofLines.push(
        `Qualidade dos dados: ${verifiedPct}% das despesas do mês verificadas pelo extrato bancário real (Open Finance).`,
      );
      if (dataFreshness === 'fresh') ofLines.push('Status da conexão: dados bancários atualizados (< 6h).');
      if (dataFreshness === 'stale') ofLines.push('Status da conexão: dados bancários desatualizados (> 6h) — sincronização em andamento.');

      // Perfil de investidor (do primeiro item Pluggy com investorProfile)
      const profileMap: Record<string, string> = {
        Conservative: 'conservador',
        Moderate: 'moderado',
        Aggressive: 'arrojado',
      };
      const firstIdentity = Object.values(openFinanceIdentityByItem ?? {}).find(
        (id) => id?.investorProfile,
      );
      if (firstIdentity?.investorProfile) {
        const ptProfile = profileMap[firstIdentity.investorProfile] ?? firstIdentity.investorProfile;
        ofLines.push(`Perfil de investidor (banco): ${ptProfile}.`);
      }

      // Saldo de entradas verificadas no mês
      const recVerif = verifiedEntries
        .filter((e) => (e.date ?? '').slice(0, 7) === mesAtualOf && e.type === 'receita')
        .reduce((s, e) => s + (Number(e.value) || 0), 0);
      const despVerif = verifiedEntries
        .filter((e) => (e.date ?? '').slice(0, 7) === mesAtualOf && e.type === 'despesa')
        .reduce((s, e) => s + (Number(e.value) || 0), 0);
      if (recVerif > 0 || despVerif > 0) {
        ofLines.push(
          `Movimentação verificada pelo banco este mês: receita R$ ${fmtBRL(recVerif)} | despesa R$ ${fmtBRL(despVerif)}.`,
        );
      }
    } else {
      ofLines.push('Fonte dos dados: inseridos manualmente pelo usuário (Open Finance não conectado).');
    }

    return [
      `Data: ${todayStr}`,
      `Receita do m\u00eas: R$ ${fmtBRL(recMes)} | Despesa do m\u00eas: R$ ${fmtBRL(despMes)} | Saldo do m\u00eas: R$ ${fmtBRL(saldoMes)}`,
      `Saldo dispon\u00edvel nas contas: R$ ${fmtBRL(saldoContas)}`,
      '',
      ...(ofLines.length ? ['OPEN FINANCE:', ...ofLines, ''] : []),
      `Despesas de hoje: R$ ${fmtBRL(total)}`,
      'Categorias (top 5):',
      ...(topCatsLines.length ? topCatsLines : ['- (sem dados)']),
      '',
      'Lan\u00e7amentos de hoje (at\u00e9 5):',
      ...(topEntriesLines.length ? topEntriesLines : ['- (sem dados)']),
      ...(metaLines.length ? ['', 'Metas em andamento:', ...metaLines] : []),
      ...(recLines.length ? ['', 'Contas vencendo em 7 dias:', ...recLines] : []),
    ].join('\n');
  }, [
    despesasHoje, todayStr, entries, accountBalances, accountMeta, goals, recurrents,
    hasOpenFinance, verifiedEntries, openFinanceIdentityByItem, dataFreshness,
  ]);

  const cacheKey = useMemo(() => `sibanki_insight_dia_${todayStr}`, [todayStr]);

  const legadoMsg = useMemo(() => {
    const opts = { shuffle: forceNew > 0 };

    const now = new Date();
    const mesAtual = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const today = now.toISOString().split('T')[0];
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    const fourWeeksAgo = new Date(now);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const fourStr = fourWeeksAgo.toISOString().split('T')[0];

    let gastoEstaSemana = 0;
    let gastoUltimas4 = 0;
    let countWeeks = 0;
    let recMes = 0;
    let gastoMes = 0;

    for (const e of entries) {
      if (isTransferEntry(e)) continue;
      const v = (e.value ?? 0) as number;
      const d = e.date ?? '';
      if (e.type === 'despesa' || (e.type as any) === 'desp') {
        if (d >= weekAgoStr && d <= today) gastoEstaSemana += v;
        if (d >= fourStr) gastoUltimas4 += v;
      } else if (e.type === 'receita' || (e.type as any) === 'rec') {
        if (d.startsWith(mesAtual)) recMes += v;
      }
      if (e.type === 'despesa' || (e.type as any) === 'desp') {
        if (d.startsWith(mesAtual)) gastoMes += v;
      }
    }

    countWeeks = 4;
    const mediaSemanal = countWeeks > 0 ? gastoUltimas4 / countWeeks : 0;

    const insights: string[] = [];

    if (mediaSemanal > 0 && gastoEstaSemana > mediaSemanal * 1.1) {
      const pct = Math.round((gastoEstaSemana / mediaSemanal - 1) * 100);
      insights.push(
        `Você gastou ${pct}% a mais esta semana do que a sua média. Vale a pena revisar os gastos antes do fim do mês.`,
      );
    }

    if (goals && goals.length > 0) {
      goals.forEach((g) => {
        if (!g || !g.target || g.target <= 0) return;
        const pct = Math.round(((g.current || 0) / g.target) * 100);
        const fim = (g as any).deadline || (g as any).endDate;
        let diasRest = 0;
        if (fim) {
          const dFim = new Date(fim);
          diasRest = Math.ceil((dFim.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        }
        const nome = (g as any).name || g.title || 'Meta';
        if (pct >= 70 && pct < 100 && diasRest > 0 && diasRest <= 30) {
          const falta = g.target - (g.current || 0);
          const porDia = diasRest > 0 ? falta / diasRest : 0;
          insights.push(
            `Sua meta "${nome}" vence em ${diasRest} dia(s) e está em ${pct}%. Para atingir, guarde cerca de R$ ${porDia.toFixed(0)}/dia.`,
          );
        }
        if (pct >= 100) insights.push(`Parabéns! Você atingiu a meta "${nome}".`);
      });
    }

    if (recurrents && recurrents.length > 0) {
      const amanha = new Date(now);
      amanha.setDate(amanha.getDate() + 1);
      const amanhaStr = amanha.toISOString().split('T')[0];
      recurrents.forEach((r) => {
        if (!r.active) return;
        const venc = (r as any).dueDay || (r as any).nextDue || r.day;
        if (venc === amanha.getDate() || ((r as any).nextDate && String((r as any).nextDate).startsWith(amanhaStr))) {
          const nome = (r as any).name || r.desc || 'Despesa recorrente';
          insights.push(
            `Amanhã vence: ${nome} de R$ ${(r.value || 0).toFixed(2)}.`,
          );
        }
      });
    }

    if (cards && cards.length > 0) {
      const dia = now.getDate();
      cards.forEach((c) => {
        if (!c.closeDay) return;
        let diasPra = c.closeDay - dia;
        if (diasPra < 0) diasPra += 30;
        if (diasPra <= 3) {
          let fat = 0;
          if (c.purchases && c.purchases.length > 0) {
            const bm = mesAtual;
            fat = c.purchases
              .filter((p) => (p.billingMonth || '').substring(0, 7) === bm)
              .reduce((s, p) => s + (p.value || 0), 0);
          }
          insights.push(
            `A fatura do ${c.name || 'cartão'} fecha em ${diasPra} dia(s). Total aproximado: R$ ${fat.toFixed(2)}.`,
          );
        }
      });
    }

    // Saldo disponível (contas incluídas na soma)
    let sal = 0;
    for (const [accName, bal] of Object.entries(accountBalances || {})) {
      if (accountMeta?.[accName]?.incluirNaSoma === false) continue;
      sal += Number(bal) || 0;
    }

    if (sal > 0 && goals && goals.length > 0) {
      const metaInv = goals.find((g) => {
        const type = String((g as any).type || '').toLowerCase();
        const name = String((g as any).name || g.title || '').toLowerCase();
        return type.includes('invest') || name.includes('invest');
      });
      if (metaInv && (metaInv.current || 0) < (metaInv.target || 0)) {
        const falta = (metaInv.target || 0) - (metaInv.current || 0);
        const aporte = Math.min(sal * 0.1, falta);
        if (aporte >= 50) {
          const nome = (metaInv as any).name || metaInv.title || 'Investimento';
          insights.push(`Seu saldo permite um aporte de até R$ ${aporte.toFixed(0)} na meta "${nome}".`);
        }
      }
    }

    if (recMes > 0 && gastoMes > 0) {
      const saldoMes = recMes - gastoMes;
      if (saldoMes > 0) {
        insights.push(`Este mês você está no azul: saldo de R$ ${saldoMes.toFixed(2)} até agora. Continue assim!`);
      } else if (saldoMes < 0) {
        insights.push(`Este mês as despesas já superaram as receitas em R$ ${Math.abs(saldoMes).toFixed(2)}. Que tal revisar algumas categorias?`);
      }
    }

    if (opts.shuffle && insights.length > 1) {
      const i = Math.floor(Math.random() * insights.length);
      return insights[i];
    }

    if (insights.length > 0) return insights[0];
    return 'Seus números estão sendo organizados. Use o Consultor IA para dúvidas ou planejamento.';
  }, [entries, goals, recurrents, cards, accountBalances, accountMeta, forceNew]);

  useEffect(() => {
    if (loading) return;
    // Acao 18: modo silencioso — nao faz fetch automatico
    if (!suggestiveMode) return;
    if (mode === 'legado') {
      setError(null);
      setBusy(false);
      setInsight(null);
      setNoInsight(false);
      setLegacyText(legadoMsg);
      return;
    }

    if (todayStr.length < 10) return;
    if (busy) return;
    setLegacyText(null);

    const totalHoje = despesasHoje.reduce((s, e) => s + (Number(e.value) || 0), 0);
    if (totalHoje <= 0) {
      setNoInsight(true);
      setInsight(null);
      setError(null);
      return;
    }

    setError(null);
    setNoInsight(false);

    try {
      const shouldUseCache = forceNew === 0;
      const cached = typeof window !== 'undefined' ? window.localStorage.getItem(cacheKey) : null;
      if (shouldUseCache && cached) {
        const parsed = JSON.parse(cached) as { status?: string } & Partial<InsightResult>;
        if ((parsed as any)?.status === 'OK') {
          setNoInsight(true);
          setInsight(null);
          return;
        }
        if (parsed?.insight_curto) {
          setInsight(parsed as InsightResult);
          return;
        }
      }
    } catch {
      // ignore cache read errors
    }

    let cancelled = false;
    const run = async () => {
      setBusy(true);
      try {
        const insightApi = httpsCallable<{ snapshot: string }, InsightResult | { status: string }>(
          functions,
          'proactiveInsightApi'
        );
        const res = await insightApi({ snapshot });
        const data = res?.data as any;

        if (cancelled) return;

        if (!data || data.status === 'OK' || !data.insight_curto) {
          setNoInsight(true);
          setInsight(null);
          try {
            window.localStorage.setItem(cacheKey, JSON.stringify({ status: 'OK' }));
          } catch {
            // ignore cache write errors
          }
          return;
        }

        setInsight({
          insight_curto: String(data.insight_curto),
          detalhe: String(data.detalhe ?? ''),
          acao_sugerida: String(data.acao_sugerida ?? ''),
          deep_link: String(data.deep_link ?? '/lancamentos'),
          relevancia_score: Number(data.relevancia_score ?? 5),
        });

        try {
          window.localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch {
          // ignore cache write errors
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const code = (err as { code?: string })?.code ?? '';
        const msg = (err as { message?: string })?.message ?? 'Erro ao conectar.';
        const friendly =
          code === 'functions/resource-exhausted' || /quota|limite|rate limit/i.test(msg)
            ? 'Limite de uso do insight por hoje atingido. Tente em alguns minutos ou amanhã.'
            : msg;
        setError(friendly);
      } finally {
        if (!cancelled) setBusy(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [cacheKey, busy, despesasHoje, forceNew, loading, legadoMsg, mode, snapshot, todayStr]);

  useEffect(() => {
    if (error || noInsight) return;

    if (mode === 'legado' && legacyText) {
      const trackingKey = `${todayStr}:legado:${legacyText}`;
      if (trackedInsightKeyRef.current === trackingKey) return;
      trackedInsightKeyRef.current = trackingKey;
      void trackPlatformEvent('insight_shown', {
        source: 'dashboard_insight_card',
        mode,
        today: todayStr,
        hasOpenTrigger: despesasHoje.length > 0,
      });
      return;
    }

    if (mode === 'gemini' && insight?.insight_curto) {
      const trackingKey = `${todayStr}:gemini:${insight.insight_curto}`;
      if (trackedInsightKeyRef.current === trackingKey) return;
      trackedInsightKeyRef.current = trackingKey;
      void trackPlatformEvent('insight_shown', {
        source: 'dashboard_insight_card',
        mode,
        today: todayStr,
        relevanceScore: Math.round(insight.relevancia_score),
        deepLink: insight.deep_link,
      });
    }
  }, [despesasHoje.length, error, insight, legacyText, mode, noInsight, todayStr]);

  if (busy) {
    return (
      <div className="flex gap-3 items-start">
        <div
          className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-emerald-500/20"
          style={{ background: 'linear-gradient(135deg,#10b981,#7c3aed)' }}
        >AS</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-emerald-400 mb-1.5">Arquiteto Soberano</p>
          <div className="bg-si-card border border-si-border-md rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 text-si-3 text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            Analisando seus movimentos...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-start">
      <div
        className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-emerald-500/20"
        style={{ background: 'linear-gradient(135deg,#10b981,#7c3aed)' }}
      >AS</div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5 gap-2">
          <p className="text-xs font-bold text-emerald-400">Arquiteto Soberano</p>
          {hasOpenFinance && dataFreshness === 'fresh' && (
            <span className="text-[10px] text-emerald-400/70 flex items-center gap-1">
              ● extrato verificado
            </span>
          )}
        </div>
        <div className="bg-si-card border border-si-border-md rounded-2xl rounded-tl-sm p-4">

          {error && (
            <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-amber-400 text-sm">
              {error}
            </div>
          )}

          {!error && noInsight && (
            <p className="mt-3 text-si-3 text-sm leading-relaxed">
              Hoje não encontrei um gatilho forte. Continue registrando seus lançamentos para receber sugestões mais
              úteis.
            </p>
          )}

          {!error && mode === 'legado' && legacyText && (
            <div className="mt-3 space-y-2">
              <p className="text-si-1 font-bold text-lg leading-snug">{legacyText}</p>
              <div className="flex items-center gap-3 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => setForceNew((n) => n + 1)}
                  className="bg-si-over-2 hover:bg-si-over-3 text-si-2 px-4 py-2 rounded-xl font-bold text-sm border border-si-border-md transition-colors"
                >
                  Novo insight
                </button>
                <Link
                  to="/consultor-ia"
                  onClick={() =>
                    void trackPlatformEvent('insight_cta_clicked', {
                      source: 'dashboard_insight_card',
                      mode,
                      target: '/consultor-ia',
                    })
                  }
                  className="bg-blue-600 hover:bg-blue-500 text-si-1 px-4 py-2 rounded-xl font-bold text-sm transition-colors"
                >
                  Ver no Consultor IA
                </Link>
              </div>
            </div>
          )}

          {!error && insight && mode === 'gemini' && (
            <div className="mt-3 space-y-2">
              <p className="text-si-1 font-bold text-lg leading-snug">{insight.insight_curto}</p>
              {insight.detalhe && <p className="text-si-4 text-sm leading-relaxed">{insight.detalhe}</p>}
              {insight.acao_sugerida && (
                <p className="text-si-3 text-sm leading-relaxed">
                  <span className="text-blue-300 font-semibold">Ação:</span> {insight.acao_sugerida}
                </p>
              )}

              <div className="flex items-center gap-3 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => setForceNew((n) => n + 1)}
                  className="bg-si-over-2 hover:bg-si-over-3 text-si-2 px-4 py-2 rounded-xl font-bold text-sm border border-si-border-md transition-colors"
                >
                  Novo insight
                </button>
                <Link
                  to={insight.deep_link}
                  onClick={() =>
                    void trackPlatformEvent('insight_cta_clicked', {
                      source: 'dashboard_insight_card',
                      mode,
                      target: insight.deep_link,
                      relevanceScore: Math.round(insight.relevancia_score),
                    })
                  }
                  className="bg-blue-600 hover:bg-blue-500 text-si-1 px-4 py-2 rounded-xl font-bold text-sm transition-colors"
                >
                  Ver no app
                </Link>
                <span className="text-xs text-si-5">
                  Relevância {Math.round(insight.relevancia_score)}/10
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

