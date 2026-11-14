import { describe, expect, it } from "vitest";
import type { ThreadSummary } from "../../../shared/types";
import { activityHeight, activityStatus, selectHoverThreads } from "./activity";

const thread = (threadId: string, overrides: Partial<ThreadSummary> = {}): ThreadSummary => ({
  threadId,
  projectId: "p",
  title: threadId,
  status: "completed",
  settled: false,
  snoozed: false,
  snoozedUntil: null,
  providerInstanceId: "codex",
  model: "test",
  runtimeMode: null,
  createdBy: "user",
  updatedAt: "2026-11-14T12:00:00Z",
  pendingRequestCount: 0,
  unread: false,
  ...overrides,
});

describe("hover activity", () => {
  it("shows the latest unread completion alongside active work instead of two finished threads", () => {
    const older = thread("old", { unread: true, latestRunCompletedAt: "2026-11-13T12:00:00Z" });
    const latest = thread("latest", { unread: true, latestRunCompletedAt: "2026-11-14T12:00:00Z" });
    const active = thread("active", { status: "running" });
    expect(
      selectHoverThreads({ inbox: [older, latest], working: [active] }).map(
        (item) => item.threadId,
      ),
    ).toEqual(["latest", "active"]);
    expect(activityStatus(active)).toEqual({ label: "Working", tone: "working" });
    expect(activityStatus(latest)).toEqual({ label: "Finished", tone: "done" });
  });
  it("prioritizes blocked work, avoids duplicate rows, and reports waiting and queued states truthfully", () => {
    const blocked = thread("blocked", { status: "running", pendingRequestCount: 1 });
    const waiting = thread("waiting", { status: "waiting" });
    expect(
      selectHoverThreads({ inbox: [blocked], working: [blocked, waiting] }).map(
        (item) => item.threadId,
      ),
    ).toEqual(["blocked", "waiting"]);
    expect(activityStatus(blocked)).toEqual({ label: "Needs you", tone: "attention" });
    expect(activityStatus(waiting).label).toBe("Waiting");
    expect(activityStatus(thread("queued", { status: "queued" })).label).toBe("Queued");
    const third = thread("third", { status: "running" });
    expect(
      selectHoverThreads({ inbox: [blocked], working: [blocked, waiting, third] }).map(
        (item) => item.threadId,
      ),
    ).toEqual(["blocked", "waiting", "third"]);
    expect(
      selectHoverThreads({
        inbox: [blocked],
        working: [blocked, waiting, third, thread("fourth", { status: "running" })],
      }).map((item) => item.threadId),
    ).toEqual(["blocked", "waiting", "third", "fourth"]);
    expect(activityHeight(1)).toBe(108);
    expect(activityHeight(3)).toBe(143);
    expect(activityHeight(8)).toBe(143);
  });
  it("does not label canceled work as finished or surface snoozed and settled threads", () => {
    const canceled = thread("canceled", { status: "cancelled", unread: true });
    expect(
      selectHoverThreads({
        inbox: [
          canceled,
          thread("snoozed", { snoozed: true }),
          thread("settled", { settled: true }),
        ],
        working: [],
      }),
    ).toEqual([]);
    expect(
      selectHoverThreads({ inbox: [thread("read")], working: [] }).map((item) => item.threadId),
    ).toEqual(["read"]);
  });
});
