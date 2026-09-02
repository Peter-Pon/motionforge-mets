/**
 * Keyboard shortcuts and menu commands — the single registry.
 *
 * Everything that can be triggered from the keyboard is described here once,
 * and four places read it: the renderer's key handler (App.tsx), the native
 * application menu (electron/menu.ts), the shortcuts dialog and the floating
 * shortcut panel. Adding a shortcut means adding one entry; it then appears
 * in the menu with its key, is bound in the renderer, and is documented.
 *
 * Single-key shortcuts (Space, S, R, F, C, arrows, + and -) deliberately have
 * no Electron accelerator: an accelerator fires even while the user is typing
 * in a table cell, whereas the renderer binding ignores editable fields. The
 * menu shows their key in the label instead.
 */

export type ShortcutCategory = 'file' | 'edit' | 'view' | 'animation' | 'help'

export interface KeyBinding {
  /** KeyboardEvent.key, compared case-insensitively. */
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
}

export interface ShortcutDef {
  /** Command name: sent by the menu over IPC and dispatched by the renderer. */
  command: string
  /** i18n key of the action label. */
  labelKey: string
  category: ShortcutCategory
  /**
   * Human-readable keys, e.g. "Ctrl+E", "S / Esc", "→". "Ctrl" is shown as ⌘
   * on macOS; "Space", "Esc" and "Home" are localised by the help dialog.
   * Absent for menu-only actions.
   */
  keys?: string
  /** Electron accelerator; only for modifier combinations (see file comment). */
  accelerator?: string
  /** Renderer bindings; several when a key has aliases (Ctrl+= and Ctrl++). */
  bindings?: KeyBinding[]
  /** Menu checkbox reflecting a renderer flag. */
  checkbox?: 'loop' | 'follow' | 'crosshair'
  /** Draw a separator above this item in the menu. */
  separatorBefore?: boolean
}

