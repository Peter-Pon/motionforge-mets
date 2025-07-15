import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FaKeyboard } from 'react-icons/fa'

export const ShortcutsHelp: React.FC = () => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  
  const isMac = navigator.platform.includes('Mac')
  const cmdKey = isMac ? '⌘' : 'Ctrl'

  const shortcuts = [
    { key: 'Space', description: t('shortcuts.playPause').replace('空格', 'Space') },
    { key: 'S', description: t('shortcuts.stop') },
    { key: 'R', description: t('shortcuts.reset') },
    { key: `${cmdKey}+I`, description: t('shortcuts.importCSV').replace('Ctrl', cmdKey) },
    { key: `${cmdKey}+E`, description: t('shortcuts.export').replace('Ctrl', cmdKey) },
    { key: `${cmdKey}+,`, description: t('shortcuts.preferences').replace('Ctrl', cmdKey) },
    { key: '+', description: t('shortcuts.speedUp') },
    { key: '-', description: t('shortcuts.speedDown') },
    { key: `${cmdKey}+T`, description: t('shortcuts.loadTestData').replace('Ctrl', cmdKey) },
    { key: 'C', description: t('shortcuts.toggleCrosshair') }
  ]

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors z-50"
        title="顯示快捷鍵說明"
      >
        <FaKeyboard className="w-5 h-5" />
      </button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40" 
        onClick={() => setIsOpen(false)}
      />
      
      {/* Modal */}
      <div className="fixed bottom-20 right-4 bg-white rounded-lg shadow-xl p-6 w-80 z-50 border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FaKeyboard />
            快捷鍵說明
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm text-gray-700 flex-1 mr-4">{shortcut.description}</span>
              <kbd className="px-3 py-1.5 bg-gray-50 rounded-md text-xs font-mono text-gray-800 border border-gray-200 shadow-sm min-w-0 text-center">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t text-xs text-gray-500">
          注意：在輸入框中輸入時快捷鍵不會生效
        </div>
      </div>
    </>
  )
}