import { BrowserWindow, app, ipcMain, screen, shell } from "electron";
import { join } from "node:path";

import type { ModelSelection, OrganizeAction, RequestResponse } from "../shared/types";
import { config } from "./config";
import { anchorOf, defaultAnchor, islandBounds, type Point } from "./island";
import { describeEnvironment } from "./t3/auth";
import { CompanionStore } from "./store";

/** Where T3 Code's desktop app serves its local environment by default. */
const LOCAL_CANDIDATES = ["http://127.0.0.1:3773", "http://127.0.0.1:3774", "http://127.0.0.1:3775"];

// Development and test runs can isolate their sign-in and expose DevTools to automation.
if (process.env.T3_COMPANION_USER_DATA) app.setPath("userData", process.env.T3_COMPANION_USER_DATA);
if (process.env.T3_COMPANION_DEBUG_PORT) {
  app.commandLine.appendSwitch("remote-debugging-port", process.env.T3_COMPANION_DEBUG_PORT);
}

let window: BrowserWindow | null = null;
let quitting = false;
/** The cursor relative to the window, as last sent; cleared to force a fresh send. */
let lastCursor: Point | null = null;

/** The quiet capsule; the renderer resizes the window to whatever it shows. */
const INITIAL_SIZE = { width: 160, height: 48 };
/** How often the mascot's eyes check where the cursor is; updates go out only when it moved. */
const CURSOR_POLL_MS = 33;

const store = new CompanionStore(
  (state) => window?.webContents.send("companion:state", state),
  (detail) => window?.webContents.send("companion:thread-detail", detail),
);

const contains = (area: Electron.Rectangle, point: Point) =>
  point.x >= area.x && point.x <= area.x + area.width && point.y >= area.y && point.y <= area.y + area.height;

async function detectLocalServer(): Promise<string | null> {
  for (const candidate of LOCAL_CANDIDATES) {
    if (await describeEnvironment(candidate).then(() => true, () => false)) return candidate;
  }
  return null;
}

/** The capsule's top-center point; the island hangs from it at every size. */
// Read once the app is ready: the screen API is unavailable before that.
let anchor: Point = { x: 0, y: 0 };
const workAreaAt = (point: Point) => screen.getDisplayNearestPoint(point).workArea;

/** Places the window at `size`, hung from the anchor and kept on its display. */
function place(size: { width: number; height: number }) {
  window?.setBounds(islandBounds(workAreaAt(anchor), anchor, size));
}

function createWindow() {
  anchor = config.anchor() ?? defaultAnchor(screen.getPrimaryDisplay().workArea);
  const bounds = islandBounds(workAreaAt(anchor), anchor, INITIAL_SIZE);
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
  // Cmd+W and window-close shortcuts fold the island instead of closing it; only Quit ends the app.
  window.on("close", (event) => {
    if (quitting) return;
    event.preventDefault();
    window?.webContents.send("companion:fold");
  });
  // Electron has no global mouse-move event, so the mascot's gaze polls the cursor instead.
  // Compared relative to the window, so moving or resizing the island re-aims the eyes too.
  const cursorTimer = setInterval(() => {
    if (!window?.isVisible()) return;
    const point = screen.getCursorScreenPoint();
    const bounds = window.getBounds();
    const relative = { x: point.x - bounds.x, y: point.y - bounds.y };
    if (lastCursor && relative.x === lastCursor.x && relative.y === lastCursor.y) return;
    lastCursor = relative;
    window.webContents.send("companion:cursor", relative);
  }, CURSOR_POLL_MS);
  window.on("closed", () => {
    clearInterval(cursorTimer);
    window = null;
  });
  // Re-center when displays or the Dock change the work area.
  screen.on("display-metrics-changed", () => {
    if (!window) return;
    if (!screen.getAllDisplays().some((display) => contains(display.workArea, anchor))) {
      anchor = defaultAnchor(screen.getPrimaryDisplay().workArea);
    }
    const { width, height } = window.getBounds();
    place({ width, height });
  });
  if (process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  else void window.loadFile(join(import.meta.dirname, "../renderer/index.html"));
}

/** Sizes the window to what the island shows, so nothing invisible blocks clicks underneath. */
function resize(size: { width: number; height: number; focus: boolean }) {
  if (!window) return;
  place(size);
  store.setForeground(size.focus);
  if (size.focus) window.focus();
}

const fromCompanion = (event: Electron.IpcMainInvokeEvent) =>
  window !== null && event.sender === window.webContents;

function registerIpc() {
  ipcMain.on("companion:cursor-sync", (event) => {
    if (window !== null && event.sender === window.webContents) lastCursor = null;
  });
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
  handle("companion:connect", (pairing: string, address: string | null) => store.pairWith(pairing, address));
  handle("companion:sign-out", async () => store.signOut(await detectLocalServer()));
  handle("companion:resize", (size: { width: number; height: number; focus: boolean }) => resize(size));
  handle("companion:move", (position: { x: number; y: number; settled: boolean }) => {
    if (!window) return;
    const { width, height } = window.getBounds();
    const next = { x: Math.round(position.x), y: Math.round(position.y), width, height };
    anchor = anchorOf(next);
    if (!position.settled) {
      window.setBounds(next);
      return;
    }
    // A drop near an edge settles fully on screen; that settled spot becomes the anchor.
    const settled = islandBounds(workAreaAt(anchor), anchor, { width, height });
    window.setBounds(settled);
    anchor = anchorOf(settled);
    config.saveAnchor(anchor);
  });
  handle("companion:open-thread", (threadId: string | null) => store.openThread(threadId));
  handle("companion:send", (threadId: string, message: string, selection: ModelSelection | null) =>
    store.send(threadId, message, selection),
  );
  handle("companion:respond", (threadId: string, requestId: string, response: RequestResponse) =>
    store.respond(threadId, requestId, response),
  );
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
    store.start(config.pairing() ? null : await detectLocalServer());
  });
  app.on("before-quit", () => {
    quitting = true;
  });
  app.on("window-all-closed", () => app.quit());
}
