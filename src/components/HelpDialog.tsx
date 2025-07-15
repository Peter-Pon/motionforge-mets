import { useTranslation } from 'react-i18next'
import { FaTimes } from 'react-icons/fa'

interface HelpDialogProps {
  isOpen: boolean
  onClose: () => void
}

interface ShortcutCategory {
  title: string
  shortcuts: {
    action: string
    keys: string
  }[]
}

export function HelpDialog({ isOpen, onClose }: HelpDialogProps) {
  const { t } = useTranslation()

  if (!isOpen) return null

  const categories: ShortcutCategory[] = [
    {
      title: t('help.categories.file'),
      shortcuts: [
        { action: t('menu.file.new'), keys: 'Ctrl/Cmd + N' },
        { action: t('menu.file.open'), keys: 'Ctrl/Cmd + O' },
        { action: t('menu.file.save'), keys: 'Ctrl/Cmd + S' },
        { action: t('menu.file.saveAs'), keys: 'Ctrl/Cmd + Shift + S' },
        { action: t('menu.file.import'), keys: 'Ctrl/Cmd + I' },
        { action: t('menu.file.export.excel'), keys: 'Ctrl/Cmd + Shift + E' },
        { action: t('menu.file.export.pdf'), keys: 'Ctrl/Cmd + Shift + P' },
        { action: t('menu.file.export.png'), keys: 'Ctrl/Cmd + Shift + I' },
        { action: t('menu.file.export.mp4'), keys: 'Ctrl/Cmd + Shift + M' },
      ]
    },
    {
      title: t('help.categories.edit'),
      shortcuts: [
        { action: t('menu.edit.undo'), keys: 'Ctrl/Cmd + Z' },
        { action: t('menu.edit.redo'), keys: 'Ctrl/Cmd + Shift + Z' },
        { action: t('menu.edit.editParams'), keys: 'F2' },
        { action: t('menu.edit.clearCanvas'), keys: 'Delete' },
        { action: t('menu.edit.resetAnimation'), keys: 'Home' },
      ]
    },
    {
      title: t('help.categories.view'),
      shortcuts: [
        { action: t('menu.view.zoomIn'), keys: 'Ctrl/Cmd + +' },
        { action: t('menu.view.zoomOut'), keys: 'Ctrl/Cmd + -' },
        { action: t('menu.view.fitWindow'), keys: 'Ctrl/Cmd + 0' },
        { action: t('menu.view.showGrid'), keys: 'Ctrl/Cmd + G' },
        { action: t('menu.view.showRuler'), keys: 'Ctrl/Cmd + R' },
        { action: t('menu.view.fullscreen'), keys: 'F11' },
      ]
    },
    {
      title: t('help.categories.animation'),
      shortcuts: [
        { action: t('menu.animation.playPause'), keys: t('help.shortcuts.space') },
        { action: t('menu.animation.stop'), keys: t('help.shortcuts.escape') },
        { action: t('menu.animation.nextFrame'), keys: t('help.shortcuts.rightArrow') },
        { action: t('menu.animation.prevFrame'), keys: t('help.shortcuts.leftArrow') },
        { action: t('help.shortcuts.speedUp'), keys: '+' },
        { action: t('help.shortcuts.speedDown'), keys: '-' },
        { action: t('menu.animation.loopPlayback'), keys: 'Ctrl/Cmd + L' },
      ]
    }
  ]

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
          </div>
        </div>
      </div>
    </div>
  )
}