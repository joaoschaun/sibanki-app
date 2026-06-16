import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar as CalIcon, ChevronLeft, ChevronRight, Sparkles, CheckCircle, RefreshCw 
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, fnsUS } from '../../firebase';

interface PostDoc {
  id: string;
  status: string;
  scheduledFor?: string;
  plats: string[];
}

export default function AdminCalendario() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PostDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [strategyText, setStrategyText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Calendar navigation state
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const loadScheduledPosts = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'admin_posts'), where('status', '==', 'agendado'));
      const snap = await getDocs(q);
      const list: PostDoc[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as PostDoc);
      });
      setPosts(list);
    } catch (err) {
      console.error('[AdminCalendario] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScheduledPosts();
  }, []);

  const navMonth = (direction: number) => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + direction);
      return next;
    });
  };

  // Memoized calendar calculations
  const calendarCells = useMemo(() => {
    const cells = [];
    const firstDayIndex = new Date(year, month, 1).getDay(); // Day of week (0-6)
    const totalDays = new Date(year, month + 1, 0).getDate(); // Days in month
    
    // Pad previous month's days
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ dayNum: null, dateStr: null });
    }

    // Current month's days
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const hasPost = posts.some((p) => p.scheduledFor === dateStr);
      cells.push({ dayNum: day, dateStr, hasPost });
    }

    return cells;
  }, [year, month, posts]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleGenerateStrategy = async () => {
    setGenerating(true);
    setStrategyText('🤖 Criando estratégia editorial do mês...');
    try {
      const callClaude = httpsCallable<{ prompt: string; systemPrompt?: string; maxTokens?: number; adminOnly: boolean }, { text?: string }>(fnsUS, 'callClaude');
      const monthsName = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];

      const prompt = `Você é o estrategista de marketing da Sibanki. 
Crie um plano estratégico de conteúdo completo para o mês de ${monthsName[month]} de ${year}.

O plano deve conter:
1. Tema Principal do Mês (uma frase forte e explicativa)
2. 4 Pilares Semanais (Semanas 1 a 4 com temas para posts focando em atração e conversão de MRR)
3. 3 Ideias Práticas de Posts (incluindo qual rede postar e gancho visual)
4. Hashtags recomendadas
5. Métricas chaves de sucesso a monitorar.

Contexto Sibanki: App de finanças pessoais com IA, plano Pro a R$29,90, PWA instalável, focando em Dias de Liberdade (Ld) e Spread Gap.
Responda diretamente com o relatório em markdown limpo, sem introduções.`;

      const res = await callClaude({ prompt, maxTokens: 1200, adminOnly: true });
      setStrategyText(res.data?.text || 'Erro na geração.');
    } catch (err) {
      console.error('[AdminCalendario] Strategy generation error:', err);
      setStrategyText('Erro técnico ao conectar com o serviço de IA.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDayClick = (dayNum: number, dateStr: string | null) => {
    if (!dayNum || !dateStr) return;
    const existing = posts.filter((p) => p.scheduledFor === dateStr);
    if (existing.length > 0) {
      showToast(`${existing.length} post(s) agendado(s) para ${dateStr}`);
      return;
    }
    
    if (window.confirm(`Agendar novo conteúdo para ${dateStr}?`)) {
      navigate('/admin/social');
    }
  };

  const MONTHS_PT = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-si-border border-t-si-3 rounded-full animate-spin" />
          <span className="text-[10px] font-bold tracking-[0.2em] text-si-4 uppercase">Carregando calendário...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-[-0.02em] text-si-1">CALENDÁRIO EDITORIAL</h1>
          <p className="text-xs text-si-4 font-medium mt-1">
            Planejamento de postagens e campanhas semanais da marca
          </p>
        </div>
        <button
          onClick={handleGenerateStrategy}
          disabled={generating}
          className="px-4 py-2.5 rounded-lg bg-si-over-2 hover:bg-si-over-3 border border-si-border text-xs font-bold tracking-[0.15em] uppercase text-si-1 flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-purple-400" />}
          {generating ? 'Gerando...' : '✨ Gerar Estratégia IA'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-si-card border border-si-border-md rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold tracking-[0.18em] text-si-3 uppercase flex items-center gap-1.5">
              <CalIcon className="w-4 h-4 text-blue-500" /> {MONTHS_PT[month]} {year}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => navMonth(-1)}
                className="p-1.5 rounded-lg bg-si-bg hover:bg-si-over-1 border border-si-border text-si-3 hover:text-si-1 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => navMonth(1)}
                className="p-1.5 rounded-lg bg-si-bg hover:bg-si-over-1 border border-si-border text-si-3 hover:text-si-1 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
              <div key={d} className="text-center text-[9px] font-bold text-si-4 uppercase tracking-wider py-1">
                {d}
              </div>
            ))}
            {calendarCells.map((cell, idx) => {
              const today = new Date();
              const isToday = cell.dayNum === today.getDate() && month === today.getMonth() && year === today.getFullYear();

              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(cell.dayNum!, cell.dateStr)}
                  className={`min-h-[56px] p-2 border rounded-xl flex flex-col justify-between cursor-pointer transition-all ${
                    cell.dayNum
                      ? isToday
                        ? 'bg-blue-950/20 border-blue-500/35 hover:bg-blue-950/35'
                        : 'bg-si-bg border-si-border hover:bg-si-over-1'
                      : 'bg-transparent border-transparent pointer-events-none'
                  }`}
                >
                  <span className={`text-[10px] font-bold ${isToday ? 'text-blue-400 font-black' : 'text-si-3'}`}>
                    {cell.dayNum}
                  </span>
                  {cell.hasPost && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block self-end" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Editorial Strategy details */}
        <div className="bg-si-card border border-si-border-md rounded-xl p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-bold tracking-[0.18em] text-si-3 uppercase">Estratégia do Mês</h3>
            <div className="bg-si-bg border border-si-border rounded-lg p-4 max-h-[380px] overflow-y-auto">
              {strategyText ? (
                <div className="text-xs text-si-3 leading-relaxed whitespace-pre-wrap font-sans">
                  {strategyText}
                </div>
              ) : (
                <p className="text-[10px] text-si-4 font-bold tracking-[0.15em] uppercase text-center py-12">
                  Clique em "Gerar Estratégia IA" para analisar e estruturar o plano editorial.
                </p>
              )}
            </div>
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
