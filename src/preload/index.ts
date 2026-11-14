/// <reference lib="dom" />
import { contextBridge, ipcRenderer } from "electron";

import type {
  CompanionApi,
  CompanionState,
  ThreadDetail,
  CompanionWindowLayout,
} from "../shared/types";

const subscribe =
  <T>(channel: string) =>
  (listener: (value: T) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, value: T) => listener(value);
    ipcRenderer.on(channel, wrapped);
    return () => {
      ipcRenderer.removeListener(channel, wrapped);
    };
  };

// Native cursor coordinates can arrive before Chromium adopts a new viewport size.
// Request a fresh sample once the renderer has caught up with the native resize.
window.addEventListener("resize", () => ipcRenderer.send("companion:cursor-sync"));

const api: CompanionApi = {
  togglePanel: () => ipcRenderer.invoke("companion:toggle-panel"),
  onToggleRequest: subscribe<void>("companion:toggle"),
  onRevealRequest: subscribe<boolean>("companion:reveal"),
  getExpanded: () => ipcRenderer.invoke("companion:get-expanded"),
  onExpandedChange: subscribe<boolean>("companion:expanded"),
  searchThreads: (input) => ipcRenderer.invoke("companion:search-threads", input),
  getState: () => ipcRenderer.invoke("companion:get-state"),
  onState: subscribe<CompanionState>("companion:state"),
  projectIcon: (projectId) => ipcRenderer.invoke("companion:project-icon", projectId),
  imageUrl: (attachmentId) => ipcRenderer.invoke("companion:image-url", attachmentId),
  connect: (pairing, address) => ipcRenderer.invoke("companion:connect", pairing, address),
  signOut: () => ipcRenderer.invoke("companion:sign-out"),
  onWindowLayout: subscribe<CompanionWindowLayout>("companion:layout"),
  resize: (size) => ipcRenderer.invoke("companion:resize", size),
  move: (position) => ipcRenderer.invoke("companion:move", position),
  onFoldRequest: subscribe<void>("companion:fold"),
  onCursor: (listener) => {
    const unsubscribe = subscribe<{
      x: number; y: number; width: number; height: number; overMascot: boolean;
    }>(
      "companion:cursor",
    )((point) => {
      if (point.width === window.innerWidth && point.height === window.innerHeight) listener(point);
    });
    // A new listener needs the current position even while the cursor stands still.
    ipcRenderer.send("companion:cursor-sync");
    return unsubscribe;
  },
  openThread: (threadId) => ipcRenderer.invoke("companion:open-thread", threadId),
  onThreadDetail: subscribe<ThreadDetail>("companion:thread-detail"),
  send: (threadId, message, selection, images) =>
    ipcRenderer.invoke("companion:send", threadId, message, selection, images),
  respond: (threadId, requestId, response) =>
    ipcRenderer.invoke("companion:respond", threadId, requestId, response),
  launch: (input) => ipcRenderer.invoke("companion:launch", input),
  organize: (threadId, action, snoozedUntil) =>
    ipcRenderer.invoke("companion:organize", threadId, action, snoozedUntil),
  interrupt: (threadId) => ipcRenderer.invoke("companion:interrupt", threadId),
  openInT3Code: (threadId) => ipcRenderer.invoke("companion:open-in-t3", threadId),
  quit: () => ipcRenderer.invoke("companion:quit"),
};

contextBridge.exposeInMainWorld("companion", api);
