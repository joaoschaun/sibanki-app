import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Circle, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import type { CoachStepId, CoachStepStatus } from '../../hooks/useCoachActive';

// ─── Tipos ───────────────────────────────────────────────────────────────────

/** Metadados de APRESENTAÇÃO por etapa. A lógica de "concluído" NÃO mora aqui —
 *  vem de `stepStatus` (useCoachActive), a fonte única de verdade. */
interface CoachStepMeta {
  id: CoachStepId;
  title: string;
  desc: string;
  link: string;
  linkLabel: string;
  priority: number; // 1 = mais urgente
}

interface CoachSetupProps {
  /** Status de conclusão por etapa, vindo do hook useCoachActive. */
  stepStatus: CoachStepStatus;
  onDismiss?: () => void;
}

// ─── Apresentação (ordem = prioridade) ───────────────────────────────────────

const STEP_META: CoachStepMeta[] = [
  {
    id: 'accounts',
    priority: 1,
    title: 'Cadastre suas contas',
    desc: 'Registre pelo menos uma conta bancária para calcular seu saldo real.',
    link: '/contas',
    linkLabel: 'Ir para Contas',
  },
  {
    id: 'entries',
    priority: 2,
    title: 'Registre seus primeiros lançamentos',
    desc: 'Com ao menos 3 receitas/despesas o Arquiteto começa a gerar insights reais.',
    link: '/lancamentos',
    linkLabel: 'Lançar agora',
  },
  {
    id: 'goals',
    priority: 3,
    title: 'Defina uma meta financeira',
    desc: 'Metas dão direção. O Sentinela usa elas para avaliar cada gasto.',
    link: '/planejamento',
    linkLabel: 'Criar meta',
  },
  {
    id: 'debts',
    priority: 4,
    title: 'Registre suas dívidas',
    desc: 'O Spread Gap e o Arquiteto precisam saber o custo das suas dívidas.',
    link: '/credito',
    linkLabel: 'Ver Crédito',
  },
  {
    id: 'whatsapp',
    priority: 5,
    title: 'Ative alertas WhatsApp',
    desc: 'O Sentinela e relatórios semanais chegam direto no seu celular.',
    link: '/configuracoes',
    linkLabel: 'Ir para Configurações',
  },
];

// ─── Componente ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'sibanki_coach_dismissed';

export function CoachSetup({ stepStatus, onDismiss }: CoachSetupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === 'true'
  );

  const steps = useMemo(
    () => STEP_META.map(step => ({ ...step, check: stepStatus[step.id] })),
    [stepStatus],
  );

  const done  = steps.filter(s => s.check).length;
  const total = steps.length;
  const pct   = Math.round((done / total) * 100);
  const allDone = done === total;
  const nextStep = steps.find(s => !s.check);

  // Não mostra se já dispensou ou se perfil completo
  if (dismissed || allDone) return null;

  return (
    <div className="bg-si-card rounded-2xl border border-si-border overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-si-over-1 transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-si-1">Modo Coach — Configure seu Sibanki</p>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/25">
              {done}/{total}
            </span>
          </div>
          {/* Barra de progresso */}
          <div className="mt-2 h-1.5 w-full rounded-full bg-si-over-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        {collapsed
          ? <ChevronDown className="w-4 h-4 text-si-5 shrink-0" />
          : <ChevronUp   className="w-4 h-4 text-si-5 shrink-0" />
        }
      </button>

      {!collapsed && (
        <div className="border-t border-si-border px-5 pb-5 pt-4 space-y-3">
          {/* Próximo passo em destaque */}
          {nextStep && (
            <div className="bg-violet-500/10 border border-violet-500/25 rounded-xl p-4 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-black text-violet-300">{nextStep.priority}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-violet-200">{nextStep.title}</p>
                <p className="text-xs text-si-5 mt-0.5">{nextStep.desc}</p>
              </div>
              <Link
                to={nextStep.link}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-bold transition-colors"
              >
                {nextStep.linkLabel}
              </Link>
            </div>
          )}

          {/* Checklist completo */}
          <div className="space-y-2">
            {steps.map(step => {
              const content = (
                <>
                  {step.check
                    ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    : <Circle      className="w-4 h-4 text-si-5 shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${step.check ? 'line-through text-si-5' : 'text-si-2 group-hover:text-si-1 transition-colors'}`}>
                      {step.title}
                    </p>
                  </div>
                  {!step.check && (
                    <span className="text-xs text-violet-400 font-bold shrink-0">
                      {step.linkLabel} →
                    </span>
                  )}
                </>
              );

              if (step.check) {
                return (
                  <div
                    key={step.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl opacity-50 select-none"
                  >
                    {content}
                  </div>
                );
              }

              return (
                <Link
                  key={step.id}
                  to={step.link}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-si-over-1 border border-transparent hover:border-violet-500/10 transition-all cursor-pointer group"
                >
                  {content}
                </Link>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              localStorage.setItem(STORAGE_KEY, 'true');
              setDismissed(true);
              if (onDismiss) onDismiss();
            }}
            className="text-xs text-si-5 hover:text-si-3 mt-1"
          >
            Dispensar (posso configurar depois)
          </button>
        </div>
      )}
    </div>
  );
}
