import { randomUUID } from "node:crypto";

import type {
  ActionResult,
  CompanionState,
  Connection,
  ModelSelection,
  OrganizeAction,
  PendingRequest,
  Provider,
  RequestResponse,
  ThreadDetail,
  ThreadStatus,
  ThreadSearchInput,
  ThreadSearchResult,
  DraftImage,
  ImageAttachment,
} from "../shared/types";
import { config } from "./config";
import { uploadImages, releaseImages } from "./t3/images";
import {
  pair,
  parsePairingInput,
  SessionEndedError,
  sessionIsValid,
  socketUrl,
  type Pairing,
} from "./t3/auth";
import { toProjects, toProviders, type ConfigProvider, type ProviderInstances } from "./t3/catalog";
import { RpcError, RpcSocket } from "./t3/rpc";
import { searchThreadCatalog, type ServerSearchResult } from "./t3/search";
import { buildSections } from "./t3/sections";
import {
  applyShellItem,
  emptyShell,
  pendingByListedThread,
  type RawThreadShell,
  type ShellState,
} from "./t3/shell";
import {
  applyThreadItem,
  emptyThreadStream,
  pendingRequests,
  type RawTurnItem,
  type ThreadStreamState,
} from "./t3/thread";

/** Coalesces bursts (a streaming reply sends many frames) into one update per frame budget. */
const PUBLISH_DELAY_MS = 60;
const RECONNECT_CAP_MS = 30_000;

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";

/** Keeps a live view of one T3 Code environment over its client protocol. */
export class CompanionStore {
  private pairing: Pairing | null = null;
  private socket: RpcSocket | null = null;
  private connection: Connection = { state: "unconfigured", suggestedUrl: null };
  private shell: ShellState = emptyShell;
  private providers: Provider[] = [];
  private providerConfig: ConfigProvider[] = [];
  private providerInstances: ProviderInstances = {};
  private searchRows = new Map<string, RawThreadShell>();
  private olderSettledSearch = false;
  private syncedAt: string | null = null;
  private retry = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private publishTimer: ReturnType<typeof setTimeout> | null = null;
  private generation = 0;
  private readonly projectIcons = new Map<string, Promise<string | null>>();

  private openThreadId: string | null = null;
  private thread: ThreadStreamState = emptyThreadStream;
  private cancelThread: (() => void) | null = null;
  private detailTimer: ReturnType<typeof setTimeout> | null = null;
  private visitedCompletion: string | null = null;
  private visitSent = false;

  constructor(
    private readonly emit: (state: CompanionState) => void,
    private readonly emitDetail: (detail: ThreadDetail) => void,
  ) {}

  // ── State ──────────────────────────────────────────────────────────────────────────────────

  state(): CompanionState {
    const sections = buildSections(this.shell, Date.now());
    const projects = toProjects(this.shell);
    return {
      connection: this.connection,
      environmentId: this.pairing?.environmentId ?? null,
      ...sections,
      projects,
      providers: this.providers,
      syncedAt: this.syncedAt,
      synchronized: this.shell.synchronized,
    };
  }

  private publish() {
    if (this.publishTimer) return;
    this.publishTimer = setTimeout(() => {
      this.publishTimer = null;
      this.emit(this.state());
    }, PUBLISH_DELAY_MS);
  }

  private setConnection(connection: Connection) {
    this.connection = connection;
    this.publish();
  }

  // ── Pairing and connection ─────────────────────────────────────────────────────────────────

  start(suggestedUrl: string | null) {
    const pairing = config.pairing();
    if (pairing) {
      this.use(pairing);
      return;
    }
    const serverUrl = config.serverUrl();
    this.setConnection(
      serverUrl
        ? {
            state: "needs-auth",
            serverUrl,
            reason: "The pairing expired. Pair the companion again.",
          }
        : { state: "unconfigured", suggestedUrl },
    );
  }

  async pairWith(input: string, address: string | null): Promise<ActionResult> {
    const target = parsePairingInput(input, address);
    if (!target) {
      return {
        ok: false,
        error: "Paste the pairing link from T3 Code, or its code together with the address.",
      };
    }
    this.setConnection({ state: "pairing", serverUrl: target.httpBaseUrl });
    try {
      const pairing = await pair(target);
      config.savePairing(pairing);
      this.use(pairing);
      return { ok: true, value: undefined };
    } catch (error) {
      this.start(address);
      return { ok: false, error: errorMessage(error) };
    }
  }

