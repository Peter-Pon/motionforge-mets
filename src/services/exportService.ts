import Papa from 'papaparse'
import { ModuleData } from '@/types'

export interface ExportOptions {
  format: 'csv' | 'excel' | 'png' | 'pdf'
  includeCalculatedPositions?: boolean
}

// Export data to CSV format
export function exportToCSV(modules: ModuleData[], options: ExportOptions = { format: 'csv' }): void {
  try {
    const csvData = modules.map(module => ({
      module: module.moduleName,
      action: module.actionDescription,
      startPosition: options.includeCalculatedPositions && module.calculatedStartX !== undefined 
        ? module.calculatedStartX 
        : module.startX,
      moveCount: module.moveCount,
      duration: module.duration,
      ...(module.stage && { stage: module.stage }), // Include stage if present
      ...(options.includeCalculatedPositions && module.isSequentialAction && {
        originalStartPosition: module.startX,
        isSequential: true
      })
    }))

    const csv = Papa.unparse(csvData, {
      header: true,
      delimiter: ',',
      quotes: true
    })

    downloadFile(csv, 'mets-export.csv', 'text/csv')
  } catch (error) {
    console.error('CSV export failed:', error)
    throw new Error('CSV export failed')
  }
}

// Export canvas as PNG
export function exportToPNG(canvasElement: HTMLCanvasElement, filename: string = 'mets-canvas.png'): void {
  try {
    canvasElement.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        downloadFileFromUrl(url, filename)
        URL.revokeObjectURL(url)
      } else {
        throw new Error('Failed to create canvas blob')
      }
    }, 'image/png')
  } catch (error) {
    console.error('PNG export failed:', error)
    throw new Error('PNG export failed')
  }
}

// Export to Excel format (basic implementation)
export async function exportToExcel(modules: ModuleData[], filename: string = 'mets-export.xlsx'): Promise<void> {
  try {
    // For basic implementation, we'll export as CSV and let user convert
    // In future, we can use libraries like ExcelJS for native Excel export
    const csvData = modules.map(module => ({
      'Module Name': module.moduleName,
      'Action Description': module.actionDescription,
      'Start Position': module.startX,
      'Calculated Position': module.calculatedStartX || module.startX,
      'Move Count': module.moveCount,
      'Duration (ms)': module.duration,
      'Stage': module.stage || '',
      'Color': module.color,
      'Sequential Action': module.isSequentialAction ? 'Yes' : 'No'
    }))

    const csv = Papa.unparse(csvData, {
      header: true,
      delimiter: ',',
      quotes: true
    })

    downloadFile(csv, filename.replace('.xlsx', '.csv'), 'text/csv')
  } catch (error) {
    console.error('Excel export failed:', error)
    throw new Error('Excel export failed')
  }
}

// Helper function to download file content
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  downloadFileFromUrl(url, filename)
  URL.revokeObjectURL(url)
}

// Helper function to download file from URL
function downloadFileFromUrl(url: string, filename: string): void {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Future: PDF export using jsPDF
export async function exportToPDF(canvasElement: HTMLCanvasElement, _modules: ModuleData[], filename: string = 'mets-export.pdf'): Promise<void> {
  try {
    // For basic implementation, export canvas as PNG
    // In future, we can use jsPDF to create proper PDF with data table
    exportToPNG(canvasElement, filename.replace('.pdf', '.png'))
  } catch (error) {
    console.error('PDF export failed:', error)
    throw new Error('PDF export failed')
  }
}

// Export project data (complete state)
export function exportProjectData(projectData: any, filename: string = 'mets-project.json'): void {
  try {
    const jsonContent = JSON.stringify(projectData, null, 2)
    downloadFile(jsonContent, filename, 'application/json')
  } catch (error) {
    console.error('Project export failed:', error)
    throw new Error('Project export failed')
  }
}