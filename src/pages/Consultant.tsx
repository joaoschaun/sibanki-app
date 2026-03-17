import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useFinancialData } from '../hooks/useFinancialData';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { buildFinancialContextString } from '../utils/consultantContext';
import { MessageCircle, Send, AlertTriangle } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  time: number;
}

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
];

export default function Consultant() {
  const { user } = useAuth();
  const {
    entries,
    accounts,
    accountBalances,
    accountMeta,
    cards,
    goals,
    investments,
    budgets,
    recurrents,
    loading: dataLoading,
  } = useFinancialData(user?.uid);

  useEffect(() => {
    if (messages.length === 0 && !dataLoading) {
      setMessages([{ role: 'ai', content: formatReply(WELCOME), time: Date.now() }]);
    }
  }, [dataLoading]);

  useEffect(() => {
    historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const txt = input.trim();
    if (!txt || sending) return;
    if (!user) {
      setError('Faça login para usar o consultor.');
      return;
    }

    setInput('');
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: txt, time: Date.now() }]);
    setSending(true);

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
      });
      const chatApi = httpsCallable<{ message: string; context: string }, { reply?: string }>(functions, 'chatApi');
      const res = await chatApi({ message: txt, context: contextStr });
      const dataRes = res?.data;
      const rawReply = (dataRes?.reply ?? '').trim() || 'Sem resposta.';
      const reply = formatReply(rawReply);
      setMessages((prev) => [...prev, { role: 'ai', content: reply, time: Date.now() }]);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      const msg = (err as { message?: string })?.message ?? 'Erro ao conectar. Tente novamente.';
      const friendly =
        code === 'functions/resource-exhausted' || /quota|limite|rate limit/i.test(msg)
          ? 'Limite de uso do consultor por hoje atingido. Tente em alguns minutos ou amanhã.'
          : msg;
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

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400">
          <MessageCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Consultor IA</h2>
          <p className="text-zinc-500 text-sm">Assistente financeiro com base nos seus dados</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-amber-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-[#0a0f18] rounded-2xl border border-white/5 overflow-hidden flex flex-col min-h-[420px] max-h-[70vh]">
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
                className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm ${
                  m.role === 'user'
                    ? 'bg-blue-600/80 text-white rounded-br-md'
                    : 'bg-white/5 border border-white/10 text-zinc-200 rounded-bl-md'
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
              <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-white/5 border border-white/10 text-zinc-400 text-sm">
                Analisando…
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-white/5 flex flex-wrap gap-2">
          {PILLS.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => setInput(label)}
              className="text-xs px-3 py-1.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/25 hover:bg-blue-500/25"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-4 pt-0 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Digite sua mensagem..."
            className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            disabled={sending}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="p-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 shrink-0"
            aria-label="Enviar"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