export const SHORTCUTS: ShortcutDef[] = [
  // File
  {
    command: 'import-csv',
    labelKey: 'menu.file.import',
    category: 'file',
    keys: 'Ctrl+I',
    accelerator: 'CmdOrCtrl+I',
    bindings: [{ key: 'i', ctrl: true }]
  },
  {
    command: 'export',
    labelKey: 'menu.file.export.title',
    category: 'file',
    keys: 'Ctrl+E',
    accelerator: 'CmdOrCtrl+E',
    bindings: [{ key: 'e', ctrl: true }]
  },

  // Edit
  {
    command: 'undo',
    labelKey: 'menu.edit.undo',
    category: 'edit',
    keys: 'Ctrl+Z',
    accelerator: 'CmdOrCtrl+Z',
    bindings: [{ key: 'z', ctrl: true }]
  },
  {
    command: 'redo',
    labelKey: 'menu.edit.redo',
    category: 'edit',
    keys: 'Ctrl+Shift+Z',
    accelerator: 'CmdOrCtrl+Shift+Z',
    bindings: [{ key: 'z', ctrl: true, shift: true }, { key: 'y', ctrl: true }]
  },
  {
    command: 'preferences',
    labelKey: 'menu.edit.preferences',
    category: 'edit',
    keys: 'Ctrl+,',
    accelerator: 'CmdOrCtrl+,',
    bindings: [{ key: ',', ctrl: true }],
    separatorBefore: true
  },

  // View
  {
    command: 'zoom-in',
    labelKey: 'menu.view.zoomIn',
    category: 'view',
    keys: 'Ctrl++',
    accelerator: 'CmdOrCtrl+=',
    bindings: [{ key: '=', ctrl: true }, { key: '+', ctrl: true }, { key: '+', ctrl: true, shift: true }]
  },
  {
    command: 'zoom-out',
    labelKey: 'menu.view.zoomOut',
    category: 'view',
    keys: 'Ctrl+-',
    accelerator: 'CmdOrCtrl+-',
    bindings: [{ key: '-', ctrl: true }]
  },
  {
    command: 'fit-window',
    labelKey: 'menu.view.fitWindow',
    category: 'view',
    keys: 'Ctrl+0',
    accelerator: 'CmdOrCtrl+0',
    bindings: [{ key: '0', ctrl: true }]
  },
  {
    command: 'actual-size',
    labelKey: 'menu.view.actualSize',
    category: 'view',
    keys: 'Ctrl+1',
    accelerator: 'CmdOrCtrl+1',
    bindings: [{ key: '1', ctrl: true }]
  },
  {
    command: 'toggle-crosshair',
    labelKey: 'menu.view.crosshair',
    category: 'view',
    keys: 'C',
    bindings: [{ key: 'c' }],
    checkbox: 'crosshair',
    separatorBefore: true
  },
  {
    command: 'toggle-fullscreen',
    labelKey: 'menu.view.fullscreen',
    category: 'view',
    keys: 'F11',
    // The menu uses Electron's togglefullscreen role for this one, which
    // carries the platform accelerator (F11, or Ctrl+Cmd+F on macOS).
    bindings: [{ key: 'F11' }],
    separatorBefore: true
  },

  // Animation
  {
    command: 'play-pause',
    labelKey: 'menu.animation.playPause',
    category: 'animation',
    keys: 'Space',
    bindings: [{ key: ' ' }]
  },
  {
    command: 'stop',
    labelKey: 'menu.animation.stop',
    category: 'animation',
    keys: 'S / Esc',
    bindings: [{ key: 's' }, { key: 'Escape' }]
  },
  {
    command: 'reset-animation',
    labelKey: 'menu.animation.reset',
    category: 'animation',
    keys: 'R / Home',
    bindings: [{ key: 'r' }, { key: 'Home' }]
  },
  {
    command: 'next-frame',
    labelKey: 'menu.animation.nextFrame',
    category: 'animation',
    keys: '→',
    bindings: [{ key: 'ArrowRight' }],
    separatorBefore: true
  },
  {
    command: 'prev-frame',
    labelKey: 'menu.animation.prevFrame',
    category: 'animation',
    keys: '←',
    bindings: [{ key: 'ArrowLeft' }]
  },
  {
    command: 'speed-up',
    labelKey: 'menu.animation.speedUp',
    category: 'animation',
    keys: '+',
    bindings: [{ key: '=' }, { key: '+' }, { key: '+', shift: true }],
    separatorBefore: true
  },
  {
    command: 'speed-down',
    labelKey: 'menu.animation.speedDown',
    category: 'animation',
    keys: '-',
    bindings: [{ key: '-' }]
  },
  {
    command: 'speed-settings',
    labelKey: 'menu.animation.speedSettings',
    category: 'animation',
    keys: 'Ctrl+Shift+S',
    accelerator: 'CmdOrCtrl+Shift+S',
    bindings: [{ key: 's', ctrl: true, shift: true }]
  },
  {
    command: 'toggle-loop',
    labelKey: 'menu.animation.loopPlayback',
    category: 'animation',
    keys: 'Ctrl+L',
    accelerator: 'CmdOrCtrl+L',
    bindings: [{ key: 'l', ctrl: true }],
    checkbox: 'loop',
    separatorBefore: true
  },
  {
    command: 'toggle-follow',
    labelKey: 'menu.animation.followPlayback',
    category: 'animation',
    keys: 'F',
    bindings: [{ key: 'f' }],
    checkbox: 'follow'
  },

  // Help
  {
    command: 'shortcuts',
    labelKey: 'menu.help.shortcuts',
    category: 'help',
    keys: 'F1',
    accelerator: 'F1',
    bindings: [{ key: 'F1' }]
  },
  {
    command: 'user-guide',
    labelKey: 'menu.help.userGuide',
    category: 'help'
  },
  {
    command: 'about',
    labelKey: 'menu.help.about',
    category: 'help',
    separatorBefore: true
  }
]

export const SHORTCUT_CATEGORIES: ShortcutCategory[] = ['file', 'edit', 'view', 'animation', 'help']

/** Menu checkbox state the renderer reports to the main process. */
export interface MenuState {
  loop: boolean
  follow: boolean
  crosshair: boolean
}

/** "Ctrl+E" → "⌘E" on macOS; leaves other tokens alone. */
export function displayKeys(keys: string, isMac: boolean): string {
  return isMac ? keys.replace(/Ctrl\+/g, '⌘').replace(/Shift\+/g, '⇧') : keys
}
