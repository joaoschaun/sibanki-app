import { BookOpen, Lightbulb, PiggyBank, TrendingUp, Shield, Target } from 'lucide-react';

const TIPS = [
  {
    icon: PiggyBank,
    title: 'Reserva de emergência',
    text: 'Guarde o equivalente a 3 a 6 meses dos seus gastos em aplicação de liquidez (poupança, CDB, Tesouro Selic). Use só em imprevistos reais.',
    color: 'bg-emerald-500/20 text-emerald-400',
  },
  {
    icon: Target,
    title: 'Regra 50-30-20',
    text: '50% da renda para necessidades (moradia, alimentação, transporte), 30% para desejos (lazer, assinaturas) e 20% para poupar e investir.',
    color: 'bg-blue-500/20 text-blue-400',
  },
  {
    icon: Shield,
    title: 'Evite o rotativo do cartão',
    text: 'Os juros do rotativo estão entre os mais altos do mercado. Se não puder pagar a fatura inteira, prefira parcelar no carnê ou usar linha de crédito mais barata.',
    color: 'bg-amber-500/20 text-amber-400',
  },
  {
    icon: TrendingUp,
    title: 'Invista de forma consistente',
    text: 'Aplicar todo mês, mesmo que pouco, com disciplina costuma trazer melhores resultados do que esperar “o momento certo” ou tentar acertar o mercado.',
    color: 'bg-violet-500/20 text-violet-400',
  },
  {
    icon: Lightbulb,
    title: 'Revise assinaturas e custos fixos',
    text: 'Streaming, academia, seguros e planos que você não usa podem ser cortados ou trocados por opções mais baratas. Faça uma revisão semestral.',
    color: 'bg-rose-500/20 text-rose-400',
  },
  {
    icon: BookOpen,
    title: 'Metas claras e prazos',
    text: 'Defina metas específicas (ex.: “viagem R$ 5 mil em 12 meses”) e acompanhe no app. Metas com valor e prazo têm muito mais chance de ser alcançadas.',
    color: 'bg-cyan-500/20 text-cyan-400',
  },
];

export default function Education() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-3xl font-bold">Educação financeira</h2>
          <p className="text-zinc-500 text-sm">Dicas e bons hábitos para suas finanças</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TIPS.map((tip, i) => (
          <div
            key={i}
            className="bg-[#0a0f18] rounded-2xl border border-white/5 p-6 flex flex-col gap-4"
          >
            <div className={`p-3 rounded-xl w-fit ${tip.color}`}>
              <tip.icon className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-zinc-100">{tip.title}</h3>
            <p className="text-zinc-400 text-sm leading-relaxed flex-1">{tip.text}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#0a0f18] rounded-2xl border border-white/5 p-6 text-center text-zinc-500 text-sm">
        Use o <strong className="text-zinc-300">Consultor IA</strong> no menu para dúvidas personalizadas com base nos seus dados (receitas, despesas, metas).
      </div>
    </div>
  );
}
