import type {
  ActionResult,
  CompanionState,
  Connection,
  ModelSelection,
  OrganizeAction,
  ProjectSummary,
  Provider,
  ThreadDetail,
  ThreadItem,
  ThreadStatus,
} from "../shared/types";
import { WORKING_STATUSES, isWorking } from "../shared/types";
import { config } from "./config";
import { buildInbox, nextFresh, type RawThread } from "./inbox";
import { McpAuthError, McpToolError, T3McpClient } from "./mcp";

const RECENT_LIMIT = 40;
const SHELF_LIMIT = 25;
const POLL_FOREGROUND_MS = 2_500;
const POLL_BACKGROUND_MS = 5_000;
const SHELF_EVERY_MS = 30_000;
const CATALOG_EVERY_MS = 5 * 60_000;
const DETAIL_ACTIVE_MS = 1_200;
const DETAIL_IDLE_MS = 6_000;
const DETAIL_PAGE = 100;
const DETAIL_MAX_CHARS = 30_000;

interface ListResult {
  readonly threads: RawThread[];
  readonly total: number;
}

interface ReadResult {
  readonly thread: RawThread & { readonly pendingRequestCount: number };
  readonly items: ReadonlyArray<ThreadItem & { readonly textTruncated?: boolean }>;
  readonly nextPosition: number | null;
  readonly hasMore: boolean;
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";

/** Polls T3 Code over MCP and keeps the companion's view of it. */
export class CompanionStore {
  private client: T3McpClient | null = null;
  private connection: Connection = { state: "unconfigured", suggestedUrl: null };
  private environmentId: string | null = null;
  private recent: RawThread[] = [];
  private recentTotal = 0;
  private working: RawThread[] = [];
  private snoozed: RawThread[] = [];
  private settled: RawThread[] = [];
  private pending = new Map<string, number>();
  private fresh = config.fresh();
  private previouslyWorking: Set<string> | null = null;
  private projects: ProjectSummary[] = [];
  private providers: Provider[] = [];
  private lastShelvesAt = 0;
  private lastCatalogAt = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private foreground = false;
  private detail: ThreadDetail | null = null;
  private detailTimer: ReturnType<typeof setTimeout> | null = null;
  private detailGeneration = 0;

  constructor(
    private readonly emit: (state: CompanionState) => void,
    private readonly emitDetail: (detail: ThreadDetail) => void,
  ) {}

  state(): CompanionState {
    const sections = buildInbox({
      recent: this.recent,
      working: this.working,
      snoozed: this.snoozed,
      settled: this.settled,
      pending: this.pending,
      fresh: this.fresh,
    });
    return {
      connection: this.connection,
      environmentId: this.environmentId,
      ...sections,
      inboxTotal: this.recentTotal,
      projects: this.projects,
      providers: this.providers,
    };
  }

  private publish() {
    this.emit(this.state());
  }

  private setConnection(connection: Connection) {
    this.connection = connection;
    this.publish();
  }

  /** Starts with the saved sign-in, or reports what is needed to connect. */
  start(suggestedUrl: string | null) {
    const auth = config.auth();
    if (!auth) {
      const serverUrl = config.serverUrl();
      this.setConnection(
        serverUrl
          ? { state: "needs-auth", serverUrl, reason: "Sign in again to keep using T3 Code." }
          : { state: "unconfigured", suggestedUrl },
      );
      return;
    }
    this.use(auth.serverUrl, auth.token);
  }

  use(serverUrl: string, token: string) {
    void this.client?.close();
    this.client = new T3McpClient(serverUrl, token);
    this.environmentId = null;
    this.previouslyWorking = null;
    this.lastShelvesAt = 0;
    this.lastCatalogAt = 0;
    this.setConnection({ state: "connected", serverUrl });
    this.schedule(0);
  }

  authorizing(serverUrl: string) {
    this.setConnection({ state: "authorizing", serverUrl });
  }

  signOut(suggestedUrl: string | null) {
    config.clearAuth();
    void this.client?.close();
    this.client = null;
    this.stopTimer();
    this.recent = [];
    this.working = [];
    this.snoozed = [];
    this.settled = [];
    this.setConnection({ state: "unconfigured", suggestedUrl });
  }

  setForeground(foreground: boolean) {
    if (this.foreground === foreground) return;
    this.foreground = foreground;
    if (foreground) this.schedule(0);
  }

  private stopTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private schedule(delay: number) {
    this.stopTimer();
    this.timer = setTimeout(() => void this.poll(), delay);
  }

