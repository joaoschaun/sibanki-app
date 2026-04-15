import type { ReactNode } from 'react';

export function TenantProvider(props: { children?: ReactNode }): JSX.Element;

export function useTenant(): {
  loading: boolean;
  error: unknown;
  tenant: unknown;
  branding: {
    appName: string;
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string;
    faviconUrl: string;
    customCss: string;
  };
  features: Record<string, unknown>;
  hasFeature: (featureName: string) => boolean;
};
