/**
 * PriceChart.tsx
 * Gráfico de preço histórico usando TradingView Lightweight Charts v5.
 * Usa dynamic import — só carrega a lib quando o componente é montado.
 */
import { useEffect, useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { fnsUS } from '../../firebase';

interface OhlcBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface PriceChartProps {
  ticker: string;
  height?: number;
}

export function PriceChart({ ticker, height = 260 }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<unknown>(null);
  const seriesRef = useRef<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker || !containerRef.current) return;

    let chart: unknown = null;
    let destroyed = false;

    async function init() {
      try {
        setLoading(true);
        setError(null);

        // Busca dados históricos via Cloud Function (Market Data Hub)
        const marketHistorical = httpsCallable<{ ticker: string; days: number }, OhlcBar[]>(
          fnsUS,
          'marketHistorical'
        );
        const result = await marketHistorical({ ticker, days: 120 });
        const bars = result.data;
        if (!Array.isArray(bars) || bars.length === 0) {
          setError('Sem histórico disponível para ' + ticker);
          setLoading(false);
          return;
        }

        // Dynamic import — nunca vai para o bundle principal
        const { createChart, CandlestickSeries, HistogramSeries, ColorType } = await import('lightweight-charts');

        if (destroyed || !containerRef.current) return;

        // Destrói gráfico anterior se existir
        if (chartRef.current) {
          (chartRef.current as { remove: () => void }).remove();
          chartRef.current = null;
        }

        chart = createChart(containerRef.current, {
          height,
          layout: {
            background: { type: ColorType.Solid, color: '#111111' },
            textColor: 'rgba(255,255,255,0.5)',
            fontSize: 11,
          },
          grid: {
            vertLines: { color: 'rgba(255,255,255,0.04)' },
            horzLines: { color: 'rgba(255,255,255,0.04)' },
          },
          rightPriceScale: {
            borderColor: 'rgba(255,255,255,0.08)',
          },
          timeScale: {
            borderColor: 'rgba(255,255,255,0.08)',
            timeVisible: true,
          },
          crosshair: {
            vertLine: { color: 'rgba(255,255,255,0.2)' },
            horzLine: { color: 'rgba(255,255,255,0.2)' },
          },
        });

        chartRef.current = chart;
        const c = chart as {
          addSeries: (series: unknown, opts?: unknown) => unknown;
          timeScale: () => { fitContent: () => void };
        };

        // Série de candlestick
        const candleSeries = c.addSeries(CandlestickSeries, {
          upColor: '#22c55e',
          downColor: '#f43f5e',
          borderUpColor: '#22c55e',
          borderDownColor: '#f43f5e',
          wickUpColor: '#22c55e',
          wickDownColor: '#f43f5e',
        });
        seriesRef.current = candleSeries;

        const candleData = bars.map((b) => ({
          time: b.date as unknown,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
        }));
        (candleSeries as { setData: (d: unknown) => void }).setData(candleData);

        // Série de volume (histograma) — se disponível
        if (bars.some((b) => b.volume != null && b.volume > 0)) {
          const volSeries = c.addSeries(HistogramSeries, {
            color: 'rgba(255,255,255,0.15)',
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume',
          });
          const volData = bars.map((b) => ({
            time: b.date as unknown,
            value: b.volume || 0,
            color: b.close >= b.open ? 'rgba(34,197,94,0.25)' : 'rgba(244,63,94,0.25)',
          }));
          (volSeries as { setData: (d: unknown) => void }).setData(volData);
        }

        c.timeScale().fitContent();
        setLoading(false);
      } catch (err) {
        if (!destroyed) {
          setError('Não foi possível carregar o gráfico.');
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      destroyed = true;
      if (chart) {
        (chart as { remove: () => void }).remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker]);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current || !chartRef.current) return;
    const observer = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        (chartRef.current as { applyOptions: (o: unknown) => void }).applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [loading]);

  if (error) {
    return (
      <div
        className="flex items-center justify-center text-[11px] tracking-widest uppercase text-si-3"
        style={{ height }}
      >
        {error}
      </div>
    );
  }

  return (
    <div className="relative" style={{ height }}>
      {loading && (
        <div
          className="absolute inset-0 flex items-center justify-center text-[11px] tracking-widest uppercase text-si-3"
          style={{ zIndex: 1 }}
        >
          Carregando gráfico…
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height, opacity: loading ? 0 : 1 }} />
    </div>
  );
}
