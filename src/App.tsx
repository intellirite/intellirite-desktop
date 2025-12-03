import { useState, useEffect, useCallback, useRef } from "react";
import {
  TopBar,
  Sidebar,
  TabStrip,
  Editor,
  ChatPanel,
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

  // Chat panel state
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);

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
    async (parentPath: string, fileName?: string) => {
      try {
        // If fileName is provided (from dialog), use it; otherwise prompt
        let finalFileName = fileName;
        if (!finalFileName) {
          const promptResult = prompt("Enter file name:");
          if (!promptResult) return;
          finalFileName = promptResult;
        }

        if (window.fileSystem) {
          await window.fileSystem.createFile(parentPath, finalFileName);
          await loadFolder(currentFolder || parentPath);
        }
      } catch (error) {
        console.error("Error creating file:", error);
        alert(`Failed to create file: ${error}`);
      }
    },
    [currentFolder, loadFolder]
  );

  // Handle new folder
  const handleNewFolder = useCallback(
    async (parentPath: string) => {
      try {
        const folderName = prompt("Enter folder name:");
        if (!folderName) return;

        if (window.fileSystem) {
          await window.fileSystem.createFolder(parentPath, folderName);
          await loadFolder(currentFolder || parentPath);
        }
      } catch (error) {
        console.error("Error creating folder:", error);
        alert(`Failed to create folder: ${error}`);
      }
    },
    [currentFolder, loadFolder]
  );

  // Handle rename
  const handleRename = useCallback(
    async (itemId: string, newName: string) => {
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
                    content={activeTab.content || ""}
                    onChange={(content) =>
                      handleEditorChange(activeTab.id, content)
                    }
                    onUpdate={(isModified) =>
                      handleEditorUpdate(activeTab.id, isModified)
                    }
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
        />
      </div>
    </div>
  );
}

export default App;
