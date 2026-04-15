/** Props dos Raio-X temáticos (ETF, renda fixa, cripto) — dados podem vir de API ou demonstração. */

export interface SectorWeight {
  name: string;
  pct: number;
}

export interface ETFDashboardProps {
  ticker: string;
  name: string;
  price?: number;
  /** 0–100 — eficiência geral do fundo */
  efficiencyScore?: number;
  adminFeePct?: number;
  trackingErrorPct?: number;
  sharpe?: number;
  volatility12mPct?: number;
  beta?: number;
  numHoldings?: number;
  top10ConcentrationPct?: number;
  portfolioPe?: number;
  sectorWeights?: SectorWeight[];
  checklist?: { id: string; label: string; ok: boolean }[];
}

export interface FixedIncomeAreaPoint {
  label: string;
  titulo: number;
  cdi: number;
  poupanca: number;
}

export interface FixedIncomeDashboardProps {
  title: string;
  subtitle?: string;
  /** 0–100 */
  issuerQualityScore?: number;
  rating?: string;
  defaultProbPct?: number;
  fgc?: boolean;
  nominalRatePct?: number;
  inflationProjPct?: number;
  realNetPct?: number;
  maturityLabel?: string;
  durationYears?: number;
  graceDays?: number;
  areaData?: FixedIncomeAreaPoint[];
  checklist?: { id: string; label: string; ok: boolean }[];
}

export interface CryptoRadarAxis {
  subject: string;
  score: number;
}

export interface CryptoAnalysisDashboardProps {
  symbol: string;
  name: string;
  /** 0–100 */
  networkHealthScore?: number;
  circulatingSupply?: number;
  maxSupply?: number | null;
  inflationOrRewardPct?: number;
  consensus?: 'PoW' | 'PoS';
  hashrateOrStakeLabel?: string;
  validatorsApprox?: number;
  activeAddresses24h?: number;
  dexVolumeUsd?: number;
  tvlUsd?: number;
  radarAxes?: CryptoRadarAxis[];
  classBenchmarkNote?: string;
  checklist?: { id: string; label: string; ok: boolean }[];
}
