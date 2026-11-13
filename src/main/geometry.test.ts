import { describe, expect, it } from "vitest";

import {
  COMPANION_COMPACT_SIZE,
  COMPANION_EXPANDED_SIZE,
  compactBoundsAt,
  resizeFromNearestCorner,
} from "./geometry";

const workArea = { x: 0, y: 25, width: 1440, height: 875 };

describe("companion geometry", () => {
  it.each([
    ["bottom-right", { x: 1340, y: 790 }, { x: 1024, y: 274 }],
    ["top-left", { x: 20, y: 40 }, { x: 20, y: 40 }],
    ["bottom-left", { x: 20, y: 790 }, { x: 20, y: 274 }],
  ])("opens toward the screen middle from the %s corner and collapses back", (_, at, opened) => {
    const compact = compactBoundsAt(at, workArea);
    const expanded = resizeFromNearestCorner(compact, COMPANION_EXPANDED_SIZE, workArea);
    expect({ x: expanded.x, y: expanded.y }).toEqual(opened);
    const collapsed = resizeFromNearestCorner(expanded, COMPANION_COMPACT_SIZE, workArea);
    expect({ x: collapsed.x, y: collapsed.y }).toEqual(at);
  });

  it("keeps a position saved on a disconnected display on screen", () => {
    expect(compactBoundsAt({ x: 3000, y: -400 }, workArea)).toMatchObject({
      x: workArea.width - COMPANION_COMPACT_SIZE.width,
      y: workArea.y,
    });
  });
});
