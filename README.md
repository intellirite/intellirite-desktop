Intellirite — Electron Desktop App (UI-Only) PRD
Goal

Create a desktop writing IDE UI (Electron + React + TS) replicating the feel of Cursor/Antigravity — clean, fast, minimal, focused.
NO backend, NO sync, NO accounts, NO AI logic — only placeholder UI components.

1 — MVP Scope (UI Only)

This phase delivers a desktop app with:

Chrome-like top bar

Left file explorer UI (tree, icons, context menu — static or fs-based)

Center tab-based editor UI (TipTap or placeholder)

Right Chat panel UI (no AI calls, just static UI & dummy messages)

Bottom status bar

Command palette UI

Keyboard interactions

Modal system

Basic “open folder” and “save file” using local fs (because editor needs to load files — this is allowed in UI phase)

2 — UI Requirements (Exact layout)
2.1 App Top Bar

Left: app icon + “Intellirite” text

Middle: “Search” input (fake for now)

Right: minimize, maximize, close window buttons

Should visually match Cursor’s top bar simplicity

Drag area enabled except interactive elements

3 — Left Sidebar (File Explorer)
Structure:

Expandable/collapsible sidebar

Shows folder name at top

Under it: a tree-like list

Folder icons

File icons (.md, .txt, .json, .pdf → different icons)

Hover actions: New File, New Folder buttons

Right-click context menu:

New file

New folder

Rename

Delete

(All UI only, no backend logic besides fs ops)

Required states:

Empty state: “Open a folder to begin writing”

Collapsed state

Selected file highlighted

Performance:

Must handle large trees (lazy-rendering recommended)

4 — Center Workspace (Tabbed Editor UI)
4.1 Tabs UI

Horizontal tab strip aligned at top of editor

Each tab:

Filename

Modified dot (●)

Close button (x)

Tab overflow handling: scrollable or collapsible side menu

Double-click tab = rename file

Right-click tab context menu (UI only):

Close

Close others

Close all

Reveal in Explorer

4.2 Editor UI (TipTap recommended)

Even though no AI backend exists, we need the editor UI to actually work:

Rich text editing (bold, italic, underline, headings, lists)

Markdown support & rendering

Code blocks with syntax highlighting

Inline toolbar when selecting text

Block-level toolbar on hover (optional but very IDE-like)

Split view:

Editor left

Markdown preview right

(Preview optional but recommended)

4.3 File Operations

UI-only but uses local fs:

Open file from tree

Edit in editor

Auto-save file to disk (debounced)

Should NOT require any backend

Local history not needed in UI-only phase

5 — Right Sidebar (AI Chat Panel UI)

Important: NO AI logic, only UI placeholders

Elements:

Header: “Intellirite Chat”

Chat area:

UI for messages: bubble design, timestamps

Example static messages

Input box with:

Textarea

Send button

Mic button (UI-only)

Expand button

Interactions:

Drag responses into editor (UI-only)

“Insert / Replace” hover actions next to messages

Chat panel collapsible with a button

6 — Bottom Status Bar

Matches IDE behavior:

Left side: “Ln 1, Col 1” (cursor info)

Middle: file type (Markdown, Text)

Right:

Last saved time

Editor mode (Insert)

Placeholder for “AI Connected” icon (no backend)

Status bar updates when:

Cursor moves

File changes

File saved

7 — Command Palette UI

Triggered with Cmd/Ctrl+K.

Should show:

Gray overlay

Centered command palette (VSCode-like)

Search input

List of commands (UI-only), examples:

“Create new file”

“Open folder”

“Toggle right panel”

“Format selection”

“Split view”

Fuzzy search (UI-only; client only)

Keyboard navigation:

Arrow keys up/down

Enter to select

Esc to close

8 — App Modals

UI screens needed:

Open folder

Confirm delete

Rename file

Settings modal

Theme (Dark/Light/System)

Font size

Editor preferences

About modal

All UI-only.

9 — Keyboard Shortcuts

Fully functional UI shortcuts:

Action	Shortcut
Open Folder	Cmd/Ctrl + O
New File	Cmd/Ctrl + N
Save File	Cmd/Ctrl + S
Command Palette	Cmd/Ctrl + K
Toggle Sidebar	Cmd/Ctrl + B
Toggle Chat	Cmd/Ctrl + Shift + I
Bold	Cmd/Ctrl + B
Italic	Cmd/Ctrl + I
Heading	Cmd/Ctrl + Alt + H

Keyboard UX is very important for IDE feel.

10 — Visual Guidelines
Color Palette

Dark theme default

Gray-based palette like Cursor

Accent color: Blue / Purple (decide later)

Typography

Inter or JetBrains Mono for UI text

Editor uses a writing-friendly serif or mono depending on mode

Components Style

Smooth rounded corners (4–6px)

Subtle shadows

No heavy borders

IDE minimalism

12 — Acceptance Criteria (UI Only)

All UI components render properly

Full app navigable with keyboard

Editor works (rich text + markdown)

Tabs and file tree behave like an IDE

Chat sidebar is visually complete

Command palette fully functional UI

All modals work

Dark mode present

App installable via Electron builder

No backend required

No sync or network needed

13 — Optional (But Useful) Enhancements

File icons and colors

Minimal animations (hover, open, collapse)

Smooth tab transitions

Breadcrumb navigation (top of editor)

Inline slash commands like Notion (“/heading”, “/table”, etc.)