/**
 * Aba "Assinaturas" do Dashboard (Ação #8 — Análise 360).
 * Extraída de Dashboard.tsx: serviços recorrentes ativos, gasto mensal
 * consolidado e detector de "vazamento invisível" (60 dias sem movimentação).
 */
import { useMemo } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useDashboardMode } from '../../hooks/useDashboardMode';
import { MerchantLogo } from '../transactions/MerchantLogo';

export function DashboardAssinaturasTab() {
  const { entries, recurrents } = useAppContext();
  const { mode: dashboardMode } = useDashboardMode();
  const now = useMemo(() => new Date(), []);

  const cardClass = dashboardMode === 'caixa'
    ? 'bg-si-bg border border-blue-500/25 rounded-xl p-5 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.12)]'
    : 'bg-si-card border border-si-border rounded-2xl p-6';

  const subscriptions = useMemo(() => {
    const termsRx = /netflix|spotify|amazon|prime|disney|hbo|apple|google|icloud|dropbox|youtube|gym|academia|crunchyroll|adobe|canva|microsoft|office|mensalidade|plano|internet|telef|celular/i;

    return recurrents
      .filter(r => r.active && r.type === 'despesa' && (
        r.category === 'Assinaturas' ||
        termsRx.test(r.desc || '')
      ))
      .map(r => ({
        id: r.id,
        desc: r.desc,
        category: r.category || 'Assinaturas',
        value: r.value,
        day: r.day,
        freq: r.freq || 'mensal',
        account: r.account,
      }));
  }, [recurrents]);

  const totalSubscriptionsMonthly = useMemo(
    () => subscriptions.reduce((s, r) => s + (Number(r.value) || 0), 0),
    [subscriptions],
  );

  const subscriptionLeaks = useMemo(() => {
    const leaks: string[] = [];
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const cutoff = sixtyDaysAgo.toISOString().slice(0, 10);

    const recentEntries = entries.filter(e => e.date >= cutoff && e.type === 'despesa');

    for (const sub of subscriptions) {
      const hasMatch = recentEntries.some(e => {
        const descMatch = (e.desc || '').toLowerCase().includes(sub.desc.toLowerCase()) ||
                          sub.desc.toLowerCase().includes((e.desc || '').toLowerCase());
        return descMatch;
      });

      if (!hasMatch) {
        leaks.push(sub.desc);
      }
    }
    return leaks;
  }, [subscriptions, entries, now]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={cardClass}>
          <p className="text-si-5 text-sm">Gasto mensal com Assinaturas</p>
          <p className="text-2xl font-bold text-violet-400">
            R$ {totalSubscriptionsMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-si-5 mt-1">Serviços recorrentes e contratos de SaaS ativos</p>
        </div>
        <div className={cardClass}>
          <p className="text-si-5 text-sm">Assinaturas identificadas</p>
          <p className="text-2xl font-bold text-si-1">
            {subscriptions.length}
          </p>
          <p className="text-xs text-si-5 mt-1">Mapeados via categoria ou palavras-chave estratégicas</p>
        </div>
      </div>

      {subscriptionLeaks.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-2">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider">Potencial Vazamento Invisível</span>
          </div>
          <p className="text-xs text-si-3 leading-relaxed">
            Detectamos que as seguintes assinaturas estão cadastradas ou ativas, mas **não registramos despesas para elas nos últimos 60 dias**.
            Verifique se você cancelou ou se está pagando por um serviço esquecido:
          </p>
          <ul className="list-disc list-inside text-xs font-semibold text-rose-300 space-y-1 pl-1">
            {subscriptionLeaks.map((leak, idx) => (
              <li key={idx}>{leak}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-si-card border border-si-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-violet-400" />
          <h3 className="text-lg font-bold text-si-1">Detalhamento de Assinaturas</h3>
        </div>

        {subscriptions.length === 0 ? (
          <p className="text-si-5 text-sm py-8 text-center">Nenhuma assinatura ativa encontrada no momento.</p>
        ) : (
          <div className="divide-y divide-si-border">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between gap-4 py-3 hover:bg-si-over-1/3 transition-colors px-2 rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <MerchantLogo
                    description={sub.desc}
                    category={sub.category}
                    type="despesa"
                    size={28}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-si-1 truncate">{sub.desc}</p>
                    <p className="text-xs text-si-5 mt-0.5">
                      Todo dia {sub.day} · Freq: {sub.freq} {sub.account ? `· ${sub.account}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-si-1">
                    R$ {sub.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
