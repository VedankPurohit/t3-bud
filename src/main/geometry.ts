export interface CompanionRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CompanionSize {
  readonly width: number;
  readonly height: number;
}

export const COMPANION_COMPACT_SIZE: CompanionSize = { width: 76, height: 84 };
export const COMPANION_EXPANDED_SIZE: CompanionSize = { width: 392, height: 600 };
const EDGE_MARGIN = 16;

function clamp(value: number, min: number, max: number): number {
  return Math.round(Math.min(Math.max(value, min), Math.max(min, max)));
}

function clampToWorkArea(rect: CompanionRect, workArea: CompanionRect): CompanionRect {
  return {
    ...rect,
    x: clamp(rect.x, workArea.x, workArea.x + workArea.width - rect.width),
    y: clamp(rect.y, workArea.y, workArea.y + workArea.height - rect.height),
  };
}

/** The collapsed companion's default spot: the work area's bottom-right corner. */
export function defaultCompactBounds(workArea: CompanionRect): CompanionRect {
  return {
    ...COMPANION_COMPACT_SIZE,
    x: workArea.x + workArea.width - COMPANION_COMPACT_SIZE.width - EDGE_MARGIN,
    y: workArea.y + workArea.height - COMPANION_COMPACT_SIZE.height - EDGE_MARGIN,
  };
}

export function compactBoundsAt(
  position: { readonly x: number; readonly y: number },
  workArea: CompanionRect,
): CompanionRect {
  return clampToWorkArea({ ...COMPANION_COMPACT_SIZE, ...position }, workArea);
}

/**
 * Moves `from` to `size`, keeping the corner nearest the screen edge fixed, so the panel opens
 * toward the middle of the screen and collapses back to the spot it grew from.
 */
export function resizeFromNearestCorner(
  from: CompanionRect,
  size: CompanionSize,
  workArea: CompanionRect,
): CompanionRect {
  const centerX = from.x + from.width / 2;
  const centerY = from.y + from.height / 2;
  const anchoredRight = centerX > workArea.x + workArea.width / 2;
  const anchoredBottom = centerY > workArea.y + workArea.height / 2;
  return clampToWorkArea(
    {
      ...size,
      x: anchoredRight ? from.x + from.width - size.width : from.x,
      y: anchoredBottom ? from.y + from.height - size.height : from.y,
    },
    workArea,
  );
}
