import type { ProjectIcon } from "../../shared/types";

/** The thread list, kept live from `orchestration.subscribeShell`. Mirrors T3 Code's shellReducer. */

export interface RawProject {
  readonly id: string;
  readonly title: string;
  readonly workspaceRoot: string;
  readonly archivedAt?: string | null;
  readonly defaultModelSelection?: RawModelSelection | null;
  readonly faviconPath?: string | null;
  readonly projectIcon?: ProjectIcon | null;
}

export interface RawModelSelection {
  readonly instanceId: string;
  readonly model: string;
  readonly options?: ReadonlyArray<{ readonly id: string; readonly value: string | boolean }>;
}

export interface RawThreadShell {
  readonly id: string;
  readonly projectId: string;
  readonly title: string;
  readonly status: string;
  readonly createdBy?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly latestRunCompletedAt?: string | null;
  readonly pendingRuntimeRequest?: { readonly id: string; readonly kind: string } | null;
  readonly settledOverride?: "settled" | "active" | null;
  readonly settledAt?: string | null;
  readonly snoozedUntil?: string | null;
  readonly pinnedAt?: string | null;
  readonly lastVisitedAt?: string | null;
  readonly modelSelection?: RawModelSelection | null;
  readonly providerInstanceId?: string | null;
  readonly lineage?: {
    readonly parentThreadId?: string | null;
    readonly relationshipToParent?: string | null;
    readonly sideChat?: boolean;
  } | null;
  readonly archivedAt?: string | null;
  readonly deletedAt?: string | null;
}

export interface ShellState {
  readonly sequence: number;
  readonly projects: ReadonlyMap<string, RawProject>;
  readonly threads: ReadonlyMap<string, RawThreadShell>;
  readonly synchronized: boolean;
}

export const emptyShell: ShellState = {
  sequence: -1,
  projects: new Map(),
  threads: new Map(),
  synchronized: false,
};

type ShellItem =
  | {
      kind: "snapshot";
      snapshot: { snapshotSequence: number; threads: RawThreadShell[]; projects: RawProject[] };
      resolvedRepositoryIdentityRoots?: unknown;
    }
  | { kind: "synchronized" }
  | { kind: "snapshot-required" }
  | { kind: "project.updated"; sequence: number; project: RawProject }
  | { kind: "project.removed"; sequence: number; projectId: string }
  | {
      kind: "thread.updated";
      sequence: number;
      location: "active" | "archive";
      thread: RawThreadShell;
    }
  | { kind: "thread.removed"; sequence: number; threadId: string }
  | { kind: string; sequence?: number };

export function applyShellItem(state: ShellState, value: unknown): ShellState {
  const item = value as ShellItem;
  if (item.kind === "snapshot" && "snapshot" in item) {
    // A snapshot carrying resolved repository roots only enriches projects; its thread list is
    // empty, so replacing state with it would wipe the inbox.
    if (item.resolvedRepositoryIdentityRoots !== undefined) return state;
    return {
      sequence: item.snapshot.snapshotSequence,
      projects: new Map(item.snapshot.projects.map((project) => [project.id, project])),
      threads: new Map(item.snapshot.threads.map((thread) => [thread.id, thread])),
      synchronized: state.synchronized,
    };
  }
  if (item.kind === "synchronized") return { ...state, synchronized: true };
  if (!("sequence" in item) || typeof item.sequence !== "number" || item.sequence <= state.sequence)
    return state;
  const next = { ...state, sequence: item.sequence };
  switch (item.kind) {
    case "project.updated": {
      const projects = new Map(state.projects);
      const { project } = item as { project: RawProject };
      projects.set(project.id, project);
      return { ...next, projects };
    }
    case "project.removed": {
      const projects = new Map(state.projects);
      projects.delete((item as { projectId: string }).projectId);
      return { ...next, projects };
    }
    case "thread.updated": {
      const { location, thread } = item as { location: string; thread: RawThreadShell };
      const threads = new Map(state.threads);
      if (location === "active") threads.set(thread.id, thread);
      else threads.delete(thread.id);
      return { ...next, threads };
    }
    case "thread.removed": {
      const threads = new Map(state.threads);
      threads.delete((item as { threadId: string }).threadId);
      return { ...next, threads };
    }
    default:
      // Unknown kinds come from newer servers; skipping them keeps the list usable.
      return next;
  }
}

const WORKING = new Set(["preparing", "queued", "starting", "running", "waiting"]);
export const isWorkingStatus = (status: string) => WORKING.has(status);

/** Subagents, side chats, archived and deleted threads stay out of the inbox, as in T3 Code. */
export function isListed(thread: RawThreadShell) {
  return (
    thread.lineage?.relationshipToParent !== "subagent" &&
    thread.lineage?.sideChat !== true &&
    !thread.archivedAt &&
    !thread.deletedAt
  );
}

/** T3 Code's unread rule: a run finished after the last visit, or a failure never seen. */
export function isUnread(thread: RawThreadShell) {
  const completed = thread.latestRunCompletedAt
    ? Date.parse(thread.latestRunCompletedAt)
    : Number.NaN;
  if (Number.isNaN(completed)) return false;
  if (thread.status === "failed")
    return !thread.lastVisitedAt || completed > Date.parse(thread.lastVisitedAt);
  return !!thread.lastVisitedAt && completed > Date.parse(thread.lastVisitedAt);
}

export const isSnoozed = (thread: RawThreadShell, now: number) =>
  !!thread.snoozedUntil && Date.parse(thread.snoozedUntil) > now;

/**
 * Requests waiting on the user, rolled up from subagents and side chats to the listed thread they
 * belong to. Subagents roll up approvals only (their coordinator answers questions).
 */
export function pendingByListedThread(threads: ReadonlyMap<string, RawThreadShell>) {
  const pending = new Map<string, { count: number; threadIds: string[] }>();
  for (const thread of threads.values()) {
    const request = thread.pendingRuntimeRequest;
    if (!request || request.kind === "auth_refresh") continue;
    let target: RawThreadShell | undefined = thread;
    const isSubagent = thread.lineage?.relationshipToParent === "subagent";
    if (isSubagent && request.kind === "user_input") continue;
    while (target && !isListed(target) && target.lineage?.parentThreadId) {
      target = threads.get(target.lineage.parentThreadId);
    }
    if (!target || !isListed(target)) continue;
    const entry = pending.get(target.id) ?? { count: 0, threadIds: [] };
    entry.count += 1;
    entry.threadIds.push(thread.id);
    pending.set(target.id, entry);
  }
  return pending;
}