  private async poll() {
    const client = this.client;
    if (!client) return;
    try {
      await this.refresh(client);
      if (this.connection.state !== "connected" && this.client === client) {
        this.connection = { state: "connected", serverUrl: this.serverUrl() };
      }
      this.publish();
    } catch (error) {
      if (this.client !== client) return;
      if (error instanceof McpAuthError) {
        config.clearAuth();
        this.client = null;
        this.setConnection({ state: "needs-auth", serverUrl: this.serverUrl(), reason: error.message });
        return;
      }
      this.setConnection({ state: "offline", serverUrl: this.serverUrl(), error: errorMessage(error) });
    }
    if (this.client === client) {
      this.schedule(this.foreground ? POLL_FOREGROUND_MS : POLL_BACKGROUND_MS);
    }
  }

  private serverUrl() {
    return "serverUrl" in this.connection ? this.connection.serverUrl : (config.serverUrl() ?? "");
  }

  private async refresh(client: T3McpClient) {
    const now = Date.now();
    const shelvesDue = now - this.lastShelvesAt >= SHELF_EVERY_MS;
    const catalogDue = now - this.lastCatalogAt >= CATALOG_EVERY_MS;
    const [recent, working, snoozed, settled, environment, projects, capabilities] =
      await Promise.all([
        client.call<ListResult>("t3_thread_list", {
          allProjects: true,
          settled: false,
          limit: RECENT_LIMIT,
        }),
        client.call<ListResult>("t3_thread_list", {
          allProjects: true,
          statuses: WORKING_STATUSES,
          limit: 100,
        }),
        shelvesDue
          ? client.call<ListResult>("t3_thread_list", {
              allProjects: true,
              snoozed: true,
              limit: SHELF_LIMIT,
            })
          : null,
        shelvesDue
          ? client.call<ListResult>("t3_thread_list", {
              allProjects: true,
              settled: true,
              limit: SHELF_LIMIT,
            })
          : null,
        this.environmentId === null
          ? client.call<{ environmentId: string }>("t3_environment_read")
          : null,
        catalogDue ? client.call<{ projects: ProjectSummary[] }>("t3_project_list") : null,
        catalogDue ? client.call<{ providers: Provider[] }>("orchestrator_capabilities") : null,
      ]);
    this.recent = recent.threads;
    this.recentTotal = recent.total;
    this.working = working.threads;
    if (snoozed) this.snoozed = snoozed.threads;
    if (settled) this.settled = settled.threads;
    if (shelvesDue) this.lastShelvesAt = now;
    if (environment) this.environmentId = environment.environmentId;
    if (projects) this.projects = projects.projects;
    if (capabilities) {
      this.providers = capabilities.providers
        .map((provider) => ({
          ...provider,
          models: (provider.models ?? []).map((model) => ({ ...model, options: model.options ?? [] })),
        }))
        .filter((provider) => provider.models.length > 0);
    }
    if (catalogDue) this.lastCatalogAt = now;

    // The list does not report approvals or questions; a one-item read of each working thread does.
    const pending = new Map<string, number>();
    await Promise.all(
      this.working.map(async (thread) => {
        const read = await client
          .call<ReadResult>("t3_thread_read", { threadId: thread.threadId, limit: 1, maxCharsPerItem: 1 })
          .catch(() => null);
        if (read && read.thread.pendingRequestCount > 0) {
          pending.set(thread.threadId, read.thread.pendingRequestCount);
        }
      }),
    );
    this.pending = pending;

    const fresh = nextFresh({
      fresh: this.fresh,
      previouslyWorking: this.previouslyWorking,
      working: this.working,
      recent: this.recent,
      settled: this.settled,
    });
    if (this.detail) fresh.delete(this.detail.threadId);
    if (fresh.size !== this.fresh.size || [...fresh].some((id) => !this.fresh.has(id))) {
      this.fresh = fresh;
      config.saveFresh(fresh);
    }
    this.previouslyWorking = new Set(this.working.map((thread) => thread.threadId));
  }

  // Thread detail: a full read when opened, then only new or still-changing messages.

  openThread(threadId: string | null) {
    this.detailGeneration += 1;
    if (this.detailTimer) clearTimeout(this.detailTimer);
    this.detailTimer = null;
    if (threadId === null) {
      this.detail = null;
      return;
    }
    if (this.fresh.delete(threadId)) {
      config.saveFresh(this.fresh);
      this.publish();
    }
    const known = [...this.recent, ...this.working, ...this.snoozed, ...this.settled].find(
      (thread) => thread.threadId === threadId,
    );
    this.detail = {
      threadId,
      title: known?.title ?? "Thread",
      status: known?.status ?? "idle",
      pendingRequestCount: this.pending.get(threadId) ?? 0,
      providerInstanceId: known?.providerInstanceId ?? null,
      model: known?.model ?? null,
      items: [],
      loading: true,
      error: null,
    };
    this.emitDetail(this.detail);
    void this.pollDetail(this.detailGeneration, true);
  }

