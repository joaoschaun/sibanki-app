import { describe, it, expect, vi } from 'vitest';
import { RadarCard } from './RadarCard';
import type { HorizonItem } from '../../utils/anticipationEngine';

describe('RadarCard Component - Decision Card v2', () => {
  const defaultItem: HorizonItem = {
    id: 'test-item-1',
    label: 'Fatura Nubank',
    decision: 'plan',
    reason: 'Você tem saldo suficiente para cobrir sem comprometer os próximos meses',
    freedomDays: 15,
    daysUntilDue: 5,
    dueDate: '2026-07-16',
    amount: 500,
    kind: 'cartao',
    hasLever: true,
    leverageScore: 10,
  };

  it('1. decision="plan" -> contem No radar · dá tempo, nao contem hoje nem AJA', () => {
    const onMontarPlano = vi.fn();
    const onSnooze = vi.fn();
    const element = RadarCard({
      item: { ...defaultItem, decision: 'plan' },
      onMontarPlano,
      onSnooze
    });

    const header = element.props.children[0];
    const labelSpan = header.props.children[1];
    expect(labelSpan.props.children).toBe('No radar · dá tempo');

    // Ensure no alert headers or action urgencies
    const labelText = labelSpan.props.children;
    expect(labelText).not.toContain('hoje');
    expect(labelText).not.toContain('AJA');
  });

  it('2. decision="urgent" -> contem Precisa de decisão · hoje e classes de estado rose', () => {
    const onMontarPlano = vi.fn();
    const onSnooze = vi.fn();
    const element = RadarCard({
      item: { ...defaultItem, decision: 'urgent', daysUntilDue: 0 },
      onMontarPlano,
      onSnooze
    });

    // Check card surface glow
    expect(element.props.glow).toBe('neutral');

    // Check border and accent
    const classes = (element.props.className || '').split(' ');
    expect(classes).toContain('border-rose-500/28');

    const header = element.props.children[0];
    const labelSpan = header.props.children[1];
    expect(labelSpan.props.children).toBe('Precisa de decisão · hoje');
    expect(labelSpan.props.className).toContain('text-rose-400');
  });

  it('3. item.reason e renderizado e botoes acionam callbacks', () => {
    const onMontarPlano = vi.fn();
    const onSnooze = vi.fn();
    const item = { ...defaultItem };
    const element = RadarCard({
      item,
      onMontarPlano,
      onSnooze
    });

    // Verify reason text
    const reasonP = element.props.children[2];
    expect(reasonP.props.children).toBe(item.reason);

    // Verify action triggers
    const actionsDiv = element.props.children[3];
    const btnPlan = actionsDiv.props.children[0];
    const btnSnooze = actionsDiv.props.children[1];

    btnPlan.props.onClick();
    expect(onMontarPlano).toHaveBeenCalledWith(item);

    btnSnooze.props.onClick();
    expect(onSnooze).toHaveBeenCalledWith(item);
  });

  it('4. item = null ou decision="silence" -> renderiza a conquista calma sem botoes de decisao', () => {
    const onMontarPlano = vi.fn();
    const onSnooze = vi.fn();
    const elementNull = RadarCard({
      item: null,
      onMontarPlano,
      onSnooze
    });

    const spanNull = elementNull.props.children;
    const textNull = spanNull.props.children[1];
    expect(textNull).toBe('Tudo sob controle esta semana · nada precisa de você agora');
    expect(elementNull.props.children.props.children.length).toBe(2);

    const elementSilence = RadarCard({
      item: { ...defaultItem, decision: 'silence' },
      onMontarPlano,
      onSnooze
    });

    const spanSilence = elementSilence.props.children;
    const textSilence = spanSilence.props.children[1];
    expect(textSilence).toBe('Tudo sob controle esta semana · nada precisa de você agora');
    expect(elementSilence.props.children.props.children.length).toBe(2);
  });

  it('5. Nenhuma classe shadow-{hue}-{n}/{n}', () => {
    const elementPlan = RadarCard({
      item: defaultItem,
      onMontarPlano: vi.fn(),
      onSnooze: vi.fn()
    });
    const elementUrgent = RadarCard({
      item: { ...defaultItem, decision: 'urgent' },
      onMontarPlano: vi.fn(),
      onSnooze: vi.fn()
    });

    const strPlan = JSON.stringify(elementPlan);
    const strUrgent = JSON.stringify(elementUrgent);

    expect(strPlan).not.toContain('shadow-rose');
    expect(strPlan).not.toContain('shadow-emerald');
    expect(strUrgent).not.toContain('shadow-rose');
    expect(strUrgent).not.toContain('shadow-emerald');
  });
});
