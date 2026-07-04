import { ShieldAlert, Plus, X } from 'lucide-react';
import type { GuardianRule } from '../../types/userData';

interface GuardianSectionProps {
  guardianEnabled: boolean;
  guardianRules: GuardianRule[];
  guardianSaving: boolean;
  addingRule: boolean;
  setAddingRule: (v: boolean) => void;
  newRuleCategory: string;
  setNewRuleCategory: (v: string) => void;
  newRuleThreshold: number;
  setNewRuleThreshold: (v: number) => void;
  newRuleCooldown: number;
  setNewRuleCooldown: (v: number) => void;
  budgetKeys: string[];
  onToggleGuardian: (enabled: boolean) => void;
  onToggleRule: (id: string, enabled: boolean) => void;
  onDeleteRule: (id: string) => void;
  onAddRule: () => void;
}

export function GuardianSection({
  guardianEnabled,
  guardianRules,
  guardianSaving,
  addingRule,
  setAddingRule,
  newRuleCategory,
  setNewRuleCategory,
  newRuleThreshold,
  setNewRuleThreshold,
  newRuleCooldown,
  setNewRuleCooldown,
  budgetKeys,
  onToggleGuardian,
  onToggleRule,
  onDeleteRule,
  onAddRule,
}: GuardianSectionProps) {
  return (
    <section className="bg-si-card rounded-2xl border border-si-border p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-si-1 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            Guardião Financeiro
          </h3>
          <p className="text-si-5 text-sm mt-1">
            Alertas no momento da decisão — antes de gastar, não depois.
          </p>
        </div>
        {/* Toggle enable/disable */}
        <button
          type="button"
          onClick={() => onToggleGuardian(!guardianEnabled)}
          disabled={guardianSaving}
          className={[
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 focus:outline-none',
            guardianEnabled
              ? 'border-amber-500 bg-amber-500'
              : 'border-si-border-md bg-si-over-2',
          ].join(' ')}
          aria-label="Ativar Guardião"
        >
          <span
            className={[
              'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200',
              guardianEnabled ? 'translate-x-5' : 'translate-x-0',
            ].join(' ')}
          />
        </button>
      </div>

      {guardianEnabled && (
        <div className="space-y-3">
          {/* Lista de regras */}
          {guardianRules.length > 0 ? (
            <ul className="space-y-2">
              {guardianRules.map((rule) => (
                <li
                  key={rule.id}
                  className="flex items-center justify-between gap-3 bg-si-over-1 rounded-xl px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-si-2 truncate">{rule.label || rule.category}</p>
                    <p className="text-[11px] text-si-5 mt-0.5">
                      Alerta em {rule.thresholdPct}% · cooldown {rule.cooldownHours}h
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* toggle regra */}
                    <button
                      type="button"
                      onClick={() => onToggleRule(rule.id, !rule.enabled)}
                      disabled={guardianSaving}
                      className={[
                        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200',
                        rule.enabled
                          ? 'border-amber-500 bg-amber-500'
                          : 'border-si-border-md bg-si-over-2',
                      ].join(' ')}
                      aria-label={`${rule.enabled ? 'Desativar' : 'Ativar'} regra ${rule.category}`}
                    >
                      <span
                        className={[
                          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200',
                          rule.enabled ? 'translate-x-4' : 'translate-x-0',
                        ].join(' ')}
                      />
                    </button>
                    {/* delete */}
                    <button
                      type="button"
                      onClick={() => onDeleteRule(rule.id)}
                      disabled={guardianSaving}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-si-5 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      aria-label="Remover regra"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            !addingRule && (
              <p className="text-si-5 text-sm text-center py-4 border border-dashed border-si-border rounded-xl">
                Nenhuma regra configurada. Adicione uma categoria para guardar.
              </p>
            )
          )}

          {/* Formulário nova regra */}
          {addingRule ? (
            <div className="bg-si-over-1 rounded-xl p-4 space-y-3 border border-si-border">
              <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-si-5">Nova regra</p>
              {/* Categoria */}
              <div>
                <label className="text-[10px] font-bold tracking-[0.14em] uppercase text-si-5 block mb-1">
                  Categoria
                </label>
                {budgetKeys.length > 0 ? (
                  <select
                    value={newRuleCategory}
                    onChange={(e) => setNewRuleCategory(e.target.value)}
                    className="w-full bg-si-card border border-si-border rounded-lg px-3 py-2 text-sm text-si-2 focus:outline-none focus:border-si-border-md"
                  >
                    <option value="">Selecione…</option>
                    {budgetKeys.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={newRuleCategory}
                    onChange={(e) => setNewRuleCategory(e.target.value)}
                    placeholder="ex: Alimentação"
                    className="w-full bg-si-card border border-si-border rounded-lg px-3 py-2 text-sm text-si-2 placeholder:text-si-5 focus:outline-none focus:border-si-border-md"
                  />
                )}
              </div>
              {/* Threshold */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold tracking-[0.14em] uppercase text-si-5 block mb-1">
                    Alertar em (% do orçamento)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={newRuleThreshold}
                    onChange={(e) => setNewRuleThreshold(Number(e.target.value))}
                    className="w-full bg-si-card border border-si-border rounded-lg px-3 py-2 text-sm text-si-2 focus:outline-none focus:border-si-border-md"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold tracking-[0.14em] uppercase text-si-5 block mb-1">
                    Cooldown (horas)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={168}
                    value={newRuleCooldown}
                    onChange={(e) => setNewRuleCooldown(Number(e.target.value))}
                    className="w-full bg-si-card border border-si-border rounded-lg px-3 py-2 text-sm text-si-2 focus:outline-none focus:border-si-border-md"
                  />
                </div>
              </div>
              {/* Ações */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onAddRule}
                  disabled={!newRuleCategory || guardianSaving}
                  className="flex-1 py-2 rounded-xl text-sm font-medium text-si-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 transition-colors disabled:opacity-40"
                >
                  {guardianSaving ? 'Salvando…' : 'Adicionar regra'}
                </button>
                <button
                  type="button"
                  onClick={() => { setAddingRule(false); setNewRuleCategory(''); }}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-si-4 bg-si-over-2 hover:bg-si-over-3 border border-si-border transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingRule(true)}
              className="flex items-center gap-2 w-full justify-center py-2.5 rounded-xl text-sm font-medium text-si-4 bg-si-over-2 hover:bg-si-over-3 border border-dashed border-si-border transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden />
              Adicionar categoria para guardar
            </button>
          )}

          {/* Nota sobre como funciona */}
          <p className="text-[11px] text-si-5 leading-relaxed">
            O Guardião avisa quando você abre o app após atingir o limite.
            O alerta não repete antes do cooldown configurado.
          </p>
        </div>
      )}
    </section>
  );
}
