import { useMemo } from 'react';
import type { InvestorProfile, InvestorProfileAnswers } from '../../types/userData';
import { computeInvestorProfileFromAnswers } from '../../utils/investorProfileFromAnswers';
import { formatFirestoreDatePtBR } from '../../utils/firestoreDate';

const labelCls = 'block text-xs font-medium text-si-5 mb-1';
const inputCls =
  'w-full px-4 py-2.5 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500 text-sm';

export interface InvestorProfileFormProps {
  answers: InvestorProfileAnswers;
  setAnswers: React.Dispatch<React.SetStateAction<InvestorProfileAnswers>>;
  currentProfile: InvestorProfile | undefined;
  busy: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
}

export function InvestorProfileForm({
  answers,
  setAnswers,
  currentProfile,
  busy,
  error,
  onSubmit,
}: InvestorProfileFormProps) {
  const preview = useMemo(() => computeInvestorProfileFromAnswers(answers), [answers]);

  return (
    <section id="investidor" className="w-full max-w-3xl scroll-mt-24 rounded-2xl border border-si-border bg-si-card p-6">
      <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-si-4 mb-1">Investimentos</p>
      <h3 className="font-semibold text-si-1 mb-1">Perfil do investidor — Suitability</h3>
      <p className="text-si-5 text-sm mb-4">
        Objetivo, horizonte e tolerância a risco orientam sugestões e o raio X da carteira em Crescimento.
      </p>
      {error && (
        <div className="mb-4 rounded-xl px-4 py-3 text-sm bg-rose-500/10 text-rose-400 border border-rose-500/20">
          {error}
        </div>
      )}
      {currentProfile ? (
        <div className="mb-5 flex items-center gap-4 bg-si-over-1 border border-si-border rounded-xl p-4">
          <div>
            <p className="text-xs text-si-5">Perfil atual</p>
            <p className="text-xl font-bold text-emerald-400 capitalize">{currentProfile.profile}</p>
            <p className="text-xs text-si-5">
              Score {currentProfile.score} · Atualizado em {formatFirestoreDatePtBR(currentProfile.updatedAt)}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-si-5 text-sm mb-4">Responda para descobrir seu perfil de risco.</p>
      )}
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="inv-obj">
              Objetivo principal
            </label>
            <select
              id="inv-obj"
              value={answers.objetivos}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, objetivos: e.target.value as InvestorProfileAnswers['objetivos'] }))
              }
              className={inputCls}
            >
              <option value="preservar-capital">Preservar capital</option>
              <option value="crescimento">Crescimento patrimonial</option>
              <option value="especulacao">Máximo retorno (alto risco)</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="inv-horizonte">
              Horizonte
            </label>
            <select
              id="inv-horizonte"
              value={answers.horizonte}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, horizonte: e.target.value as InvestorProfileAnswers['horizonte'] }))
              }
              className={inputCls}
            >
              <option value="<2">Menos de 2 anos</option>
              <option value="2-5">2 a 5 anos</option>
              <option value=">5">Mais de 5 anos</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="inv-queda">
              Reação a queda de 20%
            </label>
            <select
              id="inv-queda"
              value={answers.toleranciaQueda}
              onChange={(e) =>
                setAnswers((a) => ({
                  ...a,
                  toleranciaQueda: e.target.value as InvestorProfileAnswers['toleranciaQueda'],
                }))
              }
              className={inputCls}
            >
              <option value="baixa">Venderia para reduzir risco</option>
              <option value="media">Manteria a estratégia</option>
              <option value="alta">Aumentaria as posições</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="inv-exp">
              Experiência
            </label>
            <select
              id="inv-exp"
              value={answers.experiencia}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, experiencia: e.target.value as InvestorProfileAnswers['experiencia'] }))
              }
              className={inputCls}
            >
              <option value="iniciante">Iniciante (poupança/CDB)</option>
              <option value="intermediario">Fundos e ações</option>
              <option value="avancado">Derivativos, cripto, alavancagem</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="inv-liquidez">
              Necessidade de liquidez
            </label>
            <select
              id="inv-liquidez"
              value={answers.liquidez}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, liquidez: e.target.value as InvestorProfileAnswers['liquidez'] }))
              }
              className={inputCls}
            >
              <option value="alta">Posso precisar em até 6 meses</option>
              <option value="media">Posso deixar de 1 a 3 anos</option>
              <option value="baixa">Posso investir por mais de 3 anos</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="inv-renda">
              Capacidade de aporte
            </label>
            <select
              id="inv-renda"
              value={answers.renda}
              onChange={(e) => setAnswers((a) => ({ ...a, renda: e.target.value as InvestorProfileAnswers['renda'] }))}
              className={inputCls}
            >
              <option value="baixa">Investimento limitado</option>
              <option value="media">Parte relevante da renda</option>
              <option value="alta">Alta capacidade com reserva sólida</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
          <p className="text-xs text-si-5">
            Sugerido:{' '}
            <span className="font-semibold text-si-2 capitalize">{preview.profile}</span> · score {preview.score}
          </p>
          <button
            type="submit"
            disabled={busy}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-si-1 text-sm font-bold disabled:opacity-50"
          >
            {busy ? 'Salvando…' : currentProfile ? 'Atualizar perfil' : 'Salvar perfil'}
          </button>
        </div>
      </form>
    </section>
  );
}
