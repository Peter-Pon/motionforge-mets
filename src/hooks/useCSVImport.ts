import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '@/stores/useProjectStore'
import { importCSVFile } from '@/services/csvImport'
import { toast } from '@/components/ui/use-toast'

export function useCSVImport() {
  const { t } = useTranslation()
  const [isImporting, setIsImporting] = useState(false)
  const { updateModules, createNewProject, project } = useProjectStore()

  const handleImportCSV = async () => {
    if (!window.electronAPI) {
      // Handle web-based file input
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.csv'
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          await processCSVFile(file)
        }
      }
      input.click()
    } else {
      // Handle Electron file dialog - simplified approach without timeout
      try {
        const result = await window.electronAPI.openFile()
        
        if (!result.canceled && result.filePaths.length > 0) {
          const filePath = result.filePaths[0]
          // Read file content
          const fileResult = await window.electronAPI.readFile(filePath)
          if (fileResult.success && fileResult.data) {
            // Create a File object from the content
            const blob = new Blob([fileResult.data], { type: 'text/csv' })
            const file = new File([blob], filePath.split('/').pop() || 'data.csv')
            await processCSVFile(file)
          } else {
            toast({
              variant: 'destructive',
              title: t('error.fileNotFound'),
              description: fileResult.error
            })
          }
        }
      } catch (error) {
        console.error('Error opening file dialog:', error)
        toast({
          variant: 'destructive',
          title: t('error.importFailed'),
          description: error instanceof Error ? error.message : t('error.unknown')
        })
      }
    }
  }

  const processCSVFile = async (file: File) => {
    setIsImporting(true)
    
    try {
      const result = await importCSVFile(file)
      
      if (result.success && result.data) {
        // Create new project if none exists
        if (!project) {
          createNewProject()
        }
        
        // Update modules
        updateModules(result.data)
        
        toast({
          title: t('toolbar.importCSV'),
          description: `Successfully imported ${result.data.length} modules`
        })
      } else {
        // Show error
        let errorMessage = result.error || t('error.importFailed')
        
        if (result.rowErrors && result.rowErrors.length > 0) {
          const errors = result.rowErrors.slice(0, 3).map(e => `Row ${e.row}: ${e.message}`).join('\n')
          errorMessage += '\n\n' + errors
          if (result.rowErrors.length > 3) {
            errorMessage += `\n... and ${result.rowErrors.length - 3} more errors`
          }
        }
        
        toast({
          variant: 'destructive',
          title: t('error.importFailed'),
          description: errorMessage
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('error.importFailed'),
        description: error instanceof Error ? error.message : t('error.unknown')
      })
    } finally {
      setIsImporting(false)
    }
  }

  return {
    handleImportCSV,
    isImporting
  }
}