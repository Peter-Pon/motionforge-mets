import Papa from 'papaparse'
import { ModuleData } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export interface CSVRow {
  module: string
  action: string
  startPosition: string | number
  moveCount: string | number
  duration: string | number
  stage?: string
}

export interface CSVImportResult {
  success: boolean
  data?: ModuleData[]
  error?: string
  rowErrors?: Array<{ row: number; message: string }>
}

// Color palette for modules
const MODULE_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f97316', // orange
  '#ec4899', // pink
  '#6366f1', // indigo
  '#84cc16', // lime
]

export async function importCSVFile(file: File): Promise<CSVImportResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const { data, errors } = results
        
        if (errors.length > 0) {
          resolve({
            success: false,
            error: 'CSV parsing errors occurred',
            rowErrors: errors.map(e => ({ row: e.row || 0, message: e.message }))
          })
          return
        }

        const validationResult = validateAndTransformData(data as CSVRow[])
        resolve(validationResult)
      },
      error: (error) => {
        resolve({
          success: false,
          error: `Failed to parse CSV: ${error.message}`
        })
      }
    })
  })
}

function validateAndTransformData(rows: CSVRow[]): CSVImportResult {
  const modules: ModuleData[] = []
  const rowErrors: Array<{ row: number; message: string }> = []
  
  // Validate CSV format
  if (rows.length === 0) {
    return {
      success: false,
      error: 'CSV file is empty'
    }
  }
  
  // Check if required columns exist
  const firstRow = rows[0]
  const requiredColumns = ['module', 'action', 'startPosition', 'moveCount', 'duration']
  const missingColumns = requiredColumns.filter(col => !(col in firstRow))
  
  if (missingColumns.length > 0) {
    return {
      success: false,
      error: `Missing required columns: ${missingColumns.join(', ')}. Expected format: module,action,startPosition,moveCount,duration`
    }
  }
  
  // Group modules by name for color assignment
  const moduleColorMap: { [key: string]: string } = {}
  const uniqueModuleNames = [...new Set(rows.map(row => row.module?.trim() || ''))]
  
  uniqueModuleNames.forEach((moduleName, index) => {
    if (moduleName) {
      moduleColorMap[moduleName] = MODULE_COLORS[index % MODULE_COLORS.length]
    }
  })
  
  rows.forEach((row, index) => {
    const rowNumber = index + 2 // +1 for 0-index, +1 for header row
    
    // Validate required fields
    if (!row.module?.trim()) {
      rowErrors.push({ row: rowNumber, message: 'Module name is required' })
      return
    }
    
    if (!row.action?.trim()) {
      rowErrors.push({ row: rowNumber, message: 'Action description is required' })
      return
    }
    
    // Parse numeric values
    const startX = parseFloat(String(row.startPosition || '0'))
    const moveCount = parseFloat(String(row.moveCount || '0'))
    const duration = parseFloat(String(row.duration || '100'))
    
    // Validate numeric values
    if (isNaN(startX) || startX < 0) {
      rowErrors.push({ row: rowNumber, message: 'Start position must be a non-negative number' })
      return
    }
    
    if (isNaN(moveCount) || moveCount < 0) {
      rowErrors.push({ row: rowNumber, message: 'Move count must be a non-negative number' })
      return
    }
    
    if (isNaN(duration) || duration <= 0) {
      rowErrors.push({ row: rowNumber, message: 'Duration must be a positive number' })
      return
    }
    
    // Create module data with color assigned by module name
    modules.push({
      id: uuidv4(),
      moduleName: row.module.trim(),
      actionDescription: row.action.trim(),
      startX: Math.floor(startX),
      moveCount: Math.floor(moveCount),
      duration: duration,
      stage: row.stage?.trim() || undefined, // Optional stage column
      color: moduleColorMap[row.module.trim()]
    })
  })
  
  if (rowErrors.length > 0) {
    return {
      success: false,
      error: 'Validation errors found in CSV data',
      rowErrors
    }
  }
  
  if (modules.length === 0) {
    return {
      success: false,
      error: 'No valid data found in CSV file'
    }
  }
  
  // Process sequential actions and calculate positions
  const processedModules = processSequentialActions(modules)
  
  return {
    success: true,
    data: processedModules
  }
}

// Process sequential actions within each module group
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
    if (group.length < 2) return // No need to process single-action modules
    
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
      }
    }
    
    // Ensure first action uses original position
    if (group.length > 0) {
      group[0].calculatedStartX = group[0].startX
    }
  })
  
  return modules
}

// Install uuid package
export function installUuid() {
  // This is just a reminder that we need to install uuid
  return 'npm install uuid @types/uuid'
}