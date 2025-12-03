import { ipcMain, app, BrowserWindow, dialog } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { platform } from "process";
import fs from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  const isMac = platform === "darwin";
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1e3,
    minHeight: 600,
    frame: false,
    // Frameless window for custom title bar
    // On macOS, use 'hiddenInset' to provide space for traffic lights
    // On Windows/Linux, use 'hidden' for full custom control
    titleBarStyle: isMac ? "hiddenInset" : "hidden",
    backgroundColor: "#1e1e1e",
    // Dark theme background
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
      // Allow loading local files in dev
    }
  });
  const preloadPath = path.join(__dirname$1, "preload.mjs");
  console.log("[MAIN] Preload script path:", preloadPath);
  console.log("[MAIN] Preload script exists:", existsSync(preloadPath));
  if (existsSync(preloadPath)) {
    const preloadContent = readFileSync(preloadPath, "utf8");
    console.log("[MAIN] Preload script size:", preloadContent.length, "bytes");
    console.log("[MAIN] Preload contains fileSystem:", preloadContent.includes("fileSystem"));
  }
  win.webContents.on("did-finish-load", () => {
    console.log("[MAIN] Window finished loading");
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
    win == null ? void 0 : win.webContents.send("window-state-changed", { isMaximized: win.isMaximized() });
  });
  win.webContents.on("preload-error", (event, preloadPath2, error) => {
    console.error("[MAIN] Preload error:", preloadPath2, error);
  });
  win.on("maximize", () => {
    win == null ? void 0 : win.webContents.send("window-state-changed", { isMaximized: true });
  });
  win.on("unmaximize", () => {
    win == null ? void 0 : win.webContents.send("window-state-changed", { isMaximized: false });
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
ipcMain.on("window-minimize", () => {
  win == null ? void 0 : win.minimize();
});
ipcMain.on("window-maximize", () => {
  if (win == null ? void 0 : win.isMaximized()) {
    win == null ? void 0 : win.unmaximize();
  } else {
    win == null ? void 0 : win.maximize();
  }
});
ipcMain.on("window-close", () => {
  win == null ? void 0 : win.close();
});
ipcMain.handle("window-get-state", () => {
  return { isMaximized: (win == null ? void 0 : win.isMaximized()) ?? false };
});
ipcMain.handle("fs-open-folder", async () => {
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    properties: ["openDirectory"]
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});
async function readFolderRecursive(folderPath) {
  try {
    const items = await fs.readdir(folderPath, { withFileTypes: true });
    const fileItems = [];
    for (const item of items) {
      const fullPath = path.join(folderPath, item.name);
      if (item.isDirectory()) {
        const children = await readFolderRecursive(fullPath);
        fileItems.push({
          id: fullPath,
          name: item.name,
          path: fullPath,
          type: "folder",
          children
        });
      } else {
        const ext = path.extname(item.name).slice(1);
        fileItems.push({
          id: fullPath,
          name: item.name,
          path: fullPath,
          type: "file",
          extension: ext || void 0
        });
      }
    }
    fileItems.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    return fileItems;
  } catch (error) {
    console.error("Error reading folder recursively:", error);
    throw error;
  }
}
ipcMain.handle("fs-read-folder", async (_event, folderPath) => {
  try {
    return await readFolderRecursive(folderPath);
  } catch (error) {
    console.error("Error reading folder:", error);
    throw error;
  }
});
ipcMain.handle("fs-read-file", async (_event, filePath) => {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return { success: true, content };
  } catch (error) {
    console.error("Error reading file:", error);
    throw error;
  }
});
ipcMain.handle("fs-write-file", async (_event, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, "utf8");
    return { success: true };
  } catch (error) {
    console.error("Error writing file:", error);
    throw error;
  }
});
ipcMain.handle("fs-create-file", async (_event, parentPath, fileName) => {
  try {
    const filePath = path.join(parentPath, fileName);
    await fs.writeFile(filePath, "", "utf8");
    return { success: true, path: filePath };
  } catch (error) {
    console.error("Error creating file:", error);
    throw error;
  }
});
ipcMain.handle("fs-create-folder", async (_event, parentPath, folderName) => {
  try {
    const folderPath = path.join(parentPath, folderName);
    await fs.mkdir(folderPath, { recursive: true });
    return { success: true, path: folderPath };
  } catch (error) {
    console.error("Error creating folder:", error);
    throw error;
  }
});
ipcMain.handle("fs-rename", async (_event, oldPath, newName) => {
  try {
    const dir = path.dirname(oldPath);
    const newPath = path.join(dir, newName);
    if (existsSync(newPath)) {
      throw new Error("A file or folder with that name already exists");
    }
    await fs.rename(oldPath, newPath);
    return { success: true, path: newPath };
  } catch (error) {
    console.error("Error renaming:", error);
    throw error;
  }
});
ipcMain.handle("fs-delete", async (_event, itemPath) => {
  try {
    const stats = await fs.stat(itemPath);
    if (stats.isDirectory()) {
      await fs.rmdir(itemPath, { recursive: true });
    } else {
      await fs.unlink(itemPath);
    }
    return { success: true };
  } catch (error) {
    console.error("Error deleting:", error);
    throw error;
  }
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(createWindow);
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
