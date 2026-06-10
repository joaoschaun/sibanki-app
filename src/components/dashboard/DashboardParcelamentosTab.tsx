/**
 * Aba "Parcelamentos" do Dashboard (Ação #8 — Análise 360).
 * Extraída de Dashboard.tsx: parcelas de cartão (purchasesV2) + empréstimos,
 * com totais do mês, saldo devedor futuro e nota sobre antecipação vs Sg.
 */
import { useMemo } from 'react';
import { Layers, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useDashboardMode } from '../../hooks/useDashboardMode';

function getMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function DashboardParcelamentosTab() {
  const { cards, creditObligations } = useAppContext();
  const { mode: dashboardMode } = useDashboardMode();
  const currentMonthKey = getMonthKey(new Date());

  const cardClass = dashboardMode === 'caixa'
    ? 'bg-si-bg border border-blue-500/25 rounded-xl p-5 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.12)]'
    : 'bg-si-card border border-si-border rounded-2xl p-6';

  const cardInstallments = useMemo(() => {
    const list: {
      id: string;
      cardName: string;
      desc: string;
      current: number;
      total: number;
      value: number;
      remaining: number;
      originalDesc: string;
    }[] = [];

    for (const card of cards) {
      if (!card.purchasesV2) continue;
      const grouped = new Map<string, typeof card.purchasesV2>();
      for (const p of card.purchasesV2) {
        if (p.installment) {
          const gid = p.installment.groupId;
          if (!grouped.has(gid)) grouped.set(gid, []);
          grouped.get(gid)!.push(p);
        }
      }

      for (const [gid, purchases] of grouped.entries()) {
        const sortedPurchases = [...purchases].sort((a, b) => (a.installment?.current ?? 0) - (b.installment?.current ?? 0));
        const first = sortedPurchases[0];
        const total = first.installment?.total ?? 1;
        const val = first.installment?.installmentValue ?? first.value;
        const originalDesc = first.installment?.originalDesc ?? first.desc;

        const currentInst = sortedPurchases.find(p => p.cycleKey === currentMonthKey)?.installment?.current ?? total;
        const remainingInst = total - currentInst;
        const remainingValue = remainingInst * val;

        list.push({
          id: gid,
          cardName: card.name,
          desc: originalDesc,
          current: currentInst,
          total,
          value: val,
          remaining: remainingValue,
          originalDesc,
        });
      }
    }
    return list;
  }, [cards, currentMonthKey]);

  const loanInstallments = useMemo(() => {
    return (creditObligations ?? [])
      .filter(o => o.kind === 'emprestimo' || o.kind === 'financiamento' || o.kind === 'parcela')
      .map(o => ({
        id: o.id,
        institution: o.institution || 'Crédito',
        desc: o.label,
        current: o.installmentNumber ?? 1,
        total: o.installmentTotal ?? 1,
        value: o.amount,
        remaining: ((o.installmentTotal ?? 1) - (o.installmentNumber ?? 1)) * o.amount,
        dueDate: o.dueDate,
        status: o.status,
      }));
  }, [creditObligations]);

  const totalInstallmentsMonthly = useMemo(
    () => cardInstallments.reduce((s, i) => s + i.value, 0) + loanInstallments.reduce((s, i) => s + i.value, 0),
    [cardInstallments, loanInstallments],
  );
  const totalRemainingDebt = useMemo(
    () => cardInstallments.reduce((s, i) => s + i.remaining, 0) + loanInstallments.reduce((s, i) => s + i.remaining, 0),
    [cardInstallments, loanInstallments],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={cardClass}>
          <p className="text-si-5 text-sm">Compromisso no mês (Parcelas)</p>
          <p className="text-2xl font-bold text-amber-400">
            R$ {totalInstallmentsMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-si-5 mt-1">Soma de cartões e obrigações de crédito vigentes</p>
        </div>
        <div className={cardClass}>
          <p className="text-si-5 text-sm">Saldo devedor total (Futuro)</p>
          <p className="text-2xl font-bold text-si-1">
            R$ {totalRemainingDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-si-5 mt-1">Total a amortizar nos próximos meses</p>
        </div>
      </div>

      <div className="bg-si-card border border-si-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-bold text-si-1">Carteira de parcelamentos ativos</h3>
        </div>

        {cardInstallments.length === 0 && loanInstallments.length === 0 ? (
          <p className="text-si-5 text-sm py-8 text-center">Nenhum parcelamento ativo encontrado.</p>
        ) : (
          <div className="space-y-4">
            {cardInstallments.map((item) => {
              const pct = Math.min(100, Math.round((item.current / item.total) * 100));
              return (
                <div key={item.id} className="p-4 rounded-xl bg-si-over-1 border border-si-border space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-si-1">{item.desc}</p>
                      <p className="text-xs text-si-5 mt-0.5">Cartão: {item.cardName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-si-1">
                        R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                      </p>
                      <p className="text-xs text-si-5 mt-0.5">Restam: R$ {item.remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-si-5">
                      <span>Progresso: {item.current}/{item.total} parcelas</span>
                      <span>{pct}% quitado</span>
                    </div>
                    <div className="h-1.5 w-full bg-si-over-3 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}

            {loanInstallments.map((item) => {
              const pct = Math.min(100, Math.round((item.current / item.total) * 100));
              return (
                <div key={item.id} className="p-4 rounded-xl bg-si-over-1 border border-si-border space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-si-1">{item.desc}</p>
                      <p className="text-xs text-si-5 mt-0.5">Origem: {item.institution}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-si-1">
                        R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                      </p>
                      <p className="text-xs text-si-5 mt-0.5">Restam: R$ {item.remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-si-5">
                      <span>Progresso: {item.current}/{item.total} parcelas</span>
                      <span>{pct}% quitado</span>
                    </div>
                    <div className="h-1.5 w-full bg-si-over-3 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-si-4 leading-relaxed">
          <span className="font-bold text-blue-300">Vale a pena antecipar? </span>
          Se o seu **Spread Gap (Sg)** estiver positivo (investimentos rendendo acima das taxas de juros de suas obrigações),
          pode ser mais eficiente manter o capital rendendo. Caso o Spread Gap esteja negativo, amortizar ou antecipar parcelas com desconto
          é o investimento de menor risco e maior retorno livre de impostos.
        </div>
      </div>
    </div>
  );
}
