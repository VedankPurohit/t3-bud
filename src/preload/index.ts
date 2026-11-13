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
  connect: (serverUrl) => ipcRenderer.invoke("companion:connect", serverUrl),
  signOut: () => ipcRenderer.invoke("companion:sign-out"),
  setExpanded: (expanded) => ipcRenderer.invoke("companion:set-expanded", expanded),
  move: (position) => ipcRenderer.invoke("companion:move", position),
  openThread: (threadId) => ipcRenderer.invoke("companion:open-thread", threadId),
  onThreadDetail: subscribe<ThreadDetail>("companion:thread-detail"),
  send: (threadId, message) => ipcRenderer.invoke("companion:send", threadId, message),
  launch: (input) => ipcRenderer.invoke("companion:launch", input),
  organize: (threadId, action, snoozedUntil) =>
    ipcRenderer.invoke("companion:organize", threadId, action, snoozedUntil),
  configure: (threadId, selection) => ipcRenderer.invoke("companion:configure", threadId, selection),
  interrupt: (threadId) => ipcRenderer.invoke("companion:interrupt", threadId),
  openInT3Code: (threadId) => ipcRenderer.invoke("companion:open-in-t3", threadId),
  quit: () => ipcRenderer.invoke("companion:quit"),
};

contextBridge.exposeInMainWorld("companion", api);
