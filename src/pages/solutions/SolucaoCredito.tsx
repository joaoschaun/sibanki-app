import { Banknote } from 'lucide-react';
import { SolutionPartnerPage } from './SolutionPartnerPage';

const meta = {
  slug: 'credito',
  title: 'Crédito',
  purpose: 'Empréstimos, financiamento e linhas de crédito com parceiros',
  description:
    'Compare opções de crédito pessoal, consignado e financiamento com instituições parceiras. O objetivo é encontrar taxas e prazos alinhados ao seu orçamento, sem surpresas.',
  icon: Banknote,
  accent: 'bg-emerald-500/20 text-emerald-400',
};

export default function SolucaoCredito() {
  return <SolutionPartnerPage meta={meta} />;
}
