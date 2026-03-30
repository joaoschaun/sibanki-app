import { useEffect, useState } from 'react';

export type AppLanguage = 'pt-BR' | 'en-US';

const KEY = 'sibanki_lang';

function getInitialLanguage(): AppLanguage {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === 'en-US' || raw === 'pt-BR') return raw;
  } catch {
    // ignore
  }
  return 'pt-BR';
}

export function useLanguage() {
  const [language, setLanguage] = useState<AppLanguage>(getInitialLanguage);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, language);
    } catch {
      // ignore
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  return { language, setLanguage };
}

