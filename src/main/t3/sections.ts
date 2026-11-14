import type { ThreadStatus, ThreadSummary } from "../../shared/types";
import {
  isListed,
  isSnoozed,
  isUnread,
  isWorkingStatus,
  pendingByListedThread,
  type ShellState,
} from "./shell";

const INBOX_LIMIT = 80;
const SETTLED_LIMIT = 25;

const time = (iso: string | null | undefined) => (iso ? Date.parse(iso) : 0);

/**
 * Splits the live thread list the way T3 Code's sidebar does: snoozed wins, then settled, then
 * working, and the rest is the inbox. Threads that need the user lead the inbox, then unread ones.
 */
export function buildSections(
  shell: ShellState,
  now: number,
  limits = { inbox: INBOX_LIMIT, settled: SETTLED_LIMIT },
) {
  const pending = pendingByListedThread(shell.threads);
  const inbox: ThreadSummary[] = [];
  const working: ThreadSummary[] = [];
  const snoozed: ThreadSummary[] = [];
  const settled: ThreadSummary[] = [];
  for (const thread of shell.threads.values()) {
    if (!isListed(thread)) continue;
    const summary: ThreadSummary = {
      threadId: thread.id,
      projectId: thread.projectId,
      title: thread.title,
      status: thread.status as ThreadStatus,
      settled: thread.settledOverride === "settled",
      snoozed: isSnoozed(thread, now),
      snoozedUntil: thread.snoozedUntil ?? null,
      providerInstanceId: thread.modelSelection?.instanceId ?? thread.providerInstanceId ?? null,
      model: thread.modelSelection?.model ?? null,
      runtimeMode: null,
      createdBy: thread.createdBy ?? "user",
      updatedAt: thread.updatedAt,
      pendingRequestCount: pending.get(thread.id)?.count ?? 0,
      unread: isUnread(thread),
      latestRunCompletedAt: thread.latestRunCompletedAt ?? null,
      pendingRequestKey:
        pending
          .get(thread.id)
          ?.threadIds.map((id) => shell.threads.get(id)?.pendingRuntimeRequest?.id ?? id)
          .sort()
          .join(":") ?? null,
    };
    if (summary.snoozed) snoozed.push(summary);
    else if (summary.settled) settled.push(summary);
    else if (isWorkingStatus(thread.status)) working.push(summary);
    else inbox.push(summary);
  }
  const rank = (thread: ThreadSummary) =>
    thread.pendingRequestCount > 0 || thread.status === "failed" ? 0 : thread.unread ? 1 : 2;
  const byRecent = (left: ThreadSummary, right: ThreadSummary) =>
    time(right.updatedAt) - time(left.updatedAt);
  inbox.sort((left, right) => rank(left) - rank(right) || byRecent(left, right));
  working.sort((left, right) => rank(left) - rank(right) || byRecent(left, right));
  snoozed.sort((left, right) => time(left.snoozedUntil) - time(right.snoozedUntil));
  settled.sort(byRecent);
  return {
    inbox: inbox.slice(0, limits.inbox),
    inboxTotal: inbox.length,
    working,
    snoozed,
    settled: settled.slice(0, limits.settled),
  };
}
