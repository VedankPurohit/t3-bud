import { BrowserWindow, app, ipcMain, screen, shell } from "electron";
import { join } from "node:path";

import type {
  ModelSelection,
  OrganizeAction,
  RequestResponse,
  ThreadSearchInput,
  DraftImage,
  CompanionApi,
} from "../shared/types";
import { config } from "./config";
import { anchorOf, defaultAnchor, islandBounds, windowPlacement, type Point } from "./island";
import { describeEnvironment } from "./t3/auth";
import { CompanionStore } from "./store";
import { productName } from "../../package.json";

/** Where T3 Code's desktop app serves its local environment by default. */
const LOCAL_CANDIDATES = [
  "http://127.0.0.1:3773",
  "http://127.0.0.1:3774",
  "http://127.0.0.1:3775",
];

// Development and test runs can isolate their sign-in and expose DevTools to automation.
if (process.env.T3_COMPANION_USER_DATA) app.setPath("userData", process.env.T3_COMPANION_USER_DATA);
if (process.env.T3_COMPANION_DEBUG_PORT) {
  app.commandLine.appendSwitch("remote-debugging-port", process.env.T3_COMPANION_DEBUG_PORT);
}

let window: BrowserWindow | null = null;
let mascotWindow: BrowserWindow | null = null;
let expanded = false;
let lastSize = { width: 92, height: 74, notification: false, hover: true };
const lastCursors = new Map<BrowserWindow, Point>();
let quitting = false;
let notificationLayout = false;
let hoverLayout = true;

/** The quiet capsule; the renderer resizes the window to whatever it shows. */
const INITIAL_SIZE = { width: 92, height: 74 };
/** How often the mascot's eyes check where the cursor is; updates go out only when it moved. */
const CURSOR_POLL_MS = 33;

const store = new CompanionStore(
  (state) => {
    window?.webContents.send("companion:state", state);
    mascotWindow?.webContents.send("companion:state", state);
  },
  (detail) => window?.webContents.send("companion:thread-detail", detail),
);

const contains = (area: Electron.Rectangle, point: Point) =>
  point.x >= area.x &&
  point.x <= area.x + area.width &&
  point.y >= area.y &&
  point.y <= area.y + area.height;

async function detectLocalServer(): Promise<string | null> {
  for (const candidate of LOCAL_CANDIDATES) {
    if (
      await describeEnvironment(candidate).then(
        () => true,
        () => false,
      )
    )
      return candidate;
  }
  return null;
}

/** The capsule's top-center point; the island hangs from it at every size. */
// Read once the app is ready: the screen API is unavailable before that.
let anchor: Point = { x: 0, y: 0 };
const workAreaAt = (point: Point) => screen.getDisplayNearestPoint(point).workArea;

/** Places the window at `size`, hung from the anchor and kept on its display. */
function place(size: { width: number; height: number; notification?: boolean; hover?: boolean }) {
  const placement = windowPlacement(workAreaAt(anchor), anchor, size);
  const { mascotX, mascotY } = placement;
  notificationLayout = size.notification === true;
  hoverLayout = size.hover === true;
  window?.setBounds(placement.bounds);
  const layout = {
    width: placement.bounds.width,
    mascotX,
    mascotY,
    anchorInsets: placement.anchorInsets,
    panelAbove: placement.panelAbove,
  };
  window?.webContents.send("companion:layout", layout);
  return layout;
}

