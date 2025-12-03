import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { platform } from 'process'
import fs from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  const isMac = platform === 'darwin'
  
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    frame: false, // Frameless window for custom title bar
    // On macOS, use 'hiddenInset' to provide space for traffic lights
    // On Windows/Linux, use 'hidden' for full custom control
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    backgroundColor: '#1e1e1e', // Dark theme background
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allow loading local files in dev
    },
  })

  // Log preload path for debugging
  const preloadPath = path.join(__dirname, 'preload.mjs')
  console.log('[MAIN] Preload script path:', preloadPath)
  console.log('[MAIN] Preload script exists:', existsSync(preloadPath))
  if (existsSync(preloadPath)) {
    const preloadContent = readFileSync(preloadPath, 'utf8')
    console.log('[MAIN] Preload script size:', preloadContent.length, 'bytes')
    console.log('[MAIN] Preload contains fileSystem:', preloadContent.includes('fileSystem'))
  }

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    console.log('[MAIN] Window finished loading')
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
    // Send initial window state
    win?.webContents.send('window-state-changed', { isMaximized: win.isMaximized() })
  })

  // Log preload errors
  win.webContents.on('preload-error', (event, preloadPath, error) => {
    console.error('[MAIN] Preload error:', preloadPath, error)
  })

  // Listen to window state changes
  win.on('maximize', () => {
    win?.webContents.send('window-state-changed', { isMaximized: true })
  })

  win.on('unmaximize', () => {
    win?.webContents.send('window-state-changed', { isMaximized: false })
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// IPC handlers for window controls
ipcMain.on('window-minimize', () => {
  win?.minimize()
})

ipcMain.on('window-maximize', () => {
  if (win?.isMaximized()) {
    win?.unmaximize()
  } else {
    win?.maximize()
  }
})

ipcMain.on('window-close', () => {
  win?.close()
})

ipcMain.handle('window-get-state', () => {
  return { isMaximized: win?.isMaximized() ?? false }
})

// File system IPC handlers
ipcMain.handle('fs-open-folder', async () => {
  if (!win) return null
  
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
  })
  
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  
  return result.filePaths[0]
})

// Recursive function to read folder structure
async function readFolderRecursive(folderPath: string): Promise<any[]> {
  try {
    const items = await fs.readdir(folderPath, { withFileTypes: true })
    const fileItems = []
    
    for (const item of items) {
      const fullPath = path.join(folderPath, item.name)
      
      if (item.isDirectory()) {
        // Recursively read children
        const children = await readFolderRecursive(fullPath)
        fileItems.push({
          id: fullPath,
          name: item.name,
          path: fullPath,
          type: 'folder' as const,
          children: children,
        })
      } else {
        const ext = path.extname(item.name).slice(1)
        fileItems.push({
          id: fullPath,
          name: item.name,
          path: fullPath,
          type: 'file' as const,
          extension: ext || undefined,
        })
      }
    }
    
    // Sort: folders first, then files, both alphabetically
    fileItems.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
    
    return fileItems
  } catch (error) {
    console.error('Error reading folder recursively:', error)
    throw error
  }
}

ipcMain.handle('fs-read-folder', async (_event, folderPath: string) => {
  try {
    return await readFolderRecursive(folderPath)
  } catch (error) {
    console.error('Error reading folder:', error)
    throw error
  }
})

ipcMain.handle('fs-read-file', async (_event, filePath: string) => {
  try {
    const content = await fs.readFile(filePath, 'utf8')
    return { success: true, content }
  } catch (error) {
    console.error('Error reading file:', error)
    throw error
  }
})

ipcMain.handle('fs-write-file', async (_event, filePath: string, content: string) => {
  try {
    await fs.writeFile(filePath, content, 'utf8')
    return { success: true }
  } catch (error) {
    console.error('Error writing file:', error)
    throw error
  }
})

ipcMain.handle('fs-create-file', async (_event, parentPath: string, fileName: string) => {
  try {
    const filePath = path.join(parentPath, fileName)
    await fs.writeFile(filePath, '', 'utf8')
    return { success: true, path: filePath }
  } catch (error) {
    console.error('Error creating file:', error)
    throw error
  }
})

ipcMain.handle('fs-create-folder', async (_event, parentPath: string, folderName: string) => {
  try {
    const folderPath = path.join(parentPath, folderName)
    await fs.mkdir(folderPath, { recursive: true })
    return { success: true, path: folderPath }
  } catch (error) {
    console.error('Error creating folder:', error)
    throw error
  }
})

ipcMain.handle('fs-rename', async (_event, oldPath: string, newName: string) => {
  try {
    const dir = path.dirname(oldPath)
    const newPath = path.join(dir, newName)
    
    if (existsSync(newPath)) {
      throw new Error('A file or folder with that name already exists')
    }
    
    await fs.rename(oldPath, newPath)
    return { success: true, path: newPath }
  } catch (error) {
    console.error('Error renaming:', error)
    throw error
  }
})

ipcMain.handle('fs-delete', async (_event, itemPath: string) => {
  try {
    const stats = await fs.stat(itemPath)
    
    if (stats.isDirectory()) {
      await fs.rmdir(itemPath, { recursive: true })
    } else {
      await fs.unlink(itemPath)
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting:', error)
    throw error
  }
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
