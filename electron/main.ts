import { app, BrowserWindow, Menu, dialog, ipcMain } from 'electron'
import { join } from 'path'
import { createMenu } from './menu'

let mainWindow: BrowserWindow | null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    resizable: true,  // 明确启用窗口调整大小
    maximizable: true, // 启用最大化
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: join(__dirname, '../assets/icon.png'),
    titleBarStyle: 'default',
    title: 'METS - Mechanism Timing Simulation',
    show: false,  // 先不显示，等加载完成后再显示
    // 明确允许窗口操作
    frame: true,
    transparent: false
  })

  // 窗口准备就绪后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // 添加双击标题栏全屏功能 (仅在macOS上需要)
  if (process.platform === 'darwin') {
    mainWindow.on('enter-full-screen', () => {
      console.log('Entered full screen')
    })
    
    mainWindow.on('leave-full-screen', () => {
      console.log('Left full screen')
    })
  }

  // In development, load from vite server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5178')
    mainWindow.webContents.openDevTools()
  } else {
    // Production mode - load from built files
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  // Set up menu
  const menu = createMenu(mainWindow)
  Menu.setApplicationMenu(menu)

  // Handle focus events to prevent dialog issues
  mainWindow.on('focus', () => {
    console.log('Main window focused')
  })

  mainWindow.on('blur', () => {
    console.log('Main window blurred')
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// App event handlers
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  // Handle app focus events
  app.on('browser-window-focus', () => {
    console.log('App focused')
  })

  app.on('browser-window-blur', () => {
    console.log('App blurred')
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC handlers for file operations
ipcMain.handle('dialog:openFile', async () => {
  if (!mainWindow) return { canceled: true, filePaths: [] }
  
  try {
    // Ensure window is focused before showing dialog
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    if (!mainWindow.isFocused()) {
      mainWindow.focus()
    }
    
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    
    return result
  } catch (error) {
    console.error('Error opening file dialog:', error)
    return { canceled: true, filePaths: [] }
  }
})

ipcMain.handle('dialog:openProject', async () => {
  if (!mainWindow) return { canceled: true, filePaths: [] }
  
  try {
    // Ensure window is focused before showing dialog
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    if (!mainWindow.isFocused()) {
      mainWindow.focus()
    }
    
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'METS Project', extensions: ['mts'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    
    return result
  } catch (error) {
    console.error('Error opening project dialog:', error)
    return { canceled: true, filePaths: [] }
  }
})

ipcMain.handle('dialog:saveFile', async (_, options: any) => {
  if (!mainWindow) return { canceled: true, filePath: undefined }
  
  try {
    // Ensure window is focused before showing dialog
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    if (!mainWindow.isFocused()) {
      mainWindow.focus()
    }
    
    const result = await dialog.showSaveDialog(mainWindow, options)
    return result
  } catch (error) {
    console.error('Error opening save dialog:', error)
    return { canceled: true, filePath: undefined }
  }
})

// File system operations
import { readFile, writeFile } from 'fs/promises'

ipcMain.handle('fs:readFile', async (_, filePath: string) => {
  try {
    const data = await readFile(filePath, 'utf-8')
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('fs:writeFile', async (_, filePath: string, data: string) => {
  try {
    await writeFile(filePath, data, 'utf-8')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// Window control operations
ipcMain.on('window:minimize', () => {
  mainWindow?.minimize()
})

ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.on('window:close', () => {
  mainWindow?.close()
})

ipcMain.on('window:toggle-fullscreen', () => {
  const isFullScreen = mainWindow?.isFullScreen()
  mainWindow?.setFullScreen(!isFullScreen)
})

ipcMain.handle('window:is-fullscreen', () => {
  return mainWindow?.isFullScreen() || false
})

// Get app version
ipcMain.handle('app:get-version', () => {
  return app.getVersion()
})

// Prevent app from quitting when all windows are closed on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})