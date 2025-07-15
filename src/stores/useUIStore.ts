import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface UIState {
  sidebarCollapsed: boolean
  zoom: number
  theme: 'light' | 'dark' | 'auto'
  
  // Actions
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setZoom: (zoom: number) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  setTheme: (theme: 'light' | 'dark' | 'auto') => void
}

export const useUIStore = create<UIState>()(
  immer((set) => ({
    // Initial state
    sidebarCollapsed: false,
    zoom: 1,
    theme: 'auto',

    // Actions
    toggleSidebar: () => set((state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed
    }),

    setSidebarCollapsed: (collapsed) => set((state) => {
      state.sidebarCollapsed = collapsed
    }),

    setZoom: (zoom) => set((state) => {
      state.zoom = Math.max(0.25, Math.min(4, zoom))
    }),

    zoomIn: () => set((state) => {
      state.zoom = Math.min(4, state.zoom * 1.25)
    }),

    zoomOut: () => set((state) => {
      state.zoom = Math.max(0.25, state.zoom / 1.25)
    }),

    resetZoom: () => set((state) => {
      state.zoom = 1
    }),

    setTheme: (theme) => set((state) => {
      state.theme = theme
    })
  }))
)