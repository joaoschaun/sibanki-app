import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  /** Ação secundária — padrão Sibanki: fazer pelo Assistente. */
  assistantPrompt?: string;
}

export function EmptyState({ icon, title, description, actionLabel, actionTo, onAction, assistantPrompt }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-in fade-in duration-500">
      <div className="w-16 h-16 rounded-2xl bg-si-over-2 border border-si-border flex items-center justify-center text-si-4 mb-5">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-si-2 mb-2">{title}</h3>
      <p className="text-sm text-si-5 max-w-sm leading-relaxed mb-6">{description}</p>
      {actionLabel && actionTo && (
        <Link to={actionTo}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 text-sm font-bold transition-colors">
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionTo && (
        <button type="button" onClick={onAction}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 text-sm font-bold transition-colors">
          {actionLabel}
        </button>
      )}
      {assistantPrompt && (
        <Link
          to="/consultor-ia"
          state={{ initialMessage: assistantPrompt }}
          className="mt-3 text-[13px] text-si-4 hover:text-si-2 transition-colors underline-offset-4 hover:underline"
        >
          ou faça pelo Assistente →
        </Link>
      )}
    </div>
  );
}
