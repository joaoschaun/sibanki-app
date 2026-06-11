import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { updateUserDoc } from '../../services/persistUserData';

export interface SpotlightStep {
  selector: string;
  title: string;
  body: string;
  last?: boolean;
}

interface Props {
  tourId: string;
  steps: SpotlightStep[];
  onComplete?: () => void;
}

const PAD = 12;
const TOOLTIP_GAP = 12;

export function SpotlightTour({ tourId, steps, onComplete }: Props) {
  const { user, data } = useAppContext();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tickRef = useRef<number | null>(null);

  const tourDone = (data as any)?.tourModulos?.[tourId];
  // Passos cujo elemento realmente existe na tela atual (mobile/sidebar
  // colapsada/modo simples escondem âncoras — apontar para o nada era o bug).
  const [activeSteps, setActiveSteps] = useState<SpotlightStep[]>([]);

  useEffect(() => {
    if (tourDone) return;
    const t = setTimeout(() => {
      const found = steps.filter((s) => document.querySelector(s.selector));
      // Tour só faz sentido com pelo menos 2 âncoras visíveis.
      if (found.length >= 2) {
        setActiveSteps(found);
        setVisible(true);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [tourDone, steps]);

  const positionSpotlight = useCallback(() => {
    if (!visible || index >= activeSteps.length) return;
    const el = document.querySelector(activeSteps[index].selector);
    if (el) {
      const r = el.getBoundingClientRect();
      setRect(r);
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      // Elemento sumiu (ex.: usuário navegou) → avança em vez de apontar o vazio.
      setRect(null);
      setIndex((i) => i + 1);
    }
  }, [visible, index, activeSteps]);

  useEffect(() => {
    positionSpotlight();
    tickRef.current = window.setInterval(positionSpotlight, 200);
    const handleResize = () => positionSpotlight();
    window.addEventListener('resize', handleResize);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [positionSpotlight]);

  const finish = useCallback(async () => {
    setVisible(false);
    if (user?.uid) {
      const mods = { ...((data as any)?.tourModulos || {}), [tourId]: true };
      await updateUserDoc(user.uid, { tourModulos: mods } as any).catch(() => {});
    }
    onComplete?.();
  }, [user?.uid, data, tourId, onComplete]);

  const next = () => {
    if (index < activeSteps.length - 1) setIndex((i) => i + 1);
    else finish();
  };

  if (!visible || tourDone) return null;
  if (index >= activeSteps.length) {
    // Esgotou os passos por skip automático → encerra e marca como visto.
    void finish();
    return null;
  }

  const step = activeSteps[index];
  const isLast = index === activeSteps.length - 1;
  const sr = rect;

  const spotStyle: React.CSSProperties = sr ? {
    top: sr.top - PAD,
    left: sr.left - PAD,
    width: sr.width + PAD * 2,
    height: sr.height + PAD * 2,
  } : { top: '50%', left: '50%', width: 0, height: 0 };

  const tooltipPosition = (): React.CSSProperties => {
    if (!sr) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    const below = sr.bottom + PAD + TOOLTIP_GAP;
    const spaceBelow = window.innerHeight - below;
    if (spaceBelow > 200) {
      return { top: below, left: Math.max(16, Math.min(sr.left, window.innerWidth - 340)) };
    }
    const above = sr.top - PAD - TOOLTIP_GAP;
    return { bottom: window.innerHeight - above, left: Math.max(16, Math.min(sr.left, window.innerWidth - 340)) };
  };

  return (
    <div className="fixed inset-0 z-[300]" role="dialog" aria-modal="true">
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {sr && <rect x={spotStyle.left as number} y={spotStyle.top as number} width={spotStyle.width as number} height={spotStyle.height as number} rx="12" fill="black" />}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.7)" mask="url(#spotlight-mask)" />
      </svg>

      {sr && (
        <div className="absolute rounded-xl border-2 border-blue-400/60 pointer-events-none transition-all duration-300"
          style={spotStyle} />
      )}

      <div ref={tooltipRef} className="absolute w-80 bg-si-card border border-si-border-md rounded-2xl shadow-2xl p-5 z-[301]"
        style={tooltipPosition()}>
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-bold text-si-1 text-sm">{step.title}</h3>
          <button type="button" onClick={finish} className="p-1 rounded-lg hover:bg-si-over-3 text-si-5" title="Pular tour">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-si-4 text-sm leading-relaxed mb-4">{step.body}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-si-5">{index + 1}/{activeSteps.length}</span>
          <button type="button" onClick={next}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold">
            {isLast ? 'Concluir' : 'Próximo'} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export const GLOBAL_TOUR_STEPS: SpotlightStep[] = [
  { selector: '[data-tour="menu"]', title: 'Menu principal', body: 'Navegue por todos os módulos do Sibanki usando o menu lateral.' },
  { selector: '[data-tour="dashboard"]', title: 'Visão geral', body: 'Seu resumo financeiro: receitas, despesas, saldo e tendências do mês.' },
  { selector: '[data-tour="consultor"]', title: 'Consultor IA', body: 'Pergunte em linguagem natural sobre suas finanças e receba orientações personalizadas.' },
  { selector: '[data-tour="lancamentos"]', title: 'Lançamentos', body: 'Registre receitas e despesas — agora também por foto (OCR) e voz (STT).' },
  { selector: '[data-tour="notificacoes"]', title: 'Alertas', body: 'Receba avisos sobre orçamento, vencimentos e oportunidades.' },
  { selector: '[data-tour="perfil"]', title: 'Seu perfil', body: 'Score financeiro, conquistas e configurações da sua conta.', last: true },
];
