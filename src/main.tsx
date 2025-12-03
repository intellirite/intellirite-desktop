import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './renderer/styles/theme.css'
import './renderer/styles/global.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Use contextBridge - wait for it to be available
if (window.ipcRenderer) {
  window.ipcRenderer.on('main-process-message', (_event, message) => {
    console.log(message)
  })
} else {
  console.warn('ipcRenderer not available yet')
}

// Debug: Check if fileSystem API is available (check multiple times)
const checkFileSystem = () => {
  console.log('=== FileSystem API Check ===')
  console.log('FileSystem API available:', !!(window as any).fileSystem)
  console.log('window.fileSystem:', (window as any).fileSystem)
  console.log('window.platform:', (window as any).platform)
  console.log('window.windowControls:', (window as any).windowControls)
  
  if ((window as any).fileSystem) {
    console.log('✅ FileSystem methods:', Object.keys((window as any).fileSystem))
    console.log('✅ FileSystem.openFolder:', typeof (window as any).fileSystem.openFolder)
  } else {
    console.warn('❌ FileSystem API not available')
    console.log('Available window properties:', Object.keys(window).filter(k => 
      !k.startsWith('webkit') && 
      !k.startsWith('chrome') &&
      k !== 'location' &&
      k !== 'document' &&
      k !== 'navigator' &&
      k !== 'parent' &&
      k !== 'top' &&
      k !== 'frames' &&
      k !== 'self'
    ))
  }
}

// Check immediately
checkFileSystem()

// Check after delays (preload might load asynchronously)
setTimeout(checkFileSystem, 500)
setTimeout(checkFileSystem, 1000)
setTimeout(checkFileSystem, 2000)