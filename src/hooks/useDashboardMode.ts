import { useEffect, useState } from 'react';

type DashboardMode = 'padrao' | 'caixa';

const KEY = 'sibanki_dashboard_mode';

export function useDashboardMode() {
  const [mode, setMode] = useState<DashboardMode>(() => {
    if (typeof window === 'undefined') return 'padrao';
    const stored = window.localStorage.getItem(KEY);
    return stored === 'caixa' ? 'caixa' : 'padrao';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(KEY, mode);
  }, [mode]);

  return { mode, setMode };
}

