import { describe, expect, it } from "vitest";
import { escapeAction } from "./escape";

const event = {
  key: "Escape",
  defaultPrevented: false,
  isComposing: false,
  popupOpen: false,
  composerOpen: true,
  noticeVisible: false,
};

describe("companion Escape behavior", () => {
  it("keeps a composer open for dictation, including an empty composer with focus elsewhere", () => {
    expect(escapeAction(event)).toBe("ignore");
    expect(escapeAction({ ...event, isComposing: true })).toBe("ignore");
    expect(escapeAction({ ...event, popupOpen: true })).toBe("ignore");
    expect(escapeAction({ ...event, noticeVisible: true })).toBe("dismiss-notice");
    expect(escapeAction({ ...event, composerOpen: false })).toBe("fold");
  });
});
