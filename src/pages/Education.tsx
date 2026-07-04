/**
 * Education.tsx — Módulo de Educação Financeira (rebuild premium)
 *
 * Tabs:
 *   Início       — diagnóstico personalizado + próxima lição recomendada
 *   Trilhas      — 5 trilhas × 22 lições com quiz integrado
 *   Calculadoras — 4 calculadoras com dados reais do usuário
 *   Glossário    — 20 termos financeiros (inclui Ld, Sg, Sv)
 *
 * Personalização via IntelligenceContext (Ld, healthLevel, Sg, catTotals).
 * Progresso persistido via useEducationProgress (localStorage).
 * SibCoin: 1 evento 'consultor_usado' por lição concluída.
 */

import { useState, useMemo, useCallback } from 'react';
import {
  BookOpen, Zap, Calculator, BookMarked,
  ChevronRight, ChevronDown, CheckCircle2,
  Clock, Star, Trophy, Flame, Target, TrendingUp,
  BarChart2, Shield, Brain,
  ArrowRight, X,
  Landmark, Radio, CreditCard, Scale, Search, Calendar, 
  TrendingDown, Compass, Building, ShoppingBasket, Link, 
  Folder, AlertTriangle, RefreshCw, Mountain, HelpCircle, 
  Activity, ClipboardList, Map
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TRAILS, GLOSSARY, findLesson, type Trail, type Lesson } from '../constants/educationContent';
import { useEducationProgress } from '../hooks/useEducationProgress';
import { useIntelligence } from '../context/IntelligenceContext';
import { useAppContext } from '../context/AppContext';

// ─── Mapeamento de Emojis para Lucide ──────────────────────────────────────────
const EDUCATION_ICON_MAP: Record<string, React.ComponentType<any>> = {
  // Trilhas
  '🏛️': Landmark,
  '📡': Radio,
  '📈': TrendingUp,
  '💳': CreditCard,
  '🔥': Flame,
  
  // Lições
  '📊': BarChart2,
  '🛡️': Shield,
  '⚖️': Scale,
  '🎯': Target,
  '🔍': Search,
  '🗓️': Calendar,
  '📉': TrendingDown,
  '⚡': Zap,
  '🧭': Compass,
  '🏦': Building,
  '🧺': ShoppingBasket,
  '🔗': Link,
  '🗂️': Folder,
  '⚠️': AlertTriangle,
  '🔄': RefreshCw,
  '🧗': Mountain,
  '🃏': HelpCircle,
  '🏄': Activity,
  '📋': ClipboardList,
  '🗺️': Map,
  '🏗️': Building,
};