  signOut(suggestedUrl: string | null) {
    config.clearPairing();
    this.disconnect();
    this.pairing = null;
    this.shell = emptyShell;
    this.providers = [];
    this.setConnection({ state: "unconfigured", suggestedUrl });
  }

  private use(pairing: Pairing) {
    this.disconnect();
    this.pairing = pairing;
    this.shell = emptyShell;
    this.retry = 0;
    void this.connect();
  }

  private disconnect() {
    this.generation += 1;
    this.projectIcons.clear();
    this.searchRows.clear();
    this.olderSettledSearch = false;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.cancelThread = null;
    this.socket?.close();
    this.socket = null;
  }

  async searchThreads(input: ThreadSearchInput): Promise<ThreadSearchResult> {
    const generation = this.generation;
    const query = input.query.trim().slice(0, 200);
    let server: ServerSearchResult = { matches: [] };
    let error: string | null = null;
    if (query.length >= 2) {
      try {
        if (!this.socket || this.socket.closed)
          throw new Error("Can't reach T3 Code. Showing title matches.");
        server = await this.socket.call<ServerSearchResult>("orchestration.searchThreads", {
          query,
          limit: 50,
          ...(this.olderSettledSearch
            ? {
                olderSettledBefore: new Date().toISOString(),
                projectIds: input.projectIds.length ? input.projectIds : undefined,
              }
            : {}),
        });
      } catch (cause) {
        error = errorMessage(cause);
      }
    }
    if (generation !== this.generation)
      return { threads: [], error: "The connected environment changed." };
    this.searchRows = new Map((server.threads ?? []).map((thread) => [thread.id, thread]));
    return {
      threads: searchThreadCatalog(this.shell, { ...input, query }, server, Date.now()),
      error,
    };
  }

  /** Coming back to the island retries a dropped connection at once. */
  setForeground(foreground: boolean) {
    if (!foreground || this.socket || !this.pairing || this.connection.state !== "offline") return;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retry = 0;
    void this.connect();
  }

  private async connect() {
    const pairing = this.pairing;
    if (!pairing) return;
    const generation = this.generation;
    let socket: RpcSocket;
    try {
      const url = await socketUrl(pairing.httpBaseUrl, pairing.token);
      socket = await RpcSocket.open(url, (code) => this.onClose(generation, code));
    } catch (error) {
      if (generation !== this.generation) return;
      if (error instanceof SessionEndedError) return this.sessionEnded(error.message);
      this.setConnection({
        state: "offline",
        serverUrl: pairing.httpBaseUrl,
        error: errorMessage(error),
      });
      return this.scheduleReconnect();
    }
    if (generation !== this.generation) return socket.close();
    this.socket = socket;
    this.retry = 0;
    this.setConnection({ state: "connected", serverUrl: pairing.httpBaseUrl });

    void socket
      .call<{
        providers: ConfigProvider[];
        settings?: { providerInstances?: ProviderInstances };
        shellOlderSettled?: boolean;
      }>("server.getConfig", {})
      .then((serverConfig) => {
        if (generation !== this.generation) return;
        this.olderSettledSearch = serverConfig.shellOlderSettled === true;
        this.providerConfig = serverConfig.providers ?? [];
        this.providerInstances = serverConfig.settings?.providerInstances ?? {};
        this.providers = toProviders(this.providerConfig, this.providerInstances);
        this.publish();
      })
      .catch(() => undefined);

    socket.stream(
      "subscribeServerConfig",
      {},
      (value) => {
        if (generation !== this.generation) return;
        const event = value as {
          type: string;
          config?: {
            providers?: ConfigProvider[];
            settings?: { providerInstances?: ProviderInstances };
          };
          payload?: {
            providers?: ConfigProvider[];
            settings?: { providerInstances?: ProviderInstances };
          };
        };
        const providers = event.config?.providers ?? event.payload?.providers;
        const instances =
          event.config?.settings?.providerInstances ?? event.payload?.settings?.providerInstances;
        if (!providers && !instances) return;
        if (providers) this.providerConfig = providers;
        if (instances) this.providerInstances = instances;
        this.providers = toProviders(this.providerConfig, this.providerInstances);
        this.publish();
      },
      () => undefined,
    );

    // Resumes from the last sequence after a reconnect; the server sends what was missed.
    socket.stream(
      "orchestration.subscribeShell",
      this.shell.sequence >= 0
        ? { afterSequence: this.shell.sequence, requestCompletionMarker: true }
        : { requestCompletionMarker: true },
      (value) => {
        this.shell = applyShellItem(this.shell, value);
        this.syncedAt = new Date().toISOString();
        this.visitIfNeeded();
        this.publish();
        if (this.openThreadId) this.scheduleDetail();
      },
      () => undefined,
    );
    if (this.openThreadId) this.subscribeThread();
  }

