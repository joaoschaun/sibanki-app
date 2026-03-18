import { UsersRound } from 'lucide-react';
import { SolutionPartnerPage } from './SolutionPartnerPage';

const meta = {
  slug: 'consorcio',
  title: 'Consórcio',
  purpose: 'Grupos de consórcio e contemplação com parceiros',
  description:
    'Explore consórcios de veículos, imóveis e serviços. Parceiros ajudam a entender parcelas, lances e prazos para planejar uma compra maior com disciplina.',
  icon: UsersRound,
  accent: 'bg-violet-500/20 text-violet-400',
};

export default function SolucaoConsorcio() {
  return <SolutionPartnerPage meta={meta} />;
}
