import { describe, expect, it } from "vitest";

import { anchorOf, defaultAnchor, islandBounds } from "./island";

const workArea = { x: 0, y: 25, width: 1440, height: 875 };

describe("island geometry", () => {
  it("starts top-center and grows downward from the same capsule position", () => {
    const anchor = defaultAnchor(workArea);
    expect(islandBounds(workArea, anchor, { width: 256, height: 48 })).toEqual({ x: 592, y: 31, width: 256, height: 48 });
    expect(islandBounds(workArea, anchor, { width: 420, height: 560 })).toEqual({ x: 510, y: 31, width: 420, height: 560 });
  });

  it("keeps a moved island where the user dragged it, round-tripping its anchor", () => {
    const folded = islandBounds(workArea, { x: 300, y: 400 }, { width: 256, height: 48 });
    expect(anchorOf(folded)).toEqual({ x: 300, y: 400 });
    expect(islandBounds(workArea, anchorOf(folded), { width: 420, height: 560 })).toMatchObject({ x: 90, y: 340 });
  });

  it("shifts to stay on screen near an edge", () => {
    expect(islandBounds(workArea, { x: 1430, y: 880 }, { width: 420, height: 560 })).toEqual({
      x: 1020,
      y: 340,
      width: 420,
      height: 560,
    });
  });
});
