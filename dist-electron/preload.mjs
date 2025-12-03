"use strict";
const electron = require("electron");
console.log("[PRELOAD] Preload script starting...");
try {
  electron.contextBridge.exposeInMainWorld("ipcRenderer", {
    on(...args) {
      const [channel, listener] = args;
      return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
    },
    off(...args) {
      const [channel, ...omit] = args;
      return electron.ipcRenderer.off(channel, ...omit);
    },
    send(...args) {
      const [channel, ...omit] = args;
      return electron.ipcRenderer.send(channel, ...omit);
    },
    invoke(...args) {
      const [channel, ...omit] = args;
      return electron.ipcRenderer.invoke(channel, ...omit);
    }
  });
  const platform = process.platform;
  electron.contextBridge.exposeInMainWorld("platform", {
    isMac: platform === "darwin",
    isWindows: platform === "win32",
    isLinux: platform === "linux",
    platform
  });
  electron.contextBridge.exposeInMainWorld("windowControls", {
    minimize: () => electron.ipcRenderer.send("window-minimize"),
    maximize: () => electron.ipcRenderer.send("window-maximize"),
    close: () => electron.ipcRenderer.send("window-close"),
    getState: () => electron.ipcRenderer.invoke("window-get-state"),
    onStateChange: (callback) => {
      const listener = (_event, state) => callback(state);
      electron.ipcRenderer.on("window-state-changed", listener);
      return () => electron.ipcRenderer.removeListener("window-state-changed", listener);
    }
  });
  electron.contextBridge.exposeInMainWorld("fileSystem", {
    openFolder: () => electron.ipcRenderer.invoke("fs-open-folder"),
    readFolder: (path) => electron.ipcRenderer.invoke("fs-read-folder", path),
    createFile: (path, name) => electron.ipcRenderer.invoke("fs-create-file", path, name),
    createFolder: (path, name) => electron.ipcRenderer.invoke("fs-create-folder", path, name),
    rename: (oldPath, newName) => electron.ipcRenderer.invoke("fs-rename", oldPath, newName),
    delete: (path) => electron.ipcRenderer.invoke("fs-delete", path)
  });
  console.log("[PRELOAD] ✅ All APIs exposed successfully");
} catch (error) {
  console.error("[PRELOAD] ❌ Error exposing APIs:", error);
}
