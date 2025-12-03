# Intellirite Implementation Roadmap

This document breaks down the Intellirite desktop app development into manageable steps, following the PRD requirements.

## Part 1: Project Setup & Electron Foundation ✅ (Current Part)

### 1.1 Initialize Electron + React + TypeScript Project
- [ ] Set up Electron with React and TypeScript
- [ ] Configure build tools (Vite/Webpack)
- [ ] Set up hot reload for development
- [ ] Configure Electron Builder for packaging
- [ ] Test basic window creation

### 1.2 Project Structure
- [ ] Create folder structure:
  - `src/main/` - Electron main process
  - `src/renderer/` - React UI
  - `src/shared/` - Shared types/utilities
  - `src/renderer/components/` - UI components
  - `src/renderer/styles/` - CSS/styling
- [ ] Set up TypeScript configs for main and renderer
- [ ] Configure path aliases

### 1.3 Basic Window & Theme Setup
- [ ] Create main window with proper dimensions
- [ ] Implement frameless window (custom title bar)
- [ ] Set up dark theme as default
- [ ] Configure color palette (grays, accent colors)
- [ ] Set up Inter/JetBrains Mono fonts

---

## Part 2: Top Bar & Window Controls

### 2.1 Custom Title Bar
- [ ] Create TopBar component
- [ ] Add app icon + "Intellirite" text (left)
- [ ] Add search input (middle, placeholder only)
- [ ] Add window controls (minimize, maximize, close) - right
- [ ] Implement drag area (excluding interactive elements)
- [ ] Style to match Cursor's minimalist design

### 2.2 Window Control Functionality
- [ ] Wire up minimize button to IPC
- [ ] Wire up maximize/restore button to IPC
- [ ] Wire up close button to IPC
- [ ] Handle window state changes (maximized/restored)

---

## Part 3: Left Sidebar - File Explorer UI

### 3.1 Sidebar Structure
- [ ] Create collapsible sidebar component
- [ ] Add folder name header
- [ ] Implement collapse/expand toggle
- [ ] Add empty state: "Open a folder to begin writing"

### 3.2 File Tree UI
- [ ] Create tree component with expand/collapse
- [ ] Add file/folder icons (different for .md, .txt, .json, .pdf)
- [ ] Implement hover actions (New File, New Folder buttons)
- [ ] Add selected file highlighting
- [ ] Implement lazy rendering for large trees

### 3.3 Context Menu
- [ ] Create context menu component
- [ ] Add menu items: New File, New Folder, Rename, Delete
- [ ] Position menu on right-click
- [ ] Close menu on outside click

### 3.4 File System Integration
- [ ] Implement "Open Folder" dialog (Electron)
- [ ] Read folder structure and populate tree
- [ ] Handle file/folder creation (local fs)
- [ ] Handle rename operations
- [ ] Handle delete operations with confirmation

---

## Part 4: Center Workspace - Tabs & Editor

### 4.1 Tab System
- [ ] Create tab strip component
- [ ] Implement tab UI (filename, modified dot, close button)
- [ ] Handle tab overflow (scrollable)
- [ ] Add double-click to rename
- [ ] Create tab context menu (Close, Close Others, Close All, Reveal in Explorer)
- [ ] Implement tab switching

### 4.2 Editor Setup (TipTap)
- [ ] Install and configure TipTap
- [ ] Set up basic rich text editing
- [ ] Add markdown support
- [ ] Implement syntax highlighting for code blocks
- [ ] Add inline toolbar (bold, italic, underline, etc.)
- [ ] Add block-level toolbar on hover

### 4.3 Editor Features
- [ ] Implement heading support (H1-H6)
- [ ] Add list support (ordered, unordered)
- [ ] Add code block support
- [ ] Implement split view (editor left, preview right)
- [ ] Add markdown preview rendering

### 4.4 File Operations
- [ ] Open file from tree into editor
- [ ] Track modified state (show dot in tab)
- [ ] Implement auto-save (debounced)
- [ ] Handle multiple open files
- [ ] Sync editor content with file system

---