  private async pollDetail(generation: number, full: boolean) {
    const client = this.client;
    const current = this.detail;
    if (!client || !current || generation !== this.detailGeneration) return;
    try {
      // Re-read from just before the first message that may still change.
      const unstable = current.items.findIndex((item) => item.status !== "completed");
      const from = full
        ? undefined
        : unstable === -1
          ? current.items.at(-1)?.position
          : current.items[unstable - 1]?.position;
      let afterPosition = from;
      let read: ReadResult;
      const fetched: ThreadItem[] = [];
      do {
        read = await client.call<ReadResult>("t3_thread_read", {
          threadId: current.threadId,
          view: "messages",
          limit: DETAIL_PAGE,
          maxCharsPerItem: DETAIL_MAX_CHARS,
          ...(afterPosition === undefined ? {} : { afterPosition }),
        });
        fetched.push(...read.items.map(toItem));
        afterPosition = read.nextPosition ?? afterPosition;
      } while (read.hasMore && read.items.length > 0);
      if (generation !== this.detailGeneration) return;
      const kept =
        from === undefined ? [] : current.items.filter((item) => item.position <= from);
      const byId = new Map<string, ThreadItem>();
      for (const item of [...kept, ...fetched]) byId.set(item.itemId, item);
      this.detail = {
        ...current,
        title: read.thread.title,
        status: read.thread.status,
        pendingRequestCount: read.thread.pendingRequestCount,
        providerInstanceId: read.thread.providerInstanceId,
        model: read.thread.model,
        items: [...byId.values()].toSorted((left, right) => left.position - right.position),
        loading: false,
        error: null,
      };
    } catch (error) {
      if (generation !== this.detailGeneration) return;
      this.detail = { ...current, loading: false, error: errorMessage(error) };
    }
    this.emitDetail(this.detail);
    const delay = isWorking(this.detail.status) ? DETAIL_ACTIVE_MS : DETAIL_IDLE_MS;
    this.detailTimer = setTimeout(() => void this.pollDetail(generation, false), delay);
  }

  private refreshSoon() {
    this.schedule(150);
    if (this.detail) {
      if (this.detailTimer) clearTimeout(this.detailTimer);
      const generation = this.detailGeneration;
      this.detailTimer = setTimeout(() => void this.pollDetail(generation, false), 150);
    }
  }

  // Actions

  private async act<T>(run: (client: T3McpClient) => Promise<T>): Promise<ActionResult<T>> {
    const client = this.client;
    if (!client) return { ok: false, error: "Not connected to T3 Code." };
    try {
      const value = await run(client);
      this.refreshSoon();
      return { ok: true, value };
    } catch (error) {
      if (error instanceof McpToolError) return { ok: false, error: error.message };
      return { ok: false, error: errorMessage(error) };
    }
  }

  send(threadId: string, message: string) {
    return this.act(async (client) => {
      await client.call("t3_thread_send", { threadId, message, mode: "auto" });
    });
  }

  launch(input: { projectId: string; message: string; modelSelection: ModelSelection | null }) {
    return this.act(async (client) => {
      const firstLine = input.message.trim().split("\n")[0] ?? "New thread";
      const result = await client.call<{ threadId: string }>("t3_thread_launch", {
        title: firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine,
        projectId: input.projectId,
        message: input.message,
        ...(input.modelSelection ? { modelSelection: input.modelSelection } : {}),
      });
      return { threadId: result.threadId };
    });
  }

  organize(threadId: string, action: OrganizeAction, snoozedUntil?: string) {
    return this.act(async (client) => {
      await client.call("t3_thread_organize", {
        threadId,
        action,
        ...(snoozedUntil ? { snoozedUntil } : {}),
      });
      if (action === "settle" && this.fresh.delete(threadId)) config.saveFresh(this.fresh);
    });
  }

  configure(threadId: string, modelSelection: ModelSelection) {
    return this.act(async (client) => {
      await client.call("t3_thread_configure", { threadId, modelSelection });
    });
  }

  interrupt(threadId: string) {
    return this.act(async (client) => {
      await client.call("t3_thread_interrupt", { threadId });
    });
  }
}

function toItem(item: ReadResult["items"][number]): ThreadItem {
  return {
    itemId: item.itemId,
    position: item.position,
    type: item.type,
    text: item.text ?? "",
    status: item.status,
    createdBy: item.createdBy,
    updatedAt: item.updatedAt,
  };
}

export type { ThreadStatus };
