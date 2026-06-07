/**
 * useUiStore — estado global de UI via Zustand.
 *
 * Antes havia conflito: App.tsx usava useState local para o sidebar enquanto
 * este store ficava inativo. Agora o App.tsx consome o store diretamente.
 */
import { create } from 'zustand';

interface UiState {
  sidebarCollapsed: boolean;
  activeSection: string;
  /** Ultima rota do painel antes de /consultor-ia (toggle Painel | Assistente). */
  lastVisionPath: string;
  consultantDrawerOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveSection: (section: string) => void;
  syncRoute: (pathname: string) => void;
  openConsultantDrawer: () => void;
  closeConsultantDrawer: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  activeSection: 'dashboard',
  lastVisionPath: '/dashboard',
  consultantDrawerOpen: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setActiveSection: (section) => set({ activeSection: section }),
  syncRoute: (pathname) => {
    if (pathname === '/consultor-ia' || pathname === '/' || pathname === '/login') return;
    set({ lastVisionPath: pathname });
  },
  openConsultantDrawer: () => set({ consultantDrawerOpen: true }),
  closeConsultantDrawer: () => set({ consultantDrawerOpen: false }),
}));
