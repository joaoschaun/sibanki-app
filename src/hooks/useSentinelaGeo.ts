import { useState, useCallback, useRef } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type GeoScenario =
  | 'car_dealer'
  | 'shopping_mall'
  | 'electronics_store'
  | 'jewelry_store'
  | 'supermarket'
  | 'bank'
  | 'pharmacy'
  | 'food_venue'
  | 'clothing_store'
  | 'furniture_store'
  | null;

export interface SentinelaGeoResult {
  scenario: GeoScenario;
  placeName: string;
  message: string | null;
  sent: boolean;
}

export interface SentinelaGeoState {
  loading: boolean;
  result: SentinelaGeoResult | null;
  error: string | null;
  lastChecked: Date | null;
}

export interface SentinelaGeoSnapshot {
  daysOfFreedom?: number;
  spreadGap?: number;
  monthlyBurn?: number;
  categoryBudgets?: Record<string, { spent: number; limit: number; pct: number }>;
}


// ─── Labels legíveis por cenário ─────────────────────────────────────────────

export const SCENARIO_LABELS: Record<NonNullable<GeoScenario>, string> = {
  car_dealer:       '🚗 Concessionária',
  shopping_mall:    '🛍 Shopping',
  electronics_store:'📱 Eletrônicos',
  jewelry_store:    '💍 Joalheria',
  supermarket:      '🛒 Supermercado',
  bank:             '🏦 Banco',
  pharmacy:         '💊 Farmácia',
  food_venue:       '🍽 Restaurante',
  clothing_store:   '👕 Roupas',
  furniture_store:  '🛋 Móveis',
};

// Debounce mínimo entre checagens para não abusar da Overpass API (ms)
const MIN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Hook que obtém a posição GPS do usuário e chama a Cloud Function
 * `sentinelaGeoCheck` para identificar o cenário financeiro do local.
 *
 * @param snapshot  Dados de soberania (Dias de Liberdade, Spread Gap etc.)
 * @param phone     Número WhatsApp para envio da mensagem (ex: "5511999999999")
 */
export function useSentinelaGeo(
  snapshot: SentinelaGeoSnapshot = {},
  phone?: string
) {
  const [state, setState] = useState<SentinelaGeoState>({
    loading: false,
    result: null,
    error: null,
    lastChecked: null,
  });

  const lastCheckRef = useRef<number>(0);

  const check = useCallback(async () => {
    // Debounce: respeita intervalo mínimo
    const now = Date.now();
    if (now - lastCheckRef.current < MIN_INTERVAL_MS) {
      return; // Ainda dentro do intervalo — não faz nova chamada
    }

    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: 'Geolocalização não disponível neste dispositivo.' }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        lastCheckRef.current = Date.now();

        try {
          const functions = getFunctions(undefined, 'us-central1');
          const sentinelaFn = httpsCallable<
            { lat: number; lng: number; snapshot: SentinelaGeoSnapshot; phone?: string },
            SentinelaGeoResult
          >(functions, 'sentinelaGeoCheck');

          const response = await sentinelaFn({ lat, lng, snapshot, phone });
          setState({
            loading: false,
            result: response.data,
            error: null,
            lastChecked: new Date(),
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Erro ao consultar Sentinela.';
          setState((s) => ({ ...s, loading: false, error: msg }));
        }
      },
      (geoErr) => {
        const msgs: Record<number, string> = {
          1: 'Permissão de localização negada. Habilite nas configurações do navegador.',
          2: 'Localização indisponível no momento.',
          3: 'Tempo esgotado ao obter localização.',
        };
        setState((s) => ({
          ...s,
          loading: false,
          error: msgs[geoErr.code] ?? 'Erro de geolocalização.',
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, [snapshot, phone]);

  const reset = useCallback(() => {
    setState({ loading: false, result: null, error: null, lastChecked: null });
  }, []);

  return { ...state, check, reset };
}
