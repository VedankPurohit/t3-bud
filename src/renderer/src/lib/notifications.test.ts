import { describe, expect, it } from "vitest";
import type { CompanionState, ThreadSummary } from "@shared/types";

import {
  collectThreadNotices,
  emptyNotificationTracker,
  enqueueThreadNotices,
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
      collectThreadNotices(
        next.tracker,
        state([thread("c", { pendingRequestCount: 1, pendingRequestKey: "another-approval" })]),
      ).notices[0]?.kind,
    ).toBe("attention");
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
