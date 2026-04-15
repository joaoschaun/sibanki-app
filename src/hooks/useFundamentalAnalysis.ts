import { useMemo } from 'react';
import {
  extractB3Indicators,
  computeFundamentalPack,
  type B3RawStock,
  type B3FundamentalPack,
} from '../utils/b3Fundamentals';

/**
 * A partir do objeto bruto `results[0]` da Brapi, extrai indicadores e devolve o pack
 * usado pelo `FundamentalScorecard` (Graham, Bazin, Lynch, Buffett).
 */
export function useFundamentalAnalysis(
  stock: B3RawStock | null | undefined,
  priceFallback: number,
): B3FundamentalPack | null {
  return useMemo(() => {
    if (!stock) return null;
    const ind = extractB3Indicators(stock, priceFallback);
    return computeFundamentalPack(ind);
  }, [stock, priceFallback]);
}
