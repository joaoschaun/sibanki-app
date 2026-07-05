import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';

export interface SolutionMeta {
  slug: string;
  title: string;
  purpose: string;
  description: string;
  icon: LucideIcon;
  accent: string;
}

const TABS: { slug: string; label: string; path: string }[] = [
  { slug: 'credito', label: 'Crédito', path: '/solucoes/credito' },
  { slug: 'consorcio', label: 'Consórcio', path: '/solucoes/consorcio' },
  { slug: 'seguro', label: 'Seguro', path: '/solucoes/seguro' },
  { slug: 'investimentos', label: 'Investimentos', path: '/solucoes/investimentos' },
];

export function SolutionPartnerPage({ meta }: { meta: SolutionMeta }) {
  const Icon = meta.icon;
  return (
    <div className="space-y-8 max-w-3xl">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-si-5 hover:text-si-3 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao início
      </Link>

      <div className="flex flex-wrap gap-2 p-1 rounded-xl bg-si-zinc-9/80 border border-si-border-md w-fit">
        {TABS.map((t) => (
          <Link
            key={t.path}
            to={t.path}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              meta.slug === t.slug
                ? 'bg-blue-600 text-si-1 shadow-lg shadow-black/20'
                : 'text-si-4 hover:text-si-2 hover:bg-si-over-2'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="flex items-start gap-4">
        <div className={`p-4 rounded-2xl shrink-0 ${meta.accent}`}>
          <Icon className="w-8 h-8" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">Soluções · Parceiros</p>
          <h1 className="text-3xl font-bold text-si-1 mb-2">{meta.title}</h1>
          <p className="text-lg text-si-4 font-medium">{meta.purpose}</p>
        </div>
      </div>

      <p className="text-si-4 leading-relaxed">{meta.description}</p>

      <div className="rounded-xl border border-si-border-md bg-si-zinc-9/40 p-6">
        <h2 className="font-semibold text-si-1 mb-2">Em breve</h2>
        <p className="text-sm text-si-5">
          Aqui você verá ofertas e parceiros selecionados para esta categoria, com transparência e foco no que faz sentido para o seu perfil.
        </p>
      </div>
    </div>
  );
}
