import { create } from 'zustand';

interface UiState {
  isSidebarOpen: boolean;
  activeSection: string;
  toggleSidebar: () => void;
  setActiveSection: (section: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: true,
  activeSection: 'dashboard',
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setActiveSection: (section) => set({ activeSection: section }),
}));
