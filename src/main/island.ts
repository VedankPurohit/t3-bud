export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Gap between the menu bar and the capsule in its default spot. */
export const ISLAND_TOP_GAP = 6;

/** The capsule's top-center point, where the island starts before the user moves it. */
export function defaultAnchor(workArea: Rect): Point {
  return { x: Math.round(workArea.x + workArea.width / 2), y: workArea.y + ISLAND_TOP_GAP };
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

/**
 * The window for a given size, hung from the anchor (the capsule's top-center), so the capsule
 * stays put as the island grows. Near a screen edge the window shifts to stay fully visible.
 */
export function islandBounds(workArea: Rect, anchor: Point, size: { width: number; height: number }): Rect {
  const width = Math.min(Math.round(size.width), workArea.width);
  const height = Math.min(Math.round(size.height), workArea.height);
  return {
    x: Math.round(clamp(anchor.x - width / 2, workArea.x, workArea.x + workArea.width - width)),
    y: Math.round(clamp(anchor.y, workArea.y, workArea.y + workArea.height - height)),
    width,
    height,
  };
}

/** The anchor a dragged window implies: the top-center of where the window now sits. */
export function anchorOf(window: Rect): Point {
  return { x: Math.round(window.x + window.width / 2), y: Math.round(window.y) };
}
