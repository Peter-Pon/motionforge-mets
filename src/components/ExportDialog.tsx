import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '@/stores/useProjectStore'
import { usePreferencesStore } from '@/stores/usePreferencesStore'
import {
  downloadBlob,
  exportToCSV,
  exportToExcel,
  exportToPNG,
  exportProjectData
} from '@/services/exportService'
import { buildPdfReport } from '@/services/pdfExport'
import {
  exportToMP4,
  isVideoExportSupported,
  VideoExportAbortedError
} from '@/services/videoExport'
import { RenderConfig } from '@/lib/canvasRenderer'
import {
  FaDownload,
  FaFileExcel,
  FaFilePdf,
  FaFileImage,
  FaFileCode,
  FaFileVideo
} from 'react-icons/fa'

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
}

const FPS_CHOICES = [24, 30, 60]

/** Strip characters that are illegal in filenames on Windows and macOS. */
function safeFileStem(name: string | undefined): string {
  const cleaned = (name || '').replace(/[\\/:*?"<>|]+/g, '').trim()
  return cleaned || 'cycleview'
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation()
  const { project } = useProjectStore()
  const { grid, animation, ui } = usePreferencesStore()
  const [isExporting, setIsExporting] = useState(false)
  const [includeCalculatedPositions, setIncludeCalculatedPositions] = useState(true)
  const [fps, setFps] = useState(30)
  const [videoProgress, setVideoProgress] = useState<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const videoSupported = isVideoExportSupported()

  // The exporters must draw with the same settings the canvas is using, or the
  // output stops matching what the user approved on screen.
  const renderConfig = (): RenderConfig => ({
    cellWidth: grid.cellWidth,
    cellHeight: grid.cellHeight,
    gridColor: '#e5e5e5',
    backgroundColor: '#ffffff',
    defaultFillColor: '#3b82f6',
    textDisplay: ui.canvasTextDisplay
  })

  if (!isOpen) return null

  const handleExport = async (format: 'csv' | 'excel' | 'png' | 'json') => {
    if (!project || !project.modules.length) {
      alert(t('export.noData'))
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
        case 'png': {
          const canvas = document.querySelector('canvas') as HTMLCanvasElement
          if (!canvas) throw new Error('Canvas not found')
          exportToPNG(canvas)
          break
        }
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

  const handleExportPdf = async () => {
    if (!project || !project.modules.length) {
      alert(t('export.noData'))
      return
    }
    if (!window.electronAPI?.exportPdf) {
      alert(t('export.pdf.unsupported'))
      return
    }

    setIsExporting(true)
    try {
      const report = buildPdfReport({
        projectName: project.name,
        modules: project.modules,
        config: renderConfig(),
        labels: {
          chartPage: t('export.pdf.report.chartPage'),
          tablePage: t('export.pdf.report.tablePage'),
          totalCycle: t('export.pdf.report.totalCycle'),
          moduleCount: t('export.pdf.report.moduleCount'),
          exportedAt: t('export.pdf.report.exportedAt'),
          untitledProject: t('export.pdf.report.untitledProject'),
          columns: {
            module: t('export.pdf.report.columns.module'),
            action: t('export.pdf.report.columns.action'),
            stage: t('export.pdf.report.columns.stage'),
            startPosition: t('export.pdf.report.columns.startPosition'),
            moveCount: t('export.pdf.report.columns.moveCount'),
            intervalTime: t('export.pdf.report.columns.intervalTime'),
            startTime: t('export.pdf.report.columns.startTime'),
            endTime: t('export.pdf.report.columns.endTime')
          }
        }
      })

      const result = await window.electronAPI.exportPdf(report)
      if (result.canceled) return
      if (!result.success) throw new Error(result.error || 'PDF export failed')
      onClose()
    } catch (error) {
      console.error('PDF export failed:', error)
      alert(t('error.exportFailed') + ': ' + (error as Error).message)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportVideo = async () => {
    if (!project || !project.modules.length) {
      alert(t('export.noData'))
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    setIsExporting(true)
    setVideoProgress(0)

    try {
      const result = await exportToMP4(project.modules, renderConfig(), {
        fps,
        coloringMode: animation.coloringMode,
        signal: controller.signal,
        onProgress: setVideoProgress
      })
      downloadBlob(result.blob, `${safeFileStem(project.name)}-timing.mp4`)
      onClose()
    } catch (error) {
      if (!(error instanceof VideoExportAbortedError)) {
        console.error('MP4 export failed:', error)
        alert(t('error.exportFailed') + ': ' + (error as Error).message)
      }
    } finally {
      abortRef.current = null
      setVideoProgress(null)
      setIsExporting(false)
    }
  }

  const busyElsewhere = isExporting && videoProgress === null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="relative bg-white rounded-lg shadow-xl p-6 w-96 max-w-[90vw] max-h-[90vh] overflow-y-auto">
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
                {t('export.action')}
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">{t('export.csv.description')}</p>
            <div className="mt-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeCalculatedPositions}
                  onChange={(e) => setIncludeCalculatedPositions(e.target.checked)}
                  className="rounded"
                />
                {t('export.csv.includeCalculated')}
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
                {t('export.action')}
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">{t('export.excel.description')}</p>
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
                {t('export.action')}
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">{t('export.png.description')}</p>
          </div>

          {/* MP4 Export */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaFileVideo className="text-amber-600" />
                <span className="font-medium">{t('menu.file.export.mp4')}</span>
              </div>
              <button
                onClick={handleExportVideo}
                disabled={isExporting || !videoSupported}
                className="px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1"
              >
                <FaDownload className="text-xs" />
                {t('export.action')}
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">{t('export.mp4.description')}</p>

            {videoSupported ? (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <label htmlFor="cycleview-fps" className="text-gray-700">
                  {t('export.mp4.fps')}
                </label>
                <select
                  id="cycleview-fps"
                  value={fps}
                  onChange={(e) => setFps(Number(e.target.value))}
                  disabled={isExporting}
                  className="border rounded px-2 py-1 disabled:opacity-50"
                >
                  {FPS_CHOICES.map(choice => (
                    <option key={choice} value={choice}>{choice}</option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="mt-2 text-sm text-red-600">{t('export.mp4.unsupported')}</p>
            )}

            {videoProgress !== null && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>{t('export.mp4.rendering')}</span>
                  <span>{Math.round(videoProgress * 100)}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-200 rounded overflow-hidden">
                  <div
                    className="h-full bg-amber-600 transition-[width] duration-150"
                    style={{ width: `${Math.round(videoProgress * 100)}%` }}
                  />
                </div>
                <button
                  onClick={() => abortRef.current?.abort()}
                  className="mt-2 text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  {t('export.mp4.cancel')}
                </button>
              </div>
            )}
          </div>

          {/* PDF Export */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaFilePdf className="text-red-600" />
                <span className="font-medium">{t('menu.file.export.pdf')}</span>
              </div>
              <button
                onClick={handleExportPdf}
                disabled={isExporting}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
              >
                <FaDownload className="text-xs" />
                {t('export.action')}
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">{t('export.pdf.description')}</p>
          </div>

          {/* Project JSON Export */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaFileCode className="text-gray-600" />
                <span className="font-medium">{t('export.project.title')}</span>
              </div>
              <button
                onClick={() => handleExport('json')}
                disabled={isExporting}
                className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 flex items-center gap-1"
              >
                <FaDownload className="text-xs" />
                {t('export.action')}
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">{t('export.project.description')}</p>
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

        {/* Video export renders its own inline progress, so the blocking overlay
            is only for the short synchronous exports. */}
        {busyElsewhere && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">{t('export.exporting')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
