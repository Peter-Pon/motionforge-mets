import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { ModuleData } from '@/types'

interface HistoryState {
  history: ModuleData[][]
  currentIndex: number
  maxHistorySize: number
  
  // Actions
  pushState: (modules: ModuleData[]) => void
  undo: () => ModuleData[] | null
  redo: () => ModuleData[] | null
  canUndo: () => boolean
  canRedo: () => boolean
  clearHistory: () => void
}

export const useHistoryStore = create<HistoryState>()(
  immer((set, get) => ({
    history: [],
    currentIndex: -1,
    maxHistorySize: 50,
    
    pushState: (modules) => set(state => {
      // Remove any history after current index
      const newHistory = state.history.slice(0, state.currentIndex + 1)
      
      // Add new state
      newHistory.push(JSON.parse(JSON.stringify(modules))) // Deep clone
      
      // Limit history size
      if (newHistory.length > state.maxHistorySize) {
        newHistory.shift()
      } else {
        state.currentIndex++
      }
      
      state.history = newHistory
    }),
    
    undo: () => {
      const state = get()
      // Can undo if we have history and not at the beginning
      if (state.history.length > 0 && state.currentIndex > 0) {
        // Move index back
        const newIndex = state.currentIndex - 1
        set(draft => {
          draft.currentIndex = newIndex
        })
        // Return the state at the new index
        return state.history[newIndex]
      }
      return null
    },
    
    redo: () => {
      const state = get()
      if (state.currentIndex < state.history.length - 1) {
        // Move index forward
        const newIndex = state.currentIndex + 1
        set(draft => {
          draft.currentIndex = newIndex
        })
        // Return the state at the new index
        return state.history[newIndex]
      }
      return null
    },
    
    canUndo: () => {
      const state = get()
      return state.currentIndex > 0
    },
    
    canRedo: () => {
      const state = get()
      return state.currentIndex < state.history.length - 1
    },
    
    clearHistory: () => set(state => {
      state.history = []
      state.currentIndex = -1
    })
  }))
)