import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FaTimes } from 'react-icons/fa'

interface AboutDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  const { t } = useTranslation()
  const [appVersion, setAppVersion] = useState('1.0.0')

  useEffect(() => {
    // Get app version from package.json if available
    if (window.electronAPI && window.electronAPI.getAppVersion) {
      window.electronAPI.getAppVersion().then(setAppVersion)
    }
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <FaTimes />
        </button>

        {/* Content */}
        <div className="text-center">
          {/* Logo/Icon */}
          <div className="w-20 h-20 mx-auto mb-4 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-3xl font-bold">METS</span>
          </div>

          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
            {t('about.title')}
          </h2>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('about.version', { version: appVersion })}
          </p>

          <p className="text-gray-700 dark:text-gray-300 mb-6">
            {t('about.description')}
          </p>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('about.copyright')}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('about.developedBy')}
            </p>
            <a 
              href="https://www.motionforge.com.tw" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
            >
              www.motionforge.com.tw
            </a>
          </div>

          {/* License info */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('about.license')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}