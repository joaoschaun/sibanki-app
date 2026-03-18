import { Shield } from 'lucide-react';
import { SolutionPartnerPage } from './SolutionPartnerPage';

const meta = {
  slug: 'seguro',
  title: 'Seguro',
  purpose: 'Proteção patrimonial e coberturas com parceiros',
  description:
    'Seguros de vida, residencial, automóvel e outros produtos com parceiros confiáveis. Foco em cobertura adequada ao seu perfil e à sua realidade financeira.',
  icon: Shield,
  accent: 'bg-cyan-500/20 text-cyan-400',
};

export default function SolucaoSeguro() {
  return <SolutionPartnerPage meta={meta} />;
}
