import { describe, expect, it } from "vitest";
import { createDraftStore, type DraftStorage } from "./drafts";

function storage(): DraftStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

describe("composer drafts", () => {
  it("restores exact unsent text after a renderer restart and keeps drafts separate", () => {
    const disk = storage();
    const before = createDraftStore(disk);
    const dictated = "  A dictated thought.\n\nStill working on this…  ";
    before.write("env:thread:a", dictated);
    before.write("env:new-thread", "A different draft");
    before.write("other:thread:a", "Another environment");
    const after = createDraftStore(disk);
    expect(after.read("env:thread:a")).toBe(dictated);
    expect(after.read("env:new-thread")).toBe("A different draft");
    expect(after.read("other:thread:a")).toBe("Another environment");
    after.write("env:thread:a", "");
    expect(createDraftStore(disk).read("env:thread:a")).toBe("");
    expect(createDraftStore(disk).read("env:new-thread")).toBe("A different draft");
  });

  it("clears only the submitted draft and preserves text added while sending", () => {
    const disk = storage();
    const drafts = createDraftStore(disk);
    drafts.write("thread", "Original message");
    drafts.write("thread", "Next thought while the send is pending");
    expect(drafts.complete("thread", "Original message")).toBe(false);
    expect(createDraftStore(disk).read("thread")).toBe("Next thought while the send is pending");
    expect(drafts.complete("thread", "Next thought while the send is pending")).toBe(true);
    expect(createDraftStore(disk).read("thread")).toBe("");
  });

  it("keeps an in-memory draft and reports when persistent storage is unavailable", () => {
    const drafts = createDraftStore({
      getItem: () => {
        throw new Error("Storage unavailable");
      },
      setItem: () => {
        throw new Error("Storage unavailable");
      },
      removeItem: () => {
        throw new Error("Storage unavailable");
      },
    });
    expect(drafts.read("thread")).toBe("");
    expect(drafts.write("thread", "Keep this thought")).toBe(false);
    expect(drafts.read("thread")).toBe("Keep this thought");
  });
});
