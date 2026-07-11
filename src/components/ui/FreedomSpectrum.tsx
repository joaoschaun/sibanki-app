import { FREEDOM_ORDER, FREEDOM_SEGMENT, FREEDOM_TIERS, type FreedomStatus } from '../../constants/sovereigntyScale';
import { cn } from '../../utils/cn';

export interface FreedomSpectrumProps {
  status: FreedomStatus;
}

export function FreedomSpectrum({ status }: FreedomSpectrumProps) {
  const activeIdx = FREEDOM_ORDER.indexOf(status);
  const rating = activeIdx !== -1 ? activeIdx + 1 : 1;
  const activeTierLabel = activeIdx !== -1 ? FREEDOM_TIERS[status].label : '';

  // Center of active segment: (activeIdx + 0.5) / 5 * 100%
  const markerLeft = activeIdx !== -1 ? `${(activeIdx + 0.5) * 20}%` : '10%';

  return (
    <div
      className="w-full mt-4 mb-2"
      role="img"
      aria-label={`Nível de liberdade: ${activeTierLabel} (${rating} de 5)`}
    >
      {/* Track Container */}
      <div className="relative w-full h-2 mb-2">
        {/* Segments */}
        <div className="flex w-full h-full gap-1">
          {FREEDOM_ORDER.map((tier) => {
            const isActive = tier === status;
            return (
              <div
                key={tier}
                className={cn(
                  'flex-1 h-full rounded-full transition-opacity duration-300',
                  FREEDOM_SEGMENT[tier],
                  isActive ? 'opacity-100' : 'opacity-30'
                )}
              />
            );
          })}
        </div>

        {/* Marker */}
        {activeIdx !== -1 && (
          <div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-4 bg-white rounded-full transition-all duration-300 motion-reduce:transition-none"
            style={{ left: markerLeft }}
          />
        )}
      </div>

      {/* Labels */}
      <div className="flex justify-between text-[9px] uppercase tracking-wider">
        {FREEDOM_ORDER.map((tier) => {
          const isActive = tier === status;
          const label = FREEDOM_TIERS[tier].label;
          return (
            <span
              key={tier}
              className={cn(
                'transition-colors duration-300',
                isActive ? 'text-si-1 font-bold' : 'text-si-4'
              )}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
