import { Menu, MenuItemConstructorOptions, BrowserWindow, app } from 'electron'
import { i18n } from './i18n'
import { MenuState, SHORTCUTS, ShortcutCategory } from '../src/lib/shortcuts'

/**
 * Application menu, generated from the shortcut registry (src/lib/shortcuts.ts)
 * so every keyboard shortcut in the app appears here with its key, and the
 * menu can never drift from what the renderer actually binds. Labels come
 * from the same locale files the renderer uses; main.ts rebuilds the menu on
 * language change and whenever a checkbox flag changes in the renderer.
 *
 * Single-key shortcuts have no accelerator (they would fire inside text
 * fields), so their key is shown in the label instead.
 */
export function createMenu(mainWindow: BrowserWindow, state: MenuState): Menu {
  const isMac = process.platform === 'darwin'
  const t = (key: string) => i18n.t(key)
  const send = (command: string) => () => mainWindow.webContents.send('menu:command', command)

  const itemsFor = (category: ShortcutCategory): MenuItemConstructorOptions[] =>
    SHORTCUTS.filter(shortcut => shortcut.category === category).flatMap(shortcut => {
      const items: MenuItemConstructorOptions[] = []
      if (shortcut.separatorBefore) items.push({ type: 'separator' })

      if (shortcut.command === 'toggle-fullscreen') {
        // Electron's own role: correct accelerator and behaviour per platform.
        items.push({ role: 'togglefullscreen' })
        return items
      }

      const label = shortcut.accelerator || !shortcut.keys
        ? t(shortcut.labelKey)
        : `${t(shortcut.labelKey)}  (${shortcut.keys})`
      const item: MenuItemConstructorOptions = { label, click: send(shortcut.command) }
      if (shortcut.accelerator) item.accelerator = shortcut.accelerator
      if (shortcut.checkbox) {
        item.type = 'checkbox'
        item.checked = state[shortcut.checkbox]
      }
      items.push(item)
      return items
    })

  const template: MenuItemConstructorOptions[] = [
    // App menu (macOS only)
    ...(isMac ? [{
      label: app.getName(),
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const }
      ]
    }] : []),

    {
      label: t('menu.file.title'),
      submenu: [
        ...itemsFor('file'),
        ...(isMac ? [] : [{ type: 'separator' as const }, { role: 'quit' as const }])
      ]
    },
    {
      label: t('menu.edit.title'),
      submenu: itemsFor('edit')
    },
    {
      label: t('menu.view.title'),
      submenu: itemsFor('view')
    },
    {
      label: t('menu.animation.title'),
      submenu: itemsFor('animation')
    },
    {
      label: t('menu.window.title'),
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
        ...(isMac ? [
          { type: 'separator' as const },
          { role: 'front' as const },
          { type: 'separator' as const },
          { role: 'window' as const }
        ] : [])
      ]
    },
    {
      label: t('menu.help.title'),
      submenu: itemsFor('help')
    }
  ]

  return Menu.buildFromTemplate(template)
}
