/**
 * Feature Flags — migrado do legado (SIBANKI_FEATURES)
 *
 * Suporta:
 *  - Definição local com plano mínimo
 *  - Override remoto via Firestore (config/featureFlags)
 *  - hasFeature(key) para verificação
 *  - requireFeature(key) que retorna { allowed, upsellInfo }
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppContext } from '../context/AppContext';
import { getAppEnv } from '../utils/environment';

export type UserPlan = 'free' | 'pro' | 'familia';

interface FeatureConfig {
  enabled: boolean;
  plans: UserPlan[];
  label: string;
  desc: string;
  upsell?: string;
}

const FEATURES: Record<string, FeatureConfig> = {
  briefing_ia: {
    enabled: true,
    plans: ['pro', 'familia'],
    label: 'Briefing IA',
    desc: 'Resumo inteligente ao abrir o app',
    upsell: 'Receba um briefing personalizado toda vez que abrir o app.',
  },
  flash_banners: {
    enabled: true,
    plans: ['free', 'pro', 'familia'],
    label: 'Banners contextuais',
    desc: 'Dicas e alertas baseados na sua situação financeira',
  },
  ia_consultor: {
    enabled: true,
    plans: ['free', 'pro', 'familia'],
    label: 'Consultor IA',
    desc: 'Converse com a IA sobre suas finanças',
  },
  ia_insights_produto: {
    enabled: true,
    plans: ['free', 'pro', 'familia'],
    label: 'Insights de produtos',
    desc: 'Sugestões inteligentes de produtos financeiros',
  },
  relatorio_pdf: {
    enabled: true,
    plans: ['pro', 'familia'],
    label: 'Relatório PDF',
    desc: 'Exporte relatórios profissionais em PDF',
    upsell: 'Gere relatórios PDF completos para acompanhar sua evolução.',
  },
  open_finance: {
    enabled: true,
    plans: ['pro', 'familia'],
    label: 'Open Finance',
    desc: 'Conexão com bancos via Open Finance',
    upsell: 'Conecte suas contas bancárias e veja tudo automaticamente.',
  },
  whatsapp_bot: {
    enabled: true,
    plans: ['pro', 'familia'],
    label: 'Bot WhatsApp',
    desc: 'Receba alertas e consulte dados pelo WhatsApp',
    upsell: 'Receba alertas e gerencie finanças pelo WhatsApp.',
  },
  dashboard_customizavel: {
    enabled: true,
    plans: ['free', 'pro', 'familia'],
    label: 'Dashboard personalizável',
    desc: 'Escolha quais widgets exibir no Dashboard',
  },
  familia_compartilhado: {
    enabled: true,
    plans: ['familia'],
    label: 'Modo Família',
    desc: 'Compartilhe finanças com seu parceiro(a)',
    upsell: 'Gerencie finanças em casal com visão compartilhada.',
  },
  ocr_foto: {
    enabled: true,
    plans: ['pro', 'familia'],
    label: 'Lançamento por foto',
    desc: 'Fotografe recibos para lançar automaticamente',
    upsell: 'Tire foto do recibo e a IA cria o lançamento para você.',
  },
  stt_voz: {
    enabled: true,
    plans: ['pro', 'familia'],
    label: 'Lançamento por voz',
    desc: 'Dite seus gastos para lançar automaticamente',
    upsell: 'Diga "gastei 50 reais no mercado" e a IA lança para você.',
  },
};

export interface UpsellInfo {
  key: string;
  label: string;
  desc: string;
  upsell: string;
}

export function useFeatureFlags() {
  const { data } = useAppContext();
  const [remoteFlags, setRemoteFlags] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  const userPlan: UserPlan = useMemo(() => {
    // Ação #1 (Análise 360): plano efetivo vem de `data.plan` (gravado só pelo
    // webhook Stripe / Admin SDK). O legado settings.planType era editável pelo
    // cliente — qualquer usuário se promovia a Pro — e deixou de ser aceito.
    const plan = (data as { plan?: string } | null)?.plan;
    if (plan === 'pro' || plan === 'familia') return plan;
    return 'free';
  }, [data]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'config', 'featureFlags'));
        if (!cancelled && snap.exists()) {
          // Documento escopado por ambiente: { prod: {...}, staging: {...} }.
          const docData = snap.data() as Record<string, Record<string, boolean>>;
          setRemoteFlags(docData[getAppEnv()] || {});
        }
      } catch { /* silent */ }
      if (!cancelled) setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const hasFeature = useCallback((key: string): boolean => {
    const feat = FEATURES[key];
    if (!feat) return false;
    const enabled = key in remoteFlags ? remoteFlags[key] : feat.enabled;
    if (!enabled) return false;
    return feat.plans.includes(userPlan);
  }, [remoteFlags, userPlan]);

  const requireFeature = useCallback((key: string): { allowed: boolean; upsellInfo: UpsellInfo | null } => {
    const feat = FEATURES[key];
    if (!feat) return { allowed: false, upsellInfo: null };
    const enabled = key in remoteFlags ? remoteFlags[key] : feat.enabled;
    if (!enabled) return { allowed: false, upsellInfo: null };
    if (feat.plans.includes(userPlan)) return { allowed: true, upsellInfo: null };
    if (feat.upsell) {
      return {
        allowed: false,
        upsellInfo: { key, label: feat.label, desc: feat.desc, upsell: feat.upsell },
      };
    }
    return { allowed: false, upsellInfo: null };
  }, [remoteFlags, userPlan]);

  const allFeatures = useMemo(() => {
    return Object.entries(FEATURES).map(([key, feat]) => ({
      key,
      ...feat,
      effectiveEnabled: key in remoteFlags ? remoteFlags[key] : feat.enabled,
      userHasAccess: hasFeature(key),
    }));
  }, [remoteFlags, hasFeature]);

  return { hasFeature, requireFeature, allFeatures, userPlan, loaded };
}
