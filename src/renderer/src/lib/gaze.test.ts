import { describe, expect, it } from "vitest";

import { gazeOffset } from "./gaze";

const orb = { left: 100, top: 100, width: 34, height: 34 };

describe("gazeOffset", () => {
  it.each([
    ["centered when the cursor is on the orb", { x: 117, y: 117 }, { x: 0, y: 0 }],
    ["full travel left, inside the orb", { x: -500, y: 117 }, { x: -5, y: 0 }],
    ["right travel stops before the rim", { x: 900, y: 117 }, { x: 2, y: 0 }],
    ["down toward a cursor below", { x: 117, y: 900 }, { x: 0, y: 5 }],
    ["up travel stops before the rim", { x: 117, y: -900 }, { x: 0, y: -2.5 }],
    ["right travel stops before the rim nearby too", { x: 177, y: 117 }, { x: 2, y: 0 }],
    ["partial travel left for a nearby cursor", { x: 57, y: 117 }, { x: -2.5, y: 0 }],
  ])("%s", (_name, cursor, expected) => {
    const offset = gazeOffset(orb, cursor);
    expect({ x: offset.x + 0, y: offset.y + 0 }).toEqual(expected);
  });
});