function createSurface(bounds: Electron.Rectangle, mascot: boolean) {
  const surface = new BrowserWindow({
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
    title: mascot ? `${productName} mascot` : productName,
    acceptFirstMouse: true,
    webPreferences: {
      preload: join(import.meta.dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  // Keep the mascot clickable even when a focused panel overlaps its transparent margin.
  surface.setAlwaysOnTop(true, "floating", mascot ? 1 : 0);
  if (process.platform === "darwin") {
    surface.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true,
    });
  }
  surface.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  surface.webContents.on("will-navigate", (event, url) => {
    if (url !== surface.webContents.getURL()) event.preventDefault();
  });
  surface.on("close", (event) => {
    if (quitting) return;
    event.preventDefault();
    window?.webContents.send("companion:fold");
  });
  surface.on("closed", () => {
    lastCursors.delete(surface);
    if (mascot) mascotWindow = null;
    else window = null;
  });
  if (mascot) surface.once("ready-to-show", () => surface.showInactive());
  const query: Record<string, string> = mascot ? { surface: "mascot" } : {};
  if (process.env.ELECTRON_RENDERER_URL) {
    const url = new URL(process.env.ELECTRON_RENDERER_URL);
    if (mascot) url.searchParams.set("surface", "mascot");
    void surface.loadURL(url.href);
  } else {
    void surface.loadFile(join(import.meta.dirname, "../renderer/index.html"), { query });
  }
  return surface;
}

function moveMascot() {
  // Panel size changes never touch this window's bounds.
  mascotWindow?.setPosition(Math.round(anchor.x - INITIAL_SIZE.width / 2), Math.round(anchor.y));
}

function createWindow() {
  const saved = config.anchor() ?? defaultAnchor(screen.getPrimaryDisplay().workArea);
  const bounds = islandBounds(workAreaAt(saved), saved, INITIAL_SIZE);
  anchor = anchorOf(bounds);
  window = createSurface(bounds, false);
  mascotWindow = createSurface(bounds, true);
  let revealed = false;
  let concealTimer: ReturnType<typeof setTimeout> | undefined;
  const reveal = (next: boolean) => {
    if (revealed === next) return;
    revealed = next;
    window?.webContents.send("companion:reveal", next);
  };
  const cursorTimer = setInterval(() => {
    if (!mascotWindow?.isVisible()) return;
    const point = screen.getCursorScreenPoint();
    for (const surface of [mascotWindow, window]) {
      if (!surface?.isVisible()) continue;
      const bounds = surface.getBounds();
      const relative = { x: point.x - bounds.x, y: point.y - bounds.y };
      const last = lastCursors.get(surface);
      if (!last || relative.x !== last.x || relative.y !== last.y) {
        lastCursors.set(surface, relative);
        surface.webContents.send("companion:cursor", {
          ...relative, width: bounds.width, height: bounds.height,
          overMascot: contains(mascotWindow.getBounds(), point),
        });
      }
    }
    if (expanded || notificationLayout) {
      clearTimeout(concealTimer);
      concealTimer = undefined;
      reveal(false);
      return;
    }
    const inside = contains(mascotWindow.getBounds(), point) ||
      Boolean(window?.isVisible() && hoverLayout && contains(window.getBounds(), point));
    if (inside) {
      clearTimeout(concealTimer);
      concealTimer = undefined;
      reveal(true);
    } else if (revealed && concealTimer === undefined) {
      concealTimer = setTimeout(() => {
        concealTimer = undefined;
        reveal(false);
      }, 90);
    }
  }, CURSOR_POLL_MS);
  app.once("before-quit", () => {
    clearInterval(cursorTimer);
    clearTimeout(concealTimer);
  });
  screen.on("display-metrics-changed", () => {
    if (!window || !mascotWindow) return;
    if (!screen.getAllDisplays().some((display) => contains(display.workArea, anchor))) {
      anchor = defaultAnchor(screen.getPrimaryDisplay().workArea);
    }
    anchor = anchorOf(islandBounds(workAreaAt(anchor), anchor, INITIAL_SIZE));
    moveMascot();
    place(lastSize);
  });
}

/** Resize or hide the content window. The mascot window stays at its saved screen anchor. */
function resize(size: Parameters<CompanionApi["resize"]>[0]) {
  expanded = size.focus;
  mascotWindow?.webContents.send("companion:expanded", expanded);
  store.setForeground(size.focus);
  if (size.visible === false) {
    lastSize = { ...INITIAL_SIZE, notification: false, hover: true };
    notificationLayout = false;
    hoverLayout = true;
    window?.hide();
    const bounds = window?.getBounds() ?? INITIAL_SIZE;
    return place({ ...bounds, notification: false, hover: true });
  }
  lastSize = { ...size, notification: size.notification === true, hover: size.hover === true };
  const layout = place(size);
  if (size.focus) {
    window?.show();
    window?.focus();
  } else {
    window?.showInactive();
  }
  return layout;
}

const fromCompanion = (event: Electron.IpcMainInvokeEvent) =>
  [window, mascotWindow].some((surface) => surface !== null && event.sender === surface.webContents);

function registerIpc() {
  ipcMain.on("companion:cursor-sync", (event) => {
    for (const surface of [window, mascotWindow]) {
      if (surface && event.sender === surface.webContents) lastCursors.delete(surface);
    }
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

  handle("companion:toggle-panel", () => window?.webContents.send("companion:toggle"));
  handle("companion:get-expanded", () => expanded);
  handle("companion:search-threads", (input: ThreadSearchInput) => store.searchThreads(input));
  handle("companion:get-state", () => store.state());
  handle("companion:project-icon", (projectId: string) => store.projectIcon(projectId));
  handle("companion:image-url", (attachmentId: string) => store.imageUrl(attachmentId));
  handle("companion:connect", (pairing: string, address: string | null) =>
    store.pairWith(pairing, address),
  );
  handle("companion:sign-out", async () => store.signOut(await detectLocalServer()));
  handle(
    "companion:resize",
    (size: Parameters<CompanionApi["resize"]>[0]) =>
      resize(size),
  );
  handle("companion:move", (position: { x: number; y: number; settled: boolean }) => {
    if (!mascotWindow) return;
    anchor = { x: Math.round(position.x), y: Math.round(position.y) };
    if (position.settled) {
      anchor = anchorOf(islandBounds(workAreaAt(anchor), anchor, INITIAL_SIZE));
      config.saveAnchor(anchor);
    }
    moveMascot();
    if (window?.isVisible()) place(lastSize);
    else {
      // Update the hidden renderer's edge constraints before the next hover or click.
      place({ ...INITIAL_SIZE, hover: true });
    }
  });
  handle("companion:open-thread", (threadId: string | null) => store.openThread(threadId));
  handle(
    "companion:send",
    (
      threadId: string,
      message: string,
      selection: ModelSelection | null,
      images?: readonly DraftImage[],
    ) => store.send(threadId, message, selection, images),
  );
  handle("companion:respond", (threadId: string, requestId: string, response: RequestResponse) =>
    store.respond(threadId, requestId, response),
  );
  handle(
    "companion:launch",
    (input: {
      projectId: string;
      message: string;
      modelSelection: ModelSelection | null;
      images?: readonly DraftImage[];
    }) => store.launch(input),
  );
  handle("companion:organize", (threadId: string, action: OrganizeAction, snoozedUntil?: string) =>
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
  app.on("second-instance", () => mascotWindow?.showInactive());
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