  private onClose(generation: number, code: number) {
    if (generation !== this.generation) return;
    this.socket = null;
    this.cancelThread = null;
    const pairing = this.pairing;
    if (!pairing) return;
    // The server closes with 1000 when the token expires or is revoked.
    void (async () => {
      if (code === 1000 && !(await sessionIsValid(pairing.httpBaseUrl, pairing.token))) {
        return this.sessionEnded("T3 Code ended this companion's session. Pair it again.");
      }
      if (generation !== this.generation) return;
      this.setConnection({
        state: "offline",
        serverUrl: pairing.httpBaseUrl,
        error: "Connection lost",
      });
      this.scheduleReconnect();
    })();
  }

  private sessionEnded(reason: string) {
    const serverUrl = this.pairing?.httpBaseUrl ?? config.serverUrl() ?? "";
    config.clearPairing();
    this.disconnect();
    this.pairing = null;
    this.setConnection({ state: "needs-auth", serverUrl, reason });
  }

  /** The official client's ladder: a quick first retry, then jittered doubling up to a cap. */
  private scheduleReconnect() {
    const ceiling =
      this.retry === 0 ? 250 : Math.min(RECONNECT_CAP_MS, 1000 * 2 ** (this.retry + 1));
    const delay = ceiling / 2 + (Math.random() * ceiling) / 2;
    this.retry += 1;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.connect();
    }, delay);
  }

  // ── The open thread ────────────────────────────────────────────────────────────────────────

  openThread(threadId: string | null) {
    this.cancelThread?.();
    this.cancelThread = null;
    this.openThreadId = threadId;
    this.thread = emptyThreadStream;
    this.visitedCompletion = null;
    this.visitSent = false;
    if (!threadId) return;
    this.emitDetail(this.detail());
    if (this.socket) this.subscribeThread();
    this.visitIfNeeded();
  }

  private subscribeThread() {
    const threadId = this.openThreadId;
    const socket = this.socket;
    if (!threadId || !socket) return;
    this.cancelThread = socket.stream(
      "orchestration.subscribeThread",
      this.thread.sequence >= 0
        ? { threadId, afterSequence: this.thread.sequence, requestCompletionMarker: true }
        : { threadId, requestCompletionMarker: true },
      (value) => {
        if (this.openThreadId !== threadId) return;
        this.thread = applyThreadItem(this.thread, threadId, value);
        this.scheduleDetail();
      },
      () => undefined,
    );
  }

  private scheduleDetail() {
    if (this.detailTimer) return;
    this.detailTimer = setTimeout(() => {
      this.detailTimer = null;
      if (this.openThreadId) this.emitDetail(this.detail());
    }, PUBLISH_DELAY_MS);
  }

  /**
   * Marks the open thread read in T3 Code when it opens and again whenever a new run completes,
   * so it stops showing unread everywhere. Visiting does not trigger itself again.
   */
  private visitIfNeeded() {
    const threadId = this.openThreadId;
    const shellThread = threadId ? this.shell.threads.get(threadId) : undefined;
    if (!threadId || !shellThread || !this.socket) return;
    const completion = shellThread.latestRunCompletedAt ?? shellThread.createdAt;
    if (this.visitSent && completion === this.visitedCompletion) return;
    const opened = !this.visitSent;
    this.visitSent = true;
    this.visitedCompletion = completion;
    const visitedAt =
      [shellThread.updatedAt, shellThread.latestRunCompletedAt ?? ""].sort().at(-1) ??
      shellThread.updatedAt;
    void this.dispatch({
      type: "thread.visit",
      threadId,
      visitedAt,
      ...(opened ? { opened: true } : {}),
    }).catch(() => undefined);
  }

  private detail(): ThreadDetail {
    const threadId = this.openThreadId ?? "";
    const shellThread: RawThreadShell | undefined =
      this.shell.threads.get(threadId) ?? this.searchRows.get(threadId);
    const projection = this.thread.projection;
    const messages = (projection?.messages ?? [])
      .filter((message) => message.role === "user" || message.role === "assistant")
      .toSorted((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
    const requests = projection
      ? pendingRequests(projection).map((item) => toRequest(threadId, item))
      : [];
    const rolledUp = pendingByListedThread(this.shell.threads).get(threadId);
    const hiddenRequestCount = (rolledUp?.threadIds ?? []).filter((id) => id !== threadId).length;
    return {
      threadId,
      title: shellThread?.title ?? "Thread",
      status: (shellThread?.status ?? "idle") as ThreadStatus,
      pendingRequestCount: requests.length + hiddenRequestCount,
      providerInstanceId: shellThread?.modelSelection?.instanceId ?? null,
      model: shellThread?.modelSelection?.model ?? null,
      items: messages.map((message, index) => ({
        itemId: message.id,
        position: index,
        type: message.role === "user" ? "user_message" : "assistant_message",
        text: message.text,
        status: message.streaming ? "in_progress" : "completed",
        createdBy: message.role,
        updatedAt: message.updatedAt,
        attachments: message.attachments?.filter((attachment) => attachment.type === "image"),
      })),
      requests,
      hiddenRequestCount,
      loading: projection === null,
      error: this.socket
        ? null
        : this.connection.state === "offline"
          ? "Reconnecting to T3 Code…"
          : null,
    };
  }

  // ── Actions ────────────────────────────────────────────────────────────────────────────────

  async imageUrl(attachmentId: string): Promise<string | null> {
    const socket = this.socket;
    const pairing = this.pairing;
    if (!socket || !pairing) return null;
    try {
      const result = await socket.call<{ relativeUrl: string }>("assets.createUrl", {
        resource: { _tag: "attachment", attachmentId, disposition: "inline" },
      });
      return new URL(result.relativeUrl, pairing.httpBaseUrl).href;
    } catch {
      return null;
    }
  }

  private async withImages<T>(
    images: readonly DraftImage[],
    run: (attachments: readonly ImageAttachment[]) => Promise<T>,
  ) {
    const socket = this.socket;
    const pairing = this.pairing;
    const generation = this.generation;
    if (!socket || !pairing) throw new Error("Not connected to T3 Code.");
    const attachments = await uploadImages(socket, pairing.httpBaseUrl, images);
    try {
      if (generation !== this.generation)
        throw new Error("The connected environment changed. Your draft was kept.");
      return await run(attachments);
    } catch (error) {
      await releaseImages(socket, attachments);
      throw error;
    }
  }

  projectIcon(projectId: string): Promise<string | null> {
    const project = this.shell.projects.get(projectId);
    const socket = this.socket;
    const pairing = this.pairing;
    if (!project || !socket || !pairing) return Promise.resolve(null);
    const key = JSON.stringify([project.id, project.workspaceRoot, project.faviconPath]);
    const cached = this.projectIcons.get(key);
    if (cached) return cached;
    const request = (async () => {
      try {
        const asset = await socket.call<{ relativeUrl: string }>("assets.createUrl", {
          resource: {
            _tag: "project-favicon",
            cwd: project.workspaceRoot,
            ...(project.faviconPath ? { path: project.faviconPath } : {}),
          },
        });
        const url = new URL(asset.relativeUrl, pairing.httpBaseUrl);
        if (url.pathname.endsWith("/project-favicon-missing")) return null;
        const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
        if (!response.ok) return null;
        const mime = response.headers.get("content-type")?.split(";")[0] ?? "";
        if (!mime.startsWith("image/")) return null;
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength > 4 * 1024 * 1024) return null;
        return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
      } catch {
        this.projectIcons.delete(key);
        return null;
      }
    })();
    if (this.projectIcons.size >= 64)
      this.projectIcons.delete(this.projectIcons.keys().next().value!);
    this.projectIcons.set(key, request);
    return request;
  }

  private async dispatch(command: Record<string, unknown>) {
    const socket = this.socket;
    if (!socket) throw new Error("Not connected to T3 Code.");
    return socket.call("orchestration.dispatchCommand", { commandId: randomUUID(), ...command });
  }

  private async act<T>(run: () => Promise<T>): Promise<ActionResult<T>> {
    try {
      return { ok: true, value: await run() };
    } catch (error) {
      return { ok: false, error: error instanceof RpcError ? error.message : errorMessage(error) };
    }
  }

  send(
    threadId: string,
    text: string,
    modelSelection: ModelSelection | null,
    images: readonly DraftImage[] = [],
  ) {
    return this.act(() =>
      this.withImages(images, async (attachments) => {
        await this.dispatch({
          type: "message.dispatch",
          threadId,
          messageId: randomUUID(),
          text,
          attachments,
          createdBy: "user",
          creationSource: "web",
          dispatchMode: { type: "start_immediately" },
          deliveryIntent: "auto",
          // Switching on the next message works for every provider; a live switch does not.
          ...(modelSelection ? { modelSelection } : {}),
        });
      }),
    );
  }

  respond(threadId: string, requestId: string, response: RequestResponse) {
    return this.act(async () => {
      await this.dispatch({ type: "runtime-request.respond", threadId, requestId, ...response });
    });
  }

  organize(threadId: string, action: OrganizeAction, snoozedUntil?: string) {
    const commands: Record<OrganizeAction, Record<string, unknown>> = {
      settle: { type: "thread.settle", threadId },
      unsettle: { type: "thread.unsettle", threadId, reason: "user" },
      snooze: { type: "thread.snooze", threadId, snoozedUntil },
      unsnooze: { type: "thread.unsnooze", threadId, reason: "user" },
      mark_unread: { type: "thread.mark-unread", threadId },
    };
    return this.act(async () => {
      await this.dispatch(commands[action]);
    });
  }

  interrupt(threadId: string) {
    return this.act(async () => {
      await this.dispatch({ type: "thread.stop", threadId });
    });
  }

  launch(input: {
    projectId: string;
    message: string;
    modelSelection: ModelSelection | null;
    images?: readonly DraftImage[];
  }) {
    return this.act(async () => {
      const socket = this.socket;
      if (!socket) throw new Error("Not connected to T3 Code.");
      const project = this.shell.projects.get(input.projectId);
      const modelSelection = input.modelSelection ?? project?.defaultModelSelection ?? null;
      if (!modelSelection) throw new Error("Choose a model first.");
      const firstLine = input.message.trim().split("\n")[0] || "Image attachment";
      return this.withImages(input.images ?? [], async (attachments) => {
        const result = await socket.call<{ threadId: string }>("orchestration.launchThread", {
          commandId: randomUUID(),
          creationSource: "web",
          projectId: input.projectId,
          title: firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine,
          generateTitle: true,
          modelSelection,
          runtimeMode: "full-access",
          interactionMode: "default",
          workspaceStrategy: { type: "root" },
          initialMessage: { messageId: randomUUID(), text: input.message, attachments },
        });
        return { threadId: result.threadId };
      });
    });
  }
}

function toRequest(threadId: string, item: RawTurnItem): PendingRequest {
  if (item.type === "user_input_request") {
    return {
      threadId,
      requestId: item.requestId ?? "",
      kind: "question",
      title: item.title ?? null,
      detail: null,
      decisions: [],
      questions: (item.questions ?? []).map((question) => ({
        id: question.id,
        header: question.header ?? null,
        question: question.question,
        options: (question.options ?? []).map((option) => ({
          label: option.label,
          value: option.value ?? option.label,
          description: option.description ?? null,
        })),
        multiSelect: question.multiSelect === true,
        allowCustomAnswer: question.allowCustomAnswer === true,
      })),
    };
  }
  return {
    threadId,
    requestId: item.requestId ?? "",
    kind: "approval",
    title: item.prompt ?? item.title ?? null,
    detail: item.reason ?? null,
    decisions:
      item.options && item.options.length > 0
        ? item.options.map((option) => ({
            decision: option.decision,
            label: option.label,
            warning: option.warning ?? null,
          }))
        : [
            { decision: "accept", label: "Approve", warning: null },
            { decision: "decline", label: "Decline", warning: null },
          ],
    questions: [],
  };
}
