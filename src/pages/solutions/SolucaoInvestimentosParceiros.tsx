import { LineChart } from 'lucide-react';
import { SolutionPartnerPage } from './SolutionPartnerPage';

const meta = {
  slug: 'investimentos',
  title: 'Investimentos',
  purpose: 'Produtos e distribuidores parceiros para investir',
  description:
    'Aqui ficam as soluções de investimento oferecidas por parceiros (corretoras, bancos, fundos). É distinto da sua carteira em Crescimento: aqui o foco é descobrir ofertas e canais parceiros.',
  icon: LineChart,
  accent: 'bg-amber-500/20 text-amber-400',
};

export default function SolucaoInvestimentosParceiros() {
  return <SolutionPartnerPage meta={meta} />;
}
