import { useEffect } from 'react';
import { GenericPageSkeleton } from '../components/ui/PageSkeleton';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useIntelligence } from '../context/IntelligenceContext';
import { useConsultantSession } from '../context/ConsultantSessionContext';
import { GenerativeUiContainer } from '../components/consultant/GenerativeUiContainer';
import { Send, AlertTriangle, Scale, Lock, Wallet, CreditCard, TrendingUp, type LucideIcon } from 'lucide-react';
import { useFeatureFlags } from '../hooks/useFeatureFlags';

/** Cards de sugestão do estado vazio (Chat 2.0 — S2 da auditoria visual). */
const SUGGESTIONS: Array<{ icon: LucideIcon; title: string; prompt?: string; tool?: 'decision' }> = [
  { icon: TrendingUp, title: 'Como aumento meus Dias de Liberdade?', prompt: 'Como melhorar minha saúde financeira e aumentar meus dias de liberdade?' },
  { icon: Wallet,     title: 'Tenho dinheiro parado rendendo zero?', prompt: 'Tenho dinheiro parado em conta que não rende? Quanto eu ganharia, em dias de liberdade, movendo para algo que renda ~100% do CDI?' },
  { icon: CreditCard, title: 'Benefícios de cartão que não uso', prompt: 'Quais benefícios os meus cartões oferecem que eu provavelmente não estou aproveitando?' },
  { icon: Scale,      title: 'À vista ou parcelado?', tool: 'decision' },
];

const PILLS = [
  'Como aumento meus dias de liberdade?',
  'Tenho dinheiro parado rendendo zero?',
  'Meu cartão tem benefício que não uso?',
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
    loading: dataLoading,
  } = useAppContext();

  const { requireFeature } = useFeatureFlags();
  const { allowed: consultorAllowed, upsellInfo } = requireFeature('ia_consultor');

  const {
    messages,
    input,
    setInput,
    sending,
    error,
    dailyCount,
    showDecisionForm,
    setShowDecisionForm,
    decisionValues,
    setDecisionValues,
    historyRef,
    handleSend,
    handleDecisionAnalyze,
    queuePendingMessage,
  } = useConsultantSession();

  const { freedom } = useIntelligence();

  useEffect(() => {
    const raw = (location.state as { initialMessage?: string } | null)?.initialMessage;
    if (typeof raw === 'string' && raw.trim()) {
      queuePendingMessage(raw.trim());
      navigate(location.pathname, { replace: true, state: null });
    }
    // Somente estado da navegação inicial ao abrir a página
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              {freedom.days > 0 && freedom.days < 9999 ? (
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
              <div key={i} className="flex gap-3.5 flex-col">
                <div className="flex gap-3.5">
                  <div className="w-7 h-7 rounded-lg bg-si-over-2 border border-si-border flex items-center justify-center text-si-2 shrink-0 mt-1">
                    <BrandMark className="w-3.5 h-3.5" />
                  </div>
                  <div
                    className="flex-1 min-w-0 text-si-2 text-[15px] leading-relaxed pt-0.5 [&_strong]:text-si-1 [&_strong]:font-semibold"
                    dangerouslySetInnerHTML={{ __html: m.content }}
                  />
                </div>
                {m.uiPayload && (
                  <div className="pl-10">
                    <GenerativeUiContainer uiPayload={m.uiPayload} />
                  </div>
                )}
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
