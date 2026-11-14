import { describe, expect, it } from "vitest";

import { anchorOf, defaultAnchor, islandBounds, windowPlacement } from "./island";

const workArea = { x: 0, y: 25, width: 1440, height: 875 };

describe("island geometry", () => {
  it("preserves the screen anchor through full panel, composer, picker, and notification transitions", () => {
    for (const x of [46, 720, 1394]) {
      for (const y of [31, 450, 826]) {
        const anchor = { x, y };
        for (const size of [
          { width: 92, height: 74 },
          { width: 316, height: 225, hover: true },
          { width: 390, height: 554 },
          { width: 380, height: 222 },
          { width: 420, height: 486 },
          { width: 404, height: 142, notification: true },
          { width: 92, height: 74 },
        ]) {
          const placement = windowPlacement(workArea, anchor, size);
          expect(anchorOf(placement.bounds, placement.mascotX, placement.mascotY)).toEqual(anchor);
        }
      }
    }
  });

  it("keeps the mascot under a stationary pointer through hover resizes at screen edges", () => {
    for (const area of [workArea, { x: -1920, y: -1080, width: 1920, height: 1080 }]) {
      for (const x of [area.x + 46, area.x + area.width / 2, area.x + area.width - 46]) {
        for (const y of [area.y + 6, area.y + 300, area.y + area.height - 74]) {
          const anchor = { x, y };
          for (const size of [
            { width: 92, height: 74 },
            { width: 316, height: 190 },
            { width: 316, height: 225 },
            { width: 92, height: 74 },
          ]) {
            const placement = windowPlacement(area, anchor, { ...size, hover: true });
            expect(anchorOf(placement.bounds, placement.mascotX, placement.mascotY)).toEqual(anchor);
            expect(placement.bounds.x).toBeGreaterThanOrEqual(area.x);
            expect(placement.bounds.y).toBeGreaterThanOrEqual(area.y);
            expect(placement.bounds.x + placement.bounds.width).toBeLessThanOrEqual(area.x + area.width);
            expect(placement.bounds.y + placement.bounds.height).toBeLessThanOrEqual(area.y + area.height);
          }
        }
      }
    }
  });

  it("starts top-center and grows downward from the same capsule position", () => {
    const anchor = defaultAnchor(workArea);
    expect(islandBounds(workArea, anchor, { width: 256, height: 48 })).toEqual({
      x: 592,
      y: 31,
      width: 256,
      height: 48,
    });
    expect(islandBounds(workArea, anchor, { width: 420, height: 560 })).toEqual({
      x: 510,
      y: 31,
      width: 420,
      height: 560,
    });
  });

  it("keeps a moved island where the user dragged it, round-tripping its anchor", () => {
    const folded = islandBounds(workArea, { x: 300, y: 400 }, { width: 256, height: 48 });
    expect(anchorOf(folded)).toEqual({ x: 300, y: 400 });
    const bubble = windowPlacement(
      workArea,
      { x: 720, y: 100 },
      { width: 404, height: 142, notification: true },
    );
    expect(bubble.bounds.x + bubble.mascotX).toBe(720);
    expect(bubble.mascotY).toBe(24);
    expect(bubble.bounds.y).toBe(76);
    expect(anchorOf(bubble.bounds, bubble.mascotX, bubble.mascotY)).toEqual({ x: 720, y: 100 });
    expect(islandBounds(workArea, anchorOf(folded), { width: 420, height: 560 })).toMatchObject({
      x: 90,
      y: 340,
    });
  });

  it("shifts to stay on screen near an edge", () => {
    const top = windowPlacement(workArea, defaultAnchor(workArea), {
      width: 404,
      height: 142,
      notification: true,
    });
    expect(top.bounds.y).toBe(workArea.y);
    expect(top.bounds.y + top.mascotY).toBe(defaultAnchor(workArea).y);
    for (const x of [50, 1390]) {
      const bubble = windowPlacement(
        workArea,
        { x, y: 100 },
        { width: 404, height: 142, notification: true },
      );
      expect(bubble.bounds.x + bubble.mascotX).toBe(x);
      expect(bubble.bounds.x).toBeGreaterThanOrEqual(0);
      expect(bubble.bounds.x + bubble.bounds.width).toBeLessThanOrEqual(1440);
      expect(bubble.mascotX < bubble.bounds.width / 2).toBe(x === 50);
    }
    expect(islandBounds(workArea, { x: 1430, y: 880 }, { width: 420, height: 560 })).toEqual({
      x: 1020,
      y: 340,
      width: 420,
      height: 560,
    });
  });
});
