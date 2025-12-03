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

- [x] Create folder structure:
  - `src/main/` - Electron main process
  - `src/renderer/` - React UI
  - `src/shared/` - Shared types/utilities
  - `src/renderer/components/` - UI components
  - `src/renderer/styles/` - CSS/styling
- [x] Set up TypeScript configs for main and renderer
- [x] Configure path aliases

### 1.3 Basic Window & Theme Setup

- [x] Create main window with proper dimensions
- [x] Implement frameless window (custom title bar)
- [x] Set up dark theme as default
- [x] Configure color palette (grays, accent colors)
- [x] Set up Inter/JetBrains Mono fonts

---

## Part 2: Top Bar & Window Controls ✅

### 2.1 Custom Title Bar

- [x] Create TopBar component
- [x] Add app icon + "Intellirite" text (left)
- [x] Add search input (middle, placeholder only)
- [x] Add window controls (minimize, maximize, close) - right
- [x] Implement drag area (excluding interactive elements)
- [x] Style to match Cursor's minimalist design

### 2.2 Window Control Functionality

- [x] Wire up minimize button to IPC
- [x] Wire up maximize/restore button to IPC
- [x] Wire up close button to IPC
- [x] Handle window state changes (maximized/restored)
- [x] Update maximize button icon based on window state
- [x] Add proper error handling and TypeScript types

---

## Part 3: Left Sidebar - File Explorer UI

### 3.1 Sidebar Structure

- [x] Create collapsible sidebar component
- [x] Add folder name header
- [x] Implement collapse/expand toggle
- [x] Add empty state: "Open a folder to begin writing"

### 3.2 File Tree UI

- [x] Create tree component with expand/collapse
- [x] Add file/folder icons (different for .md, .txt, .json, .pdf)
- [x] Implement hover actions (New File, New Folder buttons)
- [x] Add selected file highlighting
- [ ] Implement lazy rendering for large trees (future optimization)

### 3.3 Context Menu

- [x] Create context menu component
- [x] Add menu items: New File, New Folder, Rename, Delete
- [x] Position menu on right-click
- [x] Close menu on outside click

### 3.4 File System Integration ✅

- [x] Implement "Open Folder" dialog (Electron)
- [x] Read folder structure and populate tree
- [x] Handle file/folder creation (local fs)
  - [x] New File dialog with file type selection (Cursor-like UI)
  - [x] Support for 30+ file types (md, txt, json, pdf, ts, js, etc.)
  - [x] New Folder creation via context menu
- [x] Handle rename operations
- [x] Handle delete operations with confirmation

---

## Part 4: Center Workspace - Tabs & Editor

### 4.1 Tab System ✅

- [x] Create tab strip component
- [x] Implement tab UI (filename, modified dot, close button)
- [x] Handle tab overflow (scrollable)
- [x] Add double-click to rename
- [x] Create tab context menu (Close, Close Others, Close All, Reveal in Explorer)
- [x] Implement tab switching

### 4.2 Editor Setup (TipTap) ✅

- [x] Install and configure TipTap
- [x] Set up basic rich text editing
- [x] Add markdown support (via StarterKit)
- [x] Implement syntax highlighting for code blocks (lowlight with multiple languages)
- [x] Add inline toolbar (bold, italic, underline, etc.)
- [x] Add block-level toolbar on hover

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

## Part 5: Right Sidebar - AI Chat Panel UI ✅

### 5.1 Chat Panel Structure ✅

- [x] Create collapsible chat sidebar
- [x] Add header: "Intellirite Chat"
- [x] Implement collapse/expand toggle

### 5.2 Chat UI Components ✅

- [x] Create message bubble component
- [x] Add timestamp display
- [x] Create static example messages
- [x] Style with proper spacing and colors

### 5.3 Chat Input ✅

- [x] Create textarea input
- [x] Add send button
- [x] Add mic button (UI only)
- [x] Add expand button
- [x] Handle enter to send (UI only)

### 5.4 Chat Interactions (UI Only) ✅

- [x] Add "Insert" and "Replace" hover actions on messages
- [x] Implement drag-to-editor UI (placeholder)
- [x] Add visual feedback for interactions

---

## Part 6: Bottom Status Bar ✅

### 6.1 Status Bar Layout ✅

- [x] Create status bar component
- [x] Left: Line/Column display ("Ln 1, Col 1")
- [x] Middle: File type indicator
- [x] Right: Last saved time, editor mode, AI status icon

### 6.2 Status Bar Updates ✅

- [x] Update cursor position on editor changes
- [x] Update file type when switching tabs
- [x] Update last saved time on save
- [x] Handle all status updates reactively

---

## Part 7: Command Palette ✅

### 7.1 Command Palette UI ✅

- [x] Create modal overlay component
- [x] Create centered palette component (VSCode-like)
- [x] Add search input
- [x] Create command list UI

### 7.2 Command System ✅

- [x] Define command list (Create file, Open folder, Toggle panels, etc.)
- [x] Implement fuzzy search (client-side)
- [x] Add keyboard navigation (arrow keys, enter, esc)
- [x] Wire up commands to actions

### 7.3 Keyboard Trigger ✅

- [x] Implement Cmd/Ctrl+K to open palette
- [x] Handle Esc to close
- [x] Handle Enter to execute selected command

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

**Active Part:** Part 7 - Command Palette ✅ (Completed)

**Completed:**

- ✅ Part 1: Project Setup & Electron Foundation
- ✅ Part 2: Top Bar & Window Controls
- ✅ Part 3: Left Sidebar (File Explorer UI)
  - ✅ Part 3.1: Sidebar Structure
  - ✅ Part 3.2: File Tree UI
  - ✅ Part 3.3: Context Menu
  - ✅ Part 3.4: File System Integration (Open Folder, Read Structure, Create Files/Folders, Rename, Delete)
- ✅ Part 4: Center Workspace (Tabs & Editor)
  - ✅ Part 4.1: Tab System (Tab Strip, Tab UI, Overflow Handling, Rename, Context Menu, Switching)
  - ✅ Part 4.2: Editor Setup (TipTap with markdown, syntax highlighting, toolbar)
  - ✅ Part 4.4: File Operations (Read/Write files, Auto-save)
- ✅ Part 5: Right Sidebar (AI Chat Panel UI)
  - ✅ Part 5.1: Chat Panel Structure (Collapsible sidebar, header, toggle)
  - ✅ Part 5.2: Chat UI Components (Message bubbles, timestamps, example messages)
  - ✅ Part 5.3: Chat Input (Textarea, send button, mic button, expand button, Enter to send)
  - ✅ Part 5.4: Chat Interactions (Insert/Replace actions, drag-to-editor, visual feedback)
- ✅ Part 6: Bottom Status Bar
  - ✅ Part 6.1: Status Bar Layout (Line/Column, File Type, Saved Time, Editor Mode, AI Status)
  - ✅ Part 6.2: Status Bar Updates (Cursor position tracking, file type updates, last saved time)
- ✅ Part 7: Command Palette
  - ✅ Part 7.1: Command Palette UI (Modal overlay, centered palette, search input, command list)
  - ✅ Part 7.2: Command System (Command list, fuzzy search, keyboard navigation, action wiring)
  - ✅ Part 7.3: Keyboard Trigger (Cmd/Ctrl+K, Esc to close, Enter to execute)

**Next Steps:** Part 8 - Modals & Dialogs
