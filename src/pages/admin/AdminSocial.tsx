import { useState, useEffect, useMemo } from 'react';
import { 
  Instagram, Linkedin, Twitter, Youtube, RefreshCw, Send, Clipboard, 
  Calendar, CheckCircle, FileText, Trash2, Clock 
} from 'lucide-react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, fnsUS } from '../../firebase';

interface PostDoc {
  id: string;
  text: string;
  plats: string[];
  briefing: string;
  tom: string;
  objetivo: string;
  status: 'rascunho' | 'agendado' | 'publicado';
  scheduledFor?: string;
  createdAt: string;
}

export default function AdminSocial() {
  const [posts, setPosts] = useState<PostDoc[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'rascunhos' | 'agendados' | 'publicados'>('rascunhos');

  // Form states
  const [selectedPlats, setSelectedPlats] = useState<string[]>(['instagram']);
  const [briefing, setBriefing] = useState('');
  const [tom, setTom] = useState('educativo');
  const [objetivo, setObjetivo] = useState('engajamento');

  // Result state
  const [generatedText, setGeneratedText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadPosts = async () => {
    try {
      setLoadingList(true);
      const q = query(collection(db, 'admin_posts'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list: PostDoc[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as PostDoc);
      });
      setPosts(list);
    } catch (err) {
      console.error('[AdminSocial] Fetch list error:', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const tabFilteredPosts = useMemo(() => {
    const statusMap = { rascunhos: 'rascunho', agendados: 'agendado', publicados: 'publicado' } as const;
    const targetStatus = statusMap[activeTab];
    return posts.filter((p) => p.status === targetStatus);
  }, [posts, activeTab]);

  const togglePlat = (plat: string) => {
    setSelectedPlats((prev) =>
      prev.includes(plat) 
        ? prev.length > 1 ? prev.filter((p) => p !== plat) : prev
        : [...prev, plat]
    );
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleGenerate = async () => {
    if (!briefing.trim()) {
      showToast('Descreva a ideia ou briefing antes de gerar.');
      return;
    }

    setGenerating(true);
    setGeneratedText('Aguardando geração do agente IA...');
    try {
      const callClaude = httpsCallable<{ prompt: string; systemPrompt?: string; maxTokens?: number; adminOnly: boolean }, { text?: string }>(fnsUS, 'callClaude');

      const platsDesc: Record<string, string> = { 
        instagram: 'Instagram (legenda com emojis, hashtags, CTA)', 
        linkedin: 'LinkedIn (post profissional, tom corporativo com insights)', 
        twitter: 'Twitter/X (até 280 chars, direto, provocativo)', 
        youtube: 'YouTube (script de roteiro para Reels/Shorts de 60s)' 
      };
      const tomDesc: Record<string, string> = { 
        educativo: 'tom educativo e inspirador', 
        provocativo: 'tom provocativo e direto, gera curiosidade', 
        emocional: 'tom emocional e humano, conta história', 
        dados: 'baseado em dados e fatos', 
        humor: 'com humor leve e descontraído' 
      };
      const objDesc: Record<string, string> = { 
        engajamento: 'maximizar curtidas, comentários e compartilhamentos', 
        conversao: 'converter visitantes em cadastros no Sibanki', 
        upsell: 'convencer usuários gratuitos a fazer upgrade para Pro', 
        educacao: 'educar sobre finanças pessoais', 
        branding: 'fortalecer a marca Sibanki no mercado' 
      };

      const platsText = selectedPlats.map((p) => platsDesc[p] || p).join(', ');
      const systemPrompt = `Você é o especialista de marketing do Sibanki — app de finanças pessoais brasileiro. Tom da marca: inteligente, humano, direto, sem jargão burocrático excessivo.`;
      
      const prompt = `Crie conteúdo de marketing para as seguintes redes: ${platsText}
Tema do conteúdo: ${briefing}
Tom desejado: ${tomDesc[tom]}
Objetivo da publicação: ${objDesc[objetivo]}

Diretrizes específicas:
${selectedPlats.includes('instagram') ? '- Instagram: Legenda com parágrafos curtos, emojis equilibrados, CTAs para o link da bio, max 300 caracteres + hashtags.' : ''}
${selectedPlats.includes('linkedin') ? '- LinkedIn: Início impactante, 3-4 parágrafos bem estruturados e uma pergunta ao final para engajar no debate.' : ''}
${selectedPlats.includes('twitter') ? '- Twitter/X: Thread curta (3-4 tweets) ou um tweet muito focado e atrativo.' : ''}
${selectedPlats.includes('youtube') ? '- YouTube Shorts/Reels: Roteiro narrado rápido de 60 segundos (Gancho -> Problema -> Solução com Sibanki -> Chamada de ação).' : ''}

Responda diretamente com os posts prontos para copiar, divididos por títulos de redes social, sem conversas introdutórias.`;

      const res = await callClaude({ prompt, systemPrompt, maxTokens: 1200, adminOnly: true });
      setGeneratedText(res.data?.text || 'Erro na geração de conteúdo.');
    } catch (err) {
      console.error('[AdminSocial] Claude generate error:', err);
      setGeneratedText('Erro técnico ao invocar proxy de Inteligência Artificial.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedText) return;
    navigator.clipboard.writeText(generatedText).then(() => {
      showToast('Conteúdo copiado para a área de transferência!');
    });
  };

  const handleSaveDraft = async () => {
    if (!generatedText) return;
    try {
      const newPost = {
        text: generatedText,
        plats: selectedPlats,
        briefing,
        tom,
        objetivo,
        status: 'rascunho',
        createdAt: new Date().toISOString(),
      };
      await addDoc(collection(db, 'admin_posts'), newPost);
      showToast('Rascunho salvo na fila de publicação!');
      loadPosts();
    } catch (err) {
      console.error('[AdminSocial] Save draft error:', err);
    }
  };

  const handleSchedule = async () => {
    if (!generatedText) return;
    const date = window.prompt('Data de publicação desejada (AAAA-MM-DD):');
    if (!date) return;

    try {
      const newPost = {
        text: generatedText,
        plats: selectedPlats,
        briefing,
        tom,
        objetivo,
        status: 'agendado',
        scheduledFor: date,
        createdAt: new Date().toISOString(),
      };
      await addDoc(collection(db, 'admin_posts'), newPost);
      showToast(`Post agendado para o dia ${date}!`);
      loadPosts();
    } catch (err) {
      console.error('[AdminSocial] Schedule error:', err);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await updateDoc(doc(db, 'admin_posts', id), {
        status: 'publicado',
        publishedAt: new Date().toISOString(),
      });
      showToast('Status atualizado para Publicado!');
      loadPosts();
    } catch (err) {
      console.error('[AdminSocial] Publish error:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este post permanentemente?')) return;
    try {
      await deleteDoc(doc(db, 'admin_posts', id));
      showToast('Post excluído da fila.');
      loadPosts();
    } catch (err) {
      console.error('[AdminSocial] Delete error:', err);
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-xl font-black tracking-[-0.02em] text-si-1">REDES SOCIAIS COM IA</h1>
        <p className="text-xs text-si-4 font-medium mt-1">
          Gere, revise e organize publicações utilizando inteligência de marketing da Sibanki
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Creator panel */}
        <div className="bg-si-card border border-si-border-md rounded-xl p-5 space-y-5">
          <h3 className="text-xs font-bold tracking-[0.18em] text-si-3 uppercase flex items-center gap-1.5">
            <Send className="w-4 h-4 text-blue-500" /> Gerador de Conteúdo
          </h3>

          <div className="space-y-2">
            <label className="text-[9px] font-bold tracking-[0.15em] text-si-4 uppercase block">Plataformas</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { id: 'instagram', icon: Instagram, label: 'Instagram' },
                { id: 'linkedin', icon: Linkedin, label: 'LinkedIn' },
                { id: 'twitter', icon: Twitter, label: 'Twitter/X' },
                { id: 'youtube', icon: Youtube, label: 'YouTube' },
              ].map((p) => {
                const isSel = selectedPlats.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlat(p.id)}
                    className={`px-3 py-1.5 border rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                      isSel 
                        ? 'border-blue-500/20 bg-blue-950/20 text-blue-400' 
                        : 'border-si-border hover:bg-si-over-1 text-si-4'
                    }`}
                  >
                    <p.icon className="w-4 h-4" /> {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-bold tracking-[0.15em] text-si-4 uppercase block">Tema ou Briefing</label>
            <textarea
              placeholder="Ex: Como poupar o décimo terceiro salário, dicas de Spread Gap..."
              value={briefing}
              onChange={(e) => setBriefing(e.target.value)}
              className="w-full h-24 p-3 bg-si-bg border border-si-border rounded-lg text-xs text-si-1 outline-none focus:border-si-border-lg transition-colors placeholder:text-si-5 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-bold tracking-[0.15em] text-si-4 uppercase block">Tom da Voz</label>
              <select
                value={tom}
                onChange={(e) => setTom(e.target.value)}
                className="w-full px-3 py-2 bg-si-bg border border-si-border rounded-lg text-xs text-si-2 outline-none focus:border-si-border-lg cursor-pointer"
              >
                <option value="educativo">Educativo e inspirador</option>
                <option value="provocativo">Provocativo e direto</option>
                <option value="emocional">Emocional e humano</option>
                <option value="dados">Baseado em dados</option>
                <option value="humor">Humor inteligente</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-bold tracking-[0.15em] text-si-4 uppercase block">Objetivo</label>
              <select
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
                className="w-full px-3 py-2 bg-si-bg border border-si-border rounded-lg text-xs text-si-2 outline-none focus:border-si-border-lg cursor-pointer"
              >
                <option value="engajamento">Engajamento (likes/share)</option>
                <option value="conversao">Capturar cadastros</option>
                <option value="upsell">Conversão plano Pro</option>
                <option value="educacao">Educação financeira</option>
                <option value="branding">Brand awareness</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-2.5 rounded-lg bg-si-over-2 hover:bg-si-over-3 border border-si-border text-xs font-bold tracking-[0.18em] uppercase text-si-1 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : '✨ Gerar Posts com IA'}
          </button>

          {/* Generated Text Area */}
          {generatedText && (
            <div className="space-y-3 pt-4 border-t border-si-border/30">
              <div className="bg-si-bg border border-si-border rounded-lg p-4 max-h-64 overflow-y-auto">
                <pre className="text-xs text-si-2 whitespace-pre-wrap font-sans leading-relaxed">
                  {generatedText}
                </pre>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 py-2 rounded-lg bg-si-over-1 hover:bg-si-over-2 border border-si-border text-[9px] font-bold tracking-wider uppercase text-si-1 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Clipboard className="w-3.5 h-3.5" /> Copiar
                </button>
                <button
                  onClick={handleSaveDraft}
                  className="flex-1 py-2 rounded-lg bg-si-over-1 hover:bg-si-over-2 border border-si-border text-[9px] font-bold tracking-wider uppercase text-si-1 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" /> Rascunho
                </button>
                <button
                  onClick={handleSchedule}
                  className="flex-1 py-2 rounded-lg bg-si-over-1 hover:bg-si-over-2 border border-si-border text-[9px] font-bold tracking-wider uppercase text-si-1 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" /> Agendar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Drafts & Queue lists */}
        <div className="bg-si-card border border-si-border-md rounded-xl p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-si-border/40 pb-2">
              <h3 className="text-xs font-bold tracking-[0.18em] text-si-3 uppercase">Rascunhos & Fila</h3>
              <div className="flex bg-si-bg p-1 rounded-lg border border-si-border text-[9px] font-bold uppercase tracking-wider">
                {(['rascunhos', 'agendados', 'publicados'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      activeTab === tab 
                        ? 'bg-si-card border border-si-border text-si-1' 
                        : 'text-si-4 hover:text-si-2'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {!loadingList ? (
                tabFilteredPosts.length > 0 ? (
                  tabFilteredPosts.map((p) => {
                    const icons: Record<string, any> = { instagram: Instagram, linkedin: Linkedin, twitter: Twitter, youtube: Youtube };

                    return (
                      <div key={p.id} className="p-3 bg-si-bg border border-si-border rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1.5">
                            {p.plats.map((pl) => {
                              const Icon = icons[pl];
                              return Icon ? <Icon key={pl} className="w-3.5 h-3.5 text-si-4" /> : null;
                            })}
                          </div>
                          {p.scheduledFor && (
                            <span className="text-[8px] font-bold font-mono text-blue-400 bg-blue-950/20 px-1.5 py-0.5 rounded border border-blue-500/10 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {p.scheduledFor}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-si-3 leading-relaxed whitespace-pre-wrap line-clamp-4">
                          {p.text}
                        </p>
                        <div className="flex gap-2 pt-2 border-t border-si-border/20">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(p.text);
                              showToast('Copiado!');
                            }}
                            className="py-1 px-2.5 rounded bg-si-over-1 hover:bg-si-over-2 border border-si-border text-[9px] font-black uppercase text-si-2 transition-colors"
                          >
                            Copiar
                          </button>
                          {p.status === 'rascunho' && (
                            <button
                              onClick={() => handlePublish(p.id)}
                              className="py-1 px-2.5 rounded bg-emerald-950/20 hover:bg-emerald-950/30 border border-emerald-500/15 text-[9px] font-black uppercase text-emerald-400 transition-colors"
                            >
                              Publicar
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="py-1 px-2.5 rounded bg-red-950/20 hover:bg-red-950/30 border border-red-500/15 text-[9px] font-black uppercase text-red-400 ml-auto transition-colors"
                            title="Apagar post"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center justify-center h-40 border border-dashed border-si-border rounded-lg text-si-4 text-[10px] font-bold tracking-[0.15em] uppercase">
                    Nenhum post nesta aba
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center h-40">
                  <div className="w-6 h-6 border-2 border-si-border border-t-si-3 rounded-full animate-spin" />
                </div>
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
