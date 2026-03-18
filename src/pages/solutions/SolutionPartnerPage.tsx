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
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao início
      </Link>

      <div className="flex flex-wrap gap-2 p-1 rounded-xl bg-zinc-900/80 border border-white/10 w-fit">
        {TABS.map((t) => (
          <Link
            key={t.path}
            to={t.path}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              meta.slug === t.slug
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
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
          <h1 className="text-3xl font-bold text-white mb-2">{meta.title}</h1>
          <p className="text-lg text-zinc-400 font-medium">{meta.purpose}</p>
        </div>
      </div>

      <p className="text-zinc-400 leading-relaxed">{meta.description}</p>

      <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6">
        <h2 className="font-semibold text-white mb-2">Em breve</h2>
        <p className="text-sm text-zinc-500">
          Aqui você verá ofertas e parceiros selecionados para esta categoria, com transparência e foco no que faz sentido para o seu perfil.
        </p>
      </div>
    </div>
  );
}
