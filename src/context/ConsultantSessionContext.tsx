/**
 * Sessão única do assistente — compartilhada entre a página /consultor-ia e o drawer global.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAppContext } from './AppContext';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { buildFinancialContextString } from '../utils/consultantContext';
import { analyzeInstallmentDecision } from '../utils/decisionEngine';
import { suggestBestCardForPurchase, type CardPurchaseSuggestion } from '../utils/suggestBestCardForPurchase';
import { trackPlatformEvent } from '../services/platformEvents';

import type { Card, Entry } from '../types/userData';

export interface ConsultantChatMessage {
  role: 'user' | 'ai';
  content: string;
  time: number;
  entryPayload?: Omit<Entry, 'id'> & { _provider?: string };
  marketPayload?: any;
  /** Sugestão determinística de cartão (benefícios cadastrados + texto do usuário). */
  cardPurchaseSuggestion?: CardPurchaseSuggestion | null;
}

/** Resposta de `assistantEntryCaptureApi` (voz + visão unificadas). */
type EntryCaptureApiResponse = {
  kind: 'voice' | 'vision';
  analysisMode: string;
  transcript: string | null;
  entry: ConsultantChatMessage['entryPayload'] | null;
  entryPayload: ConsultantChatMessage['entryPayload'] | null;
  reply: string | null;
  provider: string;
};

const CONSULTOR_DAILY_COUNT_KEY = 'sibanki_consultor_daily_count';

export function formatConsultantReply(raw: string): string {
  let s = raw.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  return s;
}

