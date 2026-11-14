import { describe, expect, it } from "vitest";
import { searchThreadCatalog } from "./search";
import { emptyShell, type RawThreadShell } from "./shell";

const now = Date.parse("2026-11-14T12:00:00Z");
const thread = (id: string, overrides: Partial<RawThreadShell> = {}): RawThreadShell => ({
  id,
  projectId: "p",
  title: id,
  status: "completed",
  createdAt: "2026-11-13T00:00:00Z",
  updatedAt: "2026-11-13T00:00:00Z",
  ...overrides,
});
const shell = (threads: RawThreadShell[]) => ({
  ...emptyShell,
  synchronized: true,
  threads: new Map(threads.map((item) => [item.id, item])),
  projects: new Map(
    [
      { id: "p", title: "Hermes", workspaceRoot: "/p" },
      { id: "q", title: "T3 Code", workspaceRoot: "/q" },
    ].map((project) => [project.id, project]),
  ),
});

describe("companion thread search", () => {
  it("finds titles beyond inbox and settled display limits, across shelves and projects", () => {
    const catalog = shell([
      ...Array.from({ length: 100 }, (_, i) => thread(`recent-${i}`)),
      ...Array.from({ length: 30 }, (_, i) =>
        thread(`settled-${i}`, { settledOverride: "settled" }),
      ),
      thread("old", { title: "Café Research", updatedAt: "2026-01-01T00:00:00Z" }),
      thread("older-settled", {
        title: "Café Research",
        settledOverride: "settled",
        updatedAt: "2026-01-01T00:00:00Z",
      }),
      thread("snoozed", { title: "Café Research", snoozedUntil: "2027-01-01T00:00:00Z" }),
      thread("working", { title: "Café Research", projectId: "q", status: "running" }),
    ]);
    expect(
      searchThreadCatalog(catalog, { query: "cafe research", projectIds: [] }, { matches: [] }, now)
        .map((item) => item.threadId)
        .sort(),
    ).toEqual(["old", "older-settled", "snoozed", "working"]);
    expect(
      searchThreadCatalog(
        catalog,
        { query: "research", projectIds: ["q"] },
        { matches: [] },
        now,
      ).map((item) => item.threadId),
    ).toEqual(["working"]);
  });

  it("scopes an empty query by project and excludes archived and delegated threads", () => {
    const catalog = shell([
      thread("a"),
      thread("b", { projectId: "q" }),
      thread("archived", { archivedAt: "2026-01-01T00:00:00Z" }),
      thread("child", { lineage: { parentThreadId: "a", relationshipToParent: "subagent" } }),
    ]);
    expect(
      searchThreadCatalog(catalog, { query: "", projectIds: ["p"] }, { matches: [] }, now).map(
        (item) => item.threadId,
      ),
    ).toEqual(["a"]);
    expect(
      searchThreadCatalog(catalog, { query: "", projectIds: ["p", "q"] }, { matches: [] }, now),
    ).toHaveLength(2);
  });

  it("merges older server rows and message hits after title matches without duplicates or cross-project hits", () => {
    const catalog = shell([
      thread("title", { title: "Focus bug" }),
      thread("message", { title: "Typing issue" }),
      thread("other", { projectId: "q" }),
    ]);
    const result = searchThreadCatalog(
      catalog,
      { query: "focus", projectIds: ["p"] },
      {
        threads: [thread("older", { title: "Focus regression", settledOverride: "settled" })],
        matches: [
          { threadId: "title", snippet: "focus" },
          { threadId: "message", snippet: "Cannot focus" },
          { threadId: "message", snippet: "duplicate" },
          { threadId: "other", snippet: "focus" },
        ],
      },
      now,
    );
    expect(result.map((item) => item.threadId)).toEqual(["title", "older", "message"]);
    expect(result.at(-1)?.snippet).toBe("Cannot focus");
    expect(result[0]?.snippet).toBeUndefined();
  });
});
