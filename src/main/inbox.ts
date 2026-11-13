import { isWorking, type ThreadStatus, type ThreadSummary } from "../shared/types";

/** A thread as `t3_thread_list` returns it. */
export interface RawThread {
  readonly threadId: string;
  readonly projectId: string;
  readonly title: string;
  readonly status: ThreadStatus;
  readonly settled: boolean;
  readonly snoozed: boolean;
  readonly snoozedUntil: string | null;
  readonly providerInstanceId: string | null;
  readonly model: string | null;
  readonly runtimeMode: string | null;
  readonly createdBy: string;
  readonly updatedAt: string;
  readonly parentThreadId: string | null;
}

export interface InboxInput {
  /** The newest unsettled threads. */
  readonly recent: readonly RawThread[];
  /** Every thread in a working status. */
  readonly working: readonly RawThread[];
  readonly snoozed: readonly RawThread[];
  readonly settled: readonly RawThread[];
  readonly pending: ReadonlyMap<string, number>;
  readonly fresh: ReadonlySet<string>;
}

const summarize =
  (input: Pick<InboxInput, "pending" | "fresh">) =>
  (thread: RawThread): ThreadSummary => ({
    threadId: thread.threadId,
    projectId: thread.projectId,
    title: thread.title,
    status: thread.status,
    settled: thread.settled,
    snoozed: thread.snoozed,
    snoozedUntil: thread.snoozedUntil,
    providerInstanceId: thread.providerInstanceId,
    model: thread.model,
    runtimeMode: thread.runtimeMode,
    createdBy: thread.createdBy,
    updatedAt: thread.updatedAt,
    pendingRequestCount: input.pending.get(thread.threadId) ?? 0,
    fresh: input.fresh.has(thread.threadId),
  });

const needsUser = (thread: ThreadSummary) =>
  thread.pendingRequestCount > 0 || thread.status === "failed";

/**
 * Splits threads the way T3 Code's sidebar does: snoozed wins, then settled, then working, and
 * the rest is the inbox. Threads waiting on the user lead the inbox, then fresh finishes.
 */
export function buildInbox(input: InboxInput) {
  const toSummary = summarize(input);
  const topLevel = (thread: RawThread) => thread.parentThreadId === null;
  const working = input.working
    .filter((thread) => topLevel(thread) && !thread.snoozed && !thread.settled)
    .map(toSummary);
  const workingIds = new Set(working.map((thread) => thread.threadId));
  const inbox = input.recent
    .filter(
      (thread) =>
        topLevel(thread) &&
        !thread.snoozed &&
        !thread.settled &&
        !isWorking(thread.status) &&
        !workingIds.has(thread.threadId),
    )
    .map(toSummary);
  const rank = (thread: ThreadSummary) => (needsUser(thread) ? 0 : thread.fresh ? 1 : 2);
  return {
    inbox: inbox.toSorted((left, right) => rank(left) - rank(right)),
    working: working.toSorted((left, right) => rank(left) - rank(right)),
    snoozed: input.snoozed.filter(topLevel).map(toSummary),
    settled: input.settled.filter(topLevel).map(toSummary),
  };
}

/**
 * Threads that stopped working since the last poll become fresh; opening, settling, or a new run
 * clears them. Only finishes the companion saw count, so a first launch starts quiet.
 */
export function nextFresh(input: {
  readonly fresh: ReadonlySet<string>;
  readonly previouslyWorking: ReadonlySet<string> | null;
  readonly working: readonly RawThread[];
  readonly recent: readonly RawThread[];
  readonly settled: readonly RawThread[];
}): Set<string> {
  const workingIds = new Set(input.working.map((thread) => thread.threadId));
  const settledIds = new Set(input.settled.map((thread) => thread.threadId));
  const fresh = new Set(
    [...input.fresh].filter((id) => !workingIds.has(id) && !settledIds.has(id)),
  );
  for (const thread of input.recent) {
    if (thread.settled) fresh.delete(thread.threadId);
  }
  if (input.previouslyWorking === null) return fresh;
  const recentById = new Map(input.recent.map((thread) => [thread.threadId, thread]));
  for (const id of input.previouslyWorking) {
    if (workingIds.has(id)) continue;
    const thread = recentById.get(id);
    if (thread && !thread.settled && !thread.snoozed) fresh.add(id);
  }
  return fresh;
}
