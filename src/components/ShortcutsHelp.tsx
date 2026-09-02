import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FaKeyboard } from 'react-icons/fa'
import { displayKeys, SHORTCUTS } from '@/lib/shortcuts'
import { IS_ONLINE, ONLINE_DISABLED_COMMANDS } from '@/lib/platform'

const isMac = navigator.platform.includes('Mac')

/** Floating quick reference: the most-used shortcuts, from the registry. */
const QUICK_COMMANDS = [
  'play-pause', 'stop', 'reset-animation', 'toggle-follow', 'speed-up', 'speed-down',
  'import-csv', 'export', 'zoom-in', 'zoom-out', 'fit-window', 'toggle-crosshair', 'preferences'
]

export const ShortcutsHelp: React.FC = () => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  const localiseKeys = (keys: string) =>
    displayKeys(keys, isMac)
      .replace('Space', t('help.shortcuts.space'))
      .replace('Esc', t('help.shortcuts.escape'))
      .replace('Home', t('help.shortcuts.home'))

  const shortcuts = QUICK_COMMANDS
    .map(command => SHORTCUTS.find(s => s.command === command))
    .filter((s): s is NonNullable<typeof s> => Boolean(s && s.keys))
    .filter(s => !(IS_ONLINE && ONLINE_DISABLED_COMMANDS.has(s.command)))
    .map(s => ({ key: localiseKeys(s.keys as string), description: t(s.labelKey) }))

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors z-50"
        title={t('help.title')}
        aria-label={t('help.title')}
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
            {t('help.title')}
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
          {t('help.inputNote')}
        </div>
      </div>
    </>
  )
}
