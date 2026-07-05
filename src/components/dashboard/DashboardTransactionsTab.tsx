/**
 * DashboardTransactionsTab — Aba "Transações" consolidada do Dashboard.
 *
 * Reúne histórico de lançamentos, assinaturas e parcelamentos sob um único
 * cockpit, eliminando a sobrecarga de abas secundárias no menu principal do
 * Dashboard.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, RefreshCw, AlertTriangle, Layers, AlertCircle, History } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { isTransferEntry } from '../../utils/entryUtils';
import { useSovereigntyScores } from '../../hooks/useSovereigntyScores';
import { MerchantLogo } from '../transactions/MerchantLogo';
import { SovereigntyBadge } from '../ui/SovereigntyBadge';
import { useDashboardMode } from '../../hooks/useDashboardMode';

function getMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function DashboardTransactionsTab() {
  const { entries, recurrents, cards, creditObligations } = useAppContext();
  const { mode: dashboardMode } = useDashboardMode();
  const [activeTab, setActiveTab] = useState<'historico' | 'assinaturas' | 'parcelamentos'>('historico');
  const [txSearch, setTxSearch] = useState('');
  const now = useMemo(() => new Date(), []);
  const currentMonthKey = getMonthKey(now);

  const scoreMap = useSovereigntyScores();

  const cardClass = dashboardMode === 'caixa'
    ? 'bg-si-bg border border-blue-500/25 rounded-xl p-5 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.12)]'
    : 'bg-si-card rounded-2xl p-6';

  // ── Lançamentos Recentes (Histórico) ──
  const filteredTx = useMemo(() => {
    const base = entries.filter((e) => !isTransferEntry(e));
    return base
      .filter((e) =>
        !txSearch || [e.desc, e.category, e.account].some((s) =>
          String(s ?? '').toLowerCase().includes(txSearch.toLowerCase())
        )
      )
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 15);
  }, [entries, txSearch]);

  // ── Assinaturas ──
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

  // ── Parcelamentos ──
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
      {/* ── Sub-tabs de filtro interno ── */}
      <div className="flex items-center gap-1.5 border-b border-si-border pb-3">
        {([
          { id: 'historico', label: 'Histórico', icon: History },
          { id: 'assinaturas', label: 'Assinaturas', icon: RefreshCw },
          { id: 'parcelamentos', label: 'Parcelamentos', icon: Layers },
        ] as const).map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                active
                  ? 'bg-si-over-2 text-si-1 border border-si-border'
                  : 'bg-transparent text-si-4 hover:text-si-2 border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Visualização: Histórico ── */}
      {activeTab === 'historico' && (
        <div className="bg-si-card border border-si-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-[11px] font-bold text-si-4 uppercase tracking-[0.18em]">Transações Recentes</h3>
              <p className="text-si-5 text-xs mt-0.5">Últimos lançamentos e impacto Sv em tempo real.</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-si-5" />
              <input
                type="text"
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                placeholder="Buscar transações..."
                className="w-full bg-si-bg border border-si-border rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-si-border-lg transition-colors"
              />
            </div>
          </div>

          <div className="divide-y divide-si-border">
            {filteredTx.length === 0 ? (
              <p className="text-si-5 text-sm py-8 text-center">Nenhum lançamento encontrado.</p>
            ) : (
              filteredTx.map((e) => {
                const dateObj = e.date ? new Date(e.date + 'T12:00:00') : null;
                const dateFormatted = dateObj
                  ? dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                  : '';
                return (
                  <div key={e.id} className="flex items-center justify-between gap-4 py-3 hover:bg-si-over-1/3 transition-colors px-2 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <MerchantLogo
                        description={e.desc}
                        category={e.category}
                        type={e.type}
                        size={28}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-si-1 truncate">{e.desc || e.category || '—'}</p>
                        <p className="text-xs text-si-5 mt-0.5">
                          {dateFormatted} · {e.category} {e.account ? `· ${e.account}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-3">
                      <span className={`text-sm font-bold ${e.type === 'receita' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {e.type === 'receita' ? '+' : '-'} R$ {e.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      {e.type === 'despesa' && scoreMap.has(e.id) && (
                        <SovereigntyBadge
                          score={scoreMap.get(e.id)!.score}
                          daysLost={scoreMap.get(e.id)!.daysLost}
                          opportunityCost10y={scoreMap.get(e.id)!.opportunityCost10y}
                          compact
                        />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between border-t border-si-border pt-4 text-xs text-si-5">
            <span>Exibindo até 15 lançamentos recentes</span>
            <Link to="/lancamentos" className="text-blue-400 hover:underline font-semibold">Ver todos →</Link>
          </div>
        </div>
      )}

      {/* ── Visualização: Assinaturas ── */}
      {activeTab === 'assinaturas' && (
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
      )}

      {/* ── Visualização: Parcelamentos ── */}
      {activeTab === 'parcelamentos' && (
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
              <span className="font-bold text-blue-300 font-semibold">Vale a pena antecipar? </span>
              Se o seu **Spread Gap (Sg)** estiver positivo (investimentos rendendo acima das taxas de juros de suas obrigações),
              pode ser mais eficiente manter o capital rendendo. Caso o Spread Gap esteja negativo, amortizar ou antecipar parcelas com desconto
              é o investimento de menor risco e maior retorno livre de impostos.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
