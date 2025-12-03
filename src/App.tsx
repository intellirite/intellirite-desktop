import { useState, useEffect, useCallback } from 'react'
import { TopBar, Sidebar } from './renderer/components'
import type { FileItem } from './shared/types'

function App() {
  const [currentFolder, setCurrentFolder] = useState<string | undefined>()
  const [files, setFiles] = useState<FileItem[]>([])
  const [selectedFileId, setSelectedFileId] = useState<string | undefined>()
  const [fileSystemReady, setFileSystemReady] = useState(false)

  // Check if fileSystem API is available
  useEffect(() => {
    const checkFileSystem = () => {
      if ((window as any).fileSystem) {
        console.log('FileSystem API is available')
        setFileSystemReady(true)
        return true
      }
      return false
    }

    // Check immediately
    if (checkFileSystem()) {
      return
    }

    // If not available, check periodically (in case it loads later)
    const interval = setInterval(() => {
      if (checkFileSystem()) {
        clearInterval(interval)
      }
    }, 100)

    // Cleanup after 5 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval)
      if (!(window as any).fileSystem) {
        console.error('FileSystem API still not available after 5 seconds')
      }
    }, 5000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [])

  // Load folder structure
  const loadFolder = useCallback(async (folderPath: string) => {
    try {
      // Try window.fileSystem first, then fallback to direct ipcRenderer
      let fileItems
      if ((window as any).fileSystem && typeof (window as any).fileSystem.readFolder === 'function') {
        fileItems = await (window as any).fileSystem.readFolder(folderPath)
      } else if ((window as any).ipcRenderer && typeof (window as any).ipcRenderer.invoke === 'function') {
        // Fallback: use ipcRenderer directly
        fileItems = await (window as any).ipcRenderer.invoke('fs-read-folder', folderPath)
      } else {
        throw new Error('File system API not available')
      }
      
      setFiles(fileItems)
      setCurrentFolder(folderPath)
    } catch (error) {
      console.error('Error loading folder:', error)
      alert(`Failed to load folder: ${error}`)
    }
  }, [])

  // Handle open folder
  const handleOpenFolder = useCallback(async () => {
    try {
      console.log('=== handleOpenFolder called ===')
      console.log('window.fileSystem:', (window as any).fileSystem)
      console.log('window.ipcRenderer:', (window as any).ipcRenderer)
      console.log('window.platform:', (window as any).platform)
      console.log('window.windowControls:', (window as any).windowControls)
      
      let folderPath: string | null = null
      
      // Try window.fileSystem first
      if ((window as any).fileSystem && typeof (window as any).fileSystem.openFolder === 'function') {
        console.log('✅ Using window.fileSystem.openFolder()')
        folderPath = await (window as any).fileSystem.openFolder()
      } 
      // Fallback: use ipcRenderer directly
      else if ((window as any).ipcRenderer && typeof (window as any).ipcRenderer.invoke === 'function') {
        console.log('⚠️ Using ipcRenderer.invoke() as fallback')
        try {
          folderPath = await (window as any).ipcRenderer.invoke('fs-open-folder')
        } catch (err) {
          console.error('IPC invoke failed:', err)
          throw err
        }
      } 
      else {
        console.error('❌ FileSystem API not available')
        console.log('Available window properties:', Object.keys(window).filter(k => 
          !k.startsWith('webkit') && 
          !k.startsWith('chrome') &&
          k !== 'location' &&
          k !== 'document' &&
          k !== 'navigator' &&
          k !== 'parent' &&
          k !== 'top' &&
          k !== 'frames' &&
          k !== 'self' &&
          k !== 'window'
        ))
        alert('File system API not available.\n\nPlease:\n1. Open DevTools (Cmd+Option+I)\n2. Check the console for errors\n3. Restart the dev server\n\nCheck terminal for preload script build errors.')
        return
      }
      
      console.log('Folder path received:', folderPath)
      
      if (folderPath) {
        await loadFolder(folderPath)
      } else {
        console.log('No folder selected (user cancelled)')
      }
    } catch (error: any) {
      console.error('Error opening folder:', error)
      const errorMsg = error?.message || String(error)
      alert(`Failed to open folder: ${errorMsg}\n\nCheck console for details.`)
    }
  }, [loadFolder, fileSystemReady])

  // Handle new file
  const handleNewFile = useCallback(async (parentPath: string) => {
    try {
      const fileName = prompt('Enter file name:')
      if (!fileName) return

      if (window.fileSystem) {
        await window.fileSystem.createFile(parentPath, fileName)
        await loadFolder(currentFolder || parentPath)
      }
    } catch (error) {
      console.error('Error creating file:', error)
      alert(`Failed to create file: ${error}`)
    }
  }, [currentFolder, loadFolder])

  // Handle new folder
  const handleNewFolder = useCallback(async (parentPath: string) => {
    try {
      const folderName = prompt('Enter folder name:')
      if (!folderName) return

      if (window.fileSystem) {
        await window.fileSystem.createFolder(parentPath, folderName)
        await loadFolder(currentFolder || parentPath)
      }
    } catch (error) {
      console.error('Error creating folder:', error)
      alert(`Failed to create folder: ${error}`)
    }
  }, [currentFolder, loadFolder])

  // Handle rename
  const handleRename = useCallback(async (itemId: string, newName: string) => {
    try {
      if (window.fileSystem) {
        await window.fileSystem.rename(itemId, newName)
        await loadFolder(currentFolder!)
      }
    } catch (error) {
      console.error('Error renaming:', error)
      alert(`Failed to rename: ${error}`)
    }
  }, [currentFolder, loadFolder])

  // Handle delete
  const handleDelete = useCallback(async (itemId: string) => {
    try {
      if (window.fileSystem) {
        await window.fileSystem.delete(itemId)
        await loadFolder(currentFolder!)
      }
    } catch (error) {
      console.error('Error deleting:', error)
      alert(`Failed to delete: ${error}`)
    }
  }, [currentFolder, loadFolder])

  // Handle file select
  const handleFileSelect = useCallback((fileId: string) => {
    setSelectedFileId(fileId)
    // TODO: Open file in editor
    console.log('Selected file:', fileId)
  }, [])

  return (
    <div className="w-full h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentFolder={currentFolder}
          files={files}
          selectedFileId={selectedFileId}
          onFileSelect={handleFileSelect}
          onOpenFolder={handleOpenFolder}
          onNewFile={handleNewFile}
          onNewFolder={handleNewFolder}
          onRename={handleRename}
          onDelete={handleDelete}
        />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <h1 className="text-xl font-semibold text-[var(--text-white)]">Intellirite</h1>
          <p className="text-md text-[var(--text-secondary)]">Desktop Writing IDE</p>
        </div>
      </div>
    </div>
  )
}

export default App
