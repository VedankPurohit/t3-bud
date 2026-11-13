import { describe, expect, it } from "vitest";

import { applyShellItem, emptyShell, isUnread, pendingByListedThread, type RawThreadShell } from "./shell";
import { applyThreadItem, emptyThreadStream, pendingRequests } from "./thread";

const shellThread = (id: string, overrides: Partial<RawThreadShell> = {}): RawThreadShell => ({
  id,
  projectId: "p",
  title: id,
  status: "completed",
  createdAt: "2026-11-13T00:00:00.000Z",
  updatedAt: "2026-11-13T00:00:00.000Z",
  ...overrides,
});

describe("shell reducer", () => {
  it("keeps the thread list through the enrichment snapshot and applies later deltas", () => {
    let state = applyShellItem(emptyShell, {
      kind: "snapshot",
      snapshot: { snapshotSequence: 10, threads: [shellThread("a"), shellThread("b")], projects: [] },
    });
    // The second snapshot only enriches projects and has no threads.
    state = applyShellItem(state, {
      kind: "snapshot",
      snapshot: { snapshotSequence: 10, threads: [], projects: [] },
      resolvedRepositoryIdentityRoots: [],
    });
    state = applyShellItem(state, { kind: "synchronized" });
    state = applyShellItem(state, { kind: "thread.updated", sequence: 11, location: "active", thread: shellThread("c") });
    state = applyShellItem(state, { kind: "thread.updated", sequence: 12, location: "archive", thread: shellThread("a") });
    state = applyShellItem(state, { kind: "thread.removed", sequence: 9, threadId: "b" });
    expect([...state.threads.keys()].sort()).toEqual(["b", "c"]);
    expect(state.synchronized).toBe(true);
    expect(state.sequence).toBe(12);
  });

  it("reads unread the way T3 Code does", () => {
    expect(isUnread(shellThread("x", { latestRunCompletedAt: "2026-11-13T02:00:00Z", lastVisitedAt: "2026-11-13T01:00:00Z" }))).toBe(true);
    expect(isUnread(shellThread("x", { latestRunCompletedAt: "2026-11-13T01:00:00Z", lastVisitedAt: "2026-11-13T02:00:00Z" }))).toBe(false);
    // A finished run never visited is not unread, but a never-seen failure is.
    expect(isUnread(shellThread("x", { latestRunCompletedAt: "2026-11-13T01:00:00Z" }))).toBe(false);
    expect(isUnread(shellThread("x", { status: "failed", latestRunCompletedAt: "2026-11-13T01:00:00Z" }))).toBe(true);
  });

  it("rolls subagent approvals up to the listed parent but leaves their questions to the coordinator", () => {
    const threads = new Map(
      [
        shellThread("parent"),
        shellThread("child", {
          lineage: { parentThreadId: "parent", relationshipToParent: "subagent" },
          pendingRuntimeRequest: { id: "r1", kind: "command" },
        }),
        shellThread("asker", {
          lineage: { parentThreadId: "parent", relationshipToParent: "subagent" },
          pendingRuntimeRequest: { id: "r2", kind: "user_input" },
        }),
      ].map((thread) => [thread.id, thread]),
    );
    expect(pendingByListedThread(threads).get("parent")).toEqual({ count: 1, threadIds: ["child"] });
  });
});

describe("thread reducer", () => {
  it("replaces streaming message text by id and finds pending requests", () => {
    let state = applyThreadItem(emptyThreadStream, "t", {
      kind: "snapshot",
      snapshotSequence: 1,
      projection: { thread: { id: "t" }, messages: [], turnItems: [], runtimeRequests: [] },
    });
    const message = (text: string, streaming: boolean) => ({
      kind: "event",
      sequence: 0,
      event: { threadId: "t", type: "message.updated", payload: { id: "m", role: "assistant", text, streaming, createdAt: "", updatedAt: "" } },
    });
    state = applyThreadItem(state, "t", { ...message("Hel", true), sequence: 2 });
    state = applyThreadItem(state, "t", { ...message("Hello there", false), sequence: 3 });
    expect(state.projection?.messages.map((m) => m.text)).toEqual(["Hello there"]);

    state = applyThreadItem(state, "t", {
      kind: "event",
      sequence: 4,
      event: { threadId: "t", type: "turn-item.updated", payload: { id: "i", type: "approval_request", requestId: "r", requestKind: "command" } },
    });
    state = applyThreadItem(state, "t", {
      kind: "event",
      sequence: 5,
      event: { threadId: "t", type: "runtime-request.updated", payload: { id: "r", status: "pending" } },
    });
    expect(pendingRequests(state.projection!).map((item) => item.requestId)).toEqual(["r"]);
    state = applyThreadItem(state, "t", {
      kind: "event",
      sequence: 6,
      event: { threadId: "t", type: "runtime-request.updated", payload: { id: "r", status: "resolved" } },
    });
    expect(pendingRequests(state.projection!)).toEqual([]);
  });
});
