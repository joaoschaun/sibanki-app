import { describe, it, expect, vi } from 'vitest';
import { Header } from './Header';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: any) => ({
    type: 'a',
    props: { href: to, children, ...props }
  }),
  useLocation: () => ({ pathname: '/dashboard' }),
}));

// Mock React hooks to run outside rendering dispatcher
(global as any).mockStateValue = false;

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useState: (initial: any) => {
      if (typeof initial === 'boolean') {
        return [(global as any).mockStateValue, vi.fn()];
      }
      return [initial, vi.fn()];
    },
    useRef: (initial: any) => ({ current: initial }),
    useMemo: (fn: any) => fn(),
    useEffect: vi.fn(),
  };
});

// Mock hook useTheme
vi.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}));

// Mock hook usePushNotifications
vi.mock('../../hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({ isEnabled: false, supported: false, requestPermission: vi.fn(), loading: false }),
}));

// Mock hook useInsightDoDia
const mockUseInsightDoDia = vi.fn();
vi.mock('../../hooks/useInsightDoDia', () => ({
  useInsightDoDia: () => mockUseInsightDoDia(),
}));

// Mock useAppContext
vi.mock('../../context/AppContext', () => ({
  useAppContext: () => ({
    user: { uid: '123' },
    data: { name: 'João' },
    entries: [],
    budgets: {},
    cards: [],
  }),
}));

describe('Header Component - Sino e Notificações (HANDOFF-0014)', () => {
  it('1. Sino sem badge quando não há alertas e nem insights', () => {
    (global as any).mockStateValue = false;
    mockUseInsightDoDia.mockReturnValue({
      insight: null,
      legacyText: null,
      mode: 'gemini',
    });

    const element = Header({ sidebarCollapsed: false });
    const str = JSON.stringify(element);

    // O badge usa aria-label="Notificações ou insights ativos"
    expect(str).not.toContain('Notificações ou insights ativos');
  });

  it('2. Sino com badge e item no dropdown quando há insight do dia', () => {
    (global as any).mockStateValue = true;
    mockUseInsightDoDia.mockReturnValue({
      insight: {
        insight_curto: 'Você está gastando acima da média',
        detalhe: 'Ajuste seu orçamento',
        acao_sugerida: 'Visualizar relatórios',
        deep_link: '/relatorios',
        relevancia_score: 8,
      },
      legacyText: null,
      mode: 'gemini',
    });

    const element = Header({ sidebarCollapsed: false });
    const str = JSON.stringify(element);

    // Deve mostrar o badge
    expect(str).toContain('Notificações ou insights ativos');

    // Deve mostrar o conteúdo do insight e o CTA
    expect(str).toContain('Você está gastando acima da média');
    expect(str).toContain('Arquiteto Soberano');
    expect(str).toContain('Ver no Consultor IA');
  });
});