function RenderEducationIcon({ icon, className = 'w-4 h-4' }: { icon: string; className?: string }) {
  const IconComp = EDUCATION_ICON_MAP[icon];
  if (IconComp) {
    return <IconComp className={className} />;
  }
  return <span className="leading-none text-base">{icon}</span>;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

// ─── LevelBadge ───────────────────────────────────────────────────────────────

function LevelBadge({ level, xp, xpProgress, xpToNext }: {
  level: number; xp: number; xpProgress: number; xpToNext: number;
}) {
  return (
    <div className="bg-si-card border border-si-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-violet-500/10 flex items-center justify-center">
            <Star className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Nível</p>
            <p className="text-lg font-bold text-white leading-none">{level}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">XP total</p>
          <p className="text-sm font-bold text-zinc-200">{xp} XP</p>
        </div>
      </div>
      <div className="space-y-1">
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all duration-700"
            style={{ width: `${xpProgress}%` }}
          />
        </div>
        <p className="text-[11px] text-zinc-600">{xpToNext} XP para nível {level + 1}</p>
      </div>
    </div>
  );
}

// ─── DiagnosticCard ───────────────────────────────────────────────────────────

function DiagnosticCard({ onClick }: { onClick: () => void }) {
  const { freedom, healthLevel, spread } = useIntelligence();
  const { entries, investments, cards } = useAppContext();

  const insights = useMemo(() => {
    const items: { icon: string; text: string; urgency: 'alta' | 'média' | 'baixa' }[] = [];

    if (freedom.days < 30) {
      items.push({ icon: '🛡️', text: 'Seu Ld está crítico — a trilha de Fundamentos tem lição essencial sobre reserva de emergência.', urgency: 'alta' });
    } else if (freedom.days < 90) {
      items.push({ icon: '🏗️', text: `Com Ld de ${Math.round(freedom.days)} dias, você ainda está construindo. Continue na trilha de Fundamentos.`, urgency: 'média' });
    }

    if (spread.spreadGap < -0.02) {
      items.push({ icon: '📉', text: 'Seu Spread Gap está negativo — a trilha de Crédito explica como sair dessa situação.', urgency: 'alta' });
    }

    if (cards.length > 0 && healthLevel === 'critico') {
      items.push({ icon: '💳', text: 'Situação de crédito atenção — aprenda estratégias práticas na trilha de Crédito.', urgency: 'alta' });
    }

    if (investments.length === 0) {
      items.push({ icon: '📈', text: 'Você ainda não tem investimentos registrados — a trilha de Investimentos é o próximo passo.', urgency: 'média' });
    }

    if (entries.length > 50 && healthLevel === 'saudavel') {
      items.push({ icon: '🔥', text: 'Perfil saudável! Explore independência financeira na trilha Longo Prazo e Liberdade.', urgency: 'baixa' });
    }

    if (items.length === 0) {
      items.push({ icon: '🎯', text: 'Conheça os indicadores Ld, Sg e Sv — os 3 números que definem sua soberania financeira.', urgency: 'baixa' });
    }

    return items.slice(0, 3);
  }, [freedom, healthLevel, spread, entries, investments, cards]);

  return (
    <div className="bg-si-card border border-si-border rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-blue-400" />
        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Diagnóstico personalizado</p>
      </div>
      <div className="space-y-2.5">
        {insights.map((ins, i) => (
          <button
            key={i}
            type="button"
            onClick={onClick}
            className="w-full flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors text-left"
          >
            <RenderEducationIcon icon={ins.icon} className="w-4 h-4 text-si-4 mt-0.5 shrink-0" />
            <p className="text-xs text-zinc-400 leading-relaxed flex-1">{ins.text}</p>
            <div className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${ins.urgency === 'alta' ? 'bg-rose-400' : ins.urgency === 'média' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── LessonViewer ─────────────────────────────────────────────────────────────

interface LessonViewerProps {
  trailId: string;
  lessonId: string;
  onClose: () => void;
  onComplete: (answers: number[]) => void;
  alreadyCompleted: boolean;
  record?: { quizScore: number; completedAt: string };
}

function LessonViewer({ lessonId, onClose, onComplete, alreadyCompleted, record }: LessonViewerProps) {
  const found = findLesson(lessonId);
  const [step, setStep]               = useState<'lesson' | 'quiz' | 'result'>('lesson');
  const [answers, setAnswers]         = useState<number[]>([]);
  const [current, setCurrent]         = useState(0);
  const [selected, setSelected]       = useState<number | null>(null);
  const [showExplanation, setShowExp] = useState(false);

  if (!found) return null;
  const { lesson } = found;

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    setShowExp(true);
  };

  const handleNext = () => {
    if (selected === null) return;
    const next = [...answers, selected];
    if (current < lesson.quiz.length - 1) {
      setAnswers(next);
      setCurrent((c) => c + 1);
      setSelected(null);
      setShowExp(false);
    } else {
      setAnswers(next);
      setStep('result');
      onComplete(next);
    }
  };

  const correctCount = step === 'result'
    ? answers.reduce((cnt, a, i) => cnt + (a === lesson.quiz[i].correct ? 1 : 0), 0)
    : 0;
  const quizScore = step === 'result' ? Math.round((correctCount / lesson.quiz.length) * 100) : 0;
  const q = lesson.quiz[current];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-[#0d0d0d] border border-white/[0.08] rounded-2xl my-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] sticky top-0 bg-[#0d0d0d] z-10">
          <div className="flex items-center gap-2.5">
            <RenderEducationIcon icon={lesson.icon} className="w-5 h-5 text-zinc-300 shrink-0" />
            <div>
              <p className="text-sm font-bold text-white leading-tight">{lesson.title}</p>
              <p className="text-[11px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3 h-3" /> {lesson.duration}
                <span className="text-zinc-700">·</span>
                <Zap className="w-3 h-3 text-amber-400" /> {lesson.xp} XP
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* LIÇÃO */}
        {step === 'lesson' && (
          <div className="px-5 py-6 space-y-6">
            <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4">
              <p className="text-sm text-zinc-300 leading-relaxed italic">{lesson.intro}</p>
            </div>

            <div className="space-y-4">
              {lesson.points.map((point, i) => {
                const parts = point.split(/(\*\*[^*]+\*\*)/g);
                return (
                  <div key={i} className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-zinc-500">{i + 1}</span>
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      {parts.map((part, j) =>
                        part.startsWith('**') && part.endsWith('**')
                          ? <strong key={j} className="text-zinc-200 font-semibold">{part.slice(2, -2)}</strong>
                          : <span key={j}>{part}</span>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4 space-y-1.5">
              <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">Exemplo prático</p>
              <p className="text-sm text-zinc-400 leading-relaxed">{lesson.example}</p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {lesson.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] text-zinc-500">{tag}</span>
              ))}
            </div>

            <div className="pt-2 flex gap-2">
              {alreadyCompleted && record && (
                <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-emerald-400 font-bold">Concluída · {record.quizScore}% no quiz</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => { setStep('quiz'); setAnswers([]); setCurrent(0); setSelected(null); setShowExp(false); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] border border-white/[0.12] text-sm font-bold text-white hover:bg-white/[0.12] transition-colors"
              >
                {alreadyCompleted ? 'Refazer quiz' : 'Ir para o quiz'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* QUIZ */}
        {step === 'quiz' && (
          <div className="px-5 py-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/30 rounded-full transition-all"
                  style={{ width: `${(current / lesson.quiz.length) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-zinc-500 shrink-0">{current + 1}/{lesson.quiz.length}</p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-bold text-zinc-200 leading-relaxed">{q.q}</p>

              <div className="space-y-2">
                {q.options.map((opt, i) => {
                  const isSelected = selected === i;
                  const isCorrect  = i === q.correct;
                  const revealed   = selected !== null;

                  let cls = 'w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all ';
                  if (!revealed) {
                    cls += 'bg-white/[0.03] border-white/[0.07] text-zinc-300 hover:bg-white/[0.06] hover:border-white/[0.12] cursor-pointer';
                  } else if (isCorrect) {
                    cls += 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 cursor-default';
                  } else if (isSelected) {
                    cls += 'bg-rose-500/10 border-rose-500/30 text-rose-300 cursor-default';
                  } else {
                    cls += 'bg-white/[0.02] border-white/[0.04] text-zinc-600 cursor-default';
                  }

                  return (
                    <button
                      key={i}
                      type="button"
                      className={cls}
                      onClick={() => handleAnswer(i)}
                      disabled={revealed}
                    >
                      <span className={`w-5 h-5 shrink-0 rounded-full border flex items-center justify-center text-[11px] font-bold mt-0.5 ${revealed && isCorrect ? 'border-emerald-500 text-emerald-400' : revealed && isSelected ? 'border-rose-500 text-rose-400' : 'border-white/[0.15] text-zinc-500'}`}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="leading-relaxed">{opt}</span>
                      {revealed && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </div>

              {showExplanation && (
                <div className={`p-3 rounded-xl border text-xs leading-relaxed ${selected === q.correct ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-200/80' : 'bg-amber-500/5 border-amber-500/20 text-amber-200/80'}`}>
                  <strong className="block mb-1">{selected === q.correct ? '✓ Correto!' : '✗ Incorreto'}</strong>
                  {q.explanation}
                </div>
              )}
            </div>

            {selected !== null && (
              <button
                type="button"
                onClick={handleNext}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/[0.08] border border-white/[0.12] text-sm font-bold text-white hover:bg-white/[0.12] transition-colors"
              >
                {current < lesson.quiz.length - 1 ? 'Próxima pergunta' : 'Ver resultado'}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* RESULTADO */}
        {step === 'result' && (
          <div className="px-5 py-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ background: quizScore >= 70 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)' }}>
              {quizScore >= 70 ? <Trophy className="w-7 h-7 text-emerald-400" /> : <Target className="w-7 h-7 text-amber-400" />}
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{quizScore}%</p>
              <p className="text-sm text-zinc-400 mt-1">{correctCount} de {lesson.quiz.length} corretas</p>
              <p className="text-xs text-zinc-500 mt-2">
                {quizScore >= 70 ? 'Excelente! Lição concluída com sucesso.' : 'Bom começo! Reveja a lição para fixar melhor.'}
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-amber-400">+{lesson.xp} XP conquistado</span>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setStep('lesson')} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-sm font-bold text-zinc-400 hover:bg-white/[0.04] transition-colors">
                Rever lição
              </button>
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/[0.08] border border-white/[0.12] text-sm font-bold text-white hover:bg-white/[0.12] transition-colors">
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TrailCard ────────────────────────────────────────────────────────────────

function TrailCard({
  trail,
  trailProgress,
  onLessonClick,
  isCompleted,
}: {
  trail: Trail;
  trailProgress: { completed: number; total: number; pct: number };
  onLessonClick: (trailId: string, lessonId: string) => void;
  isCompleted: (id: string) => boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const levelColors: Record<string, string> = {
    iniciante: 'text-emerald-400',
    intermediário: 'text-amber-400',
    avançado: 'text-rose-400',
  };

  return (
    <div className="bg-si-card border border-si-border rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className={`w-10 h-10 rounded-xl ${trail.color} flex items-center justify-center shrink-0`}>
          <RenderEducationIcon icon={trail.icon} className="w-5 h-5 text-white shrink-0" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-zinc-200">{trail.title}</p>
            <span className={`text-[11px] font-bold uppercase tracking-widest ${levelColors[trail.level] ?? 'text-zinc-500'}`}>
              {trail.level}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{trail.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${trailProgress.pct === 100 ? 'bg-emerald-500' : 'bg-white/30'}`}
                style={{ width: `${trailProgress.pct}%` }}
              />
            </div>
            <span className="text-[11px] text-zinc-500 shrink-0">{trailProgress.completed}/{trailProgress.total}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-bold text-zinc-600">{trail.totalXp} XP</span>
          {trailProgress.pct === 100 && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {expanded
            ? <ChevronDown className="w-4 h-4 text-zinc-600" />
            : <ChevronRight className="w-4 h-4 text-zinc-600" />}
        </div>
      </button>

      {expanded && (
        <div className="divide-y divide-white/[0.04] border-t border-white/[0.06]">
          {trail.lessons.map((lesson: Lesson, idx: number) => {
            const done = isCompleted(lesson.id);
            return (
              <button
                key={lesson.id}
                type="button"
                onClick={() => onLessonClick(trail.id, lesson.id)}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.03] transition-colors text-left"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-emerald-500/15' : 'bg-white/[0.05]'}`}>
                  {done
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    : <span className="text-[11px] font-bold text-zinc-600">{idx + 1}</span>}
                </div>
                <RenderEducationIcon icon={lesson.icon} className="w-4 h-4 text-zinc-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${done ? 'text-zinc-400' : 'text-zinc-200'}`}>{lesson.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-zinc-600 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> {lesson.duration}
                    </span>
                    <span className="text-zinc-700 text-[11px]">·</span>
                    <span className="text-[11px] text-amber-500/70 flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5" /> {lesson.xp} XP
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Calculadoras ─────────────────────────────────────────────────────────────

function Calculadoras() {
  const { entries, investments, accountBalances } = useAppContext();
  const { freedom } = useIntelligence();

  const [renda5030, setRenda5030] = useState('');
  const renda = parseFloat(renda5030.replace(',', '.')) || 0;

  const burnRateMonthly = useMemo(() => {
    const now = new Date();
    const ago90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const recent = entries.filter((e) => e.type === 'despesa' && new Date(e.date) >= ago90);
    const total = recent.reduce((s, e) => s + Math.abs(e.value), 0);
    return total / 3;
  }, [entries]);

  const totalBalance = useMemo(() => Object.values(accountBalances).reduce((s: number, v: number) => s + v, 0), [accountBalances]);
  const totalInvested = useMemo(() => investments.reduce((s, i) => s + ((i as any).currentValue ?? i.amount ?? 0), 0), [investments]);
  const reservaAtual = totalBalance + totalInvested;

  const [metaGastos, setMetaGastos] = useState('');
  const [aporteIF, setAporteIF]     = useState('');
  const [retornoIF, setRetornoIF]   = useState('10');
  const gastosIF      = parseFloat(metaGastos.replace(',', '.')) || 0;
  const aporteIFNum   = parseFloat(aporteIF.replace(',', '.')) || 0;
  const retornoIFNum  = (parseFloat(retornoIF) || 10) / 100;
  const patrimonioAlvo  = gastosIF > 0 ? gastosIF * 12 * 25 : 0;
  const patrimonioAtual = totalInvested;

  const mesesIF = useMemo(() => {
    if (!patrimonioAlvo || !aporteIFNum || retornoIFNum <= 0) return null;
    const r = retornoIFNum / 12;
    let n = 0; let pv = patrimonioAtual;
    while (pv < patrimonioAlvo && n < 1200) { pv = pv * (1 + r) + aporteIFNum; n++; }
    return n < 1200 ? n : null;
  }, [patrimonioAlvo, patrimonioAtual, aporteIFNum, retornoIFNum]);

  const [jcCapital, setJcCapital] = useState('');
  const [jcAporte, setJcAporte]   = useState('');
  const [jcTaxa, setJcTaxa]       = useState('10');
  const [jcAnos, setJcAnos]       = useState('10');
  const jcFV = useMemo(() => {
    const pv  = parseFloat(jcCapital.replace(',', '.')) || 0;
    const pmt = parseFloat(jcAporte.replace(',', '.')) || 0;
    const r   = (parseFloat(jcTaxa) || 10) / 100 / 12;
    const n   = (parseInt(jcAnos) || 10) * 12;
    if (r <= 0) return pv + pmt * n;
    return pv * Math.pow(1 + r, n) + pmt * ((Math.pow(1 + r, n) - 1) / r);
  }, [jcCapital, jcAporte, jcTaxa, jcAnos]);
  const jcTotal = (parseFloat(jcCapital.replace(',', '.')) || 0) + (parseFloat(jcAporte.replace(',', '.')) || 0) * (parseInt(jcAnos) || 10) * 12;

  const inputCls = 'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20';
  const labelCls = 'text-[11px] font-bold text-zinc-500 uppercase tracking-widest block mb-1.5';

  return (
    <div className="space-y-4">
      <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">4 calculadoras com seus dados reais</p>

      {/* 50-30-20 */}
      <div className="bg-si-card border border-si-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-emerald-400" />
          <p className="text-sm font-bold text-zinc-200">Regra 50-30-20</p>
        </div>
        <div>
          <label className={labelCls}>Renda mensal líquida (R$)</label>
          <input type="number" value={renda5030} onChange={(e) => setRenda5030(e.target.value)} placeholder={burnRateMonthly > 0 ? burnRateMonthly.toFixed(0) : '5000'} className={inputCls} />
        </div>
        {renda > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Necessidades', pct: 0.5, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { label: 'Desejos', pct: 0.3, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { label: 'Investir', pct: 0.2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            ].map(({ label, pct, color, bg }) => (
              <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
                <p className={`text-base font-bold ${color}`}>{fmtBRL(renda * pct)}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">{label}</p>
                <p className={`text-[11px] font-bold ${color} mt-0.5`}>{(pct * 100).toFixed(0)}%</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reserva de emergência */}
      <div className="bg-si-card border border-si-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-400" />
          <p className="text-sm font-bold text-zinc-200">Reserva de emergência</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/[0.03] rounded-xl p-3">
            <p className="text-[11px] text-zinc-500 uppercase tracking-widest">Gasto médio/mês</p>
            <p className="text-base font-bold text-zinc-200 mt-0.5">{fmtBRL(burnRateMonthly)}</p>
            <p className="text-[11px] text-zinc-600 mt-0.5">últimos 90 dias</p>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-3">
            <p className="text-[11px] text-zinc-500 uppercase tracking-widest">Ld atual</p>
            <p className="text-base font-bold text-zinc-200 mt-0.5">{Math.round(freedom.days)} dias</p>
            <p className="text-[11px] text-zinc-600 mt-0.5">{freedom.status}</p>
          </div>
        </div>
        {burnRateMonthly > 0 && (
          <div className="space-y-2">
            {[3, 6, 12].map((months) => {
              const alvo = burnRateMonthly * months;
              const pct  = Math.min(100, Math.round((reservaAtual / alvo) * 100));
              const ok   = reservaAtual >= alvo;
              return (
                <div key={months} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">{months} meses ({fmtBRL(alvo)})</span>
                    <span className={`text-xs font-bold ${ok ? 'text-emerald-400' : 'text-zinc-500'}`}>{ok ? '✓' : `${pct}%`}</span>
                  </div>
                  <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${ok ? 'bg-emerald-500' : 'bg-white/20'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FIRE */}
      <div className="bg-si-card border border-si-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-rose-400" />
          <p className="text-sm font-bold text-zinc-200">Independência financeira (FIRE)</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Gastos/mês alvo (R$)</label>
            <input type="number" value={metaGastos} onChange={(e) => setMetaGastos(e.target.value)} placeholder={burnRateMonthly > 0 ? burnRateMonthly.toFixed(0) : '5000'} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Aporte mensal (R$)</label>
            <input type="number" value={aporteIF} onChange={(e) => setAporteIF(e.target.value)} placeholder="1000" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Retorno real/ano (%)</label>
            <input type="number" value={retornoIF} onChange={(e) => setRetornoIF(e.target.value)} className={inputCls} />
          </div>
          <div className="flex flex-col justify-end">
            <p className="text-[11px] text-zinc-500 uppercase tracking-widest">Patrimônio atual</p>
            <p className="text-sm font-bold text-zinc-200 mt-0.5">{fmtBRL(patrimonioAtual)}</p>
          </div>
        </div>
        {patrimonioAlvo > 0 && (
          <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] text-zinc-500 uppercase tracking-widest">Patrimônio alvo (25×)</p>
                <p className="text-xl font-bold text-white">{fmtBRL(patrimonioAlvo)}</p>
              </div>
              {mesesIF !== null && (
                <div className="text-right">
                  <p className="text-[11px] text-zinc-500 uppercase tracking-widest">Estimativa</p>
                  <p className="text-sm font-bold text-emerald-400">
                    {Math.round(mesesIF / 12)} anos{mesesIF % 12 > 0 ? ` e ${mesesIF % 12}m` : ''}
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-zinc-500">
                <span>Progresso</span>
                <span>{Math.min(100, Math.round((patrimonioAtual / patrimonioAlvo) * 100))}%</span>
              </div>
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(100, (patrimonioAtual / patrimonioAlvo) * 100)}%` }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Juros compostos */}
      <div className="bg-si-card border border-si-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-violet-400" />
          <p className="text-sm font-bold text-zinc-200">Juros compostos</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Capital inicial (R$)', val: jcCapital, set: setJcCapital, ph: '10000' },
            { label: 'Aporte mensal (R$)', val: jcAporte, set: setJcAporte, ph: '500' },
            { label: 'Taxa anual (%)', val: jcTaxa, set: setJcTaxa, ph: '10' },
            { label: 'Prazo (anos)', val: jcAnos, set: setJcAnos, ph: '10' },
          ].map(({ label, val, set, ph }) => (
            <div key={label}>
              <label className={labelCls}>{label}</label>
              <input type="number" value={val} onChange={(e) => set(e.target.value)} placeholder={ph} className={inputCls} />
            </div>
          ))}
        </div>
        {jcFV > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-[11px] text-zinc-500 uppercase tracking-widest">Total investido</p>
              <p className="text-base font-bold text-zinc-300">{fmtBRL(jcTotal)}</p>
            </div>
            <div className="bg-violet-500/10 border border-violet-500/15 rounded-xl p-3">
              <p className="text-[11px] text-zinc-500 uppercase tracking-widest">Valor final</p>
              <p className="text-base font-bold text-violet-400">{fmtBRL(jcFV)}</p>
            </div>
            <div className="col-span-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3">
              <p className="text-[11px] text-zinc-500 uppercase tracking-widest">Juros gerados</p>
              <p className="text-lg font-bold text-emerald-400">{fmtBRL(jcFV - jcTotal)}</p>
              {jcTotal > 0 && (
                <p className="text-[11px] text-zinc-600 mt-0.5">×{(jcFV / jcTotal).toFixed(1)} vezes o investido</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Glossário ────────────────────────────────────────────────────────────────

function Glossario() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = GLOSSARY.filter((term) => {
    const matchSearch = term.term.toLowerCase().includes(search.toLowerCase()) ||
      term.definition.toLowerCase().includes(search.toLowerCase());
    const matchCat = filter === 'all' || term.category === filter;
    return matchSearch && matchCat;
  });

  const cats = [
    { id: 'all', label: 'Todos' },
    { id: 'sibanki', label: 'Sibanki' },
    { id: 'investimentos', label: 'Investimentos' },
    { id: 'crédito', label: 'Crédito' },
    { id: 'geral', label: 'Geral' },
  ];

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar termo…"
        className="w-full bg-si-card border border-si-border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {cats.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setFilter(c.id)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 transition-colors ${filter === c.id ? 'bg-white/[0.12] text-white border border-white/[0.15]' : 'bg-white/[0.04] text-zinc-500 border border-white/[0.06] hover:bg-white/[0.07]'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((term) => (
          <div key={term.term} className="bg-si-card border border-si-border rounded-xl p-4">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <p className="text-sm font-bold text-zinc-200">{term.term}</p>
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 ${
                term.category === 'sibanki'       ? 'bg-blue-500/10 text-blue-400' :
                term.category === 'investimentos' ? 'bg-violet-500/10 text-violet-400' :
                term.category === 'crédito'       ? 'bg-amber-500/10 text-amber-400' :
                'bg-zinc-500/10 text-zinc-400'
              }`}>
                {term.category}
              </span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">{term.definition}</p>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-zinc-500">Nenhum termo encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

type Tab = 'inicio' | 'trilhas' | 'calculadoras' | 'glossario';

export default function Education() {
  const navigate = useNavigate();
  const { metrics, isCompleted, getRecord, nextLesson, completeLesson } = useEducationProgress();
  const [activeTab, setActiveTab]     = useState<Tab>('inicio');
  const [lessonViewer, setLessonViewer] = useState<{ trailId: string; lessonId: string } | null>(null);

  const openLesson = useCallback((trailId: string, lessonId: string) => {
    setLessonViewer({ trailId, lessonId });
  }, []);

  const handleComplete = useCallback(async (answers: number[]) => {
    if (!lessonViewer) return;
    await completeLesson(lessonViewer.lessonId, answers);
  }, [lessonViewer, completeLesson]);

  const tabs: { id: Tab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'inicio', label: 'Início', icon: BookOpen },
    { id: 'trilhas', label: 'Trilhas', icon: Flame },
    { id: 'calculadoras', label: 'Calculadoras', icon: Calculator },
    { id: 'glossario', label: 'Glossário', icon: BookMarked },
  ];

  return (
    <div className="min-h-screen bg-si-bg pb-20">
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-white">Educação Financeira</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {metrics.completedCount > 0
              ? `${metrics.completedCount} de ${metrics.totalCount} lições · ${metrics.xp} XP · Nível ${metrics.level}`
              : '5 trilhas · 22 lições · conteúdo personalizado para seu perfil'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-si-card border border-si-border rounded-xl p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all ${activeTab === id ? 'bg-white/[0.1] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* ── INÍCIO ── */}
        {activeTab === 'inicio' && (
          <div className="space-y-4">
            <LevelBadge
              level={metrics.level}
              xp={metrics.xp}
              xpProgress={metrics.xpProgress}
              xpToNext={metrics.xpToNext}
            />

            {metrics.completedCount > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: metrics.completedCount, label: 'Lições' },
                  { val: metrics.completedTrails.length, label: 'Trilhas' },
                  { val: `${metrics.avgQuiz}%`, label: 'Quiz médio' },
                ].map(({ val, label }) => (
                  <div key={label} className="bg-si-card border border-si-border rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-zinc-200">{val}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Próxima lição */}
            {nextLesson && (() => {
              const found = findLesson(nextLesson.lessonId);
              if (!found) return null;
              const { trail, lesson } = found;
              return (
                <div className="bg-si-card border border-si-border rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/[0.06]">
                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                      {metrics.completedCount === 0 ? 'Por onde começar' : 'Próxima lição recomendada'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openLesson(trail.id, lesson.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors text-left"
                  >
                    <div className={`w-12 h-12 rounded-xl ${trail.color} flex items-center justify-center shrink-0`}>
                      <RenderEducationIcon icon={lesson.icon} className="w-5 h-5 text-white shrink-0" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-200 leading-tight">{lesson.title}</p>
                      <p className={`text-[11px] font-bold uppercase tracking-widest mt-0.5 ${trail.textColor}`}>{trail.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-zinc-600 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> {lesson.duration}
                        </span>
                        <span className="text-[11px] text-amber-500/70 flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5" /> {lesson.xp} XP
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-600 shrink-0" />
                  </button>
                </div>
              );
            })()}

            <DiagnosticCard onClick={() => setActiveTab('trilhas')} />

            {/* Progresso por trilha */}
            <div className="bg-si-card border border-si-border rounded-2xl p-5 space-y-3">
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Progresso por trilha</p>
              <div className="space-y-3">
                {TRAILS.map((trail) => {
                  const tp = metrics.trailProgress[trail.id] ?? { pct: 0, completed: 0, total: trail.lessons.length };
                  return (
                    <button
                      key={trail.id}
                      type="button"
                      onClick={() => setActiveTab('trilhas')}
                      className="w-full flex items-center gap-3 text-left"
                    >
                      <RenderEducationIcon icon={trail.icon} className="w-4 h-4 text-zinc-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-bold text-zinc-400 truncate">{trail.title}</p>
                          <span className="text-[11px] text-zinc-600 shrink-0 ml-2">{tp.completed}/{tp.total}</span>
                        </div>
                        <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${tp.pct === 100 ? 'bg-emerald-500' : 'bg-white/20'}`}
                            style={{ width: `${tp.pct}%` }}
                          />
                        </div>
                      </div>
                      {tp.pct === 100 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/consultor-ia')}
              className="w-full flex items-center gap-3 p-4 bg-si-card border border-si-border rounded-2xl hover:bg-white/[0.03] transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-zinc-200">Aprofundar com o Consultor IA</p>
                <p className="text-xs text-zinc-500 mt-0.5">Tire dúvidas sobre qualquer conteúdo das trilhas</p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600" />
            </button>
          </div>
        )}

        {/* ── TRILHAS ── */}
        {activeTab === 'trilhas' && (
          <div className="space-y-3">
            {TRAILS.map((trail) => (
              <TrailCard
                key={trail.id}
                trail={trail}
                trailProgress={metrics.trailProgress[trail.id] ?? { completed: 0, total: trail.lessons.length, pct: 0 }}
                onLessonClick={openLesson}
                isCompleted={isCompleted}
              />
            ))}
          </div>
        )}

        {/* ── CALCULADORAS ── */}
        {activeTab === 'calculadoras' && <Calculadoras />}

        {/* ── GLOSSÁRIO ── */}
        {activeTab === 'glossario' && <Glossario />}

      </div>

      {/* Modal de lição */}
      {lessonViewer && (
        <LessonViewer
          trailId={lessonViewer.trailId}
          lessonId={lessonViewer.lessonId}
          onClose={() => setLessonViewer(null)}
          onComplete={handleComplete}
          alreadyCompleted={isCompleted(lessonViewer.lessonId)}
          record={getRecord(lessonViewer.lessonId)}
        />
      )}
    </div>
  );
}
