import { HORIZON_DAYS, daysBetween } from '../../utils/anticipationEngine';
import type { HorizonItem } from '../../utils/anticipationEngine';
import { Card } from './Card';
import { cn } from '../../utils/cn';

export interface HorizonStripProps {
  item: HorizonItem | null;
  incomeDate: Date | null;
  today?: Date;
}

export function HorizonStrip({ item, incomeDate, today }: HorizonStripProps) {
  if (!item) return null;

  const todayObj = today ? new Date(today) : new Date();
  todayObj.setHours(0, 0, 0, 0);

  const incomeIdx = incomeDate ? daysBetween(todayObj, incomeDate) : -1;
  const isIncomeInHorizon = incomeIdx >= 0 && incomeIdx <= HORIZON_DAYS;

  const dueIdx = item.daysUntilDue;
  const isDueInHorizon = dueIdx >= 0 && dueIdx <= HORIZON_DAYS;

  const hasWindow = isIncomeInHorizon && isDueInHorizon && incomeIdx < dueIdx;

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
    <Card surface="raised" className="w-full p-5 border border-si-border relative overflow-hidden mt-4">
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
          const isIncome = isIncomeInHorizon && idx === incomeIdx;
          const isDue = isDueInHorizon && idx === dueIdx;
          
          const isWindow = hasWindow && idx > incomeIdx && idx < dueIdx;
          const isWindowStart = hasWindow && idx === incomeIdx + 1;
          const isWindowEnd = hasWindow && idx === dueIdx - 1;

          const labelDay = date.getDate();
          const weekday = getWeekdayLabel(date);

          return (
            <div
              key={idx}
              className={cn(
                'flex-1 min-w-[42px] flex flex-col items-center justify-center py-2.5 rounded-xl border text-center transition-all duration-300 motion-reduce:transition-none',
                isToday ? 'bg-si-over-2 border-si-border-md font-semibold' : 'bg-si-card border-si-border',
                isIncome && 'ring-2 ring-emerald-500/80 ring-offset-2 ring-offset-si-bg bg-emerald-500/10 border-emerald-500/30',
                isDue && 'ring-2 ring-amber-500/80 ring-offset-2 ring-offset-si-bg bg-amber-500/10 border-amber-500/30',
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
            </div>
          );
        })}
      </div>

      {/* Legends */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-si-4 mt-3 border-t border-si-border/40 pt-3">
        {isIncomeInHorizon && incomeDate && (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
            salário entra (dia {incomeDate.getDate()})
          </span>
        )}
        {isDueInHorizon && (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-500/20" />
            {item.label} (dia {new Date(item.dueDate).getDate()})
          </span>
        )}
        {hasWindow && (
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-2 rounded bg-amber-500/10 border border-amber-500/20" />
            janela de ação
          </span>
        )}
      </div>
    </Card>
  );
}
