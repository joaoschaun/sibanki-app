import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// ─── Tipos públicos ──────────────────────────────────────────────────────────

export interface TenantBranding {
  appName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  faviconUrl: string;
  customCss: string;
}

export interface TenantData {
  /** Identificador interno do tenant (slug ou doc id). */
  id?: string;
  slug?: string;
  /** Nome exibido para o usuário. */
  name?: string;
  /** Domínio do host resolvido. */
  domain?: string;
  branding?: Partial<TenantBranding>;
  features?: Record<string, boolean>;
  /** Plano comercial do tenant (free, pro, family, enterprise…). */
  plan?: string;
  /** Permite extensões futuras sem alterar o tipo. */
  [key: string]: unknown;
}

export interface TenantContextValue {
  loading: boolean;
  error: Error | null;
  tenant: TenantData | null;
  branding: TenantBranding;
  features: Record<string, boolean>;
  hasFeature: (featureName: string) => boolean;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_BRANDING: TenantBranding = {
  appName: "Sibanki",
  primaryColor: "#22c55e",
  secondaryColor: "#0ea5e9",
  logoUrl: "",
  faviconUrl: "/favicon.ico",
  customCss: "",
};

const DEFAULT_CONTEXT: TenantContextValue = {
  loading: true,
  error: null,
  tenant: null,
  branding: DEFAULT_BRANDING,
  features: {},
  hasFeature: () => false,
};

const TenantContext = createContext<TenantContextValue>(DEFAULT_CONTEXT);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Remove vetores comuns de XSS em CSS customizado vindos do tenant. */
function sanitizeCss(input: unknown): string {
  const css = String(input || "");
  return css
    .replace(/<\/?style[^>]*>/gi, "")
    .replace(/expression\s*\(/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/@import/gi, "");
}

function applyBranding(branding: TenantBranding): void {
  const root = document.documentElement;
  root.style.setProperty("--color-primary", branding.primaryColor || DEFAULT_BRANDING.primaryColor);
  root.style.setProperty("--color-secondary", branding.secondaryColor || DEFAULT_BRANDING.secondaryColor);
  root.style.setProperty("--color-primary-600", branding.primaryColor || DEFAULT_BRANDING.primaryColor);
  root.style.setProperty("--color-secondary-600", branding.secondaryColor || DEFAULT_BRANDING.secondaryColor);
  document.title = branding.appName || DEFAULT_BRANDING.appName;
}

function upsertFavicon(href: string | undefined): void {
  const targetHref = href || DEFAULT_BRANDING.faviconUrl;
  let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "icon");
    document.head.appendChild(link);
  }
  link.setAttribute("href", targetHref);
}

function upsertCustomCss(cssText: unknown): void {
  const id = "tenant-custom-css";
  let style = document.getElementById(id) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = id;
    document.head.appendChild(style);
  }
  style.textContent = sanitizeCss(cssText);
}

function getCurrentHost(): string {
  if (typeof window === "undefined") return "";
  return window.location.host;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface TenantProviderProps {
  children?: ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [branding, setBranding] = useState<TenantBranding>(DEFAULT_BRANDING);
  const [features, setFeatures] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;

    async function resolveTenant(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const host = encodeURIComponent(getCurrentHost());
        const response = await fetch(`/api/v1/tenants/resolve?host=${host}`);
        if (!response.ok) {
          throw new Error(`Falha ao resolver tenant (${response.status})`);
        }
        const data = (await response.json()) as TenantData;
        if (!active) return;

        const resolvedBranding: TenantBranding = {
          ...DEFAULT_BRANDING,
          ...(data.branding || {}),
        };
        setTenant(data);
        setBranding(resolvedBranding);
        setFeatures((data.features as Record<string, boolean>) || {});
        applyBranding(resolvedBranding);
        upsertFavicon(resolvedBranding.faviconUrl);
        upsertCustomCss(resolvedBranding.customCss);
      } catch (err) {
        if (!active) return;
        const normalizedError = err instanceof Error ? err : new Error(String(err));
        setError(normalizedError);
        setTenant(null);
        setBranding(DEFAULT_BRANDING);
        setFeatures({});
        applyBranding(DEFAULT_BRANDING);
        upsertFavicon(DEFAULT_BRANDING.faviconUrl);
        upsertCustomCss("");
      } finally {
        if (active) setLoading(false);
      }
    }

    void resolveTenant();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<TenantContextValue>(() => ({
    loading,
    error,
    tenant,
    branding,
    features,
    hasFeature: (featureName: string) => !!features?.[featureName],
  }), [loading, error, tenant, branding, features]);

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

// ─── Consumer hook ────────────────────────────────────────────────────────────

export function useTenant(): TenantContextValue {
  return useContext(TenantContext);
}
