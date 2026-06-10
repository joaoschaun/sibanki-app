import { useMemo, useState } from 'react';
import { GenericPageSkeleton } from '../components/ui/PageSkeleton';
import { useAppContext } from '../context/AppContext';
import { fmt } from '../utils/reportUtils';
import { Clock, Repeat, CalendarDays } from 'lucide-react';
import type { Entry, Recurrent } from '../types/userData';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function Calendar() {
  const { entries, recurrents, loading } = useAppContext();
  const now = useMemo(() => new Date(), []);
  const [cM, setCM] = useState(now.getMonth());
  const [cY, setCY] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const monthKey = `${cY}-${String(cM + 1).padStart(2, '0')}`;
  const isHojeMes = cM === now.getMonth() && cY === now.getFullYear();

  const { byDay, kpis, proximos, recs } = useMemo(() => {
    const dd: Record<number, Entry[]> = {};
    let rm = 0, dm = 0, nt = 0;
    for (const e of entries) {
      if (!e.date || !e.date.startsWith(monthKey)) continue;
      const d = parseInt(e.date.substring(8, 10), 10);
      if (!dd[d]) dd[d] = [];
      dd[d].push(e);
      nt++;
      if (e.type === 'receita') rm += Number(e.value);
      else dm += Number(e.value);
    }
    const kpis = { receita: rm, despesa: dm, saldo: rm - dm, transacoes: nt };

    const hoje = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const proxItems: { e: Entry; dk: string; label: string }[] = [];
    for (let offset = 0; offset < 14 && proxItems.length < 8; offset++) {
      const dia = new Date(hoje.getTime() + offset * 86400000);
      const dk = dia.getFullYear() + '-' +
        String(dia.getMonth() + 1).padStart(2, '0') + '-' +
        String(dia.getDate()).padStart(2, '0');
      for (const e of entries) {
        if (e.date === dk) {
          const label = offset === 0 ? 'Hoje' : offset === 1 ? 'Amanhã' : dia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          proxItems.push({ e, dk, label });
          break;
        }
      }
    }

    const recs = (recurrents ?? []).filter((r) => r.active !== false).slice(0, 8);

    return { byDay: dd, kpis, proximos: proxItems, recs };
  }, [entries, monthKey, now, recurrents]);

  const firstDay = new Date(cY, cM, 1).getDay();
  const lastDate = new Date(cY, cM + 1, 0).getDate();

  const gridDays = useMemo(() => {
    const out: { day: number | null; isToday: boolean; items: Entry[] }[] = [];
    for (let i = 0; i < firstDay; i++) out.push({ day: null, isToday: false, items: [] });
    for (let d = 1; d <= lastDate; d++) {
      const isToday = isHojeMes && d === now.getDate();
      out.push({ day: d, isToday, items: byDay[d] ?? [] });
    }
    return out;
  }, [firstDay, lastDate, isHojeMes, now.getDate(), byDay]);

  const selectedItems = useMemo(() => {
    if (selectedDay === null) return [];
    const dk = monthKey + '-' + String(selectedDay).padStart(2, '0');
    const fromEntries = entries.filter((e) => e.date === dk);
    const fromRec = (recurrents ?? []).filter((r) => r.active !== false && r.day === selectedDay);
    return [
      ...fromEntries.map((e) => ({ ...e, isRec: false })),
      ...fromRec.map((r) => ({ desc: r.desc || 'Recorrente', value: r.value, type: r.type, isRec: true })),
    ];
  }, [selectedDay, monthKey, entries, recurrents]);

  const prevMonth = () => {
    if (cM === 0) {
      setCM(11);
      setCY((y) => y - 1);
    } else setCM((m) => m - 1);
  };
  const nextMonth = () => {
    if (cM === 11) {
      setCM(0);
      setCY((y) => y + 1);
    } else setCM((m) => m + 1);
  };
  const goHoje = () => {
    setCM(now.getMonth());
    setCY(now.getFullYear());
  };

  if (loading) return <GenericPageSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-si-1">Calendário Financeiro</h2>
            <p className="text-si-5 text-sm">
              Visualize suas movimentações em formato de calendário
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-si-card rounded-xl border border-si-border p-4">
          <div className="text-xs text-si-5">Receitas</div>
          <div className="text-lg font-bold text-emerald-400">{fmt(kpis.receita)}</div>
        </div>
        <div className="bg-si-card rounded-xl border border-si-border p-4">
          <div className="text-xs text-si-5">Despesas</div>
          <div className="text-lg font-bold text-rose-400">{fmt(kpis.despesa)}</div>
        </div>
        <div className="bg-si-card rounded-xl border border-si-border p-4">
          <div className="text-xs text-si-5">Saldo</div>
          <div className={`text-lg font-bold ${kpis.saldo >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
            {fmt(kpis.saldo)}
          </div>
        </div>
        <div className="bg-si-card rounded-xl border border-si-border p-4">
          <div className="text-xs text-si-5">Transações</div>
          <div className="text-lg font-bold text-violet-400">{kpis.transacoes}</div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-si-over-2 text-si-4"
            aria-label="Mês anterior"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={goHoje}
            className="px-3 py-1.5 rounded-lg bg-si-over-2 text-si-3 text-sm font-medium hover:bg-si-over-3"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-si-over-2 text-si-4"
            aria-label="Próximo mês"
          >
            ›
          </button>
        </div>
        <span className="font-bold text-si-1">{MESES[cM]} {cY}</span>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        <div className="flex-1 bg-si-card rounded-2xl border border-si-border overflow-hidden">
          <div className="grid grid-cols-7 gap-px bg-si-over-2">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="p-2 text-center text-xs font-medium text-si-5 bg-si-card">
                {d}
              </div>
            ))}
            {gridDays.map((cell, i) => (
              <div
                key={i}
                onClick={() => cell.day !== null && setSelectedDay(cell.day)}
                className={`min-h-[80px] p-2 bg-si-card cursor-pointer transition-colors ${
                  cell.day === null ? 'opacity-50' : 'hover:bg-si-over-2'
                } ${cell.isToday ? 'ring-2 ring-blue-500/50 rounded' : ''} ${
                  selectedDay === cell.day ? 'bg-blue-500/10 ring-2 ring-blue-500' : ''
                }`}
              >
                {cell.day !== null && (
                  <>
                    <div className="text-sm font-bold text-si-2">{cell.day}</div>
                    {cell.items.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {cell.items.slice(0, 2).map((e, j) => (
                          <div
                            key={j}
                            className={`text-[11px] truncate ${e.type === 'receita' ? 'text-emerald-400' : 'text-rose-400'}`}
                          >
                            {(e.desc || e.category || '').slice(0, 10)}
                          </div>
                        ))}
                        {cell.items.length > 2 && (
                          <div className="text-[11px] text-si-5">+{cell.items.length - 2}</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="w-full lg:w-72 space-y-4 shrink-0">
          <div className="bg-si-card rounded-2xl border border-si-border p-4">
            <h4 className="text-sm font-bold text-si-3 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Próximos 7 dias
            </h4>
            {proximos.length === 0 ? (
              <p className="text-si-5 text-sm">Nenhum lançamento nos próximos dias</p>
            ) : (
              <div className="space-y-2">
                {proximos.slice(0, 7).map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 py-2 border-b border-si-border last:border-0">
                    <div className="min-w-0">
                      <div className="text-sm text-si-2 truncate">
                        {(item.e.desc || item.e.category || '—').slice(0, 22)}
                      </div>
                      <div className="text-xs text-si-5">{item.label}</div>
                    </div>
                    <span className={`text-sm font-medium shrink-0 ${item.e.type === 'receita' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {item.e.type === 'receita' ? '+' : '-'}{fmt(item.e.value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-si-card rounded-2xl border border-si-border p-4">
            <h4 className="text-sm font-bold text-si-3 mb-3 flex items-center gap-2">
              <Repeat className="w-4 h-4" /> Recorrentes do mês
            </h4>
            {recs.length === 0 ? (
              <p className="text-si-5 text-sm">Nenhum recorrente cadastrado</p>
            ) : (
              <div className="space-y-2">
                {recs.map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 py-2 border-b border-si-border last:border-0">
                    <span className="text-sm text-si-2 truncate">{(r as Recurrent).desc || 'Recorrente'}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-si-5">Dia {(r as Recurrent).day}</span>
                      <span className={`text-sm font-medium ${(r as Recurrent).type === 'receita' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {(r as Recurrent).type === 'receita' ? '+' : '-'}{fmt((r as Recurrent).value)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedDay !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedDay(null)}>
          <div
            className="bg-si-card rounded-2xl border border-si-border-md p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center font-bold text-indigo-400">
                {selectedDay}
              </div>
              <div>
                <div className="font-bold text-si-1">{selectedDay} de {MESES[cM]}</div>
                <div className="text-sm text-si-5">{cY}</div>
              </div>
            </div>
            {selectedItems.length === 0 ? (
              <p className="text-center py-8 text-si-5">Nenhuma movimentação neste dia</p>
            ) : (
              <div className="space-y-2">
                {selectedItems.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-si-over-2 border border-si-border-md"
                  >
                    <span className="text-sm text-si-2 truncate">
                      {'desc' in item ? item.desc : (item as Entry).desc || (item as Entry).category || '—'}
                    </span>
                    <span className={`text-sm font-bold shrink-0 ${
                      (item as any).type === 'receita' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {(item as any).type === 'receita' ? '+' : '-'}{fmt((item as any).value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="w-full mt-4 py-3 rounded-xl bg-si-over-2 border border-si-border-md text-si-3 font-medium hover:bg-si-over-3"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
