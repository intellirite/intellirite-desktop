import { TopBar, Sidebar } from './renderer/components'

function App() {
  return (
    <div className="w-full h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <h1 className="text-xl font-semibold text-[var(--text-white)]">Intellirite</h1>
          <p className="text-md text-[var(--text-secondary)]">Desktop Writing IDE</p>
        </div>
      </div>
    </div>
  )
}

export default App
