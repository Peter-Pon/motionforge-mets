import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { ModuleData, ProjectData, CanvasConfig } from '@/types'
import { useHistoryStore } from './useHistoryStore'

// Import the processSequentialActions function from csvImport
function processSequentialActions(modules: ModuleData[]): ModuleData[] {
  // Group modules by name
  const moduleGroups: { [key: string]: ModuleData[] } = {}
  
  modules.forEach(module => {
    if (!moduleGroups[module.moduleName]) {
      moduleGroups[module.moduleName] = []
    }
    moduleGroups[module.moduleName].push(module)
  })
  
  // Process each group
  Object.values(moduleGroups).forEach(group => {
    if (group.length === 0) return
    
    // First action always uses original position
    if (group.length > 0) {
      const firstAction = group[0]
      firstAction.calculatedStartX = firstAction.startX
      firstAction.isSequentialAction = false
    }
    
    // Process subsequent actions
    for (let i = 1; i < group.length; i++) {
      const currentAction = group[i]
      const prevAction = group[i - 1]
      
      // Check if this action should be sequential
      // If startX is 0 or negative, treat as sequential
      if (currentAction.startX <= 0) {
        currentAction.isSequentialAction = true
        
        // Calculate the new start position: previous action's end position
        const prevEndPosition = (prevAction.calculatedStartX ?? prevAction.startX) + prevAction.moveCount
        currentAction.calculatedStartX = prevEndPosition
      } else {
        // Use original position
        currentAction.calculatedStartX = currentAction.startX
        currentAction.isSequentialAction = false
      }
    }
  })
  
  return modules
}

interface ProjectState {
  project: ProjectData | null
  unsavedChanges: boolean
  
  // Actions
  createNewProject: () => void
  loadProject: (project: ProjectData) => void
  updateModules: (modules: ModuleData[], skipHistory?: boolean) => void
  updateModule: (id: string, data: Partial<ModuleData>) => void
  addModule: (module: ModuleData) => void
  removeModule: (id: string) => void
  updateCanvasConfig: (config: Partial<CanvasConfig>) => void
  setUnsavedChanges: (value: boolean) => void
  clearProject: () => void
}

const defaultCanvasConfig: CanvasConfig = {
  cellWidth: 20,
  cellHeight: 30,
  showGrid: true,
  showRuler: true,
  gridColor: '#e5e5e5',
  backgroundColor: '#ffffff',
  defaultFillColor: '#3b82f6'
}

export const useProjectStore = create<ProjectState>()(
  immer((set) => ({
    project: null,
    unsavedChanges: false,

    createNewProject: () => set((state) => {
      state.project = {
        name: 'Untitled Project',
        modules: [],
        canvasConfig: defaultCanvasConfig,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0'
      }
      state.unsavedChanges = false
      // Clear history when creating new project
      useHistoryStore.getState().clearHistory()
    }),

    loadProject: (project) => set((state) => {
      state.project = project
      state.unsavedChanges = false
      // Clear history when loading project
      useHistoryStore.getState().clearHistory()
    }),

    updateModules: (modules, skipHistory = false) => set((state) => {
      if (state.project) {
        // Push current state to history before making changes (unless skipped for undo/redo)
        if (!skipHistory) {
          const historyState = useHistoryStore.getState()
          // If this is the first change (no history), save both current and new state
          if (historyState.history.length === 0) {
            historyState.pushState(state.project.modules) // Save current state as base
          }
          historyState.pushState(modules) // Save new state
        }
        
        state.project.modules = modules
        state.project.updatedAt = new Date().toISOString()
        state.unsavedChanges = true
      }
    }),

    updateModule: (id, data) => set((state) => {
      if (state.project) {
        const moduleIndex = state.project.modules.findIndex(m => m.id === id)
        if (moduleIndex !== -1) {
          // Push current state to history before making changes
          const historyState = useHistoryStore.getState()
          // If this is the first change (no history), save current state as base
          if (historyState.history.length === 0) {
            historyState.pushState(state.project.modules)
          }
          
          // Create new modules array with the update
          const newModules = [...state.project.modules]
          Object.assign(newModules[moduleIndex], data)
          
          // If startX, moveCount, or duration was changed, recalculate sequential actions
          if ('startX' in data || 'moveCount' in data || 'duration' in data) {
            state.project.modules = processSequentialActions(newModules)
          } else {
            state.project.modules = newModules
          }
          
          // Push new state to history
          historyState.pushState(state.project.modules)
          
          state.project.updatedAt = new Date().toISOString()
          state.unsavedChanges = true
        }
      }
    }),

    addModule: (module) => set((state) => {
      if (state.project) {
        // Push current state to history before making changes
        const historyState = useHistoryStore.getState()
        // If this is the first change (no history), save current state as base
        if (historyState.history.length === 0) {
          historyState.pushState(state.project.modules)
        }
        
        state.project.modules.push(module)
        
        // Push new state to history
        historyState.pushState(state.project.modules)
        
        state.project.updatedAt = new Date().toISOString()
        state.unsavedChanges = true
      }
    }),

    removeModule: (id) => set((state) => {
      if (state.project) {
        // Push current state to history before making changes
        const historyState = useHistoryStore.getState()
        // If this is the first change (no history), save current state as base
        if (historyState.history.length === 0) {
          historyState.pushState(state.project.modules)
        }
        
        state.project.modules = state.project.modules.filter(m => m.id !== id)
        
        // Push new state to history
        historyState.pushState(state.project.modules)
        
        state.project.updatedAt = new Date().toISOString()
        state.unsavedChanges = true
      }
    }),

    updateCanvasConfig: (config) => set((state) => {
      if (state.project) {
        Object.assign(state.project.canvasConfig, config)
        state.project.updatedAt = new Date().toISOString()
        state.unsavedChanges = true
      }
    }),

    setUnsavedChanges: (value) => set((state) => {
      state.unsavedChanges = value
    }),

    clearProject: () => set((state) => {
      state.project = null
      state.unsavedChanges = false
    })
  }))
)