import { describe, it, expect } from 'vitest';
import { FreedomSpectrum } from './FreedomSpectrum';
import { FREEDOM_ORDER } from '../../constants/sovereigntyScale';

describe('FreedomSpectrum Component - Tiers Ruler v2', () => {
  it('1. Renderiza 5 segmentos na ordem FREEDOM_ORDER', () => {
    const element = FreedomSpectrum({ status: 'soberano' });
    const trackContainer = element.props.children[0];
    const segmentsContainer = trackContainer.props.children[0];
    const segments = segmentsContainer.props.children;

    expect(segments.length).toBe(5);
    FREEDOM_ORDER.forEach((tier, idx) => {
      expect(segments[idx].key).toBe(tier);
    });
  });

  it('2. status="soberano" -> o segmento/label Soberano está ativo e os outros apagados', () => {
    const element = FreedomSpectrum({ status: 'soberano' });
    
    // Check segments opacity
    const trackContainer = element.props.children[0];
    const segmentsContainer = trackContainer.props.children[0];
    const segments = segmentsContainer.props.children;

    segments.forEach((seg: any) => {
      const classes = (seg.props.className || '').split(' ');
      if (seg.key === 'soberano') {
        expect(classes).toContain('opacity-100');
        expect(classes).not.toContain('opacity-30');
      } else {
        expect(classes).toContain('opacity-30');
        expect(classes).not.toContain('opacity-100');
      }
    });

    // Check labels text color
    const labelsContainer = element.props.children[1];
    const labels = labelsContainer.props.children;

    labels.forEach((lbl: any) => {
      const classes = (lbl.props.className || '').split(' ');
      if (lbl.key === 'soberano') {
        expect(classes).toContain('text-si-1');
        expect(classes).not.toContain('text-si-4');
      } else {
        expect(classes).toContain('text-si-4');
        expect(classes).not.toContain('text-si-1');
      }
    });
  });

  it('3. aria-label contem Soberano e rating correspondente', () => {
    const element = FreedomSpectrum({ status: 'soberano' });
    expect(element.props.role).toBe('img');
    expect(element.props['aria-label']).toBe('Nível de liberdade: Soberano (4 de 5)');
  });
});
