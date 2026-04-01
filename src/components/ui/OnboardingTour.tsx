import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TourStep {
  emoji: string;
  title: string;
  description: string;
  path?: string;
  /** CTA opcional: leva ao fluxo principal (ex.: Open Finance em Configurações). */
  ctaLabel?: string;
  ctaPath?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    emoji: '👋',
    title: 'Bem-vindo ao Sibanki!',
    description:
      'Vamos começar pelo que mais economiza tempo: conectar suas contas com segurança. Você também pode usar tudo manualmente — mas a conexão oficial deixa o app mais automático.',
  },
  {
    emoji: '🔗',
    title: 'Open Finance — seu atalho para menos planilha',
    description:
      'Conecte bancos e cartões pelo Open Finance (regulado pelo Banco Central). Você autoriza no ambiente do seu banco: o Sibanki não pede senha de acesso e não movimenta seu dinheiro — só lê para organizar e gerar insights.',
    path: '/configuracoes',
    ctaLabel: 'Abrir Configurações (conexão)',
    ctaPath: '/configuracoes#open-finance',
  },
  {
    emoji: '📊',
    title: 'Dashboard',
    description:
      'Visão do mês: receitas, despesas, saldo e tendências. Quando a conexão estiver ativa, a leitura fica ainda mais fiel ao que acontece nas suas contas.',
    path: '/',
  },
  {
    emoji: '🏦',
    title: 'Contas',
    description:
      'Cadastre contas manualmente ou acompanhe as que vierem pela conexão. Saldo e movimentação no mesmo lugar.',
    path: '/contas',
  },
  {
    emoji: '💳',
    title: 'Cartões de Crédito',
    description:
      'Limite, vencimento e gastos antes da fatura fechar — para você não ser pego de surpresa.',
    path: '/cartoes',
  },
  {
    emoji: '📝',
    title: 'Lançamentos',
    description:
      'Registre receitas e despesas com data e categoria. Pelo app, WhatsApp ou Telegram — como preferir.',
    path: '/lancamentos',
  },
  {
    emoji: '🔁',
    title: 'Lançamentos Recorrentes',
    description:
      'Contas fixas (aluguel, streaming, academia, salário) para o mês se planejar sozinho.',
    path: '/recorrentes',
  },
  {
    emoji: '🎯',
    title: 'Metas Financeiras',
    description:
      'Reserva, viagem, troca de carro: metas com prazo e progresso visível.',
    path: '/planejamento',
  },
  {
    emoji: '📐',
    title: 'Orçamento por Categoria',
    description:
      'Limites por grupo de gasto. O dashboard avisa quando o ritmo passa do planejado.',
    path: '/orcamento',
  },
  {
    emoji: '📈',
    title: 'Investimentos',
    description:
      'Renda fixa, ações, FIIs e mais — com contexto do que você já registrou no app.',
    path: '/crescimento',
  },
  {
    emoji: '🤖',
    title: 'Consultor IA',
    description:
      'Pergunte em linguagem natural: “quanto gastei?”, “o que cortar primeiro?” — com base nos seus dados.',
    path: '/consultor-ia',
  },
  {
    emoji: '📚',
    title: 'Educação Financeira',
    description:
      'Conteúdos e dicas para evoluir da organização à decisão com mais confiança.',
    path: '/educacao',
  },
  {
    emoji: '🏪',
    title: 'Soluções Financeiras',
    description:
      'Crédito, consórcio, seguro e investimentos de parceiros — quando fizer sentido para você.',
    path: '/solucoes/credito',
  },
  {
    emoji: '⚙️',
    title: 'Configurações',
    description:
      'Backup, importação, relatórios, tema e integrações — tudo que mantém sua rotina segura e portátil.',
    path: '/configuracoes',
  },
  {
    emoji: '🚀',
    title: 'Pronto para começar!',
    description:
      'Recomendação: abra Configurações e conecte o Open Finance no app web (atalho na mesma tela). Depois, faça um primeiro lançamento ou peça um resumo ao Consultor IA.',
  },
];

const STORAGE_KEY = 'sibanki_tour_done';

interface OnboardingTourProps {
  onComplete?: () => void;
}

function navigateToPath(navigate: ReturnType<typeof useNavigate>, pathStr: string) {
  const i = pathStr.indexOf('#');
  const pathname = i >= 0 ? pathStr.slice(0, i) : pathStr;
  const hash = i >= 0 ? pathStr.slice(i) : '';
  navigate({ pathname: pathname || '/', hash: hash || undefined });
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
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

  const handleCta = () => {
    if (!current.ctaPath) return;
    navigateToPath(navigate, current.ctaPath);
    close();
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
        <div className="h-1 bg-si-over-2">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

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

        <div className="px-5 pt-5 pb-4 text-center min-h-[220px] flex flex-col items-center justify-center">
          <div className="text-5xl mb-4 leading-none" role="img" aria-hidden="true">
            {current.emoji}
          </div>
          <h2 className="text-lg font-bold text-si-1 mb-2">{current.title}</h2>
          <p className="text-sm text-si-4 leading-relaxed">{current.description}</p>
          {current.ctaLabel && current.ctaPath && (
            <button
              type="button"
              onClick={handleCta}
              className="mt-4 w-full py-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-si-1 font-semibold text-sm border border-emerald-500/40"
            >
              {current.ctaLabel}
            </button>
          )}
        </div>

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
