import { isWorking, type CompanionState, type ThreadSummary } from "../../../shared/types";

export function activityStatus(thread: ThreadSummary) {
  if (thread.pendingRequestCount > 0) return { label: "Needs you", tone: "attention" } as const;
  if (thread.status === "failed") return { label: "Failed", tone: "failed" } as const;
  if (isWorking(thread.status)) {
    const label =
      thread.status === "queued"
        ? "Queued"
        : thread.status === "preparing"
          ? "Preparing"
          : thread.status === "starting"
            ? "Starting"
            : thread.status === "waiting"
              ? "Waiting"
              : "Working";
    return { label, tone: "working" } as const;
  }
  return { label: "Finished", tone: "done" } as const;
}

const recent = (thread: ThreadSummary) =>
  Date.parse(
    isWorking(thread.status) ? thread.updatedAt : (thread.latestRunCompletedAt ?? thread.updatedAt),
  ) || 0;

export const activityHeight = (rowCount: number) =>
  108 + Math.max(0, Math.min(rowCount, 3) - 2) * 35;

export function selectHoverThreads(state: Pick<CompanionState, "inbox" | "working">) {
  const threads = [
    ...new Map(
      [...state.inbox, ...state.working].map((thread) => [thread.threadId, thread]),
    ).values(),
  ].filter((thread) => !thread.snoozed && !thread.settled);
  const newest = (items: ThreadSummary[]) => items.toSorted((a, b) => recent(b) - recent(a));
  const attention = newest(threads.filter((thread) => thread.pendingRequestCount > 0));
  const failed = newest(threads.filter((thread) => thread.unread && thread.status === "failed"));
  const completed = newest(
    threads.filter((thread) => thread.unread && thread.status === "completed"),
  );
  const working = newest(threads.filter((thread) => isWorking(thread.status)));
  const primary =
    attention[0] ??
    failed[0] ??
    completed[0] ??
    working[0] ??
    newest(threads.filter((thread) => thread.status === "completed"))[0];
  if (!primary) return [];
  const active = working.filter((thread) => thread.threadId !== primary.threadId);
  if (active.length) return [primary, ...active];
  const secondary = [...working, ...attention, ...failed, ...completed].find(
    (thread) => thread.threadId !== primary.threadId,
  );
  return secondary ? [primary, secondary] : [primary];
}