## Part 5: Right Sidebar - AI Chat Panel UI

### 5.1 Chat Panel Structure
- [ ] Create collapsible chat sidebar
- [ ] Add header: "Intellirite Chat"
- [ ] Implement collapse/expand toggle

### 5.2 Chat UI Components
- [ ] Create message bubble component
- [ ] Add timestamp display
- [ ] Create static example messages
- [ ] Style with proper spacing and colors

### 5.3 Chat Input
- [ ] Create textarea input
- [ ] Add send button
- [ ] Add mic button (UI only)
- [ ] Add expand button
- [ ] Handle enter to send (UI only)

### 5.4 Chat Interactions (UI Only)
- [ ] Add "Insert" and "Replace" hover actions on messages
- [ ] Implement drag-to-editor UI (placeholder)
- [ ] Add visual feedback for interactions

---

## Part 6: Bottom Status Bar

### 6.1 Status Bar Layout
- [ ] Create status bar component
- [ ] Left: Line/Column display ("Ln 1, Col 1")
- [ ] Middle: File type indicator
- [ ] Right: Last saved time, editor mode, AI status icon

### 6.2 Status Bar Updates
- [ ] Update cursor position on editor changes
- [ ] Update file type when switching tabs
- [ ] Update last saved time on save
- [ ] Handle all status updates reactively

---

## Part 7: Command Palette

### 7.1 Command Palette UI
- [ ] Create modal overlay component
- [ ] Create centered palette component (VSCode-like)
- [ ] Add search input
- [ ] Create command list UI

### 7.2 Command System
- [ ] Define command list (Create file, Open folder, Toggle panels, etc.)
- [ ] Implement fuzzy search (client-side)
- [ ] Add keyboard navigation (arrow keys, enter, esc)
- [ ] Wire up commands to actions

### 7.3 Keyboard Trigger
- [ ] Implement Cmd/Ctrl+K to open palette
- [ ] Handle Esc to close
- [ ] Handle Enter to execute selected command

---

## Part 8: Modals & Dialogs

### 8.1 Modal System
- [ ] Create reusable modal component
- [ ] Add overlay with proper z-index
- [ ] Handle Esc to close
- [ ] Handle click outside to close

### 8.2 Required Modals
- [ ] Open folder dialog
- [ ] Confirm delete dialog
- [ ] Rename file dialog
- [ ] Settings modal (theme, font size, editor preferences)
- [ ] About modal

---

## Part 9: Keyboard Shortcuts

### 9.1 Global Shortcuts Setup
- [ ] Create keyboard shortcut manager
- [ ] Handle platform differences (Cmd vs Ctrl)

### 9.2 Implement All Shortcuts
- [ ] Cmd/Ctrl + O: Open Folder
- [ ] Cmd/Ctrl + N: New File
- [ ] Cmd/Ctrl + S: Save File
- [ ] Cmd/Ctrl + K: Command Palette
- [ ] Cmd/Ctrl + B: Toggle Sidebar
- [ ] Cmd/Ctrl + Shift + I: Toggle Chat
- [ ] Editor shortcuts (Bold, Italic, Heading, etc.)

---

## Part 10: Polish & Refinement

### 10.1 Visual Polish
- [ ] Add smooth animations (hover, open, collapse)
- [ ] Implement smooth tab transitions
- [ ] Add file icons with colors
- [ ] Fine-tune spacing and alignment
- [ ] Add subtle shadows and rounded corners

### 10.2 Optional Enhancements
- [ ] Breadcrumb navigation (top of editor)
- [ ] Inline slash commands (/heading, /table, etc.)
- [ ] Improved file tree performance
- [ ] Additional keyboard shortcuts

### 10.3 Testing & Packaging
- [ ] Test all keyboard shortcuts
- [ ] Test file operations
- [ ] Test on macOS
- [ ] Test on Windows
- [ ] Test on Linux
- [ ] Build with Electron Builder
- [ ] Create installers for all platforms

---

## Current Status

**Active Part:** Part 1 - Project Setup & Electron Foundation

**Next Steps:** Initialize the Electron + React + TypeScript project structure
