import { useMemo, useState } from 'react';
import { BookOpen, Lightbulb, PiggyBank, TrendingUp, Shield, Target, CheckCircle2, PlayCircle, Award } from 'lucide-react';

const TIPS = [
  {
    icon: PiggyBank,
    title: 'Reserva de emergência',
    text: 'Guarde o equivalente a 3 a 6 meses dos seus gastos em aplicação de liquidez (poupança, CDB, Tesouro Selic). Use só em imprevistos reais.',
    color: 'bg-emerald-500/20 text-emerald-400',
  },
  {
    icon: Target,
    title: 'Regra 50-30-20',
    text: '50% da renda para necessidades (moradia, alimentação, transporte), 30% para desejos (lazer, assinaturas) e 20% para poupar e investir.',
    color: 'bg-blue-500/20 text-blue-400',
  },
  {
    icon: Shield,
    title: 'Evite o rotativo do cartão',
    text: 'Os juros do rotativo estão entre os mais altos do mercado. Se não puder pagar a fatura inteira, prefira parcelar no carnê ou usar linha de crédito mais barata.',
    color: 'bg-amber-500/20 text-amber-400',
  },
  {
    icon: TrendingUp,
    title: 'Invista de forma consistente',
    text: 'Aplicar todo mês, mesmo que pouco, com disciplina costuma trazer melhores resultados do que esperar “o momento certo” ou tentar acertar o mercado.',
    color: 'bg-violet-500/20 text-violet-400',
  },
  {
    icon: Lightbulb,
    title: 'Revise assinaturas e custos fixos',
    text: 'Streaming, academia, seguros e planos que você não usa podem ser cortados ou trocados por opções mais baratas. Faça uma revisão semestral.',
    color: 'bg-rose-500/20 text-rose-400',
  },
  {
    icon: BookOpen,
    title: 'Metas claras e prazos',
    text: 'Defina metas específicas (ex.: “viagem R$ 5 mil em 12 meses”) e acompanhe no app. Metas com valor e prazo têm muito mais chance de ser alcançadas.',
    color: 'bg-cyan-500/20 text-cyan-400',
  },
];

const COURSES = [
  { id: 'c1', title: 'Fundamentos do orçamento', lessons: 4, xp: 120 },
  { id: 'c2', title: 'Cartão e crédito consciente', lessons: 3, xp: 90 },
  { id: 'c3', title: 'Reserva e investimentos iniciais', lessons: 5, xp: 150 },
];

const PROGRESS_KEY = 'sibanki_edu_done_courses';

function readDoneCourses(): string[] {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function writeDoneCourses(done: string[]) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(done));
  } catch {
    // Ignora erro de armazenamento local.
  }
}

