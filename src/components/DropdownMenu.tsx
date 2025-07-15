import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FaEllipsisV } from 'react-icons/fa'

interface DropdownMenuProps {
  onAbout: () => void
  onShortcuts: () => void
  onUserGuide: () => void
}

export function DropdownMenu({ onAbout, onShortcuts, onUserGuide }: DropdownMenuProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close dropdown when pressing escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleMenuItemClick = (action: () => void) => {
    action()
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-sm border rounded hover:bg-accent transition-colors"
        aria-label={t('menu.more')}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <FaEllipsisV />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <button
              onClick={() => handleMenuItemClick(onAbout)}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              role="menuitem"
            >
              {t('menu.help.about')}
            </button>
            <button
              onClick={() => handleMenuItemClick(onShortcuts)}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              role="menuitem"
            >
              {t('menu.help.shortcuts')}
            </button>
            <button
              onClick={() => handleMenuItemClick(onUserGuide)}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              role="menuitem"
            >
              {t('menu.help.userGuide')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}