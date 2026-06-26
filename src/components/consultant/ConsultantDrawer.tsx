import { useRef, useEffect } from 'react';
import { useUiStore } from '../../store/useUiStore';
import { MessageCircle, Send, AlertTriangle, Lock, X } from 'lucide-react';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useConsultantSession } from '../../context/ConsultantSessionContext';
import { GenerativeUiContainer } from './GenerativeUiContainer';

const PILLS = [
  'Quanto gastei no mês?',
  'Resumo das minhas metas',
];

export function ConsultantDrawer() {
  const { requireFeature } = useFeatureFlags();
  const { allowed: consultorAllowed, upsellInfo } = requireFeature('ia_consultor');

  const { consultantDrawerOpen, closeConsultantDrawer } = useUiStore();

  const {
    messages,
    input,
    setInput,
    sending,
    error,
    handleSend,
  } = useConsultantSession();

  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (consultantDrawerOpen) {
      historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, consultantDrawerOpen]);

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
            <div className="p-2 rounded-lg bg-si-over-2 text-si-2">
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
              <a href="/configuracoes" className="text-xs px-4 py-2 bg-white text-zinc-900 rounded-lg inline-block font-semibold">Ver planos</a>
            </div>
          ) : (
            <>
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${m.role === 'user' ? 'bg-white text-zinc-900 rounded-br-sm' : 'bg-si-over-2 border border-si-border-md text-si-2 rounded-bl-sm'}`}>
                    {m.role === 'user' ? (
                      <span className="whitespace-pre-wrap">{m.content}</span>
                    ) : (
                      <>
                        <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-2" dangerouslySetInnerHTML={{ __html: m.content }} />
                        {m.uiPayload && <GenerativeUiContainer uiPayload={m.uiPayload} />}
                      </>
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
              className="p-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 disabled:opacity-50 shrink-0 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
