// Module data structure
export interface ModuleData {
  id: string
  moduleName: string
  actionDescription: string
  startX: number // Original start position from CSV
  calculatedStartX?: number // Auto-calculated start position for sequential actions
  moveCount: number
  duration: number // Changed from intervalTime to duration
  stage?: string // New optional stage column that doesn't participate in calculations
  color?: string
  isSequentialAction?: boolean // Flag to indicate if this is a sequential action
}

// Canvas configuration
export interface CanvasConfig {
  cellWidth: number
  cellHeight: number
  showGrid: boolean
  showRuler: boolean
  gridColor: string
  backgroundColor: string
  defaultFillColor: string
}

// Animation state
export interface AnimationState {
  isPlaying: boolean
  currentFrame: number
  speed: number
  totalFrames: number
  loop: boolean
}

// Project data
export interface ProjectData {
  name: string
  modules: ModuleData[]
  canvasConfig: CanvasConfig
  createdAt: string
  updatedAt: string
  version: string
}

// Application state
export interface AppState {
  project: ProjectData | null
  animation: AnimationState
  ui: {
    sidebarCollapsed: boolean
    zoom: number
    language: string
    theme: 'light' | 'dark' | 'auto'
  }
  unsavedChanges: boolean
}