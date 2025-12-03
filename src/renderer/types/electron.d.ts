// Type declarations for Electron APIs exposed to renderer

interface WindowControls {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
}

declare global {
    interface Window {
        windowControls: WindowControls;
        ipcRenderer: {
            on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
            off: (channel: string, listener?: (...args: any[]) => void) => void;
            send: (channel: string, ...args: any[]) => void;
            invoke: (channel: string, ...args: any[]) => Promise<any>;
        };
    }
}

export { };