/** Remove HTML do histórico antes de enviar ao modelo (evita ruído e tokens duplicados). */
function stripConsultantHtmlForModel(html: string): string {
  if (!html) return '';
  let s = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
  s = s.replace(/\n{3,}/g, '\n\n').trim();
  const max = 1200;
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function buildCardBenefitsSnapshot(cards: Card[]): string {
  if (!cards.length) return 'Benefícios dos cartões: nenhum cartão cadastrado.';
  const withBenefits = cards.filter((card) => !!card.cardBenefits);
  if (!withBenefits.length) return `Benefícios dos cartões: ${cards.length} cartões cadastrados, sem benefícios informados.`;

  const vip = withBenefits.filter((card) => card.cardBenefits?.vipLounge).length;
  const insurance = withBenefits.filter((card) =>
    card.cardBenefits?.travelInsurance || card.cardBenefits?.purchaseProtection || card.cardBenefits?.extendedWarranty
  ).length;
  const cashbackCards = withBenefits
    .filter((card) => typeof card.cardBenefits?.cashbackPct === 'number')
    .sort((a, b) => Number(b.cardBenefits?.cashbackPct ?? 0) - Number(a.cardBenefits?.cashbackPct ?? 0));
  const topCashback = cashbackCards[0];
  const topCashbackLabel = topCashback
    ? `${topCashback.name} (${Number(topCashback.cardBenefits?.cashbackPct ?? 0).toFixed(2)}%)`
    : 'não informado';

  return [
    `Benefícios dos cartões: ${withBenefits.length}/${cards.length} com benefícios cadastrados.`,
    `Sala VIP: ${vip} cartão(ões).`,
    `Proteções/seguros: ${insurance} cartão(ões).`,
    `Maior cashback informado: ${topCashbackLabel}.`,
  ].join(' ');
}

const WELCOME = `**Assistente Sibanki**

Seu assistente para controle financeiro. Você pode:
• **Lançar** receitas e despesas (ex: "almoço 45", "recebi 3000 salário")
• **Tirar dúvidas** sobre finanças e sobre o uso do app
• **Pedir análises** com base nos seus dados (receitas, despesas, metas, investimentos)

Digite sua mensagem abaixo.`;

export const CONSULTANT_PILLS = [
  'Quanto gastei no mês?',
  'Como melhorar minha saúde financeira?',
  'Resumo das minhas metas',
  'Como está meu orçamento por categoria?',
  'Quanto devo poupar para meu objetivo?',
  'Compare CDB, LCI e LCA para mim',
];

interface ConsultantSessionValue {
  messages: ConsultantChatMessage[];
  input: string;
  setInput: (v: string) => void;
  sending: boolean;
  recording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  error: string | null;
  dailyCount: number;
  showDecisionForm: boolean;
  setShowDecisionForm: (v: boolean | ((b: boolean) => boolean)) => void;
  decisionValues: { totalValue: string; installments: string; cashDiscount: string };
  setDecisionValues: React.Dispatch<
    React.SetStateAction<{ totalValue: string; installments: string; cashDiscount: string }>
  >;
  historyRef: React.RefObject<HTMLDivElement>;
  handleSend: (overrideText?: string) => Promise<void>;
  handleDecisionAnalyze: () => void;
  dataLoading: boolean;
  /** Mensagem inicial vinda de outra tela (ex.: Início) */
  queuePendingMessage: (text: string) => void;
  uploadReceiptPhoto: (file: File) => Promise<void>;
}

const ConsultantSessionContext = createContext<ConsultantSessionValue | null>(null);

export function ConsultantSessionProvider({ children }: { children: ReactNode }) {
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

  const [messages, setMessages] = useState<ConsultantChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dailyCount, setDailyCount] = useState(0);
  const [showDecisionForm, setShowDecisionForm] = useState(false);
  const [decisionValues, setDecisionValues] = useState({
    totalValue: '',
    installments: '',
    cashDiscount: '',
  });
  const historyRef = useRef<HTMLDivElement>(null);
  const pendingFromHomeRef = useRef<string | null>(null);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const queuePendingMessage = useCallback((text: string) => {
    pendingFromHomeRef.current = text.trim();
  }, []);

  useEffect(() => {
    if (messages.length === 0 && !dataLoading) {
      setMessages([{ role: 'ai', content: formatConsultantReply(WELCOME), time: Date.now() }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLoading]);

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
      // ignora
    }
  }, []);

  const handleDecisionAnalyze = useCallback(() => {
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
    const aiMsg = formatConsultantReply(result.narrativa);
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMsg, time: Date.now() },
      { role: 'ai', content: aiMsg, time: Date.now() + 1 },
    ]);
    setShowDecisionForm(false);
    setDecisionValues({ totalValue: '', installments: '', cashDiscount: '' });
    setError(null);
  }, [decisionValues, accountBalances, financialProfile]);

  const handleSend = useCallback(
    async (overrideText?: string) => {
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
          cards: (cards as Card[]).map((c) => ({
            name: c.name,
            limit: c.limit,
            active: c.active,
            currentBill: c.currentBill,
            flag: c.flag,
            cardBenefits: c.cardBenefits,
          })),
          recurrents,
          investorProfile: investorProfile ?? null,
          creditSnapshot,
          creditObligations,
          currentCdiMonthly: 0.0107,
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
          buildCardBenefitsSnapshot(cards as Card[]),
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

        const recentHistory = messagesRef.current
          .filter((m) => {
            if (m.role === 'ai' && (!m.content || !String(m.content).trim())) return false;
            return true;
          })
          .slice(-8);
        let historyPrompt = '';
        if (recentHistory.length > 0) {
          const formattedHistory = recentHistory
            .map((m) => {
              const roleName = m.role === 'user' ? 'Usuário' : 'Consultor';
              const body =
                m.role === 'user' ? m.content : stripConsultantHtmlForModel(m.content);
              return `${roleName}:\n${body}`;
            })
            .join('\n\n');
          historyPrompt = `[HISTÓRICO RECENTE DA CONVERSA]\n${formattedHistory}\n\n[NOVA MENSAGEM DO USUÁRIO]\n`;
        }

        // Injeta uma mensagem vazia que será preenchida iterativamente
        const baseMsgId = Date.now();
        setMessages((prev) => [
          ...prev, 
          { 
            role: 'ai', 
            content: '', 
            time: baseMsgId
          }
        ]);

        const token = await user.getIdToken();
        // A URL hardcoded na default region do Firebase
        const functionUrl = 'https://us-central1-virtus-financeiro-cd7bd.cloudfunctions.net/chatStreamApi';

        const reqBody = {
          message: `${historyPrompt}${txt}`,
          context: `${contextStr}\nPerfil consolidado:\n${advisorSnapshot}`
        };

        const fetchRes = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(reqBody)
        });

        if (!fetchRes.ok) {
           throw new Error("Falha na conexão de inteligência. Tente novamente.");
        }

        const reader = fetchRes.body?.getReader();
        if (!reader) throw new Error("Seu navegador não suporta streaming.");

        const decoder = new TextDecoder('utf-8');
        let done = false;
        let aiFullText = "";
        let rawReply = "";

        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          if (value) {
            const chunkText = decoder.decode(value, { stream: true });
            const lines = chunkText.split('\n');
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const dataRaw = line.replace("data: ", "").trim();
                if (dataRaw === "[DONE]") continue;
                if (dataRaw) {
                  try {
                    const parsed = JSON.parse(dataRaw);
                    if (parsed.error) {
                      throw new Error(parsed.error);
                    }
                    if (parsed.text) {
                      aiFullText += parsed.text;
                      rawReply = aiFullText;
                      // Atualiza estado do texto formatado dinamicamente
                      setMessages((prev) => {
                        const next = [...prev];
                        next[next.length - 1] = { ...next[next.length - 1], content: formatConsultantReply(aiFullText) };
                        return next;
                      });
                    }
                    if (parsed.marketPayload) {
                      setMessages((prev) => {
                        const next = [...prev];
                        next[next.length - 1] = { ...next[next.length - 1], marketPayload: parsed.marketPayload };
                        return next;
                      });
                    }
                  } catch(e) {
                     // Chunks cortados ao meio são ignorados e resolvidos no próximo giro
                  }
                }
              }
            }
          }
        }

        // Fallback resiliente: se o stream concluir sem texto, usa endpoint onCall tradicional.
        if (!rawReply.trim()) {
          const chatFn = httpsCallable<{ message: string; context: string }, { reply?: string; marketPayload?: unknown }>(
            functions,
            'chatApi',
          );
          const fallback = await chatFn(reqBody);
          const replyText = String(fallback.data?.reply || '').trim();
          if (!replyText) {
            throw new Error('A IA não retornou conteúdo nesta tentativa.');
          }
          rawReply = replyText;
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = {
              ...next[next.length - 1],
              content: formatConsultantReply(replyText),
              marketPayload: fallback.data?.marketPayload as any,
            };
            return next;
          });
        }
        
        void trackPlatformEvent('advisor_reply_received', {
          source: 'react_consultant_page',
          latencyMs: Date.now() - startedAt,
          replyLength: rawReply.length,
          journeyStage: financialProfile.advisor.journeyStage,
        });

        const purchaseHint = suggestBestCardForPurchase(txt, cards as Card[]);
        if (purchaseHint) {
          setMessages((prev) => {
            const next = [...prev];
            const idx = next.length - 1;
            if (next[idx]?.role === 'ai') {
              next[idx] = { ...next[idx], cardPurchaseSuggestion: purchaseHint };
            }
            return next;
          });
        }

        setDailyCount((c) => {
          const next = c + 1;
          try {
            const today = new Date().toISOString().slice(0, 10);
            localStorage.setItem(CONSULTOR_DAILY_COUNT_KEY, JSON.stringify({ date: today, count: next }));
          } catch {
            // ignora
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
    },
    [
      input,
      sending,
      user,
      entries,
      goals,
      investments,
      budgets,
      accounts,
      accountBalances,
      accountMeta,
      cards,
      recurrents,
      investorProfile,
      creditSnapshot,
      creditObligations,
      financialProfile,
    ]
  );

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    setRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRecording(true);
      setError(null);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        setSending(true);
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64data = reader.result?.toString().split(',')[1];
            if (!base64data) throw new Error("Erro na conversão de áudio");
            const captureFn = httpsCallable<
              { kind: 'voice'; audioBase64: string; mimeType: string },
              EntryCaptureApiResponse
            >(functions, 'assistantEntryCaptureApi');
            const res = await captureFn({ kind: 'voice', audioBase64: base64data, mimeType: 'audio/webm' });
            const data = res.data;
            if (data?.transcript) {
              setMessages(prev => [...prev, { role: 'user', content: `🎤 ${data.transcript}`, time: Date.now() }]);
              if (data.entryPayload) {
                const entryPayload = data.entryPayload;
                setMessages(prev => [
                  ...prev,
                  {
                    role: 'ai',
                    content: data.reply || '',
                    time: Date.now() + 1,
                    entryPayload,
                  },
                ]);
              } else {
                void handleSend(data.transcript);
              }
            } else {
              setError("Áudio ininteligível ou vazio. Tente novamente.");
            }
          };
        } catch (err: unknown) {
          setError((err as {message?: string})?.message || 'Erro ao processar áudio.');
        } finally {
          setSending(false);
        }
      };

      mediaRecorder.start();
    } catch (err) {
      setError("Permissão de microfone negada ou não suportada.");
      setRecording(false);
    }
  }, [handleSend]);

  const uploadReceiptPhoto = useCallback(async (file: File) => {
    setSending(true);
    setError(null);
    setMessages(prev => [...prev, { role: 'user', content: `📷 [Imagem: ${file.name}]`, time: Date.now() }]);
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64data = reader.result?.toString().split(',')[1];
        if (!base64data) throw new Error("Erro na conversão da imagem.");
        
        try {
           const captureFn = httpsCallable<
             { kind: 'vision'; image: string; mimeType: string },
             EntryCaptureApiResponse
           >(functions, 'assistantEntryCaptureApi');
           const res = await captureFn({ kind: 'vision', image: base64data, mimeType: file.type });
           const data = res.data;

           if (data?.entryPayload) {
              const entryPayload = data.entryPayload;
              setMessages(prev => [...prev, { role: 'ai', content: data.reply || "Analisei a nota fiscal e preparei os dados. Confirme abaixo:", time: Date.now(), entryPayload }]);
           } else {
              setMessages(prev => [...prev, { role: 'ai', content: "Desculpe, não consegui extrair os dados financeiros desta imagem.", time: Date.now() }]);
           }
        } catch (err: unknown) {
           setError((err as {message?: string})?.message || 'Falha ao analisar a imagem no servidor.');
        } finally {
           setSending(false);
        }
      };
    } catch (err) {
      setError("Erro ao ler o arquivo selecionado.");
      setSending(false);
    }
  }, []);

  useEffect(() => {
    if (dataLoading || !user || !pendingFromHomeRef.current) return;
    const msg = pendingFromHomeRef.current;
    pendingFromHomeRef.current = null;
    const t = window.setTimeout(() => {
      void handleSend(msg);
    }, 0);
    return () => clearTimeout(t);
  }, [dataLoading, user, handleSend]);

  const value = useMemo<ConsultantSessionValue>(
    () => ({
      messages,
      input,
      setInput,
      sending,
      recording,
      startRecording,
      stopRecording,
      error,
      dailyCount,
      showDecisionForm,
      setShowDecisionForm,
      decisionValues,
      setDecisionValues,
      historyRef,
      handleSend,
      handleDecisionAnalyze,
      dataLoading,
      queuePendingMessage,
      uploadReceiptPhoto,
    }),
    [
      messages,
      input,
      sending,
      error,
      dailyCount,
      showDecisionForm,
      decisionValues,
      handleSend,
      handleDecisionAnalyze,
      dataLoading,
      queuePendingMessage,
      recording,
      startRecording,
      stopRecording,
      uploadReceiptPhoto,
    ]
  );

  return <ConsultantSessionContext.Provider value={value}>{children}</ConsultantSessionContext.Provider>;
}

/** Dispara tracking de abertura uma vez (página ou drawer). */
export function useConsultantOpenTracking(source: 'react_consultant_page' | 'react_consultant_drawer') {
  const { user, loading: dataLoading, financialProfile } = useAppContext();
  const openedTrackedRef = useRef(false);

  useEffect(() => {
    if (!user || dataLoading || openedTrackedRef.current) return;
    openedTrackedRef.current = true;
    void trackPlatformEvent('advisor_opened', {
      source,
      journeyStage: financialProfile.advisor.journeyStage,
      healthLevel: financialProfile.advisor.healthLevel,
      hasOpenFinance: financialProfile.products.hasOpenFinance,
      plan: financialProfile.products.plan,
    });
  }, [user, dataLoading, financialProfile, source]);
}

export function useConsultantSession(): ConsultantSessionValue {
  const ctx = useContext(ConsultantSessionContext);
  if (!ctx) throw new Error('useConsultantSession deve estar dentro de ConsultantSessionProvider');
  return ctx;
}
