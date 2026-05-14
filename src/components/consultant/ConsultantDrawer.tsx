import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useUiStore } from '../../store/useUiStore';
import { functions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';
import { buildFinancialContextString } from '../../utils/consultantContext';
import { analyzeInstallmentDecision } from '../../utils/decisionEngine';
import { MessageCircle, Send, AlertTriangle, Scale, Lock, X } from 'lucide-react';
import { trackPlatformEvent } from '../../services/platformEvents';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  time: number;
}

const CONSULTOR_DAILY_COUNT_KEY = 'sibanki_consultor_daily_count';

function formatReply(raw: string): string {
  let s = raw.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  return s;
}

const WELCOME = `**Consultor Financeiro Sibanki**

Seu assistente para controle financeiro. Você pode:
• **Lançar** receitas e despesas (ex: "almoço 45", "recebi 3000 salário")
• **Tirar dúvidas** sobre finanças e sobre o uso do app
• **Pedir análises** com base nos seus dados

Digite sua mensagem abaixo.`;

const PILLS = [
  'Quanto gastei no mês?',
  'Resumo das minhas metas',
];

export function ConsultantDrawer() {
  const {
    user, entries, accounts, accountBalances, accountMeta, cards, goals, investments,
    budgets, recurrents, investorProfile, creditSnapshot, creditObligations, financialProfile,
    loading: dataLoading,
  } = useAppContext();

  const { requireFeature } = useFeatureFlags();
  const { allowed: consultorAllowed, upsellInfo } = requireFeature('ia_consultor');

  const { consultantDrawerOpen, closeConsultantDrawer } = useUiStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dailyCount, setDailyCount] = useState(0);
  const historyRef = useRef<HTMLDivElement>(null);
  const openedTrackedRef = useRef(false);

  useEffect(() => {
    if (messages.length === 0 && !dataLoading && consultantDrawerOpen) {
      setMessages([{ role: 'ai', content: formatReply(WELCOME), time: Date.now() }]);
    }
  }, [dataLoading, consultantDrawerOpen, messages.length]);

  useEffect(() => {
    if (consultantDrawerOpen) {
      historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, consultantDrawerOpen]);

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
      // ignora erro
    }
  }, []);

  useEffect(() => {
    if (!user || dataLoading || !consultantDrawerOpen || openedTrackedRef.current) return;
    openedTrackedRef.current = true;
    void trackPlatformEvent('advisor_opened', {
      source: 'react_consultant_drawer',
      journeyStage: financialProfile.advisor.journeyStage,
      healthLevel: financialProfile.advisor.healthLevel,
    });
  }, [user, dataLoading, consultantDrawerOpen, financialProfile]);

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
        entries, goals, investments, budgets: budgets as Record<string, unknown>, accounts,
        accountBalances, accountMeta, cards, recurrents, investorProfile: investorProfile ?? null,
        creditSnapshot, creditObligations, currentCdiMonthly: 0.0107,
      });
      const advisorSnapshot = [
        `Saúde financeira: ${financialProfile.advisor.healthLevel}`,
        `Poupança mensal: ${financialProfile.cashflow.savingsRatePct}%`,
      ].join('\n');
      
      const chatApi = httpsCallable<{ message: string; context: string }, { reply?: string }>(functions, 'chatApi');
      const res = await chatApi({ message: txt, context: `${contextStr}\nPerfil consolidado:\n${advisorSnapshot}` });
      const rawReply = (res?.data?.reply ?? '').trim() || 'Sem resposta.';
      const reply = formatReply(rawReply);
      setMessages((prev) => [...prev, { role: 'ai', content: reply, time: Date.now() }]);
      
      setDailyCount((c) => {
        const next = c + 1;
        try {
          const today = new Date().toISOString().slice(0, 10);
          localStorage.setItem(CONSULTOR_DAILY_COUNT_KEY, JSON.stringify({ date: today, count: next }));
        } catch {}
        return next;
      });
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Erro ao conectar. Tente novamente.';
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content: `<span class="inline-flex items-center gap-1.5 text-amber-400"><span aria-hidden="true">⚠️</span> ${msg}</span>`,
          time: Date.now(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (!consultantDrawerOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:bg-transparent lg:backdrop-blur-none" 
        onClick={closeConsultantDrawer} 
        aria-hidden="true" 
      />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-si-bg border-l border-si-border shadow-2xl z-[101] flex flex-col transform transition-transform duration-300 ease-in-out">
        <div className="flex items-center justify-between p-4 border-b border-si-border bg-si-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-si-1 text-sm">Consultor IA</h2>
              <p className="text-si-5 text-xs">Pronto para te ajudar</p>
            </div>
          </div>
          <button onClick={closeConsultantDrawer} className="p-2 text-si-4 hover:text-si-1 hover:bg-si-over-2 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-amber-500/10 border-b border-amber-500/30 text-amber-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div ref={historyRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {!consultorAllowed && upsellInfo ? (
            <div className="text-center py-10 space-y-3">
              <Lock className="w-8 h-8 text-blue-400 mx-auto" />
              <p className="text-sm font-bold text-si-1">{upsellInfo.label}</p>
              <a href="/configuracoes" className="text-xs px-4 py-2 bg-blue-600 text-white rounded-lg inline-block">Ver planos</a>
            </div>
          ) : (
            <>
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${m.role === 'user' ? 'bg-blue-600/90 text-white rounded-br-sm' : 'bg-si-over-2 border border-si-border-md text-si-2 rounded-bl-sm'}`}>
                    {m.role === 'user' ? (
                      <span className="whitespace-pre-wrap">{m.content}</span>
                    ) : (
                      <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-2" dangerouslySetInnerHTML={{ __html: m.content }} />
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm px-4 py-3 bg-si-over-2 border border-si-border-md text-si-4 text-xs animate-pulse">
                    Analisando...
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-3 bg-si-card border-t border-si-border">
          {consultorAllowed && (
            <div className="flex gap-2 pb-3 overflow-x-auto no-scrollbar">
              {PILLS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setInput(label)}
                  className="whitespace-nowrap text-[11px] px-3 py-1.5 rounded-full bg-si-over-2 text-si-3 border border-si-border-md hover:bg-si-over-3 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Pergunte algo..."
              className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-si-bg border border-si-border-md text-si-1 text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              disabled={sending || !consultorAllowed}
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending || !input.trim() || !consultorAllowed}
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 shrink-0 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
