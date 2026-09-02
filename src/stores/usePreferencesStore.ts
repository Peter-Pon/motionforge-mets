import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { Preferences, DEFAULT_PREFERENCES } from '@/types/preferences'

interface PreferencesStore extends Preferences {
  // Actions
  updateGridPreferences: (updates: Partial<Preferences['grid']>) => void
  updateAnimationPreferences: (updates: Partial<Preferences['animation']>) => void
  updateUIPreferences: (updates: Partial<Preferences['ui']>) => void
  resetToDefaults: () => void
  loadPreferences: () => void
  savePreferences: () => void
}

const STORAGE_KEY = 'cycleview-preferences'
// Pre-rebrand key. Read-only fallback: settings saved by a METS build are
// picked up once and then re-saved under STORAGE_KEY.
const LEGACY_STORAGE_KEY = 'mets-preferences'

const readStoredPreferences = (): string | null =>
  localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)

// Load initial preferences from localStorage
const loadInitialPreferences = (): Preferences => {
  try {
    const saved = readStoredPreferences()
    if (saved) {
      const preferences = JSON.parse(saved) as Preferences
      return { ...DEFAULT_PREFERENCES, ...preferences }
    }
  } catch (error) {
    console.warn('Failed to load preferences from localStorage:', error)
  }
  return DEFAULT_PREFERENCES
}

export const usePreferencesStore = create<PreferencesStore>()(
  immer((set, get) => ({
    // Initial state from localStorage or defaults
    ...loadInitialPreferences(),

    // Actions
    // savePreferences runs after set(): inside the updater, get() still returns
    // the previous state, which used to persist every change one step late.
    updateGridPreferences: (updates) => {
      set((state) => {
      // Validate constraints
      if (updates.cellWidth !== undefined) {
        state.grid.cellWidth = Math.max(state.grid.minWidth, Math.min(state.grid.maxWidth, updates.cellWidth))
      }
      if (updates.cellHeight !== undefined) {
        state.grid.cellHeight = Math.max(state.grid.minHeight, Math.min(state.grid.maxHeight, updates.cellHeight))
      }
      
      // Apply other updates
      Object.assign(state.grid, updates)
      
      })
      get().savePreferences()
    },

    updateAnimationPreferences: (updates) => {
      set((state) => {
        Object.assign(state.animation, updates)
      })
      get().savePreferences()
    },

    updateUIPreferences: (updates) => {
      set((state) => {
        Object.assign(state.ui, updates)
      })
      get().savePreferences()
    },

    resetToDefaults: () => {
      set((state) => {
      // Deep copy to ensure all nested properties are reset
      state.grid = { ...DEFAULT_PREFERENCES.grid }
      state.animation = { ...DEFAULT_PREFERENCES.animation }
      state.ui = { ...DEFAULT_PREFERENCES.ui }
      })
      get().savePreferences()
    },

    loadPreferences: () => {
      try {
        const saved = readStoredPreferences()
        if (saved) {
          const preferences = JSON.parse(saved) as Preferences
          set((state) => {
            Object.assign(state, preferences)
          })
        }
      } catch (error) {
        console.warn('Failed to load preferences from localStorage:', error)
      }
    },

    savePreferences: () => {
      try {
        const { updateGridPreferences, updateAnimationPreferences, updateUIPreferences, resetToDefaults, loadPreferences, savePreferences, ...preferences } = get()
        const preferencesToSave = JSON.stringify(preferences)
        localStorage.setItem(STORAGE_KEY, preferencesToSave)
      } catch (error) {
        console.warn('Failed to save preferences to localStorage:', error)
      }
    }
  }))
)