import { describe, expect, it } from "vitest";
import type { CompanionState, ThreadSummary } from "@shared/types";

import {
  collectThreadNotices,
  emptyNotificationTracker,
  enqueueThreadNotices,
  dismissThreadNotices,
  summarizeThreadNotices,
  threadNoticeIds,
} from "./notifications";

const thread = (id: string, overrides: Partial<ThreadSummary> = {}): ThreadSummary => ({
  threadId: id,
  projectId: "project",
  title: id,
  status: "running",
  settled: false,
  snoozed: false,
  snoozedUntil: null,
  providerInstanceId: "codex",
  model: "test",
  runtimeMode: null,
  createdBy: "user",
  updatedAt: "2026-11-14T00:00:00Z",
  pendingRequestCount: 0,
  unread: false,
  ...overrides,
});

const state = (
  threads: ThreadSummary[],
  overrides: Partial<CompanionState> = {},
): CompanionState => ({
  connection: { state: "connected", serverUrl: "http://test" },
  environmentId: "env",
  inbox: threads.filter((item) => item.status !== "running"),
  working: threads.filter((item) => item.status === "running"),
  snoozed: [],
  settled: [],
  inboxTotal: threads.length,
  projects: [],
  providers: [],
  syncedAt: "2026-11-14T00:00:00Z",
  synchronized: true,
  ...overrides,
});

describe("thread notifications", () => {
  it("notifies on every completed run, even while the same thread remains unread", () => {
    let tracker = collectThreadNotices(emptyNotificationTracker, state([thread("a")])).tracker;
    const finished = thread("a", {
      status: "completed",
      unread: true,
      latestRunCompletedAt: "2026-11-14T01:00:00Z",
    });
    const first = collectThreadNotices(tracker, state([finished]));
    expect(first.notices.map((notice) => notice.thread?.threadId)).toEqual(["a"]);
    tracker = collectThreadNotices(
      first.tracker,
      state([{ ...finished, status: "running" }]),
    ).tracker;
    const second = collectThreadNotices(
      tracker,
      state([{ ...finished, latestRunCompletedAt: "2026-11-14T02:00:00Z" }]),
    );
    expect(second.notices.map((notice) => notice.thread?.threadId)).toEqual(["a"]);
    expect(enqueueThreadNotices(first.notices, [...first.notices, ...second.notices])).toHaveLength(
      2,
    );
    expect(
      collectThreadNotices(
        second.tracker,
        state([{ ...finished, latestRunCompletedAt: "2026-11-14T02:00:00Z" }]),
      ).notices,
    ).toEqual([]);
  });

  it("keeps simultaneous completion, failure, and approval notices", () => {
    const baseline = collectThreadNotices(
      emptyNotificationTracker,
      state([thread("a"), thread("b"), thread("c")]),
    ).tracker;
    const next = collectThreadNotices(
      baseline,
      state([
        thread("a", { status: "completed", latestRunCompletedAt: "2026-11-14T01:00:00Z" }),
        thread("b", { status: "failed", latestRunCompletedAt: "2026-11-14T01:00:00Z" }),
        thread("c", { pendingRequestCount: 1, pendingRequestKey: "approval" }),
      ]),
    );
    expect(next.notices.map((notice) => [notice.thread?.threadId, notice.kind])).toEqual([
      ["a", "completed"],
      ["b", "failed"],
      ["c", "attention"],
    ]);
    expect(
      dismissThreadNotices(next.notices, [next.notices[1]!.id]).map(
        (notice) => notice.thread?.threadId,
      ),
    ).toEqual(["a", "c"]);
    const arrivedDuringDismissal = { ...next.notices[0]!, id: "new-completion" };
    expect(
      dismissThreadNotices(
        enqueueThreadNotices(next.notices, [arrivedDuringDismissal]),
        next.notices.map((notice) => notice.id),
      ),
    ).toEqual([arrivedDuringDismissal]);
    const repeated = { ...next.notices[0]!, id: "another-run-for-a" };
    const batch = [...next.notices, repeated];
    const summary = summarizeThreadNotices(batch);
    expect(summary.items.map((notice) => notice.id)).toEqual([
      repeated.id,
      next.notices[1]!.id,
      next.notices[2]!.id,
    ]);
    expect(summary.message).toBe("1 thread finished · 1 failed · 1 needs you");
    expect(summary.kind).toBe("attention");
    expect(threadNoticeIds(batch, repeated.id)).toEqual([next.notices[0]!.id, repeated.id]);
    expect(
      collectThreadNotices(
        next.tracker,
        state([thread("c", { pendingRequestCount: 1, pendingRequestKey: "another-approval" })]),
      ).notices[0]?.kind,
    ).toBe("attention");
  });

  it("shows a renewed approval after a completion when the approval ID is reused", () => {
    const baseline = collectThreadNotices(emptyNotificationTracker, state([thread("a")]));
    const approval = collectThreadNotices(baseline.tracker, state([thread("a", { pendingRequestCount: 1 })]));
    const completion = collectThreadNotices(approval.tracker, state([thread("a", {
      status: "completed", latestRunCompletedAt: "2026-11-14T01:00:00Z",
    })]));
    const renewed = collectThreadNotices(completion.tracker, state([thread("a", { pendingRequestCount: 1 })]));
    expect(renewed.notices[0]!.id).toBe(approval.notices[0]!.id);
    const queue = enqueueThreadNotices(
      enqueueThreadNotices(approval.notices, completion.notices), renewed.notices,
    );
    expect(queue.at(-1)).toBe(renewed.notices[0]);
    expect(summarizeThreadNotices(queue)).toMatchObject({
      kind: "attention", message: "1 needs you", items: renewed.notices,
    });
  });

  it("ignores startup backlog and baselines a different paired environment", () => {
    const initial = collectThreadNotices(
      emptyNotificationTracker,
      state([], { synchronized: false, syncedAt: null }),
    ).tracker;
    const backlog = state([
      thread("old", {
        status: "completed",
        unread: true,
        latestRunCompletedAt: "2026-11-13T00:00:00Z",
      }),
    ]);
    const synced = collectThreadNotices(initial, backlog);
    expect(synced.notices).toEqual([]);
    expect(
      collectThreadNotices(synced.tracker, {
        ...backlog,
        environmentId: "other",
        inbox: [thread("other-old", { status: "completed", unread: true })],
      }).notices,
    ).toEqual([]);
  });
});
