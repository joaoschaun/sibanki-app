import type { CreditSnapshot } from '../types/userData';

export const CREDIT_EDUCATION_CARDS = [
  { emoji: '⚠️', title: 'O custo real do mínimo', desc: 'Pagar só o mínimo do cartão pode triplicar sua dívida em 2 anos.' },
  { emoji: '📉', title: 'Como melhorar seu crédito', desc: 'Pague em dia, reduza utilização abaixo de 30% e evite novas consultas.' },
  { emoji: '🔄', title: 'Quando antecipar parcelas', desc: 'Vale se a taxa do empréstimo superar o rendimento das suas reservas.' },
  { emoji: '🧮', title: 'Renegociar nem sempre ajuda', desc: 'Alongar prazo reduz parcela, mas aumenta o custo total. Calcule antes.' },
] as const;

export const CREDIT_GLOSSARY_TERMS = [
  { term: 'CET', def: 'Custo Efetivo Total — inclui juros, IOF, tarifas e seguros. É o custo real do crédito.' },
  { term: 'Utilização', def: 'Quanto do limite está sendo usado. Acima de 30% começa a impactar o score negativamente.' },
  { term: 'Portabilidade', def: 'Transferência do seu crédito para outra instituição com taxa menor, sem custo.' },
  { term: 'Amortização', def: 'Pagamento antecipado de parcelas. Reduz o prazo ou o valor das parcelas restantes.' },
] as const;

export type CreditPlanIconKey = 'alert' | 'reneg' | 'clock' | 'check';

export function buildCreditPlanItems(args: {
  topCardLabel: string;
  loanText: string;
  dueSoonText: string;
  utilizationText: string;
}): Array<{
  iconKey: CreditPlanIconKey;
  color: string;
  bg: string;
  title: string;
  body: string;
  action: string | null;
}> {
  return [
    {
      iconKey: 'alert',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      title: 'Prioridade #1 — Quitar',
      body: `${args.topCardLabel}: maior utilização relativa. Reduzir fatura melhora score e reduz encargos do rotativo.`,
      action: 'Pagar agora',
    },
    {
      iconKey: 'reneg',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      title: 'Renegociação pendente',
      body: args.loanText,
      action: 'Simular',
    },
    {
      iconKey: 'clock',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      title: 'Vencimentos próximos',
      body: args.dueSoonText,
      action: 'Ver calendário',
    },
    {
      iconKey: 'check',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      title: 'Progresso recente',
      body: args.utilizationText,
      action: null,
    },
  ];
}

export function buildCreditOpportunities(pressureLevel: CreditSnapshot['pressureLevel']) {
  return [
    {
      show: pressureLevel !== 'controlado',
      emoji: '🔄', title: 'Portabilidade de crédito',
      desc: 'Transfira seu empréstimo para outra instituição com taxa menor. Processo gratuito e regulamentado pelo Bacen.',
      cta: 'Simular portabilidade',
      color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20',
    },
    {
      show: pressureLevel === 'controlado' || pressureLevel === 'atencao',
      emoji: '📈', title: 'Aumento de limite',
      desc: 'Seu comportamento de pagamento qualifica para aumento. Utilização sobe, mas score pode melhorar se você manter o uso baixo.',
      cta: 'Solicitar aumento',
      color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20',
    },
    {
      show: true,
      emoji: '🏠', title: 'Consolidação de dívidas',
      desc: 'Unifique cartões e empréstimos em uma única parcela com taxa menor. Parceiros: Creditas, Open Co, Banco Inter.',
      cta: 'Ver simulação',
      color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20',
    },
    {
      show: pressureLevel === 'controlado',
      emoji: '🛡️', title: 'Seguro prestamista',
      desc: 'Proteja suas parcelas em caso de desemprego ou incapacidade. A partir de R$ 12/mês.',
      cta: 'Ver planos',
      color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20',
    },
  ];
}
