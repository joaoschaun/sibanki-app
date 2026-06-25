/**
 * useEducationProgress — Progresso de educação financeira do usuário.
 *
 * Persiste no localStorage com TODO de migração para Firestore.
 * Estrutura: { [lessonId]: { completedAt, quizScore, quizAnswers } }
 *
 * XP = soma dos xp das lições concluídas.
 * Level = Math.floor(xp / 100) + 1 (cada 100 XP = 1 nível).
 */

import { useMemo, useCallback, useState } from 'react';
import { TRAILS, ALL_LESSONS, TOTAL_XP, type Trail } from '../constants/educationContent';
import { useAppContext } from '../context/AppContext';
import { httpsCallable } from 'firebase/functions';
import { fnsBR } from '../firebase';

// ─── tipos ────────────────────────────────────────────────────────────────────

export interface LessonRecord {
  completedAt: string;  // ISO
  quizScore: number;    // 0-100 (% corretas)
  quizAnswers: number[]; // índices das respostas do usuário
}

interface ProgressStore {
  [lessonId: string]: LessonRecord;
}

// ─── chave localStorage ───────────────────────────────────────────────────────

const LS_KEY = 'sibanki_education_progress';

function load(): ProgressStore {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(store: ProgressStore): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(store));
  } catch {
    // quota exceeded — ignore silently
  }
}

// ─── hook ─────────────────────────────────────────────────────────────────────

export function useEducationProgress() {
  const { user } = useAppContext();
  const [progress, setProgressState] = useState<ProgressStore>(load);

  /** Marca lição como concluída com o resultado do quiz. */
  const completeLesson = useCallback(
    async (lessonId: string, quizAnswers: number[]) => {
      const lesson = ALL_LESSONS.find((l) => l.id === lessonId);
      if (!lesson) return;

      // Calcula % corretas
      const correct = lesson.quiz.reduce(
        (cnt, q, i) => cnt + (quizAnswers[i] === q.correct ? 1 : 0),
        0,
      );
      const quizScore = lesson.quiz.length > 0
        ? Math.round((correct / lesson.quiz.length) * 100)
        : 100;

      const record: LessonRecord = {
        completedAt: new Date().toISOString(),
        quizScore,
        quizAnswers,
      };

      const next = { ...progress, [lessonId]: record };
      setProgressState(next);
      save(next);

      // Bonus SibCoin na primeira conclusão
      if (!progress[lessonId] && user?.uid) {
        try {
          const trigger = httpsCallable<{ event: string; metadata?: object }, unknown>(
            fnsBR,
            'triggerSibcoinEvent',
          );
          await trigger({ event: 'consultor_usado', metadata: { lessonId, quizScore } });
        } catch {
          // SibCoin é nice-to-have — não bloqueia
        }
      }
    },
    [progress, user],
  );

  /** Reseta progresso de uma lição (para repetir). */
  const resetLesson = useCallback((lessonId: string) => {
    const next = { ...progress };
    delete next[lessonId];
    setProgressState(next);
    save(next);
  }, [progress]);

  /** Verifica se lição está completa. */
  const isCompleted = useCallback(
    (lessonId: string) => !!progress[lessonId],
    [progress],
  );

  /** Registro de uma lição concluída. */
  const getRecord = useCallback(
    (lessonId: string): LessonRecord | undefined => progress[lessonId],
    [progress],
  );

  // ── Métricas derivadas ────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const completedIds = Object.keys(progress);
    const completedLessons = ALL_LESSONS.filter((l) => completedIds.includes(l.id));

    const xp = completedLessons.reduce((s, l) => s + l.xp, 0);
    const level = Math.floor(xp / 100) + 1;
    const xpToNext = 100 - (xp % 100);
    const xpProgress = xp % 100; // dentro do nível atual

    const avgQuiz =
      completedLessons.length > 0
        ? Math.round(
            completedLessons.reduce((s, l) => s + (progress[l.id]?.quizScore ?? 0), 0) /
              completedLessons.length,
          )
        : 0;

    const trailProgress: Record<string, { completed: number; total: number; pct: number }> = {};
    for (const trail of TRAILS) {
      const comp = trail.lessons.filter((l) => completedIds.includes(l.id)).length;
      trailProgress[trail.id] = {
        completed: comp,
        total: trail.lessons.length,
        pct: trail.lessons.length > 0 ? Math.round((comp / trail.lessons.length) * 100) : 0,
      };
    }

    const completedTrails = TRAILS.filter(
      (t) => t.lessons.every((l) => completedIds.includes(l.id)),
    );

    const overallPct = ALL_LESSONS.length > 0
      ? Math.round((completedLessons.length / ALL_LESSONS.length) * 100)
      : 0;

    return {
      xp,
      totalXp: TOTAL_XP,
      level,
      xpToNext,
      xpProgress,
      avgQuiz,
      completedCount: completedLessons.length,
      totalCount: ALL_LESSONS.length,
      overallPct,
      trailProgress,
      completedTrails,
    };
  }, [progress]);

  /** Próxima lição recomendada (primeiro não completado na sequência). */
  const nextLesson = useMemo((): { trail: Trail; lessonId: string } | null => {
    for (const trail of TRAILS) {
      for (const lesson of trail.lessons) {
        if (!progress[lesson.id]) {
          return { trail, lessonId: lesson.id };
        }
      }
    }
    return null;
  }, [progress]);

  return {
    progress,
    completeLesson,
    resetLesson,
    isCompleted,
    getRecord,
    metrics,
    nextLesson,
  };
}
