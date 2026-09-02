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
          {/* Brand mark — Dynmech mark reversed on the ink ground, same
              artwork as the app icon and the splash card. */}
          <div className="w-20 h-20 mx-auto mb-4 rounded-lg overflow-hidden" style={{ backgroundColor: '#12161B' }}>
            <svg viewBox="0 0 120 120" className="w-full h-full" role="img" aria-label="DYNMECH">
              <g transform="translate(60 60) scale(1.143) translate(-57.5 -74.95)">
                <path d="M96 96 A72 72 0 0 0 86.4 60" fill="none" stroke="#1F5FE8" strokeWidth="14" />
                <rect x="12" y="84" width="24" height="24" fill="#FAF9F7" />
                <path d="M24 96 L77.5 47.8" fill="none" stroke="#FAF9F7" strokeWidth="16" />
                <circle cx="24" cy="96" r="4.5" fill="#12161B" />
              </g>
            </svg>
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
              href="https://dynmech.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
            >
              dynmech.com
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