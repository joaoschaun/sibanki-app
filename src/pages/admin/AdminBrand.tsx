import React, { useState, useEffect } from 'react';
import { 
  Sparkles, CheckCircle, RefreshCw, Send, HelpCircle 
} from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { fnsUS } from '../../firebase';

export default function AdminBrand() {
  const [loadingGaps, setLoadingGaps] = useState(true);
  const [contentGaps, setContentGaps] = useState('');
  const [brandQuery, setBrandQuery] = useState('');
  const [queryResult, setQueryResult] = useState('');
  const [querying, setQuerying] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadContentGaps = async () => {
    setLoadingGaps(true);
    setContentGaps('🤖 Identificando gaps de conteúdo no mercado...');
    try {
      const callClaude = httpsCallable<{ prompt: string; systemPrompt?: string; maxTokens?: number; adminOnly: boolean }, { text?: string }>(fnsUS, 'callClaude');
      const prompt = `Você é um analista de marketing sênior de fintechs brasileiras. 
O Sibanki é um app de finanças pessoais (Ld/Sg/Sv, plano Pro R$29,90). Seus concorrentes são Mobills, Organizze e AUVP. 
Identifique 6 oportunidades de conteúdo específicas (gaps de mercado) que os concorrentes não estão explorando bem e onde o Sibanki pode se destacar.
Para cada oportunidade liste: Título curto, Rede social recomendada, Por que funciona e Estimativa de engajamento (1 a 5 estrelas).
Formate como lista markdown direta e sem conversas introdutórias.`;

      const res = await callClaude({ prompt, maxTokens: 900, adminOnly: true });
      setContentGaps(res.data?.text || 'Erro ao identificar gaps.');
      showToast('Gaps de mercado atualizados!');
    } catch (err) {
      console.error('[AdminBrand] Gaps fetch error:', err);
      setContentGaps('Erro técnico ao consultar serviço de análise.');
      showToast('Erro ao carregar gaps.');
    } finally {
      setLoadingGaps(false);
    }
  };

  useEffect(() => {
    loadContentGaps();
  }, []);

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandQuery.trim()) return;

    setQuerying(true);
    setQueryResult('🔮 Analisando estratégia...');
    try {
      const callClaude = httpsCallable<{ prompt: string; systemPrompt?: string; maxTokens?: number; adminOnly: boolean }, { text?: string }>(fnsUS, 'callClaude');
      const prompt = `Você é o estrategista de marca (Brand strategist) da Sibanki (app de finanças pessoais brasileiro). 
Analise a seguinte pergunta sobre marketing ou posicionamento e responda com insights práticos, acionáveis e específicos para o Sibanki:
"${brandQuery}"

Responda em markdown de forma concisa e direta, focando nas forças do produto (Ld, Sg, Sv, IA Siba, privacidade).`;

      const res = await callClaude({ prompt, maxTokens: 800, adminOnly: true });
      setQueryResult(res.data?.text || 'Sem insights retornados.');
      showToast('Insight gerado com sucesso!');
      setBrandQuery('');
    } catch (err) {
      console.error('[AdminBrand] Query error:', err);
      setQueryResult('Erro técnico ao processar insight estratégicos.');
      showToast('Erro ao obter insights.');
    } finally {
      setQuerying(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const competitors = [
    { name: 'AUVP', model: 'Educação + App', price: 'R$ 47/mês +', weak: 'UX complexa, foco restrito a investidores avançados', advantage: 'IA Conversacional + WhatsApp Bot' },
    { name: 'Organizze', model: 'SaaS Pago', price: 'R$ 19,90/mês', weak: 'Sem inteligência, sem bots e sem sync automático gratuito', advantage: 'IA Integrada + WhatsApp proativo' },
    { name: 'Mobills', model: 'SaaS Freemium', price: 'R$ 15,90/mês', weak: 'UX poluída e datada, excesso de anúncios, sem IA', advantage: 'UX moderna Pierre + Sovereignty Engine' },
  ];

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-[-0.02em] text-si-1">BRAND INTELLIGENCE</h1>
          <p className="text-xs text-si-4 font-medium mt-1">
            Análise de concorrência, posicionamento da marca e gaps de mercado
          </p>
        </div>
        <button
          onClick={loadContentGaps}
          disabled={loadingGaps}
          className="px-4 py-2.5 rounded-lg bg-si-over-2 hover:bg-si-over-3 border border-si-border text-xs font-bold tracking-[0.15em] uppercase text-si-1 flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingGaps ? 'animate-spin' : ''}`} />
          Recarregar Gaps
        </button>
      </div>

      {/* Brand KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-si-card border border-si-border-md rounded-xl p-4">
          <span className="text-[10px] font-bold tracking-[0.18em] text-si-4 uppercase block">Brand Score</span>
          <span className="text-2xl font-bold tracking-tight text-blue-500 block mt-2">7.4 / 10</span>
          <span className="text-[9px] text-emerald-500 font-bold block mt-1">↑ +0.3 vs mês ant.</span>
        </div>
        <div className="bg-si-card border border-si-border-md rounded-xl p-4">
          <span className="text-[10px] font-bold tracking-[0.18em] text-si-4 uppercase block">Menções Sociais (30d)</span>
          <span className="text-2xl font-bold tracking-tight text-si-1 block mt-2">48</span>
          <span className="text-[9px] text-emerald-500 font-bold block mt-1">↑ +12 novas</span>
        </div>
        <div className="bg-si-card border border-si-border-md rounded-xl p-4">
          <span className="text-[10px] font-bold tracking-[0.18em] text-si-4 uppercase block">Sentimento</span>
          <span className="text-2xl font-bold tracking-tight text-emerald-500 block mt-2">82%</span>
          <span className="text-[9px] text-si-4 font-medium block mt-1">Prevalência positiva</span>
        </div>
        <div className="bg-si-card border border-si-border-md rounded-xl p-4">
          <span className="text-[10px] font-bold tracking-[0.18em] text-si-4 uppercase block">Share of Voice</span>
          <span className="text-2xl font-bold tracking-tight text-si-1 block mt-2">3.1%</span>
          <span className="text-[9px] text-emerald-500 font-bold block mt-1">↑ Em ascensão</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Competitor list */}
        <div className="lg:col-span-2 bg-si-card border border-si-border-md rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold tracking-[0.18em] text-si-3 uppercase">🏆 Posicionamento contra Concorrentes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-si-border text-si-4 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Concorrente</th>
                  <th className="py-3 px-4">Modelo / Preço</th>
                  <th className="py-3 px-4">Pontos Fracos</th>
                  <th className="py-3 px-4">Diferencial Sibanki</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-si-border/50 text-si-3">
                {competitors.map((c, idx) => (
                  <tr key={idx} className="hover:bg-si-over-1/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-si-1">{c.name}</td>
                    <td className="py-3.5 px-4 text-si-2">{c.model} <span className="block font-mono text-[10px] text-si-4 mt-0.5">{c.price}</span></td>
                    <td className="py-3.5 px-4 text-si-3 leading-normal max-w-[200px]">{c.weak}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-950/30 text-emerald-500 border border-emerald-500/10">
                        {c.advantage}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Brand queries / insights */}
        <div className="bg-si-card border border-si-border-md rounded-xl p-5 flex flex-col justify-between">
          <div className="space-y-4 w-full">
            <h3 className="text-xs font-bold tracking-[0.18em] text-si-3 uppercase flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-purple-500" /> Consultor Estratégico IA
            </h3>
            <form onSubmit={handleQuery} className="space-y-3">
              <textarea
                required
                placeholder="Ex: Como explorar comercialmente o Spread Gap contra a concorrência?"
                value={brandQuery}
                onChange={(e) => setBrandQuery(e.target.value)}
                className="w-full h-24 p-3 bg-si-bg border border-si-border rounded-lg text-xs text-si-1 outline-none focus:border-si-border-lg transition-colors placeholder:text-si-5 resize-none"
              />
              <button
                type="submit"
                disabled={querying}
                className="w-full py-2.5 rounded-lg bg-si-over-2 hover:bg-si-over-3 border border-si-border text-xs font-bold tracking-[0.15em] uppercase text-si-1 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {querying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {querying ? 'Analisando...' : 'Obter Vantagem'}
              </button>
            </form>

            {queryResult && (
              <div className="bg-si-bg border border-si-border rounded-lg p-3 max-h-40 overflow-y-auto mt-2">
                <p className="text-[11px] text-si-2 leading-relaxed whitespace-pre-wrap">{queryResult}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Gaps list */}
      <div className="bg-si-card border border-si-border-md rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-bold tracking-[0.18em] text-si-3 uppercase flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-purple-400" /> Oportunidades e Gaps de Conteúdo no Mercado
        </h3>
        <div className="bg-si-bg border border-si-border rounded-lg p-4">
          <div className="text-xs text-si-3 leading-relaxed whitespace-pre-wrap font-sans">
            {contentGaps}
          </div>
        </div>
      </div>

      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-emerald-950 border border-emerald-500/20 text-emerald-400 py-3 px-5 rounded-xl text-xs font-bold tracking-wide flex items-center gap-2 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle className="w-4 h-4" /> {toastMessage}
        </div>
      )}
    </div>
  );
}
