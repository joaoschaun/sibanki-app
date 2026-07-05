import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, Shield, TrendingUp, 
  Check, Zap, Globe, Layers, Tv, CreditCard, 
  ArrowLeftRight, Navigation, AlertCircle, 
  Mic, Star, ChevronDown, 
  Lock, Award
} from 'lucide-react';

interface PlanDetails {
  name: string;
  price: string;
  desc: string;
  note: string;
  features: string[];
}

const PLANS: Record<string, PlanDetails> = {
  free: {
    name: 'Gratuito',
    price: 'R$ 0',
    desc: 'Organização pessoal essencial para sair da escuridão financeira.',
    note: 'Sem cobrança e sem necessidade de cartão de crédito.',
    features: [
      'Controle manual de contas e cartões',
      'Até 2 contas bancárias cadastradas',
      'Consultas limitadas ao Consultor IA',
      'Acesso básico pelo WhatsApp e Telegram'
    ]
  },
  pro: {
    name: 'Pro',
    price: 'R$ 29,90/mês',
    desc: 'O motor completo de soberania financeira com automação real.',
    note: '30 dias grátis de Pro. Cancele ou mude de plano quando quiser.',
    features: [
      'Contas e cartões de crédito ilimitados',
      'Sincronização automática via Open Finance (Pluggy)',
      'Consultor IA com contexto completo e sem limites',
      'Alertas de localização do Sentinela GPS (benefícios de cartões)',
      'Relatórios executivos e auditorias de investimentos em tempo real'
    ]
  },
  familia: {
    name: 'Família',
    price: 'R$ 49,90/mês',
    desc: 'Estratégia e harmonia financeira para toda a sua casa.',
    note: '30 dias grátis de Família. Ideal para casais e educação dos filhos.',
    features: [
      'Tudo do plano Pro incluso para até 4 membros',
      'Espaço Casal integrado (saldos combinados e metas conjuntas)',
      'Educação Financeira Infantil (missões, mesadas e conquistas)',
      'Painel de controle parental para aprovação de despesas',
      'Suporte prioritário e relatórios familiares consolidados'
    ]
  }
};

type FreedomTier = {
  label: string;
  color: string;
  bg: string;
  border: string;
  desc: string;
};

const FREEDOM_TIERS: Record<string, FreedomTier> = {
  fragil: { 
    label: 'Frágil', 
    color: 'text-rose-400', 
    bg: 'bg-rose-950/20', 
    border: 'border-rose-500/30',
    desc: 'Você tem menos de 30 dias de cobertura. Qualquer emergência compromete seu orçamento.' 
  },
  construcao: { 
    label: 'Em Construção', 
    color: 'text-amber-400', 
    bg: 'bg-amber-950/20', 
    border: 'border-amber-500/30',
    desc: 'Seu patrimônio cobre entre 31 e 90 dias. A base está sendo formada.' 
  },
  resiliente: { 
    label: 'Resiliente', 
    color: 'text-blue-400', 
    bg: 'bg-blue-950/20', 
    border: 'border-blue-500/30',
    desc: 'Cobre de 91 a 180 dias. Você já suporta imprevistos moderados com tranquilidade.' 
  },
  soberano: { 
    label: 'Soberano', 
    color: 'text-emerald-400', 
    bg: 'bg-emerald-950/20', 
    border: 'border-emerald-500/30',
    desc: 'De 181 a 365 dias. Você tem autonomia total e poder de decisão financeira de longo prazo.' 
  },
  inabalavel: { 
    label: 'Inabalável', 
    color: 'text-violet-400', 
    bg: 'bg-violet-950/20', 
    border: 'border-violet-500/30',
    desc: 'Mais de 1 ano de liberdade. Suas decisões financeiras são soberanas e geram riqueza passiva.' 
  }
};

