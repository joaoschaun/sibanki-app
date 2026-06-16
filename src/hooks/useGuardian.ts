/**
 * useGuardian — F0 Guardião Financeiro (web-first, sem GPS background).
 *
 * Avalia as regras configuradas pelo usuário contra os gastos do mês atual.
 * Dispara um alerta quando o gasto de uma categoria atinge o threshold % do orçamento.
 * Cooldown via localStorage (não grava no Firestore — zero custo extra).
 *
 * F0 roda ao montar (onLoad) — sem geolocalização, sem background.
 * F1+ (background GPS) = useSentinelaGeo.ts, apenas em nativo.
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import type { GuardianRule } from '../types/userData';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface GuardianAlert {
  rule: GuardianRule;
  /** % gasto da categoria no mês (ex: 87.3) */
  spentPct: number;
  /** Valor gasto no mês (R$) */
  spentAmount: number;
  /** Limite orçado para a categoria (R$) */
  budgetAmount: number;
  /** Quanto falta para o limite (R$) */
  remaining: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cooldownKey(uid: string, ruleId: string): string {
  return `sib_guardian_cooldown_${uid}_${ruleId}`;
}

function isCooldownActive(uid: string, ruleId: string, cooldownHours: number): boolean {
  try {
    const raw = localStorage.getItem(cooldownKey(uid, ruleId));
    if (!raw) return false;
    const lastFired = Number(raw);
    const elapsed = (Date.now() - lastFired) / 3_600_000; // ms → horas
    return elapsed < cooldownHours;
  } catch {
    return false;
  }
}

function setCooldown(uid: string, ruleId: string): void {
  try {
    localStorage.setItem(cooldownKey(uid, ruleId), String(Date.now()));
  } catch {
    /* localStorage indisponível — sem cooldown (alerta pode repetir) */
  }
}

/** Calcula totais de despesa por categoria no mês atual. */
function computeCatTotals(
  entries: ReturnType<typeof useAppContext>['entries'],
): Record<string, number> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const totals: Record<string, number> = {};
  for (const e of entries) {
    if (e.type !== 'despesa') continue;
    if (!e.date || !e.date.startsWith(yearMonth)) continue;
    const cat = e.category || 'Outros';
    totals[cat] = (totals[cat] ?? 0) + (e.value ?? 0);
  }
  return totals;
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useGuardian() {
  const { user, data, entries, budgets } = useAppContext();
  const [alert, setAlert] = useState<GuardianAlert | null>(null);
  const [checked, setChecked] = useState(false);

  const catTotals = useMemo(() => computeCatTotals(entries), [entries]);

  // Avalia as regras e retorna o primeiro alerta que deve disparar
  const evaluate = useCallback((): GuardianAlert | null => {
    if (!user?.uid || !data?.guardianConfig?.enabled) return null;
    const { rules } = data.guardianConfig;
    if (!rules?.length) return null;

    for (const rule of rules) {
      if (!rule.enabled) continue;
      const budgetLimit = Number((budgets as Record<string, unknown>)[rule.category] ?? 0);
      if (budgetLimit <= 0) continue; // sem orçamento configurado para a categoria

      const spent = catTotals[rule.category] ?? 0;
      const pct = (spent / budgetLimit) * 100;

      if (pct < rule.thresholdPct) continue; // ainda abaixo do threshold

      if (isCooldownActive(user.uid, rule.id, rule.cooldownHours)) continue; // em cooldown

      return {
        rule,
        spentPct: Math.round(pct * 10) / 10,
        spentAmount: spent,
        budgetAmount: budgetLimit,
        remaining: Math.max(0, budgetLimit - spent),
      };
    }
    return null;
  }, [user?.uid, data?.guardianConfig, budgets, catTotals]);

  // Roda uma única vez quando os dados estiverem prontos
  useEffect(() => {
    if (checked) return;
    if (!user?.uid || !data) return; // dados ainda carregando
    setChecked(true);

    const result = evaluate();
    if (result) setAlert(result);
  }, [checked, user?.uid, data, evaluate]);

  const dismissAlert = useCallback(() => {
    if (!alert || !user?.uid) return;
    setCooldown(user.uid, alert.rule.id);
    setAlert(null);
  }, [alert, user?.uid]);

  return { alert, dismissAlert };
}
