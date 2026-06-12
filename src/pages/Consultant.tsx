import { useState, useRef, useEffect } from 'react';
import { GenericPageSkeleton } from '../components/ui/PageSkeleton';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { buildFinancialContextString } from '../utils/consultantContext';
import { analyzeInstallmentDecision } from '../utils/decisionEngine';
import { useIntelligence } from '../context/IntelligenceContext';
import { Send, AlertTriangle, Scale, Lock, Receipt, TrendingUp, Target, type LucideIcon } from 'lucide-react';
import { trackPlatformEvent } from '../services/platformEvents';
import { useFeatureFlags } from '../hooks/useFeatureFlags';

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  time: number;
}

const CONSULTOR_DAILY_COUNT_KEY = 'sibanki_consultor_daily_count';

/** Converte resposta da IA (markdown simples) para HTML seguro para exibição. */
function formatReply(raw: string): string {
  let s = raw.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  return s;
}

/** Cards de sugestão do estado vazio (Chat 2.0 — S2 da auditoria visual). */
const SUGGESTIONS: Array<{ icon: LucideIcon; title: string; prompt?: string; tool?: 'decision' }> = [
  { icon: Receipt,    title: 'Quanto gastei este mês — e onde?', prompt: 'Quanto gastei no mês e quais foram minhas maiores categorias?' },
  { icon: TrendingUp, title: 'Como aumento meus Dias de Liberdade?', prompt: 'Como melhorar minha saúde financeira e aumentar meus dias de liberdade?' },
  { icon: Target,     title: 'Resumo das minhas metas', prompt: 'Me dá um resumo das minhas metas e do quanto falta para cada uma.' },
  { icon: Scale,      title: 'À vista ou parcelado?', tool: 'decision' },
];

const PILLS = [
  'Quanto gastei no mês?',
  'Como está meu orçamento por categoria?',
  'Quanto devo poupar para meu objetivo?',
];

/** Símbolo do banquinho (marca) em currentColor. */
function BrandMark({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="15" y="17" width="34" height="10" rx="5" fill="currentColor" />
      <rect x="14" y="26" width="9" height="27" rx="4.5" fill="currentColor" transform="rotate(16 18.5 28)" />
      <rect x="41" y="26" width="9" height="27" rx="4.5" fill="currentColor" transform="rotate(-16 45.5 28)" />
    </svg>
  );
}

