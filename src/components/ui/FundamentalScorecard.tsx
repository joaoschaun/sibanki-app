import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useEffect, useRef, useState } from 'react';
import { Check, Coins, Gem, Info, Scale, TrendingUp } from 'lucide-react';
import type { B3FundamentalPack } from '../../utils/b3Fundamentals';
import {
  buildFundamentalChecklist,
  computeCompositeScore,
  computeFairAveragePrice,
  computePillars,
  compositeTier,
  marginVsFairAvg,
} from '../../utils/fundamentalScorecardModel';
import { tooltipStyle } from '../charts/chartConfig';
import { scoreToRedBlueHsl } from '../../utils/scoreHue';

const LABEL = 'text-[11px] font-bold text-si-4 uppercase tracking-[0.18em]';

export interface FundamentalScorecardProps {
  ticker: string;
  name: string;
  price: number;
  fundamentals: B3FundamentalPack;
  pe?: number;
  pvp?: number;
  roe?: number;
  dy?: number;
}

function SemiGauge({ value }: { value: number }) {
  const v = Math.min(100, Math.max(0, value));
  const r = 38;
  const c = Math.PI * r;
  const offset = c * (1 - v / 100);
  const arcColor = scoreToRedBlueHsl(v);

  return (
    <div className="relative flex flex-col items-center justify-end h-[120px] w-full max-w-[220px] mx-auto">
      <svg viewBox="0 0 100 56" className="w-full h-[72px]" aria-hidden>
        <path
          d="M 12 52 A 38 38 0 0 1 88 52"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M 12 52 A 38 38 0 0 1 88 52"
          fill="none"
          stroke={arcColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute bottom-1 flex flex-col items-center">
        <span className="text-3xl font-bold tabular-nums" style={{ color: scoreToRedBlueHsl(v) }}>
          {v}
        </span>
        <span className="text-[11px] font-bold text-si-4 uppercase tracking-[0.2em]">de 100</span>
        <span className="sr-only">Escala visual: 0 vermelho a 100 azul</span>
      </div>
    </div>
  );
}

export function FundamentalScorecard({
  ticker,
  name,
  price,
  fundamentals: pack,
  pe,
  pvp,
  roe,
  dy,
}: FundamentalScorecardProps) {
  const [bazinTipOpen, setBazinTipOpen] = useState(false);
  const bazinTipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!bazinTipOpen) return;
    const onPointerDown = (ev: MouseEvent | TouchEvent) => {
      const el = bazinTipRef.current;
      const target = ev.target as Node | null;
      if (el && target && !el.contains(target)) {
        setBazinTipOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [bazinTipOpen]);

  const composite = computeCompositeScore(pack);
  const tier = compositeTier(composite);
  const pillars = computePillars(pack);
  const fairAvg = computeFairAveragePrice(pack);
  const marginPct = fairAvg != null ? marginVsFairAvg(fairAvg, price) : null;
  const checklist = buildFundamentalChecklist(pack, { pe, pvp, roe });

  const radarRows = [
    { subject: 'Valor', score: pillars.valor },
    { subject: 'Dividendos', score: pillars.dividendos },
    { subject: 'Lynch', score: pillars.lynch },
    { subject: 'Qualidade', score: pillars.qualidade },
  ];

  /** Cor única pela média dos pilares — vermelho = nota baixa, azul = alta (não pela posição no desenho). */
  const radarMean =
    (pillars.valor + pillars.dividendos + pillars.lynch + pillars.qualidade) / 4;
  const radarColor = scoreToRedBlueHsl(Math.round(radarMean));

  const bazinUp = pack.bazin.ok ? pack.bazin.upsidePct : 0;
  const bazinAtCeiling = pack.bazin.ok && Math.abs(bazinUp) < 0.05;

  const verdictCls = (v: string) => {
    if (v === 'COMPRAR') return 'text-emerald-400';
    if (v === 'ANALISAR') return 'text-amber-400';
    if (v === 'EVITAR') return 'text-rose-400';
    return 'text-si-3';
  };

  return (
    <div className="mt-5 pt-5 border-t border-si-border space-y-6">
      <div>
        <p className={LABEL}>Raio-X fundamentalista</p>
        <h4 className="mt-2 text-lg font-bold tracking-tight text-si-1">
          Scorecard de valor
        </h4>
        <p className="text-sm font-semibold text-si-2 mt-1 truncate" title={`${ticker} · ${name}`}>
          {ticker} · {name}
        </p>
        <p className="text-xs text-si-4 mt-1">
          Graham, Bazin, Lynch e Buffett — indicativos, não recomendação.
        </p>
        <a
          href="#fundamental-pilares"
          className="inline-block mt-3 text-[11px] font-medium text-si-3 hover:text-si-2 underline underline-offset-4 decoration-si-border-md"
        >
          Ver gráfico dos quatro pilares (radar) ↓
        </a>
      </div>

      <div className="grid gap-4 lg:grid-cols-12 lg:items-stretch">
        {/* Resumo */}
        <div className="lg:col-span-3 rounded-xl border border-si-border bg-si-bg/80 p-4 flex flex-col gap-4">
          <p className={LABEL}>Resumo</p>
          <SemiGauge value={composite} />
          <p className="text-center text-[11px] text-si-4">
            Leitura geral:{' '}
            <span className="font-bold" style={{ color: tier.color }}>
              {tier.label}
            </span>
          </p>
          <p className="text-center text-[10px] text-si-5 tracking-wide">0 vermelho → 100 azul</p>
          <div className="space-y-2 text-sm border-t border-si-border pt-3">
            <div className="flex justify-between gap-2">
              <span className="text-si-5">Preço atual</span>
              <span className="font-bold text-si-1 tabular-nums">
                R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {fairAvg != null && (
              <>
                <div className="flex justify-between gap-2">
                  <span className="text-si-5">Preço justo (média)</span>
                  <span className="font-bold text-si-1 tabular-nums">
                    R$ {fairAvg.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {marginPct != null && (
                  <div className="flex justify-between gap-2">
                    <span className="text-si-5">Margem vs. média</span>
                    <span
                      className={`font-bold tabular-nums ${marginPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                    >
                      {marginPct >= 0 ? '+' : ''}
                      {marginPct.toFixed(1)}%
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
          <p className="text-[11px] text-si-4 leading-relaxed">
            Média simples dos preços dos métodos disponíveis (Graham, Bazin e valor intrínseco Buffett). Cada
            método pode puxar a média para cima ou para baixo — use como referência, não como alvo único.
          </p>
        </div>

        {/* Quatro mestres */}
        <div className="lg:col-span-6 flex flex-col gap-3 min-w-0">
          <div className="grid gap-3 sm:grid-cols-2 flex-1 content-start">
            <div className="rounded-xl border border-si-border bg-si-bg/80 p-4 border-l-2 border-l-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Scale className="w-4 h-4 text-si-4 shrink-0" aria-hidden />
                <p className={LABEL}>Benjamin Graham</p>
              </div>
              {pack.graham.ok ? (
                <>
                  <p className="text-lg font-bold text-si-1 tabular-nums">
                    R$ {pack.graham.fairPrice.toFixed(2)}
                  </p>
                  <p className={`text-xs mt-1 ${pack.graham.upsidePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {pack.graham.upsidePct >= 0 ? 'Upside' : 'Downside'}{' '}
                    {Math.abs(pack.graham.upsidePct).toFixed(1)}% vs preço
                  </p>
                  <p className="text-[11px] text-si-4 mt-2 font-mono">√(22,5 × LPA × VPA)</p>
                  {typeof pe === 'number' && pe > 0 && (
                    <p className="text-[11px] text-si-4 mt-1">P/L {pe.toFixed(1)}</p>
                  )}
                  {typeof pvp === 'number' && pvp > 0 && (
                    <p className="text-[11px] text-si-4">P/VP {pvp.toFixed(2)}</p>
                  )}
                </>
              ) : (
                <p className="text-xs text-si-4">Dados insuficientes (LPA/VPA).</p>
              )}
            </div>

            <div className="rounded-xl border border-si-border bg-si-bg/80 p-4 border-l-2 border-l-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="w-4 h-4 text-si-4 shrink-0" aria-hidden />
                <p className={LABEL}>Décio Bazin</p>
              </div>
              {pack.bazin.ok ? (
                <>
                  <p className="text-lg font-bold text-si-1 tabular-nums">
                    R$ {pack.bazin.ceilingPrice.toFixed(2)}
                  </p>
                  {bazinAtCeiling ? (
                    <p className="text-xs mt-1 text-si-3">
                      Preço no teto Bazin (DY implícito 6% — sem margem extra vs cotação)
                    </p>
                  ) : bazinUp > 0 ? (
                    <p className="text-xs mt-1 text-emerald-400">
                      Margem {bazinUp.toFixed(1)}% vs preço (abaixo do teto)
                    </p>
                  ) : (
                    <p className="text-xs mt-1 text-rose-400">
                      Acima do teto {Math.abs(bazinUp).toFixed(1)}%
                    </p>
                  )}
                  {typeof dy === 'number' && (
                    <p className="text-[11px] text-si-4 mt-2">DY {dy.toFixed(2)}%</p>
                  )}
                  <div ref={bazinTipRef} className="mt-1 flex items-center gap-1.5 text-[11px] text-si-5 relative group w-fit">
                    <span>
                      Base Bazin:{' '}
                      {pack.bazin.base === 'dps12m'
                        ? 'proventos 12m'
                        : pack.bazin.base === 'dy'
                          ? 'DY reportado'
                          : 'indisponível'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setBazinTipOpen((v) => !v)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setBazinTipOpen(false);
                      }}
                      className="inline-flex items-center justify-center text-si-4 hover:text-si-2"
                      aria-label="Entenda o cálculo do Bazin"
                      aria-haspopup="dialog"
                      aria-controls="bazin-tip"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                    <div
                      id="bazin-tip"
                      role="tooltip"
                      className={`absolute left-0 top-full mt-1 z-20 w-64 rounded-lg border border-si-border-md bg-si-bg/95 p-2 text-[11px] leading-snug text-si-4 transition-opacity ${
                        bazinTipOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none group-hover:opacity-100'
                      }`}
                    >
                      {pack.bazin.divPerShareUsed > 0 && (
                        <p>Provento base: R$ {pack.bazin.divPerShareUsed.toFixed(2)} por ação.</p>
                      )}
                      <p className="mt-1">
                        Para maior precisão, usamos o dinheiro real pago (proventos 12m) para calcular o Teto de 6%, ignorando estimativas genéricas da bolsa.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-xs text-si-4">DY ou preço indisponível para teto.</p>
              )}
            </div>

            <div className="rounded-xl border border-si-border bg-si-bg/80 p-4 border-l-2 border-l-white/10">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <TrendingUp className="w-4 h-4 text-si-4 shrink-0" aria-hidden />
                  <p className={LABEL}>Peter Lynch</p>
                </div>
                <span className={`text-xs font-bold shrink-0 ${verdictCls(pack.lynch.verdict)}`}>
                  {pack.lynch.verdict}
                </span>
              </div>
              <div className="h-2 bg-si-zinc-8 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all min-w-0"
                  style={{
                    width: `${pack.lynch.score}%`,
                    backgroundColor: scoreToRedBlueHsl(pack.lynch.score),
                  }}
                />
              </div>
              <p className="text-xs text-si-4 mb-2">Score {pack.lynch.score}/100</p>
              {pack.lynch.peg != null && (
                <p className="text-[11px] text-si-3 mb-2 font-mono">
                  PEG {pack.lynch.peg.toFixed(2)}
                  {pack.lynch.epsGrowthPct != null && pack.lynch.epsGrowthPct > 0 && (
                    <span className="text-si-4 font-sans">
                      {' '}
                      (P/L ÷ cresc. EPS ~{pack.lynch.epsGrowthPct.toFixed(1)}% a.a.)
                    </span>
                  )}
                </p>
              )}
              <ul className="text-[11px] text-si-3 space-y-1 list-disc list-inside">
                {pack.lynch.items.slice(0, 5).map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-si-border bg-si-bg/80 p-4 border-l-2 border-l-white/10">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Gem className="w-4 h-4 text-si-4 shrink-0" aria-hidden />
                  <p className={LABEL}>Warren Buffett</p>
                </div>
                <span className={`text-xs font-bold shrink-0 ${verdictCls(pack.buffett.verdict)}`}>
                  {pack.buffett.verdict}
                </span>
              </div>
              <p className="text-sm font-bold text-si-1 mb-2">Score {pack.buffett.score}/100</p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-si-5 mb-2">
                <span>Moat {pack.buffett.moatScore}/25</span>
                <span>Gestão {pack.buffett.mgtScore}/25</span>
                <span>Saúde {pack.buffett.finScore}/25</span>
                <span>Margem {pack.buffett.mosScore}/25</span>
              </div>
              {pack.buffett.intrinsicValue > 0 && (
                <p className="text-xs text-si-4">
                  Valor intrínseco (estim.): R$ {pack.buffett.intrinsicValue.toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="lg:col-span-3 rounded-xl border border-si-border bg-si-bg/80 p-4">
          <p className={LABEL}>Checklist</p>
          <p className="text-[11px] text-si-4 mt-2 mb-3">
            Critérios clássicos; poucos itens positivos pedem mais análise.
          </p>
          <ul className="space-y-2.5">
            {checklist.map((item) => (
              <li key={item.id} className="flex items-start gap-2 text-[11px] leading-snug">
                <span
                  className={`mt-0.5 shrink-0 ${item.ok ? 'text-emerald-400' : 'text-si-5'}`}
                  aria-hidden
                >
                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                </span>
                <span className={item.ok ? 'text-si-2' : 'text-si-5'}>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Radar em linha inteira: mais legível e menos “vazio” no centro */}
      <div
        id="fundamental-pilares"
        className="rounded-xl border border-si-border bg-si-bg/80 p-4 sm:p-5 scroll-mt-24"
      >
        <p className={`${LABEL} mb-1`}>Quatro pilares (esta ação)</p>
        <p className="text-[11px] text-si-4 mb-4 max-w-3xl">
          <strong className="text-si-3">Mapeamento:</strong> Valor = Graham; Dividendos = Bazin; Lynch = score composto (P/L,
          DY, ROE, etc.); Qualidade = Buffett. O <strong className="text-si-3">formato</strong> (quão longe do centro em cada
          eixo) mostra cada nota; a <strong className="text-si-3">cor</strong> é só a média dos quatro (0 vermelho, 100 azul) —
          não depende do lado esquerdo/direito do desenho.
        </p>
        <div className="h-[min(280px,42vw)] min-h-[200px] w-full max-w-2xl mx-auto">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="52%" outerRadius="78%" data={radarRows} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
              <PolarGrid stroke="var(--si-border)" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: 'var(--si-text-3)', fontSize: 11 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tickCount={5}
                tick={{ fill: 'var(--si-text-5)', fontSize: 9 }}
              />
              <Radar
                name="Pontuação"
                dataKey="score"
                stroke={radarColor}
                strokeWidth={1.75}
                fill={radarColor}
                fillOpacity={0.32}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(val: any) => [`${Math.round(Number(val))} / 100`, '']}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
