import { useState, useRef, useEffect } from 'react';
import { GenericPageSkeleton } from '../components/ui/PageSkeleton';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { buildFinancialContextString } from '../utils/consultantContext';
import { analyzeInstallmentDecision } from '../utils/decisionEngine';
import { MessageCircle, Send, AlertTriangle, Scale, Lock } from 'lucide-react';
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

const WELCOME = `**Consultor Financeiro Sibanki**

Seu assistente para controle financeiro. Você pode:
• **Lançar** receitas e despesas (ex: "almoço 45", "recebi 3000 salário")
• **Tirar dúvidas** sobre finanças e sobre o uso do app
• **Pedir análises** com base nos seus dados (receitas, despesas, metas, investimentos)

Digite sua mensagem abaixo.`;

const PILLS = [
  'Quanto gastei no mês?',
  'Como melhorar minha saúde financeira?',
  'Resumo das minhas metas',
  'Como está meu orçamento por categoria?',
  'Quanto devo poupar para meu objetivo?',
];

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

  useEffect(() => {
    if (messages.length === 0 && !dataLoading) {
      setMessages([{ role: 'ai', content: formatReply(WELCOME), time: Date.now() }]);
    }
  }, [dataLoading]);

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
        <Lock className="w-12 h-12 text-blue-400 mx-auto" />
        <h2 className="text-xl font-bold text-si-1">{upsellInfo.label}</h2>
        <p className="text-si-4 text-sm">{upsellInfo.upsell}</p>
        <a href="/configuracoes" className="inline-block px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm">Ver planos</a>
      </div>
    );
  }

  if (dataLoading) return <GenericPageSkeleton rows={3} />;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-wrap items-start gap-3 gap-y-2">
        <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
          <MessageCircle className="w-6 h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold">Consultor IA</h2>
          <p className="text-si-5 text-sm">Assistente financeiro com base nos seus dados</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs w-full sm:w-auto sm:ml-auto sm:justify-end">
          <span className="px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
            Online
          </span>
          <span className="px-2 py-1 rounded-full bg-si-over-2 text-si-4 border border-si-border-md whitespace-nowrap">
            Consultas hoje: {dailyCount}
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-amber-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-si-card rounded-2xl border border-si-border overflow-hidden flex flex-col h-[calc(100dvh-14rem)] min-h-[min(500px,50dvh)] max-h-[calc(100dvh-8rem-env(safe-area-inset-bottom,0px))]">
        <div
          ref={historyRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[240px]"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm shadow-sm'
                    : 'bg-si-over-2 border border-si-border-md text-si-2 rounded-bl-sm shadow-sm'
                }`}
              >
                {m.role === 'user' ? (
                  <span className="whitespace-pre-wrap">{m.content}</span>
                ) : (
                  <div
                    className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-2 prose-strong:text-inherit [&_strong]:font-bold"
                    dangerouslySetInnerHTML={{ __html: m.content }}
                  />
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm px-5 py-3.5 bg-si-over-2 border border-si-border-md text-si-4 text-[15px] animate-pulse">
                Analisando sua solicitação...
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-si-border flex flex-wrap gap-2">
          {PILLS.map((label) => <button
                key={label}
                type="button"
                onClick={() => setInput(label)}
                className="text-[13px] px-3.5 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
              >
              {label}
            </button>
          )}
          <button
              type="button"
              onClick={() => setShowDecisionForm((v) => !v)}
              className="text-[13px] px-3.5 py-1.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 flex items-center gap-1.5 transition-colors"
            >
            <Scale className="w-3 h-3" />
            À Vista ou Parcelado?
          </button>
        </div>

        {showDecisionForm && (
          <div className="mx-3 mb-3 p-3 rounded-xl bg-violet-500/10 border border-violet-500/25 space-y-2">
            <p className="text-xs font-semibold text-violet-300">⚖️ Analisador: À Vista vs Parcelado</p>
            <div className="flex gap-2 flex-wrap">
              <div className="flex flex-col gap-1 flex-1 min-w-[110px]">
                <label className="text-xs text-si-4">Valor total (R$)</label>
                <input
                  type="number"
                  placeholder="ex: 1200"
                  value={decisionValues.totalValue}
                  onChange={(e) => setDecisionValues((v) => ({ ...v, totalValue: e.target.value }))}
                  className="w-full bg-si-over-2 border border-si-border-md rounded-lg px-2 py-1.5 text-sm text-si-1 focus:outline-none focus:border-violet-500/60"
                />
              </div>
              <div className="flex flex-col gap-1 w-24">
                <label className="text-xs text-si-4">Nº parcelas</label>
                <input
                  type="number"
                  placeholder="ex: 12"
                  value={decisionValues.installments}
                  onChange={(e) => setDecisionValues((v) => ({ ...v, installments: e.target.value }))}
                  className="w-full bg-si-over-2 border border-si-border-md rounded-lg px-2 py-1.5 text-sm text-si-1 focus:outline-none focus:border-violet-500/60"
                />
              </div>
              <div className="flex flex-col gap-1 w-28">
                <label className="text-xs text-si-4">Desconto à vista (%)</label>
                <input
                  type="number"
                  placeholder="ex: 5"
                  value={decisionValues.cashDiscount}
                  onChange={(e) => setDecisionValues((v) => ({ ...v, cashDiscount: e.target.value }))}
                  className="w-full bg-si-over-2 border border-si-border-md rounded-lg px-2 py-1.5 text-sm text-si-1 focus:outline-none focus:border-violet-500/60"
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
                className="text-xs px-4 py-1.5 rounded-lg bg-violet-600/80 text-white hover:bg-violet-600 font-medium"
              >
                Analisar →
              </button>
            </div>
          </div>
        )}

        <div className="p-4 pt-0 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Digite sua mensagem..."
            className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            disabled={sending}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || !input.trim()}
            className="p-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-si-1 disabled:opacity-50 shrink-0"
            aria-label="Enviar"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
