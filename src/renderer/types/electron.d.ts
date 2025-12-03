// Type declarations for Electron APIs exposed to renderer

interface WindowState {
    isMaximized: boolean;
}

interface PlatformInfo {
    isMac: boolean;
    isWindows: boolean;
    isLinux: boolean;
    platform: string;
}

interface WindowControls {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    getState: () => Promise<WindowState>;
    onStateChange: (callback: (state: WindowState) => void) => () => void;
}

interface FileSystem {
    openFolder: () => Promise<string | null>;
    readFolder: (path: string) => Promise<any[]>;
    readFile: (filePath: string) => Promise<{ success: boolean; content: string }>;
    writeFile: (filePath: string, content: string) => Promise<{ success: boolean }>;
    createFile: (path: string, name: string) => Promise<{ success: boolean; path: string }>;
    createFolder: (path: string, name: string) => Promise<{ success: boolean; path: string }>;
    rename: (oldPath: string, newName: string) => Promise<{ success: boolean; path: string }>;
    delete: (path: string) => Promise<{ success: boolean }>;
}

declare global {
    interface Window {
        platform: PlatformInfo;
        windowControls: WindowControls;
        fileSystem: FileSystem;
        ipcRenderer: {
            on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
            off: (channel: string, listener?: (...args: any[]) => void) => void;
            send: (channel: string, ...args: any[]) => void;
            invoke: (channel: string, ...args: any[]) => Promise<any>;
        };
    }
}

export { };
