import { describe, it, expect } from 'vitest';
import { HorizonStrip } from './HorizonStrip';
import type { HorizonItem } from '../../utils/anticipationEngine';

describe('HorizonStrip Component - 15 Days Timeline', () => {
  const baseItem: HorizonItem = {
    id: 'test-item-1',
    kind: 'cartao',
    label: 'Fatura Bradesco',
    amount: 1000,
    dueDate: '2026-07-21',
    daysUntilDue: 10,
    hasLever: true,
    leverageScore: 5,
    freedomDays: 20,
    decision: 'plan',
    reason: 'preserva 20 dias'
  };

  const today = new Date('2026-07-11');

  it('1. item = null -> componente nao renderiza (retorna null)', () => {
    const element = HorizonStrip({
      item: null,
      incomeDate: new Date('2026-07-15'),
      today
    });
    expect(element).toBeNull();
  });

  it('2. Com item + incomeDate no horizonte -> renderiza 16 celulas e marcadores correctos', () => {
    const element = HorizonStrip({
      item: baseItem,
      incomeDate: new Date('2026-07-16'), // 5 dias apos hoje
      today
    });

    expect(element).not.toBeNull();
    const grid = element!.props.children[1];
    const cells = grid.props.children;
    expect(cells.length).toBe(16);

    // Renda no indice 5
    const cellIncome = cells[5];
    expect(cellIncome.props.className).toContain('ring-emerald-500/80');

    // Despesa no indice 10
    const cellDue = cells[10];
    expect(cellDue.props.className).toContain('ring-amber-500/80');
  });

  it('3. Renda antes da despesa -> existe a janela de acao (vão contínuo)', () => {
    const element = HorizonStrip({
      item: baseItem,
      incomeDate: new Date('2026-07-16'), // 5 dias apos hoje
      today
    });

    const grid = element!.props.children[1];
    const cells = grid.props.children;

    // Celulas da janela: indices 6, 7, 8, 9
    [6, 7, 8, 9].forEach((idx) => {
      expect(cells[idx].props.className).toContain('bg-amber-500/5');
    });

    // Inicio da janela (indice 6) tem border-l
    expect(cells[6].props.className).toContain('border-l');

    // Fim da janela (indice 9) tem border-r
    expect(cells[9].props.className).toContain('border-r');
  });

  it('4. incomeDate = null -> sem marcador de renda e sem janela de acao', () => {
    const element = HorizonStrip({
      item: baseItem,
      incomeDate: null,
      today
    });

    const grid = element!.props.children[1];
    const cells = grid.props.children;

    // Verifica que nenhuma celula tem marcador de renda ou pertence a janela
    cells.forEach((cell: any) => {
      const classes = (cell.props.className || '').split(' ');
      expect(classes).not.toContain('ring-emerald-500/80');
      expect(classes).not.toContain('bg-amber-500/5');
    });

    // Despesa segue marcada no indice 10
    expect(cells[10].props.className).toContain('ring-amber-500/80');
  });

  it('5. Nenhuma classe shadow-{hue}-{n}/{n}', () => {
    const element = HorizonStrip({
      item: baseItem,
      incomeDate: new Date('2026-07-16'),
      today
    });

    const str = JSON.stringify(element);
    expect(str).not.toContain('shadow-emerald');
    expect(str).not.toContain('shadow-amber');
    expect(str).not.toContain('shadow-rose');
  });
});
