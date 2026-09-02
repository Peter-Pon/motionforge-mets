import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

/**
 * View zoom. 1 is the cell size from preferences; the canvas scales its cell
 * geometry and the parameter table scales its row height by the same factor,
 * so the two stay row-aligned at every level. Below 0.5 the table text stops
 * being legible, above 3 a single cell fills the window.
 */
export const MIN_ZOOM = 0.5
export const MAX_ZOOM = 3
export const ZOOM_STEP = 1.25
/**
 * Follow mode may go far below the manual floor: its job is to keep every
 * active module in view at once, and on a wide machine that can mean a whole
 * cycle of 300 cells across a laptop screen. Text is unreadable down there,
 * but the shape of the chart still is.
 */
export const FOLLOW_MIN_ZOOM = 0.1

export const clampZoom = (zoom: number) =>
  Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))

export const clampFollowZoom = (zoom: number) =>
  Math.max(FOLLOW_MIN_ZOOM, Math.min(MAX_ZOOM, zoom))

interface UIState {
  sidebarCollapsed: boolean
  zoom: number
  /**
   * Follow playback: the canvas keeps the cells being painted in view by
   * scrolling, and zooms out when they will not fit. `followBaseZoom` is the
   * level the user chose; follow mode never zooms in past it and returns to
   * it when the active region shrinks again.
   */
  followPlayback: boolean
  followBaseZoom: number
  theme: 'light' | 'dark' | 'auto'
  
  // Actions
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setZoom: (zoom: number) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  toggleFollowPlayback: () => void
  /** Zoom applied by the follow camera; leaves the user's base level alone. */
  applyFollowZoom: (zoom: number) => void
  setTheme: (theme: 'light' | 'dark' | 'auto') => void
}

export const useUIStore = create<UIState>()(
  immer((set) => ({
    // Initial state
    sidebarCollapsed: false,
    zoom: 1,
    followPlayback: false,
    followBaseZoom: 1,
    theme: 'auto',

    // Actions
    toggleSidebar: () => set((state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed
    }),

    setSidebarCollapsed: (collapsed) => set((state) => {
      state.sidebarCollapsed = collapsed
    }),

    // User-driven zoom changes also move the follow base level.
    setZoom: (zoom) => set((state) => {
      state.zoom = clampZoom(zoom)
      state.followBaseZoom = state.zoom
    }),

    zoomIn: () => set((state) => {
      state.zoom = clampZoom(state.zoom * ZOOM_STEP)
      state.followBaseZoom = state.zoom
    }),

    zoomOut: () => set((state) => {
      state.zoom = clampZoom(state.zoom / ZOOM_STEP)
      state.followBaseZoom = state.zoom
    }),

    resetZoom: () => set((state) => {
      state.zoom = 1
      state.followBaseZoom = 1
    }),

    toggleFollowPlayback: () => set((state) => {
      state.followPlayback = !state.followPlayback
      if (state.followPlayback) {
        state.followBaseZoom = state.zoom
      } else {
        // Leaving follow mode restores the level the user had picked.
        state.zoom = state.followBaseZoom
      }
    }),

    applyFollowZoom: (zoom) => set((state) => {
      state.zoom = clampFollowZoom(zoom)
    }),

    setTheme: (theme) => set((state) => {
      state.theme = theme
    })
  }))
)
