import { Clock } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  className?: string;
}

export function ComingSoonBadge({ children, className = '' }: Props) {
  return (
    <span className={`relative inline-flex ${className}`}>
      {children}
      <span className="absolute -top-2 -right-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/90 text-[10px] font-bold text-white shadow-lg whitespace-nowrap z-10">
        <Clock className="w-2.5 h-2.5" /> Em breve
      </span>
    </span>
  );
}

export function ComingSoonOverlay({ label = 'Em breve' }: { label?: string }) {
  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] rounded-xl flex items-center justify-center z-10">
      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500/90 text-sm font-bold text-white shadow-lg">
        <Clock className="w-4 h-4" /> {label}
      </span>
    </div>
  );
}
