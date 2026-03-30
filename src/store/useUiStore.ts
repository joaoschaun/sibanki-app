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
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveSection: (section: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  activeSection: 'dashboard',
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setActiveSection: (section) => set({ activeSection: section }),
}));
