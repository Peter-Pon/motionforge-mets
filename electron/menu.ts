import { Menu, MenuItemConstructorOptions, BrowserWindow, app } from 'electron'

export function createMenu(mainWindow: BrowserWindow): Menu {
  const isMac = process.platform === 'darwin'

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
    
    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'Import CSV',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => {
            mainWindow.webContents.send('menu:command', 'import-csv')
          }
        },
        { type: 'separator' },
        {
          label: 'Export',
          submenu: [
            {
              label: 'Export as Excel',
              accelerator: 'CmdOrCtrl+Shift+E',
              click: () => {
                mainWindow.webContents.send('menu:command', 'export-excel')
              }
            },
            {
              label: 'Export as PDF',
              accelerator: 'CmdOrCtrl+Shift+P',
              click: () => {
                mainWindow.webContents.send('menu:command', 'export-pdf')
              }
            },
            {
              label: 'Export as PNG',
              accelerator: 'CmdOrCtrl+Shift+I',
              click: () => {
                mainWindow.webContents.send('menu:command', 'export-png')
              }
            },
            {
              label: 'Export as MP4',
              accelerator: 'CmdOrCtrl+Shift+M',
              click: () => {
                mainWindow.webContents.send('menu:command', 'export-mp4')
              }
            }
          ]
        },
        { type: 'separator' },
        ...(isMac ? [] : [{ role: 'quit' as const }])
      ]
    },
    
    // Edit menu
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: () => {
            mainWindow.webContents.send('menu:command', 'undo')
          }
        },
        {
          label: 'Redo',
          accelerator: 'CmdOrCtrl+Shift+Z',
          click: () => {
            mainWindow.webContents.send('menu:command', 'redo')
          }
        }
      ]
    },
    
    // Animation menu
    {
      label: 'Animation',
      submenu: [
        {
          label: 'Play/Pause',
          accelerator: 'Space',
          click: () => {
            mainWindow.webContents.send('menu:command', 'play-pause')
          }
        },
        {
          label: 'Stop',
          accelerator: 'Escape',
          click: () => {
            mainWindow.webContents.send('menu:command', 'stop')
          }
        },
        {
          label: 'Reset Animation',
          accelerator: 'Home',
          click: () => {
            mainWindow.webContents.send('menu:command', 'reset-animation')
          }
        },
        { type: 'separator' },
        {
          label: 'Next Frame',
          accelerator: 'Right',
          click: () => {
            mainWindow.webContents.send('menu:command', 'next-frame')
          }
        },
        {
          label: 'Previous Frame',
          accelerator: 'Left',
          click: () => {
            mainWindow.webContents.send('menu:command', 'prev-frame')
          }
        },
        { type: 'separator' },
        {
          label: 'Speed Settings',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            mainWindow.webContents.send('menu:command', 'speed-settings')
          }
        },
        {
          label: 'Loop Playback',
          accelerator: 'CmdOrCtrl+L',
          type: 'checkbox',
          checked: false,
          click: () => {
            mainWindow.webContents.send('menu:command', 'toggle-loop')
          }
        }
      ]
    },
    
    // Window menu
    {
      label: 'Window',
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
    
    // Help menu
    {
      label: 'Help',
      submenu: [
        {
          label: 'About METS',
          click: () => {
            mainWindow.webContents.send('menu:command', 'about')
          }
        },
        {
          label: 'User Guide',
          click: () => {
            mainWindow.webContents.send('menu:command', 'user-guide')
          }
        },
        {
          label: 'Keyboard Shortcuts',
          click: () => {
            mainWindow.webContents.send('menu:command', 'shortcuts')
          }
        }
      ]
    }
  ]

  return Menu.buildFromTemplate(template)
}