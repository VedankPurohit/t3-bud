import { describe, expect, it } from "vitest";

import { gazeOffset } from "./gaze";

const orb = { left: 100, top: 100, width: 34, height: 34 };

describe("gazeOffset", () => {
  it.each([
    [
      "centered when the cursor is on the orb",
      { x: 117, y: 117 },
      { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
    ],
    [
      "turns left within the face",
      { x: -500, y: 117 },
      { x: -7.5, y: 0, rotation: -6, scaleX: 0.88, scaleY: 1 },
    ],
    [
      "turns right by the same amount",
      { x: 900, y: 117 },
      { x: 7.5, y: 0, rotation: 6, scaleX: 0.88, scaleY: 1 },
    ],
    [
      "looks down without rolling sideways",
      { x: 117, y: 900 },
      { x: 0, y: 4.5, rotation: 0, scaleX: 1, scaleY: 0.94 },
    ],
    [
      "looks up by the same amount",
      { x: 117, y: -900 },
      { x: 0, y: -4.5, rotation: 0, scaleX: 1, scaleY: 0.94 },
    ],
    [
      "turns partway toward a nearby cursor on the right",
      { x: 177, y: 117 },
      { x: 3.75, y: 0, rotation: 3, scaleX: 0.94, scaleY: 1 },
    ],
    [
      "mirrors a nearby cursor on the left",
      { x: 57, y: 117 },
      { x: -3.75, y: 0, rotation: -3, scaleX: 0.94, scaleY: 1 },
    ],
    [
      "combines a diagonal look and turn",
      { x: 900, y: -900 },
      { x: 7.5, y: -4.5, rotation: 6, scaleX: 0.88, scaleY: 0.94 },
    ],
  ])("%s", (_name, cursor, expected) => {
    const offset = gazeOffset(orb, cursor);
    expect(offset).toEqual(expected);
  });
});
