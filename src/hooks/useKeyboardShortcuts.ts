import { useEffect } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  action: () => void
  description: string
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in input fields
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatches = !!shortcut.ctrl === (event.ctrlKey || event.metaKey)
        const shiftMatches = !!shortcut.shift === event.shiftKey
        const altMatches = !!shortcut.alt === event.altKey
        
        if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
          event.preventDefault()
          event.stopPropagation()
          shortcut.action()
          break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts, enabled])
}

// Helper function to format shortcut for display
export function formatShortcut(shortcut: Omit<KeyboardShortcut, 'action' | 'description'>): string {
  const parts: string[] = []
  
  if (shortcut.ctrl || shortcut.meta) {
    parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
  }
  if (shortcut.shift) parts.push('Shift')
  if (shortcut.alt) parts.push(navigator.platform.includes('Mac') ? '⌥' : 'Alt')
  
  parts.push(shortcut.key.toUpperCase())
  
  return parts.join('+')
}

// Common shortcuts configuration
export const COMMON_SHORTCUTS = {
  PLAY_PAUSE: { key: ' ', description: 'Play/Pause' },
  STOP: { key: 's', description: 'Stop' },
  RESET: { key: 'r', description: 'Reset' },
  IMPORT_CSV: { key: 'o', ctrl: true, shift: true, description: 'Import CSV' },
  EXPORT: { key: 'e', ctrl: true, description: 'Export' },
  PREFERENCES: { key: ',', ctrl: true, description: 'Preferences' },
  SPEED_UP: { key: '=', description: 'Speed Up' },
  SPEED_DOWN: { key: '-', description: 'Speed Down' },
  LOAD_TEST_DATA: { key: 't', ctrl: true, description: 'Load Test Data' },
  TOGGLE_CROSSHAIR: { key: 'c', description: 'Toggle Crosshair' }
} as const