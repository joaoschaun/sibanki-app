import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks para os contextos
const mockUseAppContext = vi.fn();
const mockUseIntelligence = vi.fn();

vi.mock('../../context/AppContext', () => ({
  useAppContext: () => mockUseAppContext()
}));

vi.mock('../../context/IntelligenceContext', () => ({
  useIntelligence: () => mockUseIntelligence()
}));

// Mock react-router-dom Link to prevent evaluation issues
vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: any) => ({
    type: 'a',
    props: { href: to, children, ...props }
  })
}));

// Mock react hooks since we are calling components as functions
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useState: (initial: any) => [initial, vi.fn()],
    useMemo: (factory: any) => factory(),
    useCallback: (callback: any) => callback,
    useEffect: vi.fn()
  };
});

// Mock recharts to avoid rendering dependencies issues
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => children,
  AreaChart: ({ children }: any) => children,
  Area: () => null
}));

import { ContasConectadas } from './ContasConectadas';
import { CreditoEmFormacao } from './CreditoEmFormacao';
import { ParaOndeFoi } from './ParaOndeFoi';
import { FluxoResumo } from './FluxoResumo';

describe('Dashboard V9 Bento Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ContasConectadas', () => {
    it('1. Renderiza contas corretas e calcula o saldo consolidado', () => {
      mockUseAppContext.mockReturnValue({
        accounts: ['Itaú', 'Bradesco'],
        accountBalances: { 'Itaú': 5000, 'Bradesco': 1000 },
        accountMeta: { 'Itaú': { tipo: 'Corrente' } },
        hasOpenFinance: true
      });

      const element = ContasConectadas();
      expect(element).not.toBeNull();

      const str = JSON.stringify(element);
      expect(str).toContain('Itaú');
      expect(str).toContain('Bradesco');
      expect(str).toContain('6.000,00'); // Saldo consolidado
      expect(str).toContain('ao vivo');
    });

    it('2. Renderiza estado manual e convite quando sem Open Finance', () => {
      mockUseAppContext.mockReturnValue({
        accounts: [],
        accountBalances: {},
        accountMeta: {},
        hasOpenFinance: false
      });

      const element = ContasConectadas();
      const str = JSON.stringify(element);
      expect(str).toContain('manual');
      expect(str).toContain('Conectar banco');
    });

    it('3. Não possui classes de sombra shadow-{hue}', () => {
      mockUseAppContext.mockReturnValue({
        accounts: ['Itaú'],
        accountBalances: { 'Itaú': 100 },
        accountMeta: {},
        hasOpenFinance: true
      });

      const element = ContasConectadas();
      const str = JSON.stringify(element);
      expect(str).not.toContain('shadow-emerald');
      expect(str).not.toContain('shadow-amber');
      expect(str).not.toContain('shadow-blue');
    });
  });

  describe('CreditoEmFormacao', () => {
    it('1. Renderiza limite e uso estimado com conversão para dias de liberdade', () => {
      mockUseAppContext.mockReturnValue({
        financialProfile: {
          credit: {
            activeCards: 2,
            estimatedCardUsage: 600,
            cardUtilizationPct: 30,
            totalCardLimit: 2000,
            availableLimit: 1400,
            pressureLevel: 'atencao'
          }
        }
      });
      mockUseIntelligence.mockReturnValue({
        freedom: { dailyBurnRate: 100 }
      });

      const element = CreditoEmFormacao();
      expect(element).not.toBeNull();

      const str = JSON.stringify(element);
      expect(str).toContain('600,00');
      expect(str).toContain('"≈ "');
      expect(str).toContain('6');
      expect(str).toContain('"dias"');
      expect(str).toContain('" de liberdade"');
      expect(str).toContain('atencao');
    });

    it('2. Estado vazio quando não tem cartões ativos', () => {
      mockUseAppContext.mockReturnValue({
        financialProfile: {
          credit: {
            activeCards: 0
          }
        }
      });

      const element = CreditoEmFormacao();
      const str = JSON.stringify(element);
      expect(str).toContain('Nenhum cartão ativo');
    });
  });

  describe('ParaOndeFoi', () => {
    it('1. Renderiza categorias do mês ordenadas por valor gasto', () => {
      const catTotals = {
        'Alimentação': 400,
        'Lazer': 100,
        'Transferência': 1000 // deve ser filtrado
      };

      const element = ParaOndeFoi({ catTotals });
      expect(element).not.toBeNull();

      const str = JSON.stringify(element);
      expect(str).toContain('Alimentação');
      expect(str).toContain('Lazer');
      expect(str).not.toContain('Transferência');
      expect(str).toContain('500,00'); // total considerado: 400 + 100 = 500
    });

    it('2. Estado vazio se não há gastos relevantes', () => {
      const element = ParaOndeFoi({ catTotals: {} });
      const str = JSON.stringify(element);
      expect(str).toContain('Nenhum gasto no mês');
    });
  });

  describe('FluxoResumo', () => {
    it('1. Renderiza entradas, saídas e saldo', () => {
      const last6Months = [
        { monthKey: '2026-01', receita: 1000, despesa: 800 },
        { monthKey: '2026-02', receita: 2000, despesa: 1500 }
      ];

      const element = FluxoResumo({
        receitaMes: 2000,
        despesaMes: 1500,
        saldoMes: 500,
        last6Months
      });

      expect(element).not.toBeNull();

      const str = JSON.stringify(element);
      expect(str).toContain('2.000');
      expect(str).toContain('1.500');
      expect(str).toContain('500');
      expect(str).toContain('superávit');
    });
  });
});
