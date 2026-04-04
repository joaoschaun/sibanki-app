import type { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  return (
    <div className={`animate-in fade-in slide-in-from-bottom-4 duration-300 ${className}`}>
      {children}
    </div>
  );
}

export function StaggerItem({ children, index = 0, className = '' }: { children: ReactNode; index?: number; className?: string }) {
  return (
    <div
      className={`animate-in fade-in slide-in-from-bottom-2 duration-300 ${className}`}
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
    >
      {children}
    </div>
  );
}
