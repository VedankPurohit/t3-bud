import { describe, expect, it } from "vitest";

import { buildSections } from "./sections";
import type { RawThreadShell, ShellState } from "./shell";

const NOW = Date.parse("2026-11-13T12:00:00Z");

const thread = (id: string, overrides: Partial<RawThreadShell> = {}): RawThreadShell => ({
  id,
  projectId: "p",
  title: id,
  status: "completed",
  createdAt: "2026-11-13T00:00:00Z",
  updatedAt: "2026-11-13T10:00:00Z",
  ...overrides,
});

const shellOf = (threads: RawThreadShell[]): ShellState => ({
  sequence: 1,
  projects: new Map(),
  threads: new Map(threads.map((entry) => [entry.id, entry])),
  synchronized: true,
});

describe("buildSections", () => {
  it("files threads like T3 Code's sidebar and leads the inbox with what needs the user", () => {
    const sections = buildSections(
      shellOf([
        thread("quiet", { updatedAt: "2026-11-13T11:00:00Z" }),
        thread("unread", { latestRunCompletedAt: "2026-11-13T09:00:00Z", lastVisitedAt: "2026-11-13T08:00:00Z" }),
        thread("failed", { status: "failed", latestRunCompletedAt: "2026-11-13T09:00:00Z" }),
        thread("running", { status: "running", pendingRuntimeRequest: { id: "r", kind: "command" } }),
        thread("asleep", { status: "running", snoozedUntil: "2026-11-13T15:00:00Z" }),
        thread("woken", { snoozedUntil: "2026-11-13T11:00:00Z" }),
        thread("done", { settledOverride: "settled" }),
        thread("subagent", { lineage: { parentThreadId: "quiet", relationshipToParent: "subagent" } }),
        thread("archived", { archivedAt: "2026-11-13T00:00:00Z" }),
      ]),
      NOW,
    );
    expect(sections.inbox.map((entry) => entry.threadId)).toEqual(["failed", "unread", "quiet", "woken"]);
    expect(sections.working.map((entry) => [entry.threadId, entry.pendingRequestCount])).toEqual([["running", 1]]);
    expect(sections.snoozed.map((entry) => entry.threadId)).toEqual(["asleep"]);
    expect(sections.settled.map((entry) => entry.threadId)).toEqual(["done"]);
  });
});
