import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '@/stores/useProjectStore'
import { exportToCSV, exportToPNG, exportToExcel, exportToPDF, exportProjectData } from '@/services/exportService'
import { FaDownload, FaFileExcel, FaFilePdf, FaFileImage, FaFileCode } from 'react-icons/fa'

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation()
  const { project } = useProjectStore()
  const [isExporting, setIsExporting] = useState(false)
  const [includeCalculatedPositions, setIncludeCalculatedPositions] = useState(true)

  if (!isOpen) return null

  const handleExport = async (format: 'csv' | 'excel' | 'png' | 'pdf' | 'json') => {
    if (!project || !project.modules.length) {
      alert('No data to export')
      return
    }

    setIsExporting(true)
    try {
      switch (format) {
        case 'csv':
          exportToCSV(project.modules, { format: 'csv', includeCalculatedPositions })
          break
        case 'excel':
          await exportToExcel(project.modules)
          break
        case 'png':
          const canvas = document.querySelector('canvas') as HTMLCanvasElement
          if (canvas) {
            exportToPNG(canvas)
          } else {
            throw new Error('Canvas not found')
          }
          break
        case 'pdf':
          const pdfCanvas = document.querySelector('canvas') as HTMLCanvasElement
          if (pdfCanvas) {
            await exportToPDF(pdfCanvas, project.modules)
          } else {
            throw new Error('Canvas not found')
          }
          break
        case 'json':
          exportProjectData(project)
          break
      }
      onClose()
    } catch (error) {
      console.error('Export failed:', error)
      alert(t('error.exportFailed') + ': ' + (error as Error).message)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-[90vw]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t('menu.file.export.title')}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
            disabled={isExporting}
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          {/* CSV Export */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaFileCode className="text-blue-600" />
                <span className="font-medium">CSV</span>
              </div>
              <button
                onClick={() => handleExport('csv')}
                disabled={isExporting}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
              >
                <FaDownload className="text-xs" />
                導出
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">導出模組數據為CSV格式</p>
            <div className="mt-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeCalculatedPositions}
                  onChange={(e) => setIncludeCalculatedPositions(e.target.checked)}
                  className="rounded"
                />
                包含計算位置信息
              </label>
            </div>
          </div>

          {/* Excel Export */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaFileExcel className="text-green-600" />
                <span className="font-medium">{t('menu.file.export.excel')}</span>
              </div>
              <button
                onClick={() => handleExport('excel')}
                disabled={isExporting}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
              >
                <FaDownload className="text-xs" />
                導出
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">導出詳細模組數據</p>
          </div>

          {/* PNG Export */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaFileImage className="text-purple-600" />
                <span className="font-medium">{t('menu.file.export.png')}</span>
              </div>
              <button
                onClick={() => handleExport('png')}
                disabled={isExporting}
                className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1"
              >
                <FaDownload className="text-xs" />
                導出
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">導出當前畫布視圖</p>
          </div>

          {/* PDF Export */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaFilePdf className="text-red-600" />
                <span className="font-medium">{t('menu.file.export.pdf')}</span>
              </div>
              <button
                onClick={() => handleExport('pdf')}
                disabled={isExporting}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
              >
                <FaDownload className="text-xs" />
                導出
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">導出畫布和數據為PDF</p>
          </div>

          {/* Project JSON Export */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaFileCode className="text-gray-600" />
                <span className="font-medium">項目文件</span>
              </div>
              <button
                onClick={() => handleExport('json')}
                disabled={isExporting}
                className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 flex items-center gap-1"
              >
                <FaDownload className="text-xs" />
                導出
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">導出完整項目配置</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            {t('dialog.cancel')}
          </button>
        </div>

        {isExporting && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">正在導出...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}