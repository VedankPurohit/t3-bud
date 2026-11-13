import { BrowserWindow, app, ipcMain, screen, shell } from "electron";
import { join } from "node:path";

import type { ModelSelection, OrganizeAction } from "../shared/types";
import { config } from "./config";
import {
  COMPANION_COMPACT_SIZE,
  COMPANION_EXPANDED_SIZE,
  compactBoundsAt,
  defaultCompactBounds,
  resizeFromNearestCorner,
} from "./geometry";
import { probeServer, signIn } from "./oauth";
import { CompanionStore } from "./store";

/** Where T3 Code's desktop app serves its local environment by default. */
const LOCAL_CANDIDATES = ["http://127.0.0.1:3773", "http://127.0.0.1:3774", "http://127.0.0.1:3775"];

// Development and test runs can isolate their sign-in and expose DevTools to automation.
if (process.env.T3_COMPANION_USER_DATA) app.setPath("userData", process.env.T3_COMPANION_USER_DATA);
if (process.env.T3_COMPANION_DEBUG_PORT) {
  app.commandLine.appendSwitch("remote-debugging-port", process.env.T3_COMPANION_DEBUG_PORT);
}

let window: BrowserWindow | null = null;
let expanded = false;

const store = new CompanionStore(
  (state) => window?.webContents.send("companion:state", state),
  (detail) => window?.webContents.send("companion:thread-detail", detail),
);

async function detectLocalServer(): Promise<string | null> {
  for (const candidate of LOCAL_CANDIDATES) {
    if (await probeServer(candidate)) return candidate;
  }
  return null;
}

const workAreaFor = (rect: Electron.Rectangle) => screen.getDisplayMatching(rect).workArea;

function createWindow() {
  const saved = config.position();
  const bounds = saved
    ? compactBoundsAt(saved, workAreaFor({ ...saved, ...COMPANION_COMPACT_SIZE }))
    : defaultCompactBounds(screen.getPrimaryDisplay().workArea);
  window = new BrowserWindow({
    ...bounds,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    title: "T3 Companion",
    // A panel floats over full-screen apps and takes keys without activating the app.
    ...(process.platform === "darwin" ? { type: "panel" as const } : {}),
    webPreferences: {
      preload: join(import.meta.dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.setAlwaysOnTop(true, "floating");
  if (process.platform === "darwin") {
    window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true });
  }
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (url !== window?.webContents.getURL()) event.preventDefault();
  });
  window.once("ready-to-show", () => window?.showInactive());
  window.on("closed", () => {
    window = null;
  });
  if (process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  else void window.loadFile(join(import.meta.dirname, "../renderer/index.html"));
}

function setExpanded(next: boolean) {
  if (!window || expanded === next) return;
  const from = window.getBounds();
  const bounds = resizeFromNearestCorner(
    from,
    next ? COMPANION_EXPANDED_SIZE : COMPANION_COMPACT_SIZE,
    workAreaFor(from),
  );
  expanded = next;
  window.setBounds(bounds);
  store.setForeground(next);
  if (next) window.focus();
  else config.savePosition({ x: bounds.x, y: bounds.y });
}

const fromCompanion = (event: Electron.IpcMainInvokeEvent) =>
  window !== null && event.sender === window.webContents;

function registerIpc() {
  const handle = <A extends unknown[], R>(
    channel: string,
    handler: (...args: A) => R | Promise<R>,
  ) => {
    ipcMain.handle(channel, (event, ...args) => {
      if (!fromCompanion(event)) throw new Error("Only the companion window may call this.");
      return handler(...(args as A));
    });
  };

  handle("companion:get-state", () => store.state());
  handle("companion:connect", async (serverUrl: string) => {
    try {
      store.authorizing(new URL(serverUrl).origin);
      const auth = await signIn(serverUrl, null);
      config.saveAuth(auth);
      store.use(auth.serverUrl, auth.token);
      return { ok: true, value: undefined };
    } catch (error) {
      store.start(await detectLocalServer());
      return { ok: false, error: error instanceof Error ? error.message : "Could not connect." };
    }
  });
  handle("companion:sign-out", async () => store.signOut(await detectLocalServer()));
  handle("companion:set-expanded", (next: boolean) => setExpanded(next));
  handle("companion:move", (position: { x: number; y: number; settled: boolean }) => {
    if (!window || expanded) return;
    const point = { x: Math.round(position.x), y: Math.round(position.y) };
    const bounds = position.settled
      ? compactBoundsAt(point, workAreaFor({ ...point, ...COMPANION_COMPACT_SIZE }))
      : { ...point, ...COMPANION_COMPACT_SIZE };
    window.setBounds(bounds);
    if (position.settled) config.savePosition({ x: bounds.x, y: bounds.y });
  });
  handle("companion:open-thread", (threadId: string | null) => store.openThread(threadId));
  handle("companion:send", (threadId: string, message: string) => store.send(threadId, message));
  handle(
    "companion:launch",
    (input: { projectId: string; message: string; modelSelection: ModelSelection | null }) =>
      store.launch(input),
  );
  handle(
    "companion:organize",
    (threadId: string, action: OrganizeAction, snoozedUntil?: string) =>
      store.organize(threadId, action, snoozedUntil),
  );
  handle("companion:configure", (threadId: string, selection: ModelSelection) =>
    store.configure(threadId, selection),
  );
  handle("companion:interrupt", (threadId: string) => store.interrupt(threadId));
  handle("companion:open-in-t3", async (threadId: string | null) => {
    const environmentId = store.state().environmentId;
    // T3 Code's desktop app registers t3code:// and opens threads from it.
    const url =
      threadId && environmentId
        ? `t3code://threads/${encodeURIComponent(environmentId)}/${encodeURIComponent(threadId)}`
        : "t3code://";
    try {
      await shell.openExternal(url);
    } catch {
      const serverUrl = config.serverUrl();
      if (serverUrl) await shell.openExternal(serverUrl);
    }
  });
  handle("companion:quit", () => app.quit());
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => window?.showInactive());
  void app.whenReady().then(async () => {
    // An accessory app: no Dock icon or menu bar, just the floating companion.
    if (process.platform === "darwin") app.dock?.hide();
    registerIpc();
    createWindow();
    store.start(config.auth() ? null : await detectLocalServer());
  });
  app.on("window-all-closed", () => app.quit());
}
