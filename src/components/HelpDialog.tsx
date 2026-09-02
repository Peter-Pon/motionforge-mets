import { useTranslation } from 'react-i18next'
import { FaTimes } from 'react-icons/fa'
import { displayKeys, SHORTCUT_CATEGORIES, SHORTCUTS } from '@/lib/shortcuts'
import { IS_ONLINE, ONLINE_DISABLED_COMMANDS } from '@/lib/platform'

interface HelpDialogProps {
  isOpen: boolean
  onClose: () => void
}

const isMac = navigator.platform.includes('Mac')

export function HelpDialog({ isOpen, onClose }: HelpDialogProps) {
  const { t } = useTranslation()

  if (!isOpen) return null

  // Key names that read differently per language; everything else is shown as-is.
  const localiseKeys = (keys: string) =>
    displayKeys(keys, isMac)
      .replace('Space', t('help.shortcuts.space'))
      .replace('Esc', t('help.shortcuts.escape'))
      .replace('Home', t('help.shortcuts.home'))

  // One table per category, straight from the registry the menu and the key
  // handler are built from, so this list is always what actually works.
  const categories = SHORTCUT_CATEGORIES.map(category => ({
    title: t(`help.categories.${category}`),
    shortcuts: SHORTCUTS.filter(s => s.category === category && s.keys && !(IS_ONLINE && ONLINE_DISABLED_COMMANDS.has(s.command))).map(s => ({
      action: t(s.labelKey),
      keys: localiseKeys(s.keys as string)
    }))
  })).filter(category => category.shortcuts.length > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('help.title')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FaTimes />
          </button>
        </div>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {t('help.description')}
        </p>

        {/* Shortcuts list */}
        <div className="overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories.map((category, idx) => (
              <div key={idx} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3 text-gray-800 dark:text-gray-200">
                  {category.title}
                </h3>
                <table className="w-full">
                  <tbody>
                    {category.shortcuts.map((shortcut, shortcutIdx) => (
                      <tr key={shortcutIdx} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                        <td className="py-2 text-sm text-gray-700 dark:text-gray-300">
                          {shortcut.action}
                        </td>
                        <td className="py-2 text-sm text-right">
                          <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 dark:text-gray-200 dark:bg-gray-700 rounded">
                            {shortcut.keys}
                          </kbd>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Additional help info */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
              {t('help.tips.title')}
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              <li>{t('help.tips.tip1')}</li>
              <li>{t('help.tips.tip2')}</li>
              <li>{t('help.tips.tip3')}</li>
              <li>{t('help.tips.tip4')}</li>
            </ul>
            <p className="mt-2 text-xs text-blue-700 dark:text-blue-300">{t('help.inputNote')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
