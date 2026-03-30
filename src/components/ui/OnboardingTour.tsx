import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface TourStep {
  emoji: string;
  title: string;
  description: string;
  path?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    emoji: '👋',
    title: 'Bem-vindo ao Sibanki!',
    description:
      'Seu app completo de finanças pessoais. Em poucos passos você vai conhecer tudo o que está disponível para organizar sua vida financeira.',
  },
  {
    emoji: '📊',
    title: 'Dashboard',
    description:
      'Visão consolidada do seu mês: receitas, despesas, saldo e evolução dos últimos 6 meses — tudo em um único lugar.',
    path: '/',
  },
  {
    emoji: '🏦',
    title: 'Contas',
    description:
      'Cadastre suas contas bancárias (corrente, poupança, digital) e acompanhe o saldo de cada uma separadamente.',
    path: '/contas',
  },
  {
    emoji: '💳',
    title: 'Cartões de Crédito',
    description:
      'Registre seus cartões com limite, bandeira e data de vencimento. Controle os gastos antes da fatura fechar.',
    path: '/cartoes',
  },
  {
    emoji: '📝',
    title: 'Lançamentos',
    description:
      'Registre receitas e despesas com data, categoria e conta. Use o botão "Novo lançamento" no dashboard ou acesse aqui.',
    path: '/lancamentos',
  },
  {
    emoji: '🔁',
    title: 'Lançamentos Recorrentes',
    description:
      'Cadastre contas fixas mensais como aluguel, streaming, academia e salário. O app lembra automaticamente.',
    path: '/recorrentes',
  },
  {
    emoji: '🎯',
    title: 'Metas Financeiras',
    description:
      'Crie metas com valor alvo e prazo (reserva de emergência, viagem, bem). Acompanhe o progresso com barra visual.',
    path: '/planejamento',
  },
  {
    emoji: '📐',
    title: 'Orçamento por Categoria',
    description:
      'Defina limites mensais por categoria (alimentação, lazer, transporte). O dashboard alerta quando você estourar.',
    path: '/orcamento',
  },
  {
    emoji: '📈',
    title: 'Investimentos',
    description:
      'Registre renda fixa, ações, FIIs e cripto. Consulte cotações B3 em tempo real, calcule juros compostos e defina seu perfil de investidor.',
    path: '/crescimento',
  },
  {
    emoji: '🤖',
    title: 'Consultor IA',
    description:
      'Análise inteligente das suas finanças com sugestões personalizadas. Pergunte qualquer coisa: "quanto gastei esse mês?", "como melhorar meu score?"',
    path: '/consultor-ia',
  },
  {
    emoji: '📚',
    title: 'Educação Financeira',
    description:
      'Conteúdos e dicas para evoluir sua relação com dinheiro — de iniciante a investidor.',
    path: '/educacao',
  },
  {
    emoji: '🏪',
    title: 'Soluções Financeiras',
    description:
      'Compare e contrate crédito, consórcio, seguro e investimentos de parceiros — tudo dentro do app.',
    path: '/solucoes/credito',
  },
  {
    emoji: '⚙️',
    title: 'Configurações',
    description:
      'Faça backup dos seus dados em JSON, importe lançamentos via CSV, gere relatório PDF e escolha entre tema claro e escuro.',
    path: '/configuracoes',
  },
  {
    emoji: '🚀',
    title: 'Pronto para começar!',
    description:
      'Recomendamos: cadastre suas contas em "Contas", defina saldos iniciais e faça seu primeiro lançamento. Qualquer dúvida, o Consultor IA está aqui para ajudar.',
  },
];

const STORAGE_KEY = 'sibanki_tour_done';

interface OnboardingTourProps {
  onComplete?: () => void;
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      // Pequeno delay para o app terminar de montar
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const total = TOUR_STEPS.length;
  const current = TOUR_STEPS[step];
  const pct = Math.round(((step + 1) / total) * 100);

  const close = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
    onComplete?.();
  };

  const next = () => {
    if (step < total - 1) {
      setStep((s) => s + 1);
    } else {
      close();
    }
  };

  const prev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Tour de apresentação do Sibanki"
    >
      <div className="relative w-full max-w-sm mx-4 bg-si-card border border-si-border-md rounded-2xl shadow-2xl overflow-hidden">
        {/* Barra de progresso */}
        <div className="h-1 bg-si-over-2">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 pt-4 pb-0">
          <span className="text-xs text-si-5 font-medium">
            {step + 1} de {total}
          </span>
          <button
            type="button"
            onClick={close}
            className="p-1.5 rounded-lg hover:bg-si-over-3 text-si-4 hover:text-si-2 transition-colors"
            aria-label="Fechar tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="px-5 pt-5 pb-6 text-center min-h-[220px] flex flex-col items-center justify-center">
          <div className="text-5xl mb-4 leading-none" role="img" aria-hidden="true">
            {current.emoji}
          </div>
          <h2 className="text-lg font-bold text-si-1 mb-2">{current.title}</h2>
          <p className="text-sm text-si-4 leading-relaxed">{current.description}</p>
        </div>

        {/* Botões */}
        <div className="flex items-center gap-3 px-5 pb-5">
          <button
            type="button"
            onClick={prev}
            disabled={step === 0}
            className="p-2.5 rounded-xl bg-si-over-2 hover:bg-si-over-3 border border-si-border-md text-si-4 disabled:opacity-30 transition-colors"
            aria-label="Passo anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={next}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-si-1 font-bold text-sm transition-colors"
          >
            {step === total - 1 ? '🚀 Começar!' : 'Próximo'}
          </button>

          <button
            type="button"
            onClick={next}
            disabled={step === total - 1}
            className="p-2.5 rounded-xl bg-si-over-2 hover:bg-si-over-3 border border-si-border-md text-si-4 disabled:opacity-30 transition-colors"
            aria-label="Próximo passo"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Link pular */}
        <div className="text-center pb-4">
          <button
            type="button"
            onClick={close}
            className="text-xs text-si-5 hover:text-si-3 transition-colors"
          >
            Pular tour
          </button>
        </div>
      </div>
    </div>
  );
}