export default function Consultant() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    user,
    entries,
    accounts,
    accountBalances,
    accountMeta,
    cards,
    goals,
    investments,
    budgets,
    recurrents,
    investorProfile,
    creditSnapshot,
    creditObligations,
    financialProfile,
    loading: dataLoading,
  } = useAppContext();

  const { requireFeature } = useFeatureFlags();
  const { allowed: consultorAllowed, upsellInfo } = requireFeature('ia_consultor');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dailyCount, setDailyCount] = useState(0);
  const [showDecisionForm, setShowDecisionForm] = useState(false);
  const [decisionValues, setDecisionValues] = useState({ totalValue: '', installments: '', cashDiscount: '' });
  const historyRef = useRef<HTMLDivElement>(null);
  const openedTrackedRef = useRef(false);
  /** Mensagem vinda da Início (Arquiteto); enviada após dados carregarem. */
  const pendingFromHomeRef = useRef<string | null>(null);

  const { freedom } = useIntelligence();

  useEffect(() => {
    const raw = (location.state as { initialMessage?: string } | null)?.initialMessage;
    if (typeof raw === 'string' && raw.trim()) {
      pendingFromHomeRef.current = raw.trim();
      navigate(location.pathname, { replace: true, state: null });
    }
    // Somente estado da navegação inicial ao abrir a página
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const raw = localStorage.getItem(CONSULTOR_DAILY_COUNT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { date?: string; count?: number };
      if (parsed?.date === today && typeof parsed.count === 'number') {
        setDailyCount(parsed.count);
      }
    } catch {
      // ignora erro de leitura local
    }
  }, []);

  useEffect(() => {
    if (!user || dataLoading || openedTrackedRef.current) return;
    openedTrackedRef.current = true;
    void trackPlatformEvent('advisor_opened', {
      source: 'react_consultant_page',
      journeyStage: financialProfile.advisor.journeyStage,
      healthLevel: financialProfile.advisor.healthLevel,
      hasOpenFinance: financialProfile.products.hasOpenFinance,
      plan: financialProfile.products.plan,
    });
  }, [user, dataLoading, financialProfile]);

  const handleDecisionAnalyze = () => {
    const total = parseFloat(decisionValues.totalValue.replace(',', '.'));
    const inst = parseInt(decisionValues.installments, 10);
    if (!total || !inst || inst < 2) {
      setError('Preencha o valor total e o número de parcelas (mínimo 2).');
      return;
    }
    const discount = parseFloat(decisionValues.cashDiscount.replace(',', '.') || '0') / 100;
    const totalLiquidityRaw = Object.values(accountBalances).reduce((s, v) => s + (v > 0 ? v : 0), 0);

    const result = analyzeInstallmentDecision({
      totalValue: total,
      installments: inst,
      cashDiscount: discount || undefined,
      investmentMonthlyRate: 0.0107,
      creditPressureLevel: financialProfile.credit.pressureLevel as 'controlado' | 'atencao' | 'elevado' | 'critico',
      debtCommitmentPct: financialProfile.credit.cardUtilizationPct,
      emergencyReserveMonths: totalLiquidityRaw > 0
        ? totalLiquidityRaw / Math.max(1, Math.abs(financialProfile.cashflow.balance) || financialProfile.cashflow.expenses / 12)
        : 0,
      hasCashAvailable: totalLiquidityRaw >= total,
    });

    const userMsg = `⚖️ Análise: À Vista vs Parcelado\nValor: R$ ${total.toFixed(2)} | ${inst}x${discount ? ` | Desconto à vista: ${(discount * 100).toFixed(0)}%` : ''}`;
    const aiMsg = formatReply(result.narrativa);
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMsg, time: Date.now() },
      { role: 'ai', content: aiMsg, time: Date.now() + 1 },
    ]);
    setShowDecisionForm(false);
    setDecisionValues({ totalValue: '', installments: '', cashDiscount: '' });
    setError(null);
  };

  const handleSend = async (overrideText?: string) => {
    const txt = (overrideText !== undefined ? overrideText : input).trim();
    if (!txt || sending) return;
    if (!user) {
      setError('Faça login para usar o consultor.');
      return;
    }

    setInput('');
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: txt, time: Date.now() }]);
    setSending(true);
    const startedAt = Date.now();

    try {
      const contextStr = buildFinancialContextString({
        entries,
        goals,
        investments,
        budgets: budgets as Record<string, unknown>,
        accounts,
        accountBalances,
        accountMeta,
        cards,
        recurrents,
        investorProfile: investorProfile ?? null,
        creditSnapshot,
        creditObligations,
        currentCdiMonthly: 0.0107, // ~CDI mensal vigente; substituir por BRAPI quando disponível
      });
      const advisorSnapshot = [
        `Saúde financeira: ${financialProfile.advisor.healthLevel}`,
        `Estágio da jornada: ${financialProfile.advisor.journeyStage}`,
        `Poupança mensal: ${financialProfile.cashflow.savingsRatePct}%`,
        `Uso estimado do limite: ${financialProfile.credit.cardUtilizationPct}%`,
        `Pressão de crédito: ${financialProfile.credit.pressureLevel}`,
        `Faturas em 7 dias: R$ ${financialProfile.credit.dueSoonAmount.toFixed(2)}`,
        `Compromisso mensal com dívidas: R$ ${financialProfile.credit.monthlyDebtCommitment.toFixed(2)}`,
        `Open Finance ativo: ${financialProfile.products.hasOpenFinance ? 'sim' : 'não'}`,
        `Próximas ações sugeridas: ${financialProfile.advisor.nextBestActions.join(', ') || 'nenhuma'}`,
      ].join('\n');
      void trackPlatformEvent('advisor_message_sent', {
        source: 'react_consultant_page',
        messageLength: txt.length,
        journeyStage: financialProfile.advisor.journeyStage,
        healthLevel: financialProfile.advisor.healthLevel,
        topSignals: financialProfile.advisor.topSignals,
        nextBestActions: financialProfile.advisor.nextBestActions,
      });
      const chatApi = httpsCallable<{ message: string; context: string }, { reply?: string }>(functions, 'chatApi');
      const res = await chatApi({ message: txt, context: `${contextStr}\nPerfil consolidado:\n${advisorSnapshot}` });
      const dataRes = res?.data;
      const rawReply = (dataRes?.reply ?? '').trim() || 'Sem resposta.';
      const reply = formatReply(rawReply);
      setMessages((prev) => [...prev, { role: 'ai', content: reply, time: Date.now() }]);
      void trackPlatformEvent('advisor_reply_received', {
        source: 'react_consultant_page',
        latencyMs: Date.now() - startedAt,
        replyLength: rawReply.length,
        journeyStage: financialProfile.advisor.journeyStage,
      });
      setDailyCount((c) => {
        const next = c + 1;
        try {
          const today = new Date().toISOString().slice(0, 10);
          localStorage.setItem(CONSULTOR_DAILY_COUNT_KEY, JSON.stringify({ date: today, count: next }));
        } catch {
          // ignora erro de persistência local
        }
        return next;
      });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      const msg = (err as { message?: string })?.message ?? 'Erro ao conectar. Tente novamente.';
      const friendly =
        code === 'functions/resource-exhausted' || /quota|limite|rate limit/i.test(msg)
          ? 'Limite de uso do consultor por hoje atingido. Tente em alguns minutos ou amanhã.'
          : msg;
      void trackPlatformEvent('advisor_reply_failed', {
        source: 'react_consultant_page',
        code,
        messageLength: txt.length,
        journeyStage: financialProfile.advisor.journeyStage,
      });
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content: `<span class="inline-flex items-center gap-1.5 text-amber-400"><span aria-hidden="true">⚠️</span> ${friendly}</span>`,
          time: Date.now(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (dataLoading || !user || !pendingFromHomeRef.current) return;
    const msg = pendingFromHomeRef.current;
    pendingFromHomeRef.current = null;
    const t = window.setTimeout(() => {
      void handleSend(msg);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- envio único ao receber mensagem da Início
  }, [dataLoading, user]);

  if (!consultorAllowed && upsellInfo) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center space-y-4">
        <Lock className="w-12 h-12 text-si-3 mx-auto" />
        <h2 className="text-xl font-bold text-si-1">{upsellInfo.label}</h2>
        <p className="text-si-4 text-sm">{upsellInfo.upsell}</p>
        <a href="/configuracoes" className="inline-block px-6 py-3 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-sm">Ver planos</a>
      </div>
    );
  }

  if (dataLoading) return <GenericPageSkeleton rows={3} />;

  const hour = new Date().getHours();
  const saud = hour < 6 ? 'Boa madrugada' : hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = (user?.displayName || '').trim().split(' ')[0] || '';
  const hasChat = messages.length > 0;

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100dvh-8.5rem)] min-h-[460px]">
      {error && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-amber-400 text-sm mb-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Histórico / estado vazio ─────────────────────────────────────── */}
      <div ref={historyRef} className="flex-1 overflow-y-auto py-2 space-y-7">
        {!hasChat ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-si-over-2 border border-si-border flex items-center justify-center text-si-1 mb-6">
              <BrandMark className="w-6 h-6" />
            </div>
            <h2 className="text-si-1 text-[26px] sm:text-3xl font-extrabold tracking-[-0.02em] mb-2">
              {saud}{firstName ? `, ${firstName}` : ''}.
            </h2>
            <p className="text-si-4 text-[15px] mb-9 max-w-md leading-relaxed">
              {freedom.days > 0 ? (
                <>Seu Ld está em <strong className="text-si-1 font-bold">{freedom.days} dias</strong> de liberdade. Como posso ajudar hoje?</>
              ) : (
                'Sou o seu consultor com o contexto completo das suas finanças. Como posso ajudar hoje?'
              )}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => (s.tool === 'decision' ? setShowDecisionForm(true) : void handleSend(s.prompt))}
                  className="group text-left p-4 rounded-2xl bg-si-card border border-si-border hover:border-si-border-md hover:bg-si-over-1 transition-all"
                >
                  <s.icon className="w-4 h-4 text-si-4 group-hover:text-si-2 mb-2.5 transition-colors" aria-hidden />
                  <p className="text-si-2 group-hover:text-si-1 text-[13.5px] font-medium leading-snug transition-colors">{s.title}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[82%] rounded-2xl rounded-br-md px-4 py-3 bg-white text-zinc-900 text-[15px] leading-relaxed shadow-sm">
                  <span className="whitespace-pre-wrap">{m.content}</span>
                </div>
              </div>
            ) : (
              <div key={i} className="flex gap-3.5">
                <div className="w-7 h-7 rounded-lg bg-si-over-2 border border-si-border flex items-center justify-center text-si-2 shrink-0 mt-1">
                  <BrandMark className="w-3.5 h-3.5" />
                </div>
                <div
                  className="flex-1 min-w-0 text-si-2 text-[15px] leading-relaxed pt-0.5 [&_strong]:text-si-1 [&_strong]:font-semibold"
                  dangerouslySetInnerHTML={{ __html: m.content }}
                />
              </div>
            )
          )
        )}
        {sending && (
          <div className="flex gap-3.5">
            <div className="w-7 h-7 rounded-lg bg-si-over-2 border border-si-border flex items-center justify-center text-si-2 shrink-0 mt-1">
              <BrandMark className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1.5 pt-3" aria-label="Analisando">
              <span className="w-1.5 h-1.5 rounded-full bg-si-4 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-si-4 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-si-4 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>

      {/* ── Sugestões compactas durante a conversa ───────────────────────── */}
      {hasChat && !sending && (
        <div className="py-2.5 flex flex-wrap gap-2">
          {PILLS.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => void handleSend(label)}
              className="text-[12.5px] px-3 py-1.5 rounded-full bg-si-over-1 text-si-4 border border-si-border hover:bg-si-over-2 hover:text-si-2 transition-colors"
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowDecisionForm((v) => !v)}
            className="text-[12.5px] px-3 py-1.5 rounded-full bg-si-over-1 text-si-4 border border-si-border hover:bg-si-over-2 hover:text-si-2 flex items-center gap-1.5 transition-colors"
          >
            <Scale className="w-3 h-3" aria-hidden />
            À vista ou parcelado?
          </button>
        </div>
      )}

      {showDecisionForm && (
        <div className="mb-3 p-4 rounded-2xl bg-si-card border border-si-border-md space-y-2">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-si-4">Analisador · À vista vs parcelado</p>
          <div className="flex gap-2 flex-wrap">
            <div className="flex flex-col gap-1 flex-1 min-w-[110px]">
              <label className="text-xs text-si-4">Valor total (R$)</label>
              <input
                type="number"
                placeholder="ex: 1200"
                value={decisionValues.totalValue}
                onChange={(e) => setDecisionValues((v) => ({ ...v, totalValue: e.target.value }))}
                className="w-full bg-si-over-2 border border-si-border-md rounded-lg px-2 py-1.5 text-sm text-si-1 focus:outline-none focus:border-si-3"
              />
            </div>
            <div className="flex flex-col gap-1 w-24">
              <label className="text-xs text-si-4">Nº parcelas</label>
              <input
                type="number"
                placeholder="ex: 12"
                value={decisionValues.installments}
                onChange={(e) => setDecisionValues((v) => ({ ...v, installments: e.target.value }))}
                className="w-full bg-si-over-2 border border-si-border-md rounded-lg px-2 py-1.5 text-sm text-si-1 focus:outline-none focus:border-si-3"
              />
            </div>
            <div className="flex flex-col gap-1 w-28">
              <label className="text-xs text-si-4">Desconto à vista (%)</label>
              <input
                type="number"
                placeholder="ex: 5"
                value={decisionValues.cashDiscount}
                onChange={(e) => setDecisionValues((v) => ({ ...v, cashDiscount: e.target.value }))}
                className="w-full bg-si-over-2 border border-si-border-md rounded-lg px-2 py-1.5 text-sm text-si-1 focus:outline-none focus:border-si-3"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setShowDecisionForm(false); setDecisionValues({ totalValue: '', installments: '', cashDiscount: '' }); }}
              className="text-xs px-3 py-1.5 rounded-lg bg-si-over-2 text-si-4 border border-si-border-md hover:text-si-2"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDecisionAnalyze}
              className="text-xs px-4 py-1.5 rounded-lg bg-white text-zinc-900 hover:bg-zinc-100 font-medium"
            >
              Analisar →
            </button>
          </div>
        </div>
      )}

      {/* ── Composer ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 p-2 pl-4 rounded-2xl bg-si-card border border-si-border-md focus-within:border-si-3 transition-colors shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Pergunte sobre o seu dinheiro…"
          className="flex-1 min-w-0 bg-transparent text-si-1 text-[15px] placeholder:text-si-5 focus:outline-none py-2"
          disabled={sending}
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={sending || !input.trim()}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 disabled:opacity-40 shrink-0 transition-all"
          aria-label="Enviar"
        >
          <Send className="w-[18px] h-[18px]" />
        </button>
      </div>
      <p className="text-center text-[11px] text-si-5 mt-2.5 shrink-0">
        O consultor conhece seus dados e o mercado em tempo real{dailyCount > 0 ? ` · ${dailyCount} consulta${dailyCount > 1 ? 's' : ''} hoje` : ''}
      </p>
    </div>
  );
}
