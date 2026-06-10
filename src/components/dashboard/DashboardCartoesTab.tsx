/**
 * Aba "Cartões" do Dashboard (Ação #8 — Análise 360).
 * Extraída de Dashboard.tsx: macro de crédito (faturas/limites por cartão)
 * + widget Sentinela GPS (geofencing financeiro). O hook useSentinelaGeo
 * migrou junto — só esta aba o consome.
 */
import { useMemo } from 'react';
import { CreditCard, Navigation, AlertTriangle, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useIntelligence } from '../../context/IntelligenceContext';
import { useSentinelaGeo, SCENARIO_LABELS } from '../../hooks/useSentinelaGeo';

interface Props {
  catTotals: Record<string, number>;
  budgetMap: Record<string, number>;
}

export function DashboardCartoesTab({ catTotals, budgetMap }: Props) {
  const { cards, financialProfile } = useAppContext();
  const { freedom, spread } = useIntelligence();

  const sentinelaSnapshot = useMemo(() => ({
    daysOfFreedom: freedom.days,
    spreadGap: spread.spreadGap,
    monthlyBurn: freedom.dailyBurnRate * 30,
    categoryBudgets: Object.fromEntries(
      Object.entries(catTotals).map(([cat, spent]) => {
        const limit = budgetMap[cat] ?? 0;
        return [cat, { spent, limit, pct: limit > 0 ? Math.round((spent / limit) * 100) : 0 }];
      })
    ),
  }), [freedom, spread, catTotals, budgetMap]);

  const userPhone = (financialProfile as unknown as Record<string, unknown>)?.whatsappPhone as string | undefined;
  const sentinela = useSentinelaGeo(sentinelaSnapshot, userPhone);

  return (
    <div className="space-y-6">
      <div className="bg-si-card border border-si-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-bold text-si-1">Macro de Crédito</h3>
        </div>

        {cards.length === 0 ? (
          <p className="text-si-5 text-sm py-8 text-center">Nenhum cartão cadastrado no momento.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cards.map((card) => {
              const limit = card.limit ?? 0;
              const bill = card.currentBill ?? 0;
              const utilization = limit > 0 ? Math.min(100, Math.round((bill / limit) * 100)) : 0;
              return (
                <div key={card.id} className="p-4 rounded-xl bg-si-over-1 border border-si-border space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-si-1">{card.name}</p>
                      <p className="text-xs text-si-5 mt-0.5">Bandeira: {card.flag || '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-si-1">R$ {bill.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <p className="text-xs text-si-5 mt-0.5">Limite: R$ {limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-si-5">
                      <span>Uso de limite</span>
                      <span>{utilization}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-si-over-3 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          utilization >= 80 ? 'bg-rose-500' : utilization >= 50 ? 'bg-amber-400' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${utilization}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-si-5 pt-1 border-t border-white/5">
                    <span>Fechamento: dia {card.closeDay}</span>
                    <span>Vencimento: dia {card.dueDay}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sentinela GPS — Geofencing Financeiro */}
      <div className="bg-si-card rounded-2xl border border-si-border p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-si-4 uppercase tracking-wider">Sentinela GPS</span>
            <span className="text-xs text-si-5 ml-1">— alerta financeiro por localização</span>
          </div>
          <button
            onClick={() => sentinela.check()}
            disabled={sentinela.loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs font-bold hover:bg-cyan-500/20 transition-colors disabled:opacity-50 disabled:cursor-wait"
          >
            <Navigation className={`w-3.5 h-3.5 ${sentinela.loading ? 'animate-pulse' : ''}`} />
            {sentinela.loading ? 'Localizando...' : 'Verificar local'}
          </button>
        </div>

        {sentinela.error && (
          <div className="mt-3 flex items-start gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{sentinela.error}</span>
          </div>
        )}

        {sentinela.result && sentinela.result.scenario && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-si-2">
                {SCENARIO_LABELS[sentinela.result.scenario]}
                {sentinela.result.placeName ? ` — ${sentinela.result.placeName}` : ''}
              </span>
              <button onClick={() => sentinela.reset()} className="ml-auto text-si-5 hover:text-si-3" title="Fechar alerta">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {sentinela.result.message && (
              <pre className="whitespace-pre-wrap text-xs text-si-3 bg-si-bg rounded-xl p-3 border border-si-border leading-relaxed font-sans">
                {sentinela.result.message}
              </pre>
            )}
            {sentinela.result.sent && (
              <p className="text-xs text-emerald-400">✓ Alerta enviado via WhatsApp</p>
            )}
          </div>
        )}

        {sentinela.result && !sentinela.result.scenario && !sentinela.loading && (
          <p className="mt-3 text-xs text-si-5">
            Nenhum local financeiramente relevante detectado no raio de 100m.
          </p>
        )}

        {!sentinela.result && !sentinela.loading && !sentinela.error && (
          <p className="mt-2 text-xs text-si-5">
            Pressione "Verificar local" ao entrar em shoppings, concessionárias, bancos e lojas — o Arquiteto avisa o que importa.
          </p>
        )}

        {sentinela.lastChecked && (
          <p className="mt-2 text-xs text-si-5">
            Última verificação: {sentinela.lastChecked.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
}
