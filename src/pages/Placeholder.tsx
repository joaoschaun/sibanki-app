import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';

const LABELS: Record<string, string> = {
  '/planejamento': 'Planejamento',
  '/crescimento': 'Crescimento',
  '/social': 'Social',
};

export default function Placeholder() {
  const { pathname } = useLocation();
  const label = LABELS[pathname] || 'Módulo';

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">{label}</h2>
        <p className="text-si-5 text-sm">Em construção – em breve nesta versão</p>
      </div>
      <div className="bg-si-card rounded-2xl border border-si-border p-16 flex flex-col items-center justify-center text-center">
        <Construction className="w-16 h-16 text-zinc-600 mb-4" />
        <p className="text-si-4 max-w-sm">
          Este módulo ainda não foi migrado. Use o app atual (versão legada) para acessar {label}.
        </p>
      </div>
    </div>
  );
}
