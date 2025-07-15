// import React from 'react'
import { useTranslation } from 'react-i18next'
import { usePreferencesStore } from '@/stores/usePreferencesStore'
import { FaCog, FaTimes } from 'react-icons/fa'

interface PreferencesDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function PreferencesDialog({ isOpen, onClose }: PreferencesDialogProps) {
  const { t } = useTranslation()
  const {
    grid,
    animation,
    ui,
    updateGridPreferences,
    updateAnimationPreferences,
    updateUIPreferences,
    resetToDefaults
  } = usePreferencesStore()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <FaCog className="text-gray-600" />
            <h2 className="text-lg font-semibold">{t('preferences.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6 max-h-96 overflow-y-auto">
          {/* Grid Settings */}
          <div>
            <h3 className="text-md font-medium mb-3">{t('preferences.grid.title')}</h3>
            <div className="space-y-4">
              {/* Cell Width */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('preferences.grid.cellWidth')} (5-50px)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={5}
                    max={50}
                    value={grid.cellWidth}
                    onChange={(e) => updateGridPreferences({ cellWidth: parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    min={5}
                    max={50}
                    value={grid.cellWidth}
                    onChange={(e) => updateGridPreferences({ cellWidth: parseInt(e.target.value) })}
                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded text-center"
                  />
                  <span className="text-sm text-gray-500 w-6">px</span>
                </div>
              </div>

              {/* Cell Height */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('preferences.grid.cellHeight')} (12-60px)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={12}
                    max={60}
                    value={grid.cellHeight}
                    onChange={(e) => updateGridPreferences({ cellHeight: parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    min={12}
                    max={60}
                    value={grid.cellHeight}
                    onChange={(e) => updateGridPreferences({ cellHeight: parseInt(e.target.value) })}
                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded text-center"
                  />
                  <span className="text-sm text-gray-500 w-6">px</span>
                </div>
              </div>
            </div>
          </div>

          {/* Animation Settings */}
          <div>
            <h3 className="text-md font-medium mb-3">{t('preferences.animation.title')}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('preferences.animation.coloringMode')}
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="coloringMode"
                      value="gradual"
                      checked={animation.coloringMode === 'gradual'}
                      onChange={(e) => updateAnimationPreferences({ coloringMode: e.target.value as 'gradual' | 'instant' })}
                      className="mr-2"
                    />
                    <span className="text-sm">{t('preferences.animation.gradual')}</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="coloringMode"
                      value="instant"
                      checked={animation.coloringMode === 'instant'}
                      onChange={(e) => updateAnimationPreferences({ coloringMode: e.target.value as 'gradual' | 'instant' })}
                      className="mr-2"
                    />
                    <span className="text-sm">{t('preferences.animation.instant')}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* View Settings */}
          <div>
            <h3 className="text-md font-medium mb-3">{t('preferences.view.title')}</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="crosshair-enabled"
                  checked={ui.crosshairEnabled}
                  onChange={(e) => updateUIPreferences({ crosshairEnabled: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="crosshair-enabled" className="text-sm">
                  {t('preferences.view.crosshairEnabled')}
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="pan-enabled"
                  checked={ui.panEnabled}
                  onChange={(e) => updateUIPreferences({ panEnabled: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="pan-enabled" className="text-sm">
                  {t('preferences.view.panEnabled')}
                </label>
              </div>

              {/* Canvas Text Display */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('preferences.view.canvasTextDisplay')}
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="canvasTextDisplay"
                      value="module"
                      checked={ui.canvasTextDisplay === 'module'}
                      onChange={(e) => updateUIPreferences({ canvasTextDisplay: e.target.value as 'module' | 'stage' | 'action' })}
                      className="mr-2"
                    />
                    <span className="text-sm">{t('preferences.view.displayModule')}</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="canvasTextDisplay"
                      value="stage"
                      checked={ui.canvasTextDisplay === 'stage'}
                      onChange={(e) => updateUIPreferences({ canvasTextDisplay: e.target.value as 'module' | 'stage' | 'action' })}
                      className="mr-2"
                    />
                    <span className="text-sm">{t('preferences.view.displayStage')}</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="canvasTextDisplay"
                      value="action"
                      checked={ui.canvasTextDisplay === 'action'}
                      onChange={(e) => updateUIPreferences({ canvasTextDisplay: e.target.value as 'module' | 'stage' | 'action' })}
                      className="mr-2"
                    />
                    <span className="text-sm">{t('preferences.view.displayAction')}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t">
          <button
            onClick={resetToDefaults}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
          >
            {t('preferences.resetDefaults')}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary/90"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}