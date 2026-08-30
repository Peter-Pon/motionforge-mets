import { app, BrowserWindow, Menu, dialog, ipcMain } from 'electron'
import { join } from 'path'
import { createMenu } from './menu'

let mainWindow: BrowserWindow | null
let splashWindow: BrowserWindow | null = null
let splashShownAt = 0

// The splash is authored at 1120x600 (2x) and shown at logical size, matching
// the DynMech Motion splash card.
const SPLASH_WIDTH = 560
const SPLASH_HEIGHT = 300
// Below this the card just flickers; hold it so the brand actually registers.
const SPLASH_MIN_MS = 900
// Backstop: never let a failed load leave an always-on-top card on screen.
const SPLASH_MAX_MS = 12000

/**
 * Splash language. The renderer owns the UI language (localStorage), which the
 * main process cannot read before the window exists, so the card follows the
 * OS locale — the same four variants Motion ships, English for anything else.
 */
function splashLanguage(): string {
  const locale = app.getLocale().toLowerCase()
  if (locale.startsWith('zh')) {
    return /(^|-)(tw|hk|mo|hant)(-|$)/.test(locale) ? 'zh-TW' : 'zh-CN'
  }
  if (locale.startsWith('ja')) return 'ja'
  return 'en'
}

// package.json "name" is the npm id; the macOS application menu and the
// About role should read the product name in dev as well as when packaged.
app.setName('DynMech CycleView')

function createSplash() {
  splashWindow = new BrowserWindow({
    width: SPLASH_WIDTH,
    height: SPLASH_HEIGHT,
    frame: false,
    resizable: false,
    movable: false,
    center: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    backgroundColor: '#12161B',
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  })

  splashWindow.loadFile(join(__dirname, '../assets/splash.html'), { hash: splashLanguage() })
  splashWindow.once('ready-to-show', () => {
    splashShownAt = Date.now()
    splashWindow?.show()
  })
  splashWindow.on('closed', () => { splashWindow = null })

  setTimeout(closeSplash, SPLASH_MAX_MS)
}

function closeSplash() {
  if (!splashWindow || splashWindow.isDestroyed()) return
  splashWindow.close()
  splashWindow = null
}

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
    title: 'DynMech CycleView',
    show: false,  // 先不显示，等加载完成后再显示
    // 明确允许窗口操作
    frame: true,
    transparent: false
  })

  // 窗口准备就绪后显示;开机画面至少停留 SPLASH_MIN_MS 再让位,避免一闪而过
  mainWindow.once('ready-to-show', () => {
    const held = splashShownAt ? Date.now() - splashShownAt : SPLASH_MIN_MS
    const wait = Math.max(0, SPLASH_MIN_MS - held)
    setTimeout(() => {
      closeSplash()
      mainWindow?.show()
      mainWindow?.focus()
    }, wait)
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
  createSplash()
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
        { name: 'CycleView Project', extensions: ['cvp'] },
        { name: 'METS Project (legacy)', extensions: ['mts'] },
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
import { readFile, writeFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'

/**
 * PDF report export.
 *
 * The renderer hands over a finished HTML document; we print it through
 * Chromium's own print pipeline in an offscreen window. Doing it this way
 * rather than with a JS PDF library is what makes CJK module names work
 * without embedding megabytes of font, and keeps the chart vector and the
 * text selectable.
 */
ipcMain.handle('pdf:export', async (_, payload: {
  html: string
  headerHtml: string
  footerHtml: string
  fileName: string
}) => {
  if (!mainWindow) return { success: false, canceled: true }

  const target = await dialog.showSaveDialog(mainWindow, {
    defaultPath: payload.fileName,
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  })
  if (target.canceled || !target.filePath) return { success: false, canceled: true }

  // Unique temp name so two exports in flight cannot clobber each other.
  const tempPath = join(tmpdir(), `cycleview-report-${Date.now()}-${process.pid}.html`)
  let printWindow: BrowserWindow | null = null

  try {
    await writeFile(tempPath, payload.html, 'utf-8')

    printWindow = new BrowserWindow({
      show: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false, javascript: false }
    })
    await printWindow.loadFile(tempPath)

    const pdf = await printWindow.webContents.printToPDF({
      pageSize: 'A3',
      landscape: true,
      printBackground: true,
      // The document's own @page box supplies the margins; the running header
      // and footer are fixed elements inside it. Only the page number comes
      // from a template.
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: payload.headerHtml,
      footerTemplate: payload.footerHtml
    })

    await writeFile(target.filePath, pdf)
    return { success: true, filePath: target.filePath }
  } catch (error: any) {
    return { success: false, error: error?.message ?? String(error) }
  } finally {
    if (printWindow && !printWindow.isDestroyed()) printWindow.destroy()
    await unlink(tempPath).catch(() => {})
  }
})

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