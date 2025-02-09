// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  moveRight: () => ipcRenderer.send("move-right"),
  moveCursor: (x: number, y: number) => ipcRenderer.send("move-cursor", x, y),
});
