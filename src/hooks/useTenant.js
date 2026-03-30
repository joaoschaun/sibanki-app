import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const DEFAULT_BRANDING = {
  appName: "Sibanki",
  primaryColor: "#22c55e",
  secondaryColor: "#0ea5e9",
  logoUrl: "",
  faviconUrl: "/favicon.ico",
  customCss: "",
};

const TenantContext = createContext({
  loading: true,
  error: null,
  tenant: null,
  branding: DEFAULT_BRANDING,
  features: {},
  hasFeature: () => false,
});

function sanitizeCss(input) {
  const css = String(input || "");
  // Remove vetores comuns de XSS em CSS customizado.
  return css
    .replace(/<\/?style[^>]*>/gi, "")
    .replace(/expression\s*\(/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/@import/gi, "");
}

function applyBranding(branding) {
  const root = document.documentElement;
  root.style.setProperty("--color-primary", branding.primaryColor || DEFAULT_BRANDING.primaryColor);
  root.style.setProperty("--color-secondary", branding.secondaryColor || DEFAULT_BRANDING.secondaryColor);
  root.style.setProperty("--color-primary-600", branding.primaryColor || DEFAULT_BRANDING.primaryColor);
  root.style.setProperty("--color-secondary-600", branding.secondaryColor || DEFAULT_BRANDING.secondaryColor);
  document.title = branding.appName || DEFAULT_BRANDING.appName;
}

function upsertFavicon(href) {
  const targetHref = href || DEFAULT_BRANDING.faviconUrl;
  let link = document.querySelector("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "icon");
    document.head.appendChild(link);
  }
  link.setAttribute("href", targetHref);
}

function upsertCustomCss(cssText) {
  const id = "tenant-custom-css";
  let style = document.getElementById(id);
  if (!style) {
    style = document.createElement("style");
    style.id = id;
    document.head.appendChild(style);
  }
  style.textContent = sanitizeCss(cssText);
}

function getCurrentHost() {
  if (typeof window === "undefined") return "";
  return window.location.host;
}

export function TenantProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [features, setFeatures] = useState({});

  useEffect(() => {
    let active = true;
    async function resolveTenant() {
      setLoading(true);
      setError(null);
      try {
        const host = encodeURIComponent(getCurrentHost());
        const response = await fetch(`/api/v1/tenants/resolve?host=${host}`);
        if (!response.ok) throw new Error(`Falha ao resolver tenant (${response.status})`);
        const data = await response.json();
        if (!active) return;
        const resolvedBranding = { ...DEFAULT_BRANDING, ...(data.branding || {}) };
        setTenant(data);
        setBranding(resolvedBranding);
        setFeatures(data.features || {});
        applyBranding(resolvedBranding);
        upsertFavicon(resolvedBranding.faviconUrl);
        upsertCustomCss(resolvedBranding.customCss);
      } catch (err) {
        if (!active) return;
        setError(err);
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
    resolveTenant();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => {
    return {
      loading,
      error,
      tenant,
      branding,
      features,
      hasFeature: (featureName) => !!features?.[featureName],
    };
  }, [loading, error, tenant, branding, features]);

  return React.createElement(TenantContext.Provider, { value }, children);
}

export function useTenant() {
  return useContext(TenantContext);
}
