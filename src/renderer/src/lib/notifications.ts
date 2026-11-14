import { isWorking, type CompanionState, type ThreadSummary } from "../../../shared/types";

export interface ThreadNotice {
  readonly id: string;
  readonly kind: "completed" | "failed" | "attention" | "preview";
  readonly thread: ThreadSummary | null;
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
  for (const notice of incoming) byId.set(notice.id, notice);
  return [...byId.values()].slice(-20);
}
