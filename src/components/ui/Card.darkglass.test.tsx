import { describe, it, expect } from 'vitest';
import { Card } from './Card';

describe('Card Component - Dark-Glass Pierre v2', () => {
  it('1. Retrocompat: Card sem props novas contem as classes atuais e nao contem si-surface/si-glow-positive', () => {
    const element = (Card as any).render({ padding: 'md' }, null);
    const className = element.props.className;

    expect(className).toContain('bg-si-card');
    expect(className).toContain('rounded-2xl');
    expect(className).toContain('border');
    expect(className).toContain('border-si-border');
    expect(className).not.toContain('si-surface');
    expect(className).not.toContain('si-glow');
  });

  it('2. Card surface="raised" contem si-surface e si-elev, e mantem rounded-2xl border', () => {
    const element = (Card as any).render({ padding: 'md', surface: 'raised' }, null);
    const className = element.props.className;

    expect(className).toContain('si-surface');
    expect(className).toContain('si-elev');
    expect(className).toContain('rounded-2xl');
    expect(className).toContain('border');
    expect(className).not.toContain('bg-si-card');
  });

  it('3. Card glow="positive" contem si-glow-positive e glow="neutral" contem si-glow', () => {
    const elementPos = (Card as any).render({ padding: 'md', glow: 'positive' }, null);
    const classesPos = (elementPos.props.className || '').split(' ');
    expect(classesPos).toContain('si-glow-positive');
    expect(classesPos).not.toContain('si-glow');

    const elementNeu = (Card as any).render({ padding: 'md', glow: 'neutral' }, null);
    const classesNeu = (elementNeu.props.className || '').split(' ');
    expect(classesNeu).toContain('si-glow');
    expect(classesNeu).not.toContain('si-glow-positive');
  });

  it('4. Card default nao contem nenhuma classe si-glow* nem si-surface', () => {
    const element = (Card as any).render({}, null);
    const className = element.props.className;

    expect(className).not.toContain('si-surface');
    expect(className).not.toContain('si-glow');
    expect(className).not.toContain('si-glow-positive');
  });
});
