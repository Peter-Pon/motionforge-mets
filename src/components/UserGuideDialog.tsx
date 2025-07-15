import { useTranslation } from 'react-i18next'
import { FaTimes } from 'react-icons/fa'

interface UserGuideDialogProps {
  isOpen: boolean
  onClose: () => void
}

interface GuideSection {
  title: string
  content: string[]
}

export function UserGuideDialog({ isOpen, onClose }: UserGuideDialogProps) {
  const { t } = useTranslation()

  if (!isOpen) return null

  const sections: GuideSection[] = [
    {
      title: t('userGuide.sections.gettingStarted.title'),
      content: [
        t('userGuide.sections.gettingStarted.step1'),
        t('userGuide.sections.gettingStarted.step2'),
        t('userGuide.sections.gettingStarted.step3'),
        t('userGuide.sections.gettingStarted.step4')
      ]
    },
    {
      title: t('userGuide.sections.importingData.title'),
      content: [
        t('userGuide.sections.importingData.csvFormat'),
        t('userGuide.sections.importingData.requiredColumns'),
        t('userGuide.sections.importingData.dragDrop'),
        t('userGuide.sections.importingData.testData')
      ]
    },
    {
      title: t('userGuide.sections.animationControls.title'),
      content: [
        t('userGuide.sections.animationControls.playPause'),
        t('userGuide.sections.animationControls.stop'),
        t('userGuide.sections.animationControls.reset'),
        t('userGuide.sections.animationControls.speed')
      ]
    },
    {
      title: t('userGuide.sections.visualization.title'),
      content: [
        t('userGuide.sections.visualization.modules'),
        t('userGuide.sections.visualization.stages'),
        t('userGuide.sections.visualization.timing'),
        t('userGuide.sections.visualization.colors')
      ]
    },
    {
      title: t('userGuide.sections.exporting.title'),
      content: [
        t('userGuide.sections.exporting.formats'),
        t('userGuide.sections.exporting.excel'),
        t('userGuide.sections.exporting.pdf'),
        t('userGuide.sections.exporting.images')
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
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('userGuide.title')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FaTimes />
          </button>
        </div>

        {/* Introduction */}
        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('userGuide.introduction')}
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
              {t('userGuide.quickStart.title')}
            </h3>
            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
              <li>{t('userGuide.quickStart.step1')}</li>
              <li>{t('userGuide.quickStart.step2')}</li>
              <li>{t('userGuide.quickStart.step3')}</li>
            </ol>
          </div>
        </div>

        {/* Guide sections */}
        <div className="overflow-y-auto flex-1">
          <div className="space-y-6">
            {sections.map((section, idx) => (
              <div key={idx} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0">
                <h3 className="font-semibold text-lg mb-3 text-gray-800 dark:text-gray-200">
                  {section.title}
                </h3>
                <div className="space-y-3">
                  {section.content.map((content, contentIdx) => (
                    <div key={contentIdx} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Additional help */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-gray-200 mb-3">
              {t('userGuide.additionalHelp.title')}
            </h3>
            <div className="space-y-2">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {t('userGuide.additionalHelp.shortcuts')}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {t('userGuide.additionalHelp.about')}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {t('userGuide.additionalHelp.support')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}