const FAQ_ITEMS = [
  {
    q: 'Como funciona a sincronização via Open Finance? É seguro?',
    a: 'Sim, é 100% seguro. Nós utilizamos a Pluggy, uma das maiores infraestruturas de Open Finance do Brasil (regulada pelo Banco Central). A conexão é estritamente de leitura (read-only), o que significa que o Sibanki consegue apenas ler os saldos, extratos e transações. É matematicamente impossível realizar transferências, pagamentos ou qualquer movimentação na sua conta pelo nosso sistema.'
  },
  {
    q: 'O Sibanki vende ou comercializa meus dados financeiros?',
    a: 'Absolutamente não. Nosso modelo de negócios é baseado em assinaturas (SaaS). Diferente de aplicativos gratuitos que lucram vendendo seus dados para bancos ou empurrando empréstimos e cartões indesejados, nós cobramos uma mensalidade para garantir que nosso único interesse seja o seu sucesso financeiro. Seus dados são criptografados de ponta a ponta e nunca serão compartilhados.'
  },
  {
    q: 'Como funciona o registro de gastos pelo WhatsApp e Telegram?',
    a: 'Você recebe um número exclusivo de assistente pessoal. Ao enviar qualquer mensagem em linguagem natural (ex: "gastei 85 reais no ifood no cartão de crédito") ou uma mensagem de voz, nossa IA interpreta os valores, a categoria e a forma de pagamento, lançando-os automaticamente na sua conta em tempo real, enviando de volta o seu Sovereignty Score de recompensa.'
  },
  {
    q: 'O que é o Spread Gap (Sg) e o Sovereignty Score (Sv)?',
    a: 'O Spread Gap (Sg) é um indicador que compara as taxas de juros de suas dívidas (como parcelas de cartão) com o rendimento de sua liquidez ativa, apontando perdas financeiras invisíveis. O Sovereignty Score (Sv) avalia o impacto de cada despesa nos seus Dias de Liberdade (Ld), ensinando seu cérebro de forma gamificada a priorizar ativos geradores de riqueza em vez de passivos de consumo.'
  },
  {
    q: 'Existe aplicativo para celular Android e iOS?',
    a: 'O Sibanki é desenvolvido como um PWA (Progressive Web App) de última geração. Isso significa que você não precisa baixar arquivos pesados na App Store ou Google Play. Ao acessar o sistema no celular, basta clicar em "Adicionar à Tela de Início" para instalá-lo como um aplicativo nativo, com carregamento instantâneo, suporte offline e notificações de segurança.'
  },
  {
    q: 'Posso cancelar a assinatura a qualquer momento? Há fidelidade?',
    a: 'Não há fidelidade alguma. Você pode cancelar, fazer o downgrade ou exportar todos os seus dados em formato de planilha (CSV) com um único clique nas configurações da sua conta, sem burocracias ou telefonemas.'
  }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro' | 'familia'>('pro');
  
  // Estados para o Simulador de Dias de Liberdade (Ld)
  const [patrimonio, setPatrimonio] = useState<number>(35000);
  const [custoVida, setCustoVida] = useState<number>(4200);

  // Estados para o Simulador de WhatsApp
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [micRecording, setMicRecording] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; sub?: string }>>([
    { sender: 'bot', text: 'Olá! Sou o assistente Sibanki. Digite ou fale qualquer gasto para eu registrar e analisar.' }
  ]);

  // Estados do Simulador de Dashboard Real
  const [activeMockTab, setActiveMockTab] = useState<'visao' | 'tx' | 'sub' | 'card'>('visao');
  const [gpsChecking, setGpsChecking] = useState<boolean>(false);
  const [gpsResult, setGpsResult] = useState<string | null>(null);
  const [sibcoinCount, setSibcoinCount] = useState<number>(1280);
  const [logoTheme, setLogoTheme] = useState<'virtus' | 'alfa'>('virtus');
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);

  // Efeito para simular aumento de moedas
  useEffect(() => {
    const interval = setInterval(() => {
      setSibcoinCount(prev => prev + (Math.random() > 0.7 ? 1 : 0));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Cálculos reativos do Simulador de Ld
  const ldResult = useMemo(() => {
    if (custoVida <= 0) return { days: 9999, tier: FREEDOM_TIERS.inabalavel };
    const burnRateDiario = custoVida / 30;
    const days = Math.round(patrimonio / burnRateDiario);
    
    let tier = FREEDOM_TIERS.fragil;
    if (days > 365) tier = FREEDOM_TIERS.inabalavel;
    else if (days >= 181) tier = FREEDOM_TIERS.soberano;
    else if (days >= 91) tier = FREEDOM_TIERS.resiliente;
    else if (days >= 31) tier = FREEDOM_TIERS.construcao;

    return { days, tier };
  }, [patrimonio, custoVida]);

  const handleSelectPlan = (plan: 'free' | 'pro' | 'familia') => {
    setSelectedPlan(plan);
    try {
      localStorage.setItem('sib_selected_plan', plan);
    } catch (e) {
      console.warn('Erro ao salvar plano no localStorage:', e);
    }
  };

  const handleGetStarted = (planKey: string) => {
    try {
      localStorage.setItem('sib_selected_plan', planKey);
    } catch (e) {
      console.warn('Erro ao salvar plano no localStorage:', e);
    }
    navigate('/login');
  };

  // Simular fluxo de conversa no WhatsApp (texto ou áudio)
  const triggerChatSimulation = (type: 'happy' | 'investment' | 'voice') => {
    if (isTyping || micRecording) return;
    
    setChatMessages([
      { sender: 'bot', text: 'Olá! Sou o assistente Sibanki. Digite ou fale qualquer gasto para eu registrar e analisar.' }
    ]);

    if (type === 'happy') {
      setIsTyping(true);
      setTimeout(() => {
        setChatMessages(prev => [...prev, { sender: 'user', text: 'Gastei R$ 75 de Uber voltando do shopping no crédito' }]);
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setChatMessages(prev => [...prev, { 
            sender: 'bot', 
            text: '📉 Despesa registrada! R$ 75,00 categorizada como Transporte no cartão Nu.',
            sub: 'Sovereignty Score: 42/100 (Atenção - Uso de crédito para consumo não programado). Recompensa: +1 SibCoin.'
          }]);
        }, 1000);
      }, 400);
    } else if (type === 'investment') {
      setIsTyping(true);
      setTimeout(() => {
        setChatMessages(prev => [...prev, { sender: 'user', text: 'Comprei 10 cotas de MXRF11 por R$ 9.80 cada no banco Inter' }]);
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setChatMessages(prev => [...prev, { 
            sender: 'bot', 
            text: '💰 Investimento capturado! 10 ativos de Renda Variável (MXRF11) a R$ 9,80. Total: R$ 98,00.',
            sub: 'Sovereignty Score: 98/100 (Soberano - Aporte gerador de renda passiva). Recompensa: +15 SibCoins!'
          }]);
        }, 1000);
      }, 400);
    } else if (type === 'voice') {
      setMicRecording(true);
      setTimeout(() => {
        setMicRecording(false);
        setIsTyping(true);
        setChatMessages(prev => [...prev, { sender: 'user', text: '🎙️ Mensagem de Voz (0:04)' }]);
        setTimeout(() => {
          setChatMessages(prev => [...prev, { sender: 'user', text: '"Arquiteto, acabei de almoçar no iFood, deu 82 reais no débito"' }]);
          setIsTyping(true);
          setTimeout(() => {
            setIsTyping(false);
            setChatMessages(prev => [...prev, { 
              sender: 'bot', 
              text: '📉 Despesa registrada! R$ 82,00 categorizada como Alimentação na conta Itaú.',
              sub: 'Sovereignty Score: 78/100 (Saudável - Compra à vista dentro da cota diária de alimentação).'
            }]);
          }, 1000);
        }, 800);
      }, 2500);
    }
  };

  const handleSimulateGPS = () => {
    if (gpsChecking) return;
    setGpsChecking(true);
    setGpsResult(null);
    setTimeout(() => {
      setGpsChecking(false);
      setGpsResult('Localização: Pão de Açúcar Supermercados. Benefício: Use seu cartão Itaú Pão de Açúcar para obter 2 pontos por real nesta compra.');
    }, 2200);
  };

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 font-sans antialiased selection:bg-emerald-500/30 selection:text-white">
      {/* Estilo local para animações e efeitos premium adicionais */}
      <style>{`
        .mesh-glow {
          background: radial-gradient(circle at 50% 50%, rgba(34, 197, 94, 0.08) 0%, rgba(10, 10, 10, 0) 70%);
        }
        .mesh-glow-blue {
          background: radial-gradient(circle at 50% 50%, rgba(14, 165, 233, 0.05) 0%, rgba(10, 10, 10, 0) 70%);
        }
        .card-premium {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .card-premium:hover {
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7);
        }
        .text-gradient {
          background: linear-gradient(180deg, #ffffff 0%, #a1a1aa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .text-glow {
          text-shadow: 0 0 40px rgba(255,255,255,0.15);
        }
        .radar-pulse {
          animation: radar 2s infinite ease-out;
        }
        @keyframes radar {
          0% { transform: scale(0.9); opacity: 1; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        .spin-coin-slow {
          animation: spinCoin 6s infinite linear;
        }
        @keyframes spinCoin {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        .accordion-item {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes tabFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .tab-animate {
          animation: tabFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Grid de fundo de engenharia ultra sutil */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `
            radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.03) 1px, transparent 0),
            linear-gradient(to right, rgba(255, 255, 255, 0.01) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.01) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px, 128px 128px, 128px 128px'
        }}
      />

      {/* Efeitos de Glow Mesh no Background */}
      <div className="absolute top-0 left-1/4 w-[700px] h-[700px] mesh-glow rounded-full pointer-events-none" />
      <div className="absolute top-[35%] right-1/4 w-[750px] h-[750px] mesh-glow-blue rounded-full pointer-events-none" />
      <div className="absolute bottom-20 left-1/3 w-[800px] h-[800px] bg-violet-500/[0.015] rounded-full blur-[150px] pointer-events-none" />

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[#030303]/70 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-white/10 flex items-center justify-center relative group overflow-hidden">
              <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="text-white font-extrabold text-sm tracking-tighter relative z-10">S</span>
            </div>
            <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-zinc-100 select-none">Sibanki</span>
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate('/login')}
              className="text-[11px] font-bold text-zinc-400 hover:text-white uppercase tracking-[0.2em] transition-colors py-2"
            >
              Entrar
            </button>
            <button 
              onClick={() => handleGetStarted(selectedPlan)}
              className="text-[11px] font-bold bg-zinc-100 hover:bg-white text-black uppercase tracking-[0.2em] transition-all px-5 py-3 rounded-xl hover:scale-[1.02] shadow-xl shadow-black/40"
            >
              Começar agora
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ───────────────────────────────────────────────────── */}
      <header className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-24 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.01] text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400 mb-8 select-none">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> SIBANKI FINANCIAL OPERATING SYSTEM (v2.1)
        </div>

        <h1 className="text-5xl sm:text-8xl font-black tracking-tight text-glow leading-[1.02] mb-8 uppercase text-gradient">
          Sua liberdade. <br />
          Sem concessões.
        </h1>

        <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto leading-relaxed tracking-[0.03em] mb-14">
          O Sibanki unifica contas, faturas de cartões e investimentos em uma interface limpa, silenciosa e automatizada via Open Finance. Mapeie seus dias de liberdade e recupere o controle da sua jornada.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
          <button 
            onClick={() => handleGetStarted('pro')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-black text-[11px] font-bold uppercase tracking-[0.2em] transition-all px-7 py-4.5 rounded-xl shadow-2xl hover:scale-[1.02]"
          >
            Iniciar degustação de 30 dias <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => {
              const el = document.getElementById('demo');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full sm:w-auto bg-[#0a0a0a] hover:bg-zinc-900 border border-white/10 text-zinc-300 text-[11px] font-bold uppercase tracking-[0.2em] transition-colors px-7 py-4.5 rounded-xl"
          >
            Ver demonstração
          </button>
        </div>
      </header>

      {/* ── Métricas e Conceitos ────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-28 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Ld */}
          <div className="card-premium rounded-3xl p-8 transition-all duration-300 flex flex-col justify-between min-h-[16rem]">
            <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-center mb-6">
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-[11px] font-bold text-white uppercase tracking-[0.25em] mb-3">Dias de Liberdade (Ld)</h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                A única métrica que importa. O Sibanki calcula quantos dias seu patrimônio líquido cobriria seus custos habituais caso sua fonte de renda ativa cessasse hoje.
              </p>
            </div>
          </div>

          {/* Sg */}
          <div className="card-premium rounded-3xl p-8 transition-all duration-300 flex flex-col justify-between min-h-[16rem]">
            <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-center mb-6">
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-[11px] font-bold text-white uppercase tracking-[0.25em] mb-3">Spread Gap (Sg)</h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Evite perdas financeiras invisíveis. Comparamos as taxas de juros de suas dívidas e faturas parceladas com a liquidez de seus rendimentos e investimentos ativos.
              </p>
            </div>
          </div>

          {/* Sv */}
          <div className="card-premium rounded-3xl p-8 transition-all duration-300 flex flex-col justify-between min-h-[16rem]">
            <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-center mb-6">
              <Zap className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h3 className="text-[11px] font-bold text-white uppercase tracking-[0.25em] mb-3">Sovereignty Score (Sv)</h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Análise comportamental. Um motor matemático avalia a qualidade estrutural de cada despesa, pontuando transações com base no impacto na sua liberdade.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Simulador Interativo do Sistema ─────────────────────────────────── */}
      <section id="demo" className="border-t border-white/[0.04] bg-black/30 py-32 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-xs font-bold text-zinc-500 tracking-[0.3em] uppercase mb-4">Experiência Interativa</h2>
            <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase leading-tight">
              Navegue pelo Cockpit Real
            </h3>
            <p className="text-xs text-zinc-400 mt-2 max-w-xl mx-auto">
              Simule a interface que você usará no dia a dia. Alterne entre as sub-abas abaixo para ver a reatividade do painel.
            </p>
          </div>

          {/* Cockpit Interativo */}
          <div className="max-w-4xl mx-auto bg-[#0a0a0a] border border-white/[0.06] rounded-3xl p-6 sm:p-10 shadow-2xl relative">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            
            {/* Sub-navegação do cockpit */}
            <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.04] pb-4 mb-8">
              {([
                { id: 'visao', label: 'Visão geral', icon: Layers },
                { id: 'tx', label: 'Transações', icon: ArrowLeftRight },
                { id: 'sub', label: 'Assinaturas', icon: Tv },
                { id: 'card', label: 'Cartões & GPS', icon: CreditCard }
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveMockTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors ${
                    activeMockTab === tab.id
                      ? 'bg-zinc-100 text-black shadow-lg shadow-black/10'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Conteúdo dinâmico simulado com animações */}
            <div key={activeMockTab} className="tab-animate">
              {activeMockTab === 'visao' && (
                <div className="space-y-6">
                  {/* Grid de KPIs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-[#111]/40 border border-white/[0.04] p-5 rounded-2xl">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2">Dias de Liberdade</p>
                      <p className="text-3xl font-black text-emerald-400 leading-none mb-1">182 <span className="text-xs font-bold text-zinc-500 uppercase">dias</span></p>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded">Soberano</span>
                    </div>
                    <div className="bg-[#111]/40 border border-white/[0.04] p-5 rounded-2xl">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2">Spread Gap</p>
                      <p className="text-3xl font-black text-blue-400 leading-none mb-1">+2.45% <span className="text-xs font-bold text-zinc-500 uppercase">a.m.</span></p>
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded">Zona Saudável</span>
                    </div>
                    <div className="bg-[#111]/40 border border-white/[0.04] p-5 rounded-2xl">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2">Score Soberano</p>
                      <p className="text-3xl font-black text-white leading-none mb-1">84 <span className="text-xs font-bold text-zinc-500 uppercase">pts</span></p>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-800 px-2 py-0.5 rounded">Autonomia Alta</span>
                    </div>
                  </div>

                  {/* Evolução de Patrimônio */}
                  <div className="bg-[#111]/20 border border-white/[0.04] rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Fluxo de Patrimônio (Evolução)</span>
                      <span className="text-[11px] text-zinc-400 font-semibold tracking-wider">Últimos 6 meses</span>
                    </div>
                    <div className="h-32 flex items-end justify-between gap-4 pt-4 border-b border-white/5 relative">
                      <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-white/5 pointer-events-none" />
                      <div className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                        <div className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border-t border-emerald-500/30 rounded-t h-16 transition-all duration-300 flex items-end justify-center" />
                        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">Dez</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                        <div className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border-t border-emerald-500/30 rounded-t h-20 transition-all duration-300 flex items-end justify-center" />
                        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">Jan</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                        <div className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border-t border-emerald-500/30 rounded-t h-24 transition-all duration-300 flex items-end justify-center" />
                        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">Fev</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                        <div className="w-full bg-[#111] hover:bg-zinc-800 border-t border-zinc-700 rounded-t h-12 transition-all duration-300 flex items-end justify-center" />
                        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">Mar</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                        <div className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 border-t border-emerald-500/40 rounded-t h-28 transition-all duration-300 flex items-end justify-center" />
                        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">Abr</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                        <div className="w-full bg-emerald-500/30 hover:bg-emerald-500/40 border-t border-emerald-500/50 rounded-t h-32 transition-all duration-300 flex items-end justify-center" />
                        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">Mai</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeMockTab === 'tx' && (
                <div className="space-y-4">
                  <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Lançamentos Recentes com Sv Score</p>
                  <div className="divide-y divide-white/[0.04] border border-white/5 rounded-2xl bg-[#111]/10 overflow-hidden">
                    {/* Netflix */}
                    <div className="flex items-center justify-between gap-4 p-4 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#E50914] flex items-center justify-center shrink-0">
                          <img src="https://cdn.simpleicons.org/netflix/fff" alt="" className="w-4 h-4 object-contain" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">Netflix</p>
                          <p className="text-[11px] text-zinc-500">28 Mai · Assinaturas · Nubank</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-3">
                        <span className="text-xs font-bold text-rose-400">- R$ 55,90</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">92 Sv</span>
                      </div>
                    </div>

                    {/* iFood */}
                    <div className="flex items-center justify-between gap-4 p-4 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#EA1D2C] flex items-center justify-center shrink-0">
                          <img src="https://cdn.simpleicons.org/ifood/fff" alt="" className="w-4 h-4 object-contain" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">iFood Delivery</p>
                          <p className="text-[11px] text-zinc-500">28 Mai · Alimentação · Itaú Crédito</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-3">
                        <span className="text-xs font-bold text-rose-400">- R$ 82,00</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400">54 Sv</span>
                      </div>
                    </div>

                    {/* Uber */}
                    <div className="flex items-center justify-between gap-4 p-4 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#000000] border border-white/10 flex items-center justify-center shrink-0">
                          <img src="https://cdn.simpleicons.org/uber/fff" alt="" className="w-4 h-4 object-contain" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">Uber Trip</p>
                          <p className="text-[11px] text-zinc-500">27 Mai · Transporte · Nubank</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-3">
                        <span className="text-xs font-bold text-rose-400">- R$ 24,90</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">88 Sv</span>
                      </div>
                    </div>

                    {/* Airbnb */}
                    <div className="flex items-center justify-between gap-4 p-4 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#FF5A5F] flex items-center justify-center shrink-0">
                          <img src="https://cdn.simpleicons.org/airbnb/fff" alt="" className="w-4 h-4 object-contain" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">Hospedagem Airbnb</p>
                          <p className="text-[11px] text-zinc-500">24 Mai · Viagens · Inter (Parcelado 1/3)</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-3">
                        <span className="text-xs font-bold text-rose-400">- R$ 450,00</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400">32 Sv</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeMockTab === 'sub' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-violet-500/[0.03] border border-violet-500/10 rounded-2xl p-4">
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total de Assinaturas Mapeadas</p>
                      <p className="text-lg font-black text-white">R$ 139,80/mês</p>
                    </div>
                    <span className="px-2 py-1 bg-violet-500/10 border border-violet-500/20 rounded-lg text-[10px] font-bold text-violet-400 uppercase tracking-widest">3 Serviços Ativos</span>
                  </div>

                  {/* Vazamento invisível Alerta */}
                  <div className="bg-rose-500/10 border border-rose-500/25 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
                      <AlertCircle className="w-4 h-4" />
                      <span>ALERTA: POTENCIAL VAZAMENTO INVISÍVEL</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Detectamos que você possui a assinatura <strong className="text-white">Amazon Prime</strong> ativa, mas não registrou movimentações na categoria nos últimos 60 dias. Verifique se esqueceu de cancelar.
                    </p>
                  </div>

                  {/* Detalhes de Assinaturas */}
                  <div className="divide-y divide-white/[0.04] border border-white/5 rounded-2xl bg-[#111]/10 overflow-hidden">
                    <div className="flex justify-between p-4">
                      <div>
                        <p className="text-xs font-bold text-white">Spotify Premium</p>
                        <p className="text-[11px] text-zinc-500">Todo dia 10 · Freq: Mensal</p>
                      </div>
                      <span className="text-xs font-bold text-zinc-300">R$ 24,90</span>
                    </div>
                    <div className="flex justify-between p-4">
                      <div>
                        <p className="text-xs font-bold text-white">Netflix Premium</p>
                        <p className="text-[11px] text-zinc-500">Todo dia 15 · Freq: Mensal</p>
                      </div>
                      <span className="text-xs font-bold text-zinc-300">R$ 55,90</span>
                    </div>
                    <div className="flex justify-between p-4">
                      <div>
                        <p className="text-xs font-bold text-white">Wellhub (Gympass)</p>
                        <p className="text-[11px] text-zinc-500">Todo dia 28 · Freq: Mensal</p>
                      </div>
                      <span className="text-xs font-bold text-zinc-300">R$ 59,00</span>
                    </div>
                  </div>
                </div>
              )}

              {activeMockTab === 'card' && (
                <div className="space-y-6">
                  {/* Cartões de crédito mock */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-[#111]/30 border border-white/5 p-4 rounded-2xl space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-white">Cartão Nubank</span>
                        <span className="font-semibold text-zinc-400">R$ 1.820 de R$ 5.000</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: '36%' }} />
                      </div>
                    </div>
                    <div className="bg-[#111]/30 border border-white/5 p-4 rounded-2xl space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-white">Cartão XP Visa Infinite</span>
                        <span className="font-semibold text-zinc-400">R$ 8.900 de R$ 15.000</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: '59%' }} />
                      </div>
                    </div>
                  </div>

                  {/* Sentinela GPS Interactive */}
                  <div className="border border-white/5 bg-[#111]/10 rounded-2xl p-5 relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-cyan-400" />
                        <span className="text-[11px] font-bold text-white uppercase tracking-wider">Sentinela GPS Simulado</span>
                      </div>
                      <button
                        onClick={handleSimulateGPS}
                        disabled={gpsChecking}
                        className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/25 hover:bg-cyan-500/20 text-cyan-300 text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 relative overflow-hidden"
                      >
                        {gpsChecking ? 'Escaneando...' : 'Verificar Localização'}
                      </button>
                    </div>

                    {gpsChecking && (
                      <div className="mt-6 flex justify-center items-center py-6">
                        <div className="relative w-16 h-16 rounded-full border border-cyan-500/20 flex items-center justify-center">
                          <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30 radar-pulse" />
                          <Navigation className="w-6 h-6 text-cyan-400 animate-pulse" />
                        </div>
                      </div>
                    )}

                    {gpsResult && !gpsChecking && (
                      <div className="mt-4 p-3 bg-cyan-950/20 border border-cyan-500/30 rounded-xl text-xs text-cyan-200 leading-relaxed tab-animate">
                        {gpsResult}
                      </div>
                    )}

                    {!gpsResult && !gpsChecking && (
                      <p className="text-[11px] text-zinc-500 mt-3">
                        Pressione o botão para simular a chegada a um estabelecimento e ver o Sentinela recomendar o melhor cartão da sua carteira.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/[0.04] pt-4 mt-8 text-[11px] text-zinc-500">
              <span>Preview funcional interativo</span>
              <button onClick={() => handleGetStarted('pro')} className="text-emerald-400 hover:underline">Experimentar na minha conta real →</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Seção de Simuladores Interativos (Ld + WhatsApp) ──────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-32 relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-xs font-bold text-zinc-500 tracking-[0.3em] uppercase mb-4">Simulação em Tempo Real</h2>
          <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase leading-tight">
            Interaja com as nossas ferramentas.
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* Ld Calculator */}
          <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div>
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-[11px] font-bold text-white uppercase tracking-[0.25em]">Calculadora de Liberdade</h3>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-wider">Métrica Ld</span>
              </div>

              <p className="text-xs text-zinc-400 mb-8 leading-relaxed">
                Descubra qual a sua classe de soberania ajustando os valores do simulador.
              </p>

              {/* Slider Patrimonio */}
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                  <span className="text-zinc-500">Patrimônio Líquido</span>
                  <span className="text-white">R$ {patrimonio.toLocaleString('pt-BR')}</span>
                </div>
                <input 
                  type="range" 
                  min="5000" 
                  max="1000000" 
                  step="5000"
                  value={patrimonio}
                  onChange={(e) => setPatrimonio(Number(e.target.value))}
                  className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Slider Custo de Vida */}
              <div className="space-y-4 mb-10">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                  <span className="text-zinc-500">Custo de Vida Mensal</span>
                  <span className="text-white">R$ {custoVida.toLocaleString('pt-BR')}</span>
                </div>
                <input 
                  type="range" 
                  min="1000" 
                  max="30000" 
                  step="500"
                  value={custoVida}
                  onChange={(e) => setCustoVida(Number(e.target.value))}
                  className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>

            {/* Output */}
            <div className={`border rounded-2xl p-6 transition-all duration-300 ${ldResult.tier.bg} ${ldResult.tier.border}`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Resultado do Ld</span>
                <span className={`text-[11px] font-bold uppercase tracking-widest ${ldResult.tier.color}`}>
                  {ldResult.tier.label}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className={`text-5xl font-black tracking-tight leading-none ${ldResult.tier.color}`}>
                  {ldResult.days > 9999 ? '∞' : ldResult.days}
                </span>
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">dias de cobertura</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {ldResult.tier.desc}
              </p>
            </div>
          </div>

          {/* WhatsApp Simulator */}
          <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[11px] font-bold text-white uppercase tracking-[0.25em]">Simulador de Integração</h3>
                <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded uppercase tracking-wider">WhatsApp & Telegram</span>
              </div>

              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                Envie mensagens de teste ou simule um **áudio de voz** para ver o assistente processar e catalogar em tempo real.
              </p>

              {/* Chat View */}
              <div className="border border-white/5 bg-[#050505] rounded-2xl p-5 min-h-[19rem] flex flex-col justify-between mb-6">
                <div className="space-y-4 overflow-y-auto max-h-[16rem] pr-1">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col tab-animate ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                        msg.sender === 'user' 
                          ? 'bg-zinc-100 text-black rounded-tr-none font-medium' 
                          : 'bg-[#111] border border-white/5 text-zinc-200 rounded-tl-none'
                      }`}>
                        {msg.text}
                        {msg.sub && (
                          <div className="mt-2.5 text-[11px] font-semibold text-emerald-400 border-t border-white/5 pt-1.5">
                            {msg.sub}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex items-center gap-1.5 pl-2 text-zinc-600">
                      <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  )}
                  {micRecording && (
                    <div className="flex items-center gap-2 pl-2 text-rose-500 bg-rose-500/5 border border-rose-500/10 rounded-xl px-3 py-2 animate-pulse w-fit">
                      <Mic className="w-3.5 h-3.5 text-rose-500" />
                      <span className="text-[11px] font-bold uppercase tracking-wider">Escaner de Voz Ativo...</span>
                      <div className="flex gap-0.5">
                        <span className="w-1 h-3 bg-rose-500 rounded-full" />
                        <span className="w-1 h-4 bg-rose-500 rounded-full" />
                        <span className="w-1 h-2 bg-rose-500 rounded-full" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Chat CTAs */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">Simule um envio de texto ou áudio</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button 
                  onClick={() => triggerChatSimulation('happy')}
                  disabled={isTyping || micRecording}
                  className="p-3.5 border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] text-left rounded-xl transition-colors disabled:opacity-50"
                >
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Gasto Simples</span>
                  <span className="text-[11px] text-zinc-300 font-medium leading-normal block">"Gastei R$ 75 de Uber..."</span>
                </button>
                <button 
                  onClick={() => triggerChatSimulation('investment')}
                  disabled={isTyping || micRecording}
                  className="p-3.5 border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] text-left rounded-xl transition-colors disabled:opacity-50"
                >
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Investimento</span>
                  <span className="text-[11px] text-zinc-300 font-medium leading-normal block">"Comprei 10 cotas MXRF..."</span>
                </button>
                <button 
                  onClick={() => triggerChatSimulation('voice')}
                  disabled={isTyping || micRecording}
                  className="p-3.5 border border-rose-500/10 bg-rose-500/[0.02] hover:bg-rose-500/[0.04] text-left rounded-xl transition-colors disabled:opacity-50 flex flex-col justify-between"
                >
                  <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block mb-1 flex items-center gap-1">
                    <Mic className="w-3 h-3 text-rose-500 animate-pulse" /> Simular Áudio
                  </span>
                  <span className="text-[11px] text-zinc-300 font-medium leading-normal block">"Falar despesa iFood no débito"</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Bento Grid de Recursos ─────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-xs font-bold text-zinc-500 tracking-[0.3em] uppercase mb-4">Recursos do Ecossistema</h2>
          <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase leading-tight">
            Infraestrutura de Automação
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          {/* Card Grande: Open Finance e Segurança */}
          <div className="md:col-span-7 card-premium rounded-3xl p-8 flex flex-col justify-between min-h-[22rem]">
            <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-center mb-6">
              <Lock className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 px-2.5 py-0.5 rounded text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-4">Leitura Protegida (Read-Only)</div>
              <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-2">Open Finance Sem Complicações</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                O Sibanki sincroniza seus saldos de faturas e contas em segundo plano via infraestrutura regulada pelo Banco Central. Segurança em conformidade com a LGPD: nós nunca pedimos permissão de escrita ou transações. É um espelho inteligente para sua soberania.
              </p>
            </div>
            <div className="flex gap-4 border-t border-white/5 pt-4 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
              <span>✓ Criptografia AES-256</span>
              <span>✓ Parceria com a Pluggy</span>
            </div>
          </div>

          {/* Card Médio 1: Gamificação e SibCoins */}
          <div className="md:col-span-5 card-premium rounded-3xl p-8 flex flex-col justify-between min-h-[22rem]">
            <div className="flex justify-between items-start mb-6">
              <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-center">
                <Award className="w-5 h-5 text-amber-400" />
              </div>
              {/* Moeda 3D simulada rotacionando */}
              <div className="w-12 h-12 rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-yellow-600/30 flex items-center justify-center font-black text-amber-300 shadow-lg shadow-black/10 spin-coin-slow text-sm">
                $
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-2">Recompensas com SibCoins</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Receba moedas reais do aplicativo ao catalogar seus gastos corretos, realizar aportes de investimentos ou fechar o mês com saldo positivo. Troque por descontos na assinatura ou prêmios.
              </p>
              <div className="bg-[#111] border border-white/5 px-4 py-2.5 rounded-xl flex justify-between items-center text-xs">
                <span className="text-zinc-500">Seu Saldo Acumulado:</span>
                <span className="font-bold text-amber-300 font-mono">{sibcoinCount} SibCoins</span>
              </div>
            </div>
          </div>

          {/* Card Médio 2: Muralha de Liquidez */}
          <div className="md:col-span-5 card-premium rounded-3xl p-8 flex flex-col justify-between min-h-[20rem]">
            <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-center mb-6">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-2">Muralha de Liquidez</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Proteja-se contra a exposição. Comparamos suas reservas líquidas de curtíssimo prazo contra todas as contas e compromissos cadastrados para os próximos 30 dias.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] text-zinc-400">
                  <span>Reservas Líquidas</span>
                  <span className="text-emerald-400 font-bold">R$ 45.000</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: '75%' }} />
                </div>
                <div className="flex justify-between text-[11px] text-zinc-400 pt-1">
                  <span>Passivo 30 dias</span>
                  <span className="text-rose-400 font-bold">R$ 12.000</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500" style={{ width: '25%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Card Grande 2: White Label Multi-tenant */}
          <div className="md:col-span-7 card-premium rounded-3xl p-8 flex flex-col justify-between min-h-[20rem]">
            <div className="flex justify-between items-start mb-6">
              <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-purple-400" />
              </div>
              {/* Botão de simular troca de logo */}
              <button 
                onClick={() => setLogoTheme(prev => prev === 'virtus' ? 'alfa' : 'virtus')}
                className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[10px] font-bold rounded-lg uppercase tracking-wider hover:bg-purple-500/20"
              >
                Alternar Branding
              </button>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-2">Branding Multi-tenant para Consultores</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                É consultor financeiro ou assessor? Ofereça o Sibanki personalizado para os seus assessorados com sua própria marca, cores, relatórios consolidados e canal de suporte exclusivo. 
              </p>
              
              <div className="border border-white/5 bg-[#050505] rounded-xl p-4 flex justify-between items-center text-xs">
                <span className="text-zinc-500">Logo Ativa:</span>
                <span className="font-bold text-white tracking-widest uppercase bg-white/[0.02] border border-white/10 px-3 py-1 rounded">
                  {logoTheme === 'virtus' ? '💠 Virtus Financeiro' : '🔥 Consultoria Alfa'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Depoimentos (Prova Social) ──────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24 relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-xs font-bold text-zinc-500 tracking-[0.3em] uppercase mb-4">Depoimentos</h2>
          <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase leading-tight">
            Quem usa, recupera o controle.
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Depoimento 1 */}
          <div className="card-premium rounded-3xl p-8 flex flex-col justify-between space-y-6">
            <div className="flex text-amber-400 gap-0.5">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed italic">
              "Recuperei R$ 340 de assinaturas fantasmas no primeiro mês usando o painel de Assinaturas e o alerta de Vazamento Invisível. O aplicativo se pagou sozinho por mais de um ano."
            </p>
            <div className="flex items-center gap-3 border-t border-white/5 pt-4">
              <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold">
                TC
              </div>
              <div>
                <p className="text-xs font-bold text-white">Thiago Castilho</p>
                <p className="text-[11px] text-zinc-500">Ld atual: 198 dias · Soberano</p>
              </div>
            </div>
          </div>

          {/* Depoimento 2 */}
          <div className="card-premium rounded-3xl p-8 flex flex-col justify-between space-y-6">
            <div className="flex text-amber-400 gap-0.5">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed italic">
              "O indicador de Spread Gap abriu meus olhos. Vi que o parcelamento de uma compra me custava mais caro do que deixar o dinheiro rendendo no banco. Decidi amortizar e a tranquilidade é indescritível."
            </p>
            <div className="flex items-center gap-3 border-t border-white/5 pt-4">
              <div className="w-9 h-9 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-bold">
                MP
              </div>
              <div>
                <p className="text-xs font-bold text-white">Mariana Pires</p>
                <p className="text-[11px] text-zinc-500">Ld atual: 280 dias · Soberano</p>
              </div>
            </div>
          </div>

          {/* Depoimento 3 */}
          <div className="card-premium rounded-3xl p-8 flex flex-col justify-between space-y-6">
            <div className="flex text-amber-400 gap-0.5">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed italic">
              "O bot do WhatsApp é maravilhoso. Não tenho saco para planilhas. Eu só gravo áudios no meio da correria do trabalho e quando chego em casa à noite o painel de controle está todo atualizado."
            </p>
            <div className="flex items-center gap-3 border-t border-white/5 pt-4">
              <div className="w-9 h-9 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 text-xs font-bold">
                RS
              </div>
              <div>
                <p className="text-xs font-bold text-white">Rodrigo Soares</p>
                <p className="text-[11px] text-zinc-500">Ld atual: 410 dias · Inabalável</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Planos (Pricing) ────────────────────────────────────────────────── */}
      <section id="pricing" className="bg-[#050505] border-t border-white/[0.04] py-32 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-20">
            <h2 className="text-xs font-bold text-zinc-500 tracking-[0.3em] uppercase mb-4">Tabela de Preços</h2>
            <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase leading-tight">
              Comece gratuito. Mude quando precisar.
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {Object.entries(PLANS).map(([key, plan]) => {
              const isSelected = selectedPlan === key;
              return (
                <div 
                  key={key}
                  onClick={() => handleSelectPlan(key as 'free' | 'pro' | 'familia')}
                  className={`cursor-pointer bg-[#0a0a0a] border rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 relative ${
                    isSelected 
                      ? 'border-emerald-500/40 shadow-[0_0_50px_rgba(34,197,94,0.03)] scale-[1.02]' 
                      : 'border-white/5 hover:border-white/10 hover:scale-[1.01]'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
                  )}
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <h3 className="text-xs font-bold text-white uppercase tracking-widest">{plan.name}</h3>
                      {key === 'pro' && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Mais Popular</span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-3xl font-black text-white tracking-tight">{plan.price}</span>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed mb-6">{plan.desc}</p>
                    
                    <div className="h-px bg-white/5 mb-6" />

                    <ul className="space-y-4 mb-8">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-400">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGetStarted(key);
                    }}
                    className={`w-full py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                      isSelected 
                        ? 'bg-zinc-100 text-black hover:bg-white shadow-xl shadow-black/30' 
                        : 'bg-white/[0.01] border border-white/10 text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    Começar
                  </button>
                </div>
              );
            })}
          </div>

          {/* Banner de informações do plano */}
          <div className="max-w-3xl mx-auto bg-white/[0.01] border border-white/[0.04] rounded-2xl p-5 text-center">
            <p className="text-xs text-zinc-400 font-medium">
              <span className="font-bold text-white uppercase tracking-wider">Período de Testes: </span>
              {PLANS[selectedPlan].note}
            </p>
          </div>
        </div>
      </section>

      {/* ── Seção de FAQ (Sanfona Interativa) ────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-24 relative z-10 border-t border-white/[0.04]">
        <div className="text-center mb-16">
          <h2 className="text-xs font-bold text-zinc-500 tracking-[0.3em] uppercase mb-4">Perguntas Frequentes</h2>
          <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase leading-tight">
            Respostas Transparentes
          </h3>
          <p className="text-xs text-zinc-400 mt-2">
            Resolvemos todas as suas dúvidas sobre segurança, privacidade e usabilidade.
          </p>
        </div>

        <div className="space-y-4">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = faqOpenIndex === idx;
            return (
              <div 
                key={idx} 
                className="border border-white/5 bg-[#0a0a0a] rounded-2xl overflow-hidden accordion-item"
              >
                <button
                  type="button"
                  onClick={() => setFaqOpenIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between gap-4 p-5 sm:p-6 text-left focus:outline-none"
                >
                  <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide leading-tight">
                    {item.q}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform duration-300 ${
                    isOpen ? 'rotate-180 text-white' : ''
                  }`} />
                </button>
                
                {/* Expansão com transição de altura */}
                <div 
                  className={`transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-56 border-t border-white/5 p-5 sm:p-6 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
                  }`}
                >
                  <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                    {item.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] py-16 bg-black/60 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-md bg-white/[0.01] border border-white/10 flex items-center justify-center">
              <span className="text-white font-extrabold text-xs tracking-tighter">S</span>
            </div>
            <span className="text-xs font-black tracking-widest uppercase text-zinc-500">Sibanki</span>
          </div>

          <p className="text-[10px] text-zinc-600 uppercase tracking-widest text-center">
            &copy; {new Date().getFullYear()} Sibanki OS. Todos os direitos reservados.
          </p>

          <div className="flex items-center gap-4 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-zinc-500" /> Criptografia de Nível Militar</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
