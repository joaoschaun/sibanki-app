/**
 * useModuleFlags — estado de ligado/desligado dos módulos de navegação.
 *
 * Fonte: documento `config/modules` no Firestore (gravado pelo painel admin).
 * Shape ESCOPADO POR AMBIENTE: { prod: {moduleKey: bool}, staging: {...} }.
 * O app lê a fatia do seu ambiente (getAppEnv pelo hostname) — assim toggles no
 * staging não afetam produção. Chaves ausentes herdam o default do módulo.
 *
 * - UM listener compartilhado (singleton) para todos os consumidores — respeita
 *   a convenção do projeto de minimizar listeners Firestore (Sidebar +
 *   BottomNavigation + ModuleGuard usam o mesmo).
 * - Falha de leitura (ex.: regras) → fallback para defaults (tudo ligado).
 * - Módulos `essential` são SEMPRE habilitados, ignorando override remoto.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase';
import { MODULE_BY_KEY, defaultModuleFlags } from '../constants/appModules';
import { getAppEnv } from '../utils/environment';

type Flags = Record<string, boolean>;
const ENV = getAppEnv();

// ── Store singleton: 1 onSnapshot para N consumidores ─────────────────────────
let current: Flags = {};
let started = false;
let isLoaded = false;
let unsub: Unsubscribe | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function ensureSubscription() {
  if (started) return;
  started = true;
  const ref = doc(db, 'config', 'modules');
  unsub = onSnapshot(
    ref,
    (snap) => {
      // Documento escopado por ambiente: lê só a fatia { [ENV]: {...} }.
      const data = snap.exists() ? (snap.data() as Record<string, Flags>) : {};
      current = (data && data[ENV]) || {};
      isLoaded = true;
      notify();
    },
    () => {
      // Regras negam ou rede falha → segue com defaults (tudo ligado).
      isLoaded = true;
      notify();
    },
  );
}

function subscribe(cb: () => void): () => void {
  ensureSubscription();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
    // Quando ninguém mais escuta, encerra o listener (libera recursos).
    if (listeners.size === 0 && unsub) {
      unsub();
      unsub = null;
      started = false;
    }
  };
}

export function useModuleFlags() {
  const [, force] = useState(0);

  useEffect(() => subscribe(() => force((n) => n + 1)), []);

  const remote = current;
  const loaded = isLoaded;

  const isModuleEnabled = useCallback(
    (key: string): boolean => {
      const mod = MODULE_BY_KEY[key];
      // Módulo desconhecido → mostra (não esconde por engano).
      if (!mod) return true;
      // Essencial nunca desliga.
      if (mod.essential) return true;
      return key in remote ? !!remote[key] : mod.default;
    },
    [remote],
  );

  const moduleFlags = useMemo(() => ({ ...defaultModuleFlags(), ...remote }), [remote]);

  return { isModuleEnabled, moduleFlags, loaded };
}
