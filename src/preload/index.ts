import { contextBridge, ipcRenderer } from "electron";

import type { CompanionApi, CompanionState, ThreadDetail } from "../shared/types";

const subscribe =
  <T>(channel: string) =>
  (listener: (value: T) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, value: T) => listener(value);
    ipcRenderer.on(channel, wrapped);
    return () => {
      ipcRenderer.removeListener(channel, wrapped);
    };
  };

const api: CompanionApi = {
  getState: () => ipcRenderer.invoke("companion:get-state"),
  onState: subscribe<CompanionState>("companion:state"),
  connect: (pairing, address) => ipcRenderer.invoke("companion:connect", pairing, address),
  signOut: () => ipcRenderer.invoke("companion:sign-out"),
  resize: (size) => ipcRenderer.invoke("companion:resize", size),
  move: (position) => ipcRenderer.invoke("companion:move", position),
  onFoldRequest: subscribe<void>("companion:fold"),
  onCursor: (listener) => {
    const unsubscribe = subscribe<{ x: number; y: number }>("companion:cursor")(listener);
    // A new listener needs the current position even while the cursor stands still.
    ipcRenderer.send("companion:cursor-sync");
    return unsubscribe;
  },
  openThread: (threadId) => ipcRenderer.invoke("companion:open-thread", threadId),
  onThreadDetail: subscribe<ThreadDetail>("companion:thread-detail"),
  send: (threadId, message, selection) => ipcRenderer.invoke("companion:send", threadId, message, selection),
  respond: (threadId, requestId, response) => ipcRenderer.invoke("companion:respond", threadId, requestId, response),
  launch: (input) => ipcRenderer.invoke("companion:launch", input),
  organize: (threadId, action, snoozedUntil) =>
    ipcRenderer.invoke("companion:organize", threadId, action, snoozedUntil),
  interrupt: (threadId) => ipcRenderer.invoke("companion:interrupt", threadId),
  openInT3Code: (threadId) => ipcRenderer.invoke("companion:open-in-t3", threadId),
  quit: () => ipcRenderer.invoke("companion:quit"),
};

contextBridge.exposeInMainWorld("companion", api);
