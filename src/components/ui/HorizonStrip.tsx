import { HORIZON_DAYS, daysBetween } from '../../utils/anticipationEngine';
import type { HorizonEvent } from '../../utils/anticipationEngine';
import { Card } from './Card';
import { cn } from '../../utils/cn';

export interface HorizonStripProps {
  events: HorizonEvent[];
  incomeDate: Date | null;
  today?: Date;
}

export function HorizonStrip({ events, incomeDate, today }: HorizonStripProps) {
  const todayObj = today ? new Date(today) : new Date();
  todayObj.setHours(0, 0, 0, 0);

  const incomeIdx = incomeDate ? daysBetween(todayObj, incomeDate) : -1;
  const isIncomeInHorizon = incomeIdx >= 0 && incomeIdx <= HORIZON_DAYS;

  const hasNoEventsAndNoIncome = events.length === 0 && !isIncomeInHorizon;

  if (hasNoEventsAndNoIncome) {
    return (
      <Card surface="raised" className="w-full p-5 border border-si-border relative overflow-hidden mt-4" role="region" aria-label="Horizonte de planejamento">
        <div className="flex flex-col items-center justify-center text-center py-4">
          <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-si-4 mb-2">
            Horizonte · próximos 15 dias
          </span>
          <p className="text-sm font-medium text-si-2 max-w-[450px]">
            Provisione seus próximos 15 dias · adicione recorrentes ou conecte seu banco.
          </p>
        </div>
      </Card>
    );
  }

  // Mapear eventos por índice de dia relativo
  const eventsByDayIdx: { [idx: number]: HorizonEvent[] } = {};
  events.forEach((event) => {
    const idx = event.daysUntilDue;
    if (idx >= 0 && idx <= HORIZON_DAYS) {
      if (!eventsByDayIdx[idx]) {
        eventsByDayIdx[idx] = [];
      }
      eventsByDayIdx[idx].push(event);
    }
  });

  // Encontrar a primeira receita e a primeira despesa após ela para a janela de ação
  const firstIncomeEvent = events.find((e) => e.flow === 'entrada' && e.daysUntilDue === incomeIdx);
  const incomeAmount = firstIncomeEvent ? firstIncomeEvent.amount : 0;
  const nextExitEvent = events.find((e) => e.flow === 'saida' && e.daysUntilDue > incomeIdx);
  const nextExitIdx = nextExitEvent ? nextExitEvent.daysUntilDue : -1;
  const nextExitAmount = nextExitEvent ? nextExitEvent.amount : 0;

  const hasWindow = isIncomeInHorizon && nextExitIdx >= 0 && nextExitIdx <= HORIZON_DAYS && incomeAmount < nextExitAmount;

  const daysArray = Array.from({ length: 16 }, (_, i) => {
    const d = new Date(todayObj);
    d.setDate(todayObj.getDate() + i);
    return d;
  });

  const getWeekdayLabel = (date: Date) => {
    const days = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    return days[date.getDay()];
  };

  return (
    <Card surface="raised" className="w-full p-5 border border-si-border relative overflow-hidden mt-4" role="region" aria-label="Linha do tempo do Horizonte de 15 dias">
      <span className="sr-only">
        {`Horizonte de planejamento financeiro. ${events.length} compromissos agendados nos próximos 15 dias.`}
      </span>

      {/* Title */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-si-4">
          Horizonte · próximos 15 dias
        </span>
      </div>

      {/* Grid of 16 days */}
      <div className="flex gap-1.5 w-full overflow-x-auto pb-2 scrollbar-none">
        {daysArray.map((date, idx) => {
          const isToday = idx === 0;
          const dayEvents = eventsByDayIdx[idx] || [];
          const hasExit = dayEvents.some((e) => e.flow === 'saida');
          const hasEntrance = dayEvents.some((e) => e.flow === 'entrada') || (isIncomeInHorizon && idx === incomeIdx);

          const isWindow = hasWindow && idx > incomeIdx && idx < nextExitIdx;
          const isWindowStart = hasWindow && idx === incomeIdx + 1;
          const isWindowEnd = hasWindow && idx === nextExitIdx - 1;

          const labelDay = date.getDate();
          const weekday = getWeekdayLabel(date);

          return (
            <div
              key={idx}
              className={cn(
                'flex-1 min-w-[42px] flex flex-col items-center justify-center py-2.5 rounded-xl border text-center transition-all duration-300 motion-reduce:transition-none',
                isToday ? 'bg-si-over-2 border-si-border-md font-semibold' : 'bg-si-card border-si-border',
                hasExit && 'ring-2 ring-amber-500/80 ring-offset-2 ring-offset-si-bg bg-amber-500/10 border-amber-500/30',
                !hasExit && hasEntrance && 'ring-2 ring-emerald-500/80 ring-offset-2 ring-offset-si-bg bg-emerald-500/10 border-emerald-500/30',
                isWindow && 'bg-amber-500/5 border-y border-amber-500/20 rounded-none',
                isWindowStart && 'border-l rounded-l-xl',
                isWindowEnd && 'border-r rounded-r-xl'
              )}
            >
              <span className="text-[9px] text-si-4 uppercase tracking-wider mb-1">
                {isToday ? 'hoje' : weekday}
              </span>
              <span className="text-sm font-bold text-si-1">
                {labelDay}
              </span>
              {(dayEvents.length > 0 || (isIncomeInHorizon && idx === incomeIdx)) && (
                <div className="flex gap-1 mt-1.5 justify-center items-center">
                  {isIncomeInHorizon && idx === incomeIdx && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Renda" />
                  )}
                  {dayEvents.map((ev) => (
                    <span
                      key={ev.id}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        ev.flow === 'entrada' ? 'bg-emerald-500' : 'bg-amber-500'
                      )}
                      title={`${ev.label}: R$ ${ev.amount}`}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legends */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-si-4 mt-3 border-t border-si-border/40 pt-3">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
          recebimentos planejados
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-500/20" />
          pagamentos planejados
        </span>
        {hasWindow && (
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-2 rounded bg-amber-500/10 border border-amber-500/20" />
            janela de ação (cobertura necessária)
          </span>
        )}
      </div>
    </Card>
  );
}
