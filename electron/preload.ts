import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  openProject: () => ipcRenderer.invoke('dialog:openProject'),
  saveFile: (options: any) => ipcRenderer.invoke('dialog:saveFile', options),
  
  // Platform information
  platform: process.platform,
  
  // File system operations
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath: string, data: string) => ipcRenderer.invoke('fs:writeFile', filePath, data),
  
  // Application controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  toggleFullscreen: () => ipcRenderer.send('window:toggle-fullscreen'),
  isFullscreen: () => ipcRenderer.invoke('window:is-fullscreen'),
  
  // Menu commands
  onMenuCommand: (callback: (command: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, command: string) => callback(command)
    ipcRenderer.on('menu:command', handler)
    // Return a cleanup function
    return () => ipcRenderer.removeListener('menu:command', handler)
  },
  removeMenuCommand: (callback: (command: string) => void) => {
    ipcRenderer.removeAllListeners('menu:command')
  },
  
  // App info
  getAppVersion: () => ipcRenderer.invoke('app:get-version')
})

// TypeScript definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      openFile: () => Promise<Electron.OpenDialogReturnValue>
      openProject: () => Promise<Electron.OpenDialogReturnValue>
      saveFile: (options: any) => Promise<Electron.SaveDialogReturnValue>
      platform: NodeJS.Platform
      readFile: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>
      writeFile: (filePath: string, data: string) => Promise<{ success: boolean; error?: string }>
      minimize: () => void
      maximize: () => void
      close: () => void
      toggleFullscreen: () => void
      isFullscreen: () => Promise<boolean>
      onMenuCommand: (callback: (command: string) => void) => (() => void)
      removeMenuCommand: (callback: (command: string) => void) => void
      getAppVersion: () => Promise<string>
    }
  }
}