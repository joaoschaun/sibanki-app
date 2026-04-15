import type { InvestorProfile, InvestorProfileAnswers } from '../types/userData';

export const DEFAULT_INVESTOR_PROFILE_ANSWERS: InvestorProfileAnswers = {
  objetivos: 'preservar-capital',
  horizonte: '>5',
  toleranciaQueda: 'media',
  experiencia: 'iniciante',
  liquidez: 'media',
  renda: 'media',
};

export function computeInvestorProfileFromAnswers(answers: InvestorProfileAnswers): InvestorProfile {
  let score = 0;
  if (answers.objetivos === 'preservar-capital') score += 5;
  if (answers.objetivos === 'crescimento') score += 15;
  if (answers.objetivos === 'especulacao') score += 25;
  if (answers.horizonte === '<2') score += 5;
  if (answers.horizonte === '2-5') score += 10;
  if (answers.horizonte === '>5') score += 20;
  if (answers.toleranciaQueda === 'baixa') score += 5;
  if (answers.toleranciaQueda === 'media') score += 10;
  if (answers.toleranciaQueda === 'alta') score += 20;
  if (answers.experiencia === 'iniciante') score += 5;
  if (answers.experiencia === 'intermediario') score += 10;
  if (answers.experiencia === 'avancado') score += 15;
  if (answers.liquidez === 'alta') score += 5;
  if (answers.liquidez === 'media') score += 10;
  if (answers.liquidez === 'baixa') score += 15;
  if (answers.renda === 'baixa') score += 5;
  if (answers.renda === 'media') score += 10;
  if (answers.renda === 'alta') score += 15;
  const normalized = Math.max(0, Math.min(100, score));
  let profile: InvestorProfile['profile'];
  if (normalized <= 30) profile = 'conservador';
  else if (normalized <= 65) profile = 'moderado';
  else profile = 'arrojado';
  return { profile, score: normalized, version: 1, updatedAt: new Date().toISOString(), answers };
}
