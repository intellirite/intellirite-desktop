import { useState, useEffect, useCallback, useRef } from "react";
import {
  TopBar,
  Sidebar,
  TabStrip,
  Editor,
  ChatPanel,
  StatusBar,
  CommandPalette,
  SettingsModal,
  InputDialog,
  type CursorPosition,
  type Command,
} from "./renderer/components";
import type { FileItem } from "./shared/types";
import type { TabData } from "./renderer/components/Tab";
import TurndownService from "turndown";
import { marked } from "marked";

function App() {
  const [currentFolder, setCurrentFolder] = useState<string | undefined>();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | undefined>();
  const [fileSystemReady, setFileSystemReady] = useState(false);

  // Tab management
  const [tabs, setTabs] = useState<TabData[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Auto-save debounce refs
  const saveTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const turndownService = useRef(new TurndownService());
  
  // Editor ref for AI chat integration
  const editorRef = useRef<any>(null);

  // Chat panel state
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);

  // Status bar state
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({
    line: 1,
    column: 1,
  });
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Command palette state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Settings modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Input dialog state (for folder/file creation)
  const [inputDialog, setInputDialog] = useState<{
    isOpen: boolean;
    title: string;
    placeholder: string;
    defaultValue?: string;
    onSubmit: (value: string) => void;
  }>({
    isOpen: false,
    title: "",
    placeholder: "",
    defaultValue: "",
    onSubmit: () => {},
  });

  // Check if fileSystem API is available
  useEffect(() => {
    const checkFileSystem = () => {
      if ((window as any).fileSystem) {
        console.log("FileSystem API is available");
        setFileSystemReady(true);
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkFileSystem()) {
      return;
    }

    // If not available, check periodically (in case it loads later)
    const interval = setInterval(() => {
      if (checkFileSystem()) {
        clearInterval(interval);
      }
    }, 100);

    // Cleanup after 5 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!(window as any).fileSystem) {
        console.error("FileSystem API still not available after 5 seconds");
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Load folder structure
  const loadFolder = useCallback(async (folderPath: string) => {
    try {
      // Try window.fileSystem first, then fallback to direct ipcRenderer
      let fileItems;
      if (
        (window as any).fileSystem &&
        typeof (window as any).fileSystem.readFolder === "function"
      ) {
        fileItems = await (window as any).fileSystem.readFolder(folderPath);
      } else if (
        (window as any).ipcRenderer &&
        typeof (window as any).ipcRenderer.invoke === "function"
      ) {
        // Fallback: use ipcRenderer directly
        fileItems = await (window as any).ipcRenderer.invoke(
          "fs-read-folder",
          folderPath
        );
      } else {
        throw new Error("File system API not available");
      }

      setFiles(fileItems);
      setCurrentFolder(folderPath);
    } catch (error) {
      console.error("Error loading folder:", error);
      alert(`Failed to load folder: ${error}`);
    }
  }, []);

  // Handle open folder
  const handleOpenFolder = useCallback(async () => {
    try {
      console.log("=== handleOpenFolder called ===");
      console.log("window.fileSystem:", (window as any).fileSystem);
      console.log("window.ipcRenderer:", (window as any).ipcRenderer);
      console.log("window.platform:", (window as any).platform);
      console.log("window.windowControls:", (window as any).windowControls);

      let folderPath: string | null = null;

      // Try window.fileSystem first
      if (
        (window as any).fileSystem &&
        typeof (window as any).fileSystem.openFolder === "function"
      ) {
        console.log("✅ Using window.fileSystem.openFolder()");
        folderPath = await (window as any).fileSystem.openFolder();
      }
      // Fallback: use ipcRenderer directly
      else if (
        (window as any).ipcRenderer &&
        typeof (window as any).ipcRenderer.invoke === "function"
      ) {
        console.log("⚠️ Using ipcRenderer.invoke() as fallback");
        try {
          folderPath = await (window as any).ipcRenderer.invoke(
            "fs-open-folder"
          );
        } catch (err) {
          console.error("IPC invoke failed:", err);
          throw err;
        }
      } else {
        console.error("❌ FileSystem API not available");
        console.log(
          "Available window properties:",
          Object.keys(window).filter(
            (k) =>
              !k.startsWith("webkit") &&
              !k.startsWith("chrome") &&
              k !== "location" &&
              k !== "document" &&
              k !== "navigator" &&
              k !== "parent" &&
              k !== "top" &&
              k !== "frames" &&
              k !== "self" &&
              k !== "window"
          )
        );
        alert(
          "File system API not available.\n\nPlease:\n1. Open DevTools (Cmd+Option+I)\n2. Check the console for errors\n3. Restart the dev server\n\nCheck terminal for preload script build errors."
        );
        return;
      }

      console.log("Folder path received:", folderPath);

      if (folderPath) {
        await loadFolder(folderPath);
      } else {
        console.log("No folder selected (user cancelled)");
      }
    } catch (error: any) {
      console.error("Error opening folder:", error);
      const errorMsg = error?.message || String(error);
      alert(`Failed to open folder: ${errorMsg}\n\nCheck console for details.`);
    }
  }, [loadFolder, fileSystemReady]);

  // Handle new file
  const handleNewFile = useCallback(
    (parentPath: string, fileName?: string) => {
      // If fileName is provided (from dialog), use it directly
      if (fileName) {
        (async () => {
          try {
            if (window.fileSystem) {
              await window.fileSystem.createFile(parentPath, fileName);
              await loadFolder(currentFolder || parentPath);
            }
          } catch (error) {
            console.error("Error creating file:", error);
            alert(`Failed to create file: ${error}`);
          }
        })();
        return;
      }

      // Otherwise show input dialog
      setInputDialog({
        isOpen: true,
        title: "New File",
        placeholder: "Enter file name (e.g., example.txt)",
        onSubmit: async (finalFileName: string) => {
          try {
            if (window.fileSystem) {
              await window.fileSystem.createFile(parentPath, finalFileName);
              await loadFolder(currentFolder || parentPath);
            }
          } catch (error) {
            console.error("Error creating file:", error);
            alert(`Failed to create file: ${error}`);
          }
        },
      });
    },
    [currentFolder, loadFolder]
  );

  // Handle new folder
  const handleNewFolder = useCallback(
    (parentPath: string) => {
      setInputDialog({
        isOpen: true,
        title: "New Folder",
        placeholder: "Enter folder name",
        onSubmit: async (folderName: string) => {
          try {
            if (window.fileSystem) {
              await window.fileSystem.createFolder(parentPath, folderName);
              await loadFolder(currentFolder || parentPath);
            }
          } catch (error) {
            console.error("Error creating folder:", error);
            alert(`Failed to create folder: ${error}`);
          }
        },
      });
    },
    [currentFolder, loadFolder]
  );

  // Handle rename
  const handleRename = useCallback(
    (itemId: string, currentName?: string) => {
      setInputDialog({
        isOpen: true,
        title: "Rename",
        placeholder: "Enter new name",
        defaultValue: currentName || "",
        onSubmit: async (newName: string) => {
          try {
            if (window.fileSystem) {
              await window.fileSystem.rename(itemId, newName);
              await loadFolder(currentFolder!);
            }
          } catch (error) {
            console.error("Error renaming:", error);
            alert(`Failed to rename: ${error}`);
          }
        },
      });
    },
    [currentFolder, loadFolder]
  );

  // Handle delete
  const handleDelete = useCallback(
    async (itemId: string) => {
      try {
        if (window.fileSystem) {
          await window.fileSystem.delete(itemId);
          await loadFolder(currentFolder!);
        }
      } catch (error) {
        console.error("Error deleting:", error);
        alert(`Failed to delete: ${error}`);
      }
    },
    [currentFolder, loadFolder]
  );

  // Handle file select - open file in tab
  const handleFileSelect = useCallback(
    async (fileId: string) => {
      setSelectedFileId(fileId);

      // Check if tab already exists
      const existingTab = tabs.find((tab) => tab.filePath === fileId);
      if (existingTab) {
        setActiveTabId(existingTab.id);
        return;
      }

      // Create new tab
      try {
        // Read file content
        let content = "";
        if (window.fileSystem) {
          try {
            const result = await window.fileSystem.readFile(fileId);
            if (result.success) {
              content = result.content;

              // Convert markdown to HTML for TipTap if it's a markdown file
              const extension = fileId.split(".").pop()?.toLowerCase();
              if (extension === "md" || extension === "markdown") {
                // Convert markdown to HTML for TipTap
                if (content.trim() && !content.trim().startsWith("<")) {
                  content = marked.parse(content) as string;
                }
              } else {
                // For non-markdown files, convert plain text to HTML paragraphs
                if (!content.trim().startsWith("<")) {
                  // Convert plain text to HTML paragraphs
                  const lines = content
                    .split("\n")
                    .filter((line) => line.trim());
                  if (lines.length > 0) {
                    content = lines.map((line) => `<p>${line}</p>`).join("");
                  } else {
                    content = "<p></p>"; // Empty paragraph for empty files
                  }
                }
              }
            }
          } catch (error) {
            console.error("Error reading file:", error);
            content = "<p>Error loading file content</p>";
          }
        }

        const fileName = fileId.split("/").pop() || "Untitled";
        const newTab: TabData = {
          id: `tab-${Date.now()}-${Math.random()}`,
          filePath: fileId,
          fileName: fileName,
          isModified: false,
          content: content,
        };

        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(newTab.id);
      } catch (error) {
        console.error("Error opening file:", error);
        alert(`Failed to open file: ${error}`);
      }
    },
    [tabs]
  );

  // Handle editor content change with auto-save
  const handleEditorChange = useCallback(
    (tabId: string, content: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) return;

      // Update tab content and mark as modified
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tabId ? { ...t, content, isModified: true } : t
        )
      );

      // Clear existing timeout for this tab
      const existingTimeout = saveTimeouts.current.get(tabId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set new timeout for auto-save (debounced - 1 second)
      const timeout = setTimeout(async () => {
        try {
          if (window.fileSystem) {
            // Convert HTML to markdown for .md files, otherwise save as HTML
            const extension = tab.filePath.split(".").pop()?.toLowerCase();
            let contentToSave = content;

            if (extension === "md" || extension === "markdown") {
              // Convert HTML to markdown
              contentToSave = turndownService.current.turndown(content);
            } else if (extension === "txt") {
              // Extract plain text from HTML
              const div = document.createElement("div");
              div.innerHTML = content;
              contentToSave = div.textContent || div.innerText || "";
            }
            // For other file types, save as HTML

            await window.fileSystem.writeFile(tab.filePath, contentToSave);

            // Mark as not modified after save
            setTabs((prev) =>
              prev.map((t) =>
                t.id === tabId ? { ...t, isModified: false } : t
              )
            );

            // Update last saved time
            setLastSaved(new Date());

            console.log("Auto-saved:", tab.filePath);
          }
        } catch (error) {
          console.error("Error auto-saving file:", error);
          // Don't show alert for auto-save errors, just log
        }

        saveTimeouts.current.delete(tabId);
      }, 1000); // 1 second debounce

      saveTimeouts.current.set(tabId, timeout);
    },
    [tabs]
  );

  // Handle editor update (modified state) - this is called by TipTap
  const handleEditorUpdate = useCallback(
    (_tabId: string, _isModified: boolean) => {
      // This is handled by handleEditorChange, but keeping for compatibility
    },
    []
  );

  // Auto-open first file when folder is loaded and no tabs exist
  useEffect(() => {
    if (
      files.length > 0 &&
      tabs.length === 0 &&
      !activeTabId &&
      currentFolder
    ) {
      const findFirstFile = (items: FileItem[]): FileItem | null => {
        for (const item of items) {
          if (item.type === "file") {
            return item;
          }
          if (
            item.type === "folder" &&
            item.children &&
            item.children.length > 0
          ) {
            const found = findFirstFile(item.children);
            if (found) return found;
          }
        }
        return null;
      };

      const firstFile = findFirstFile(files);
      if (firstFile) {
        // Small delay to ensure state is ready
        setTimeout(() => {
          handleFileSelect(firstFile.id);
        }, 150);
      }
    }
  }, [files, tabs.length, activeTabId, currentFolder, handleFileSelect]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      saveTimeouts.current.forEach((timeout) => clearTimeout(timeout));
      saveTimeouts.current.clear();
    };
  }, []);

  // Handle chat panel insert/replace actions
  const handleChatInsert = useCallback(
    (content: string) => {
      if (activeTabId) {
        const tab = tabs.find((t) => t.id === activeTabId);
        if (tab) {
          // Insert content at cursor position (simplified - just append for now)
          const newContent = tab.content + "\n\n" + content;
          handleEditorChange(activeTabId, newContent);
        }
      }
    },
    [activeTabId, tabs]
  );

  const handleChatReplace = useCallback(
    (content: string) => {
      if (activeTabId) {
        handleEditorChange(activeTabId, content);
      }
    },
    [activeTabId]
  );

  // Tab operations
  const handleTabSelect = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  const handleTabClose = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        const newTabs = prev.filter((tab) => tab.id !== tabId);
        // If closing active tab, switch to another tab
        if (tabId === activeTabId) {
          if (newTabs.length > 0) {
            setActiveTabId(newTabs[newTabs.length - 1].id);
          } else {
            setActiveTabId(null);
          }
        }
        return newTabs;
      });
    },
    [activeTabId]
  );

  const handleTabCloseOthers = useCallback((tabId: string) => {
    setTabs((prev) => prev.filter((tab) => tab.id === tabId));
    setActiveTabId(tabId);
  }, []);

  const handleTabCloseAll = useCallback(() => {
    setTabs([]);
    setActiveTabId(null);
  }, []);

  const handleTabRevealInExplorer = useCallback(async (filePath: string) => {
    // TODO: Implement reveal in explorer (requires Electron shell API)
    console.log("Reveal in explorer:", filePath);
    alert("Reveal in Explorer feature coming soon");
  }, []);

  const handleTabRename = useCallback(
    async (tabId: string, newName: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) return;

      try {
        // Rename file on disk
        if (window.fileSystem) {
          await window.fileSystem.rename(tab.filePath, newName);

          // Update tab
          const newPath = tab.filePath.replace(tab.fileName, newName);
          setTabs((prev) =>
            prev.map((t) =>
              t.id === tabId
                ? { ...t, fileName: newName, filePath: newPath }
                : t
            )
          );

          // Reload folder to reflect changes
          if (currentFolder) {
            await loadFolder(currentFolder);
          }
        }
      } catch (error) {
        console.error("Error renaming file:", error);
        alert(`Failed to rename file: ${error}`);
      }
    },
    [tabs, currentFolder, loadFolder]
  );

  // Define commands for command palette
  const commands: Command[] = [
    {
      id: "open-folder",
      label: "Open Folder",
      description: "Open a folder to start working",
      category: "File",
      shortcut: "⌘O",
      action: handleOpenFolder,
    },
    {
      id: "new-file",
      label: "New File",
      description: "Create a new file",
      category: "File",
      shortcut: "⌘N",
      action: () => {
        if (currentFolder) {
          handleNewFile(currentFolder);
        } else {
          alert("Please open a folder first");
        }
      },
    },
    {
      id: "new-folder",
      label: "New Folder",
      description: "Create a new folder",
      category: "File",
      action: () => {
        if (currentFolder) {
          handleNewFolder(currentFolder);
        } else {
          alert("Please open a folder first");
        }
      },
    },
    {
      id: "toggle-sidebar",
      label: "Toggle Sidebar",
      description: "Show or hide the file explorer",
      category: "View",
      shortcut: "⌘B",
      action: () => {
        // TODO: Implement sidebar toggle
        console.log("Toggle sidebar");
      },
    },
    {
      id: "toggle-chat",
      label: "Toggle Chat Panel",
      description: "Show or hide the AI chat panel",
      category: "View",
      shortcut: "⌘⇧I",
      action: () => {
        setIsChatCollapsed(!isChatCollapsed);
      },
    },
    {
      id: "close-tab",
      label: "Close Tab",
      description: "Close the currently active tab",
      category: "Editor",
      shortcut: "⌘W",
      action: () => {
        if (activeTabId) {
          handleTabClose(activeTabId);
        }
      },
    },
    {
      id: "close-other-tabs",
      label: "Close Other Tabs",
      description: "Close all tabs except the active one",
      category: "Editor",
      action: () => {
        if (activeTabId) {
          handleTabCloseOthers(activeTabId);
        }
      },
    },
    {
      id: "close-all-tabs",
      label: "Close All Tabs",
      description: "Close all open tabs",
      category: "Editor",
      action: handleTabCloseAll,
    },
    {
      id: "command-palette",
      label: "Show Command Palette",
      description: "Open the command palette",
      category: "General",
      shortcut: "⌘K",
      action: () => {
        setIsCommandPaletteOpen(true);
      },
    },
    {
      id: "settings",
      label: "Open Settings",
      description: "Open settings and preferences",
      category: "General",
      action: () => {
        setIsSettingsOpen(true);
      },
    },
  ];

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd/Ctrl+K to open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Don't trigger shortcuts when typing in input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Other shortcuts can be added here
      if ((e.metaKey || e.ctrlKey) && e.key === "o") {
        e.preventDefault();
        handleOpenFolder();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        if (currentFolder) {
          handleNewFile(currentFolder);
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        // TODO: Toggle sidebar
      } else if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "i"
      ) {
        e.preventDefault();
        setIsChatCollapsed((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key === "w") {
        e.preventDefault();
        if (activeTabId) {
          handleTabClose(activeTabId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    handleOpenFolder,
    handleNewFile,
    currentFolder,
    activeTabId,
    handleTabClose,
  ]);

  return (
    <div className="w-full h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
      <TopBar onOpenSettings={() => setIsSettingsOpen(true)} />
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
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Strip */}
          <TabStrip
            tabs={tabs}
            activeTabId={activeTabId}
            onTabSelect={handleTabSelect}
            onTabClose={handleTabClose}
            onTabCloseOthers={handleTabCloseOthers}
            onTabCloseAll={handleTabCloseAll}
            onTabRevealInExplorer={handleTabRevealInExplorer}
            onTabRename={handleTabRename}
          />

          {/* Editor Area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-primary)]">
            {activeTabId ? (
              (() => {
                const activeTab = tabs.find((t) => t.id === activeTabId);
                return activeTab ? (
                  <Editor
                    ref={editorRef}
                    content={activeTab.content || ""}
                    onChange={(content) =>
                      handleEditorChange(activeTab.id, content)
                    }
                    onUpdate={(isModified) =>
                      handleEditorUpdate(activeTab.id, isModified)
                    }
                    onCursorChange={(line, column) => {
                      setCursorPosition({ line, column });
                    }}
                    editable={true}
                  />
                ) : null;
              })()
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
                <h1 className="text-xl font-semibold text-[var(--text-white)]">
                  Intellirite
                </h1>
                <p className="text-md text-[var(--text-secondary)]">
                  Desktop Writing IDE
                </p>
                <p className="text-sm text-[var(--text-tertiary)] mt-4">
                  Click a file in the sidebar to open it
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <ChatPanel
          isCollapsed={isChatCollapsed}
          onToggleCollapse={() => setIsChatCollapsed(!isChatCollapsed)}
          onInsertToEditor={handleChatInsert}
          onReplaceInEditor={handleChatReplace}
          editor={editorRef.current}
          currentFilePath={activeTabId ? tabs.find(t => t.id === activeTabId)?.filePath : undefined}
          currentFileName={activeTabId ? tabs.find(t => t.id === activeTabId)?.fileName : undefined}
          workspacePath={currentFolder}
          cursorPosition={cursorPosition}
        />
      </div>

      {/* Status Bar */}
      <StatusBar
        cursorPosition={cursorPosition}
        fileType={
          activeTabId
            ? tabs
                .find((t) => t.id === activeTabId)
                ?.fileName.split(".")
                .pop()
            : undefined
        }
        lastSaved={lastSaved}
        editorMode="Insert"
        isAIConnected={true}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={commands}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Input Dialog */}
      <InputDialog
        isOpen={inputDialog.isOpen}
        onClose={() =>
          setInputDialog({
            isOpen: false,
            title: "",
            placeholder: "",
            defaultValue: "",
            onSubmit: () => {},
          })
        }
        onSubmit={inputDialog.onSubmit}
        title={inputDialog.title}
        placeholder={inputDialog.placeholder}
        defaultValue={inputDialog.defaultValue}
      />
    </div>
  );
}

export default App;
