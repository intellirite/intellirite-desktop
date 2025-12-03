import { ipcRenderer, contextBridge } from 'electron'
// Note: process is a global in Electron preload context, we can access process.platform directly

// Log that preload script is loading
console.log('[PRELOAD] Preload script starting...')

try {
  // --------- Expose some API to the Renderer process ---------
  contextBridge.exposeInMainWorld('ipcRenderer', {
    on(...args: Parameters<typeof ipcRenderer.on>) {
      const [channel, listener] = args
      return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
    },
    off(...args: Parameters<typeof ipcRenderer.off>) {
      const [channel, ...omit] = args
      return ipcRenderer.off(channel, ...omit)
    },
    send(...args: Parameters<typeof ipcRenderer.send>) {
      const [channel, ...omit] = args
      return ipcRenderer.send(channel, ...omit)
    },
    invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
      const [channel, ...omit] = args
      return ipcRenderer.invoke(channel, ...omit)
    },
  })

  // Platform info
  // Access process.platform directly (process is global in Electron preload)
  const platform = process.platform
  contextBridge.exposeInMainWorld('platform', {
    isMac: platform === 'darwin',
    isWindows: platform === 'win32',
    isLinux: platform === 'linux',
    platform: platform,
  })

  // Window controls API
  contextBridge.exposeInMainWorld('windowControls', {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    getState: () => ipcRenderer.invoke('window-get-state'),
    onStateChange: (callback: (state: { isMaximized: boolean }) => void) => {
      const listener = (_event: unknown, state: { isMaximized: boolean }) => callback(state)
      ipcRenderer.on('window-state-changed', listener)
      return () => ipcRenderer.removeListener('window-state-changed', listener)
    },
  })

  // File system API
  contextBridge.exposeInMainWorld('fileSystem', {
    openFolder: () => ipcRenderer.invoke('fs-open-folder'),
    readFolder: (path: string) => ipcRenderer.invoke('fs-read-folder', path),
    createFile: (path: string, name: string) => ipcRenderer.invoke('fs-create-file', path, name),
    createFolder: (path: string, name: string) => ipcRenderer.invoke('fs-create-folder', path, name),
    rename: (oldPath: string, newName: string) => ipcRenderer.invoke('fs-rename', oldPath, newName),
    delete: (path: string) => ipcRenderer.invoke('fs-delete', path),
  })

  console.log('[PRELOAD] ✅ All APIs exposed successfully')
} catch (error) {
  console.error('[PRELOAD] ❌ Error exposing APIs:', error)
}
