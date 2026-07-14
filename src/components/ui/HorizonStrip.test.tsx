import { describe, it, expect } from 'vitest';
import { HorizonStrip } from './HorizonStrip';
import type { HorizonEvent } from '../../utils/anticipationEngine';

describe('HorizonStrip Component - 15 Days Timeline', () => {
  const baseEvent: HorizonEvent = {
    id: 'test-event-1',
    kind: 'cartao',
    label: 'Fatura Bradesco',
    amount: 1000,
    dueDate: '2026-07-21',
    daysUntilDue: 10,
    flow: 'saida'
  };

  const incomeEvent: HorizonEvent = {
    id: 'income-event-1',
    kind: 'recorrente',
    label: 'Salário',
    amount: 500,
    dueDate: '2026-07-16',
    daysUntilDue: 5,
    flow: 'entrada'
  };

  const today = new Date('2026-07-11');

  it('1. Sem eventos e sem renda no horizonte -> renderiza a grade vazia + convite', () => {
    const element = HorizonStrip({
      events: [],
      incomeDate: null,
      today
    });
    expect(element).not.toBeNull();
    
    // O grid de 16 dias (segundo elemento filho do Card) deve estar presente
    const grid = element!.props.children[2];
    const cells = grid.props.children;
    expect(cells.length).toBe(16);

    const str = JSON.stringify(element);
    expect(str).toContain('Provisione seus pr\u00f3ximos 15 dias');
  });

  it('2. Com eventos + incomeDate no horizonte -> renderiza 16 celulas e marcadores correctos', () => {
    const element = HorizonStrip({
      events: [baseEvent, incomeEvent],
      incomeDate: new Date('2026-07-16'), // 5 dias apos hoje
      today
    });

    expect(element).not.toBeNull();
    // No estado com dados, o elemento principal tem filhos.
    // Buscamos o grid de 16 dias (segundo elemento filho do Card).
    const grid = element!.props.children[2];
    const cells = grid.props.children;
    expect(cells.length).toBe(16);

    // Renda/despesa com estilo correto
    const cellIncome = cells[5];
    expect(cellIncome.props.className).toContain('ring-emerald-500/80');

    const cellDue = cells[10];
    expect(cellDue.props.className).toContain('ring-amber-500/80');
  });

  it('3. Renda antes da despesa com renda < despesa -> existe a janela de acao (vão contínuo)', () => {
    const element = HorizonStrip({
      events: [baseEvent, incomeEvent],
      incomeDate: new Date('2026-07-16'),
      today
    });

    const grid = element!.props.children[2];
    const cells = grid.props.children;

    // Celulas da janela: indices 6, 7, 8, 9
    [6, 7, 8, 9].forEach((idx) => {
      expect(cells[idx].props.className).toContain('bg-amber-500/5');
    });

    expect(cells[6].props.className).toContain('border-l');
    expect(cells[9].props.className).toContain('border-r');
  });

  it('4. incomeDate = null -> sem janela de acao se nao ha renda para comparar', () => {
    const element = HorizonStrip({
      events: [baseEvent],
      incomeDate: null,
      today
    });

    const grid = element!.props.children[2];
    const cells = grid.props.children;

    cells.forEach((cell: any) => {
      const classes = (cell.props.className || '').split(' ');
      expect(classes).not.toContain('bg-amber-500/5');
    });

    expect(cells[10].props.className).toContain('ring-amber-500/80');
  });

  it('5. Nenhuma classe shadow-{hue}-{n}/{n}', () => {
    const element = HorizonStrip({
      events: [baseEvent, incomeEvent],
      incomeDate: new Date('2026-07-16'),
      today
    });

    const str = JSON.stringify(element);
    expect(str).not.toContain('shadow-emerald');
    expect(str).not.toContain('shadow-amber');
    expect(str).not.toContain('shadow-rose');
  });
});
