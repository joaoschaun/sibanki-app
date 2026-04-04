import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, actionTo, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-in fade-in duration-500">
      <div className="w-16 h-16 rounded-2xl bg-si-over-2 border border-si-border flex items-center justify-center text-si-4 mb-5">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-si-2 mb-2">{title}</h3>
      <p className="text-sm text-si-5 max-w-sm leading-relaxed mb-6">{description}</p>
      {actionLabel && actionTo && (
        <Link to={actionTo}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors">
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionTo && (
        <button type="button" onClick={onAction}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
