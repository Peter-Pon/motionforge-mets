import Papa from 'papaparse'
import { ModuleData } from '@/types'

export interface ExportOptions {
  format: 'csv' | 'pdf'
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

    downloadFile(csv, 'cycleview-export.csv', 'text/csv')
  } catch (error) {
    console.error('CSV export failed:', error)
    throw new Error('CSV export failed')
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

// PDF export lives in services/pdfExport.ts — it is a full report rendered
// through Chromium's print pipeline, not a canvas snapshot.

// Save an already-encoded binary blob (e.g. the MP4 produced by videoExport).
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  try {
    downloadFileFromUrl(url, filename)
  } finally {
    // Revoke on the next tick: the click above starts the save asynchronously.
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }
}

