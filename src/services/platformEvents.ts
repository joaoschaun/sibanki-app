import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import type { PlatformEventName } from '../types/platform';

type Primitive = string | number | boolean | null;
type EventPayload = Primitive | Primitive[] | { [key: string]: Primitive | Primitive[] | undefined };

function sanitizePayload(payload?: Record<string, unknown>): Record<string, EventPayload> {
  if (!payload) return {};

  const out: Record<string, EventPayload> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value as Primitive;
      continue;
    }

    if (Array.isArray(value)) {
      out[key] = value
        .filter((item): item is Primitive => item == null || typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean')
        .slice(0, 20);
      continue;
    }

    if (typeof value === 'object') {
      const nested: Record<string, Primitive | Primitive[]> = {};
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        if (
          nestedValue == null ||
          typeof nestedValue === 'string' ||
          typeof nestedValue === 'number' ||
          typeof nestedValue === 'boolean'
        ) {
          nested[nestedKey] = nestedValue as Primitive;
        } else if (Array.isArray(nestedValue)) {
          nested[nestedKey] = nestedValue
            .filter(
              (item): item is Primitive =>
                item == null || typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean',
            )
            .slice(0, 20);
        }
      }
      out[key] = nested;
    }
  }

  return out;
}

export async function trackPlatformEvent(name: PlatformEventName, payload?: Record<string, unknown>): Promise<void> {
  try {
    const callable = httpsCallable<
      { name: PlatformEventName; payload?: Record<string, EventPayload> },
      { ok?: boolean }
    >(functions, 'trackPlatformEvent');
    await callable({ name, payload: sanitizePayload(payload) });
  } catch {
    // Telemetria nunca deve quebrar a UX principal.
  }
}
