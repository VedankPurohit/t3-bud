import { isWorking, type CompanionState, type ThreadSummary } from "../../../shared/types";

export interface ThreadNotice {
  readonly id: string;
  readonly kind: "completed" | "failed" | "attention" | "preview";
  readonly thread: ThreadSummary | null;
}

export function describeThreadNotice(notice: ThreadNotice) {
  const thread = notice.thread;
  const kind =
    notice.kind === "preview" && (thread?.status === "completed" || thread?.status === "failed")
      ? thread.status
      : notice.kind;
  const title = thread?.title ?? "Your thread updates appear here";
  const message =
    kind === "completed"
      ? `${title} is done`
      : kind === "failed"
        ? `${title} ran into a problem`
        : kind === "attention"
          ? `${title} needs your input`
          : title;
  return { kind, title, message };
}

export interface NotificationTracker {
  readonly environmentId: string | null;
  readonly threads: ReadonlyMap<string, ThreadSummary> | null;
  readonly latestCompletion: number;
}

export const emptyNotificationTracker: NotificationTracker = {
  environmentId: null,
  threads: null,
  latestCompletion: 0,
};
const completedAt = (thread: ThreadSummary) =>
  thread.latestRunCompletedAt ? Date.parse(thread.latestRunCompletedAt) || 0 : 0;
const requestKey = (thread: ThreadSummary) =>
  thread.pendingRequestKey ||
  (thread.pendingRequestCount > 0 ? String(thread.pendingRequestCount) : null);

export function collectThreadNotices(tracker: NotificationTracker, state: CompanionState) {
  if (state.connection.state !== "connected" || state.synchronized === false || !state.syncedAt) {
    return { tracker, notices: [] as ThreadNotice[] };
  }
  const threads = [...state.inbox, ...state.working];
  const latestCompletion = Math.max(
    tracker.environmentId === state.environmentId ? tracker.latestCompletion : 0,
    0,
    ...threads.map(completedAt),
  );
  const next = {
    environmentId: state.environmentId,
    threads: new Map(threads.map((thread) => [thread.threadId, thread])),
    latestCompletion,
  };
  if (tracker.threads === null || tracker.environmentId !== state.environmentId)
    return { tracker: next, notices: [] as ThreadNotice[] };

  const notices: ThreadNotice[] = [];
  for (const thread of threads) {
    if (thread.snoozed || thread.settled) continue;
    const previous = tracker.threads.get(thread.threadId);
    const request = requestKey(thread);
    if (request && (!previous || request !== requestKey(previous))) {
      notices.push({ id: `${thread.threadId}:attention:${request}`, kind: "attention", thread });
      continue;
    }
    const terminal = thread.status === "completed" || thread.status === "failed";
    const completion = completedAt(thread);
    const changed =
      completion > 0 &&
      (previous ? completion !== completedAt(previous) : completion > tracker.latestCompletion);
    const stopped = previous && isWorking(previous.status) && terminal;
    if (terminal && (changed || stopped)) {
      const kind = thread.status === "failed" ? "failed" : "completed";
      notices.push({
        id: `${thread.threadId}:${kind}:${thread.latestRunCompletedAt ?? thread.updatedAt}`,
        kind,
        thread,
      });
    }
  }
  return { tracker: next, notices };
}

export function enqueueThreadNotices(
  queue: readonly ThreadNotice[],
  incoming: readonly ThreadNotice[],
) {
  const byId = new Map(queue.map((notice) => [notice.id, notice]));
  for (const notice of incoming) {
    byId.delete(notice.id);
    byId.set(notice.id, notice);
  }
  return [...byId.values()].slice(-20);
}

export function dismissThreadNotices(queue: readonly ThreadNotice[], ids: readonly string[]) {
  const dismissed = new Set(ids);
  return queue.filter((notice) => !dismissed.has(notice.id));
}

export function threadNoticeIds(queue: readonly ThreadNotice[], id: string) {
  const threadId = queue.find((notice) => notice.id === id)?.thread?.threadId;
  return threadId
    ? queue.filter((notice) => notice.thread?.threadId === threadId).map((notice) => notice.id)
    : [id];
}

export function summarizeThreadNotices(queue: readonly ThreadNotice[]) {
  const items = [
    ...new Map(queue.map((notice) => [notice.thread?.threadId ?? notice.id, notice])).values(),
  ];
  const counts = { completed: 0, failed: 0, attention: 0, preview: 0 };
  for (const notice of items) counts[describeThreadNotice(notice).kind] += 1;
  const parts = [
    counts.completed
      ? `${counts.completed} thread${counts.completed === 1 ? "" : "s"} finished`
      : "",
    counts.failed ? `${counts.failed} failed` : "",
    counts.attention ? `${counts.attention} ${counts.attention === 1 ? "needs" : "need"} you` : "",
    counts.preview ? `${counts.preview} update${counts.preview === 1 ? "" : "s"}` : "",
  ].filter(Boolean);
  const kind = counts.attention
    ? "attention"
    : counts.failed
      ? "failed"
      : counts.completed
        ? "completed"
        : "preview";
  return { items, message: parts.join(" · "), kind } as const;
}

export function previewThreadNotices(
  state: Pick<CompanionState, "inbox" | "working">,
): ThreadNotice[] {
  const threads = [
    ...new Map(
      [...state.inbox, ...state.working].map((thread) => [thread.threadId, thread]),
    ).values(),
  ];
  const samples = threads.filter(
    (thread) => thread.status === "completed" || thread.status === "failed",
  );
  if (!threads.length) return [{ id: "preview:empty", kind: "preview", thread: null }];
  return (samples.length ? samples : threads).slice(0, 4).map(
    (thread): ThreadNotice => ({
      id: `preview:${thread.threadId}`,
      kind: "preview",
      thread,
    }),
  );
}