export default function Education() {
  const [doneCourses, setDoneCourses] = useState<string[]>(() => readDoneCourses());
  const [calcIncome, setCalcIncome] = useState('5000');
  const [calcFixedCost, setCalcFixedCost] = useState('3000');
  const [calcEmergencyMonths, setCalcEmergencyMonths] = useState('6');
  const totalXp = useMemo(
    () => COURSES.filter((c) => doneCourses.includes(c.id)).reduce((sum, c) => sum + c.xp, 0),
    [doneCourses]
  );
  const level = Math.max(1, Math.floor(totalXp / 100) + 1);
  const levelBase = (level - 1) * 100;
  const nextLevelXp = level * 100;
  const xpInLevel = totalXp - levelBase;
  const xpNeed = nextLevelXp - levelBase;
  const progress = Math.max(0, Math.min(100, (xpInLevel / xpNeed) * 100));
  const nextCourse = COURSES.find((c) => !doneCourses.includes(c.id)) ?? null;

  const doneCount = doneCourses.length;
  const allDone = doneCount >= COURSES.length;
  const firstDone = doneCourses.includes(COURSES[0]?.id ?? 'c1');
  const twoDone = doneCount >= 2;
  const calcNeeds = (parseFloat(calcIncome.replace(',', '.')) || 0) * 0.5;
  const calcWants = (parseFloat(calcIncome.replace(',', '.')) || 0) * 0.3;
  const calcInvest = (parseFloat(calcIncome.replace(',', '.')) || 0) * 0.2;
  const emergencyTarget =
    (parseFloat(calcFixedCost.replace(',', '.')) || 0) * (parseFloat(calcEmergencyMonths.replace(',', '.')) || 0);

  const toggleCourseDone = (id: string) => {
    setDoneCourses((prev) => {
      const next = prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id];
      writeDoneCourses(next);
      return next;
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-3xl font-bold">Educação financeira</h2>
          <p className="text-si-5 text-sm">Dicas e bons hábitos para suas finanças</p>
        </div>
      </div>

      <section className="bg-si-card rounded-2xl border border-si-border p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-si-1">Nível de aprendizagem</h3>
            <p className="text-si-5 text-sm">Evolua concluindo trilhas de educação financeira.</p>
          </div>
          <span className="text-sm font-semibold text-amber-400">Nível {level}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-si-over-3 overflow-hidden mb-2">
          <div className="h-full bg-amber-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-si-5">
          XP: {totalXp} · {xpInLevel}/{xpNeed} para o próximo nível
        </p>
      </section>

      <section className="bg-si-card rounded-2xl border border-si-border p-6">
        <h3 className="text-lg font-bold text-si-1 mb-3">Continuar de onde parou</h3>
        {nextCourse ? (
          <div className="flex items-center justify-between gap-4 bg-si-over-2 rounded-xl border border-si-border-md p-4">
            <div>
              <p className="text-si-1 font-medium">{nextCourse.title}</p>
              <p className="text-xs text-si-5">{nextCourse.lessons} aulas · {nextCourse.xp} XP</p>
            </div>
            <button type="button" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-si-1 text-sm font-medium">
              <PlayCircle className="w-4 h-4" /> Continuar
            </button>
          </div>
        ) : (
          <p className="text-sm text-emerald-400">Todas as trilhas concluídas. Excelente progresso!</p>
        )}
      </section>

      <section className="bg-si-card rounded-2xl border border-si-border p-6">
        <h3 className="text-lg font-bold text-si-1 mb-4">Trilhas recomendadas</h3>
        <div className="space-y-3">
          {COURSES.map((course) => {
            const done = doneCourses.includes(course.id);
            return (
              <div key={course.id} className="flex items-center justify-between gap-4 p-4 rounded-xl bg-si-over-2 border border-si-border-md">
                <div className="min-w-0">
                  <p className="text-si-1 font-medium truncate">{course.title}</p>
                  <p className="text-xs text-si-5">{course.lessons} aulas · {course.xp} XP</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleCourseDone(course.id)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border ${done ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-si-over-2 text-si-3 border-si-border-md hover:bg-si-over-3'}`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {done ? 'Concluído' : 'Marcar concluído'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-si-card rounded-2xl border border-si-border p-6">
        <h3 className="text-lg font-bold text-si-1 mb-3 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          Conquistas
        </h3>
        <p className="text-si-5 text-sm mb-4">Badges desbloqueadas conforme você completa as trilhas.</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-si-over-2 border border-si-border-md">
            <div className="min-w-0">
              <p className="text-si-2 font-semibold">Primeira trilha</p>
              <p className="text-xs text-si-5 mt-1">Conclua 1 curso</p>
            </div>
            <span className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border ${
              firstDone ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-si-over-2 text-si-4 border-si-border-md'
            }`}>
              <CheckCircle2 className="w-4 h-4" /> {firstDone ? 'Desbloqueado' : 'Bloqueado'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-si-over-2 border border-si-border-md">
            <div className="min-w-0">
              <p className="text-si-2 font-semibold">Ritmo consistente</p>
              <p className="text-xs text-si-5 mt-1">Conclua 2 cursos</p>
            </div>
            <span className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border ${
              twoDone ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-si-over-2 text-si-4 border-si-border-md'
            }`}>
              <CheckCircle2 className="w-4 h-4" /> {twoDone ? 'Desbloqueado' : 'Bloqueado'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-si-over-2 border border-si-border-md">
            <div className="min-w-0">
              <p className="text-si-2 font-semibold">Trilha completa</p>
              <p className="text-xs text-si-5 mt-1">Conclua todos os cursos</p>
            </div>
            <span className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border ${
              allDone ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-si-over-2 text-si-4 border-si-border-md'
            }`}>
              <CheckCircle2 className="w-4 h-4" /> {allDone ? 'Desbloqueado' : 'Bloqueado'}
            </span>
          </div>
        </div>
      </section>

      <section className="bg-si-card rounded-2xl border border-si-border p-6">
        <h3 className="text-lg font-bold text-si-1 mb-4">Calculadoras financeiras</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-si-border-md bg-si-bg p-4">
            <p className="text-sm font-semibold text-si-1 mb-3">Regra 50-30-20</p>
            <label htmlFor="calc-income" className="block text-xs text-si-5 mb-1">Renda mensal (R$)</label>
            <input
              id="calc-income"
              type="text"
              inputMode="decimal"
              value={calcIncome}
              onChange={(e) => setCalcIncome(e.target.value.replace(/[^0-9,.-]/, ''))}
              className="w-full px-3 py-2 rounded-lg bg-si-card border border-si-border-md text-sm text-si-1 mb-3"
            />
            <ul className="text-xs text-si-4 space-y-1">
              <li>Necessidades (50%): R$ {calcNeeds.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</li>
              <li>Desejos (30%): R$ {calcWants.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</li>
              <li>Poupar/Investir (20%): R$ {calcInvest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</li>
            </ul>
          </div>
          <div className="rounded-xl border border-si-border-md bg-si-bg p-4">
            <p className="text-sm font-semibold text-si-1 mb-3">Reserva de emergência</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label htmlFor="calc-fixed" className="block text-xs text-si-5 mb-1">Gastos fixos (R$)</label>
                <input
                  id="calc-fixed"
                  type="text"
                  inputMode="decimal"
                  value={calcFixedCost}
                  onChange={(e) => setCalcFixedCost(e.target.value.replace(/[^0-9,.-]/, ''))}
                  className="w-full px-3 py-2 rounded-lg bg-si-card border border-si-border-md text-sm text-si-1"
                />
              </div>
              <div>
                <label htmlFor="calc-months" className="block text-xs text-si-5 mb-1">Meses alvo</label>
                <input
                  id="calc-months"
                  type="text"
                  inputMode="numeric"
                  value={calcEmergencyMonths}
                  onChange={(e) => setCalcEmergencyMonths(e.target.value.replace(/[^\d]/g, ''))}
                  className="w-full px-3 py-2 rounded-lg bg-si-card border border-si-border-md text-sm text-si-1"
                />
              </div>
            </div>
            <p className="text-xs text-si-4">
              Meta estimada: <span className="text-si-2 font-semibold">R$ {emergencyTarget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TIPS.map((tip, i) => (
          <div
            key={i}
            className="bg-si-card rounded-2xl border border-si-border p-6 flex flex-col gap-4"
          >
            <div className={`p-3 rounded-xl w-fit ${tip.color}`}>
              <tip.icon className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-si-1">{tip.title}</h3>
            <p className="text-si-4 text-sm leading-relaxed flex-1">{tip.text}</p>
          </div>
        ))}
      </div>

      <div className="bg-si-card rounded-2xl border border-si-border p-6 text-center text-si-5 text-sm">
        Use o <strong className="text-si-3">Consultor IA</strong> no menu para dúvidas personalizadas com base nos seus dados (receitas, despesas, metas).
      </div>
    </div>
  );
}
