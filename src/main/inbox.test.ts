import { describe, expect, it } from "vitest";

import { buildInbox, nextFresh, type RawThread } from "./inbox";

const thread = (id: string, overrides: Partial<RawThread> = {}): RawThread => ({
  threadId: id,
  projectId: "p",
  title: id,
  status: "completed",
  settled: false,
  snoozed: false,
  snoozedUntil: null,
  providerInstanceId: "codex",
  model: "gpt",
  runtimeMode: "full-access",
  createdBy: "user",
  updatedAt: "2026-11-13T00:00:00.000Z",
  parentThreadId: null,
  ...overrides,
});

describe("buildInbox", () => {
  it("puts snoozed over working, hides subagents, and leads with threads that need the user", () => {
    const result = buildInbox({
      recent: [
        thread("done"),
        thread("failed", { status: "failed" }),
        thread("fresh"),
        thread("running", { status: "running" }),
        thread("child", { parentThreadId: "done" }),
      ],
      working: [
        thread("running", { status: "running" }),
        thread("asleep", { status: "running", snoozed: true }),
      ],
      snoozed: [thread("asleep", { status: "running", snoozed: true })],
      settled: [thread("old", { settled: true })],
      pending: new Map([["running", 1]]),
      fresh: new Set(["fresh"]),
    });
    expect(result.inbox.map((t) => t.threadId)).toEqual(["failed", "fresh", "done"]);
    expect(result.working.map((t) => [t.threadId, t.pendingRequestCount])).toEqual([
      ["running", 1],
    ]);
    expect(result.snoozed.map((t) => t.threadId)).toEqual(["asleep"]);
    expect(result.settled.map((t) => t.threadId)).toEqual(["old"]);
  });
});

describe("nextFresh", () => {
  it("marks threads that stop working, but not on the first poll", () => {
    const recent = [thread("a"), thread("b"), thread("c", { snoozed: true })];
    const first = nextFresh({
      fresh: new Set(),
      previouslyWorking: null,
      working: [],
      recent,
      settled: [],
    });
    expect([...first]).toEqual([]);
    const later = nextFresh({
      fresh: first,
      previouslyWorking: new Set(["a", "c", "d"]),
      working: [thread("d", { status: "running" })],
      recent,
      settled: [],
    });
    expect([...later]).toEqual(["a"]);
  });

  it("clears fresh threads that run again or get settled", () => {
    const next = nextFresh({
      fresh: new Set(["again", "settled", "kept"]),
      previouslyWorking: new Set(),
      working: [thread("again", { status: "running" })],
      recent: [thread("kept")],
      settled: [thread("settled", { settled: true })],
    });
    expect([...next]).toEqual(["kept"]);
  });
});
