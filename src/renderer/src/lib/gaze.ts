/** How far the eyes travel toward the cursor, in the 64-unit viewBox. */
const GAZE_REACH = 5;
/** Cursor distance, in screen pixels, at which the eyes reach their full travel. */
const GAZE_FULL_REACH_PX = 120;
/** The eyes sit up and right in the orb, so they may travel further left and down than right and up. */
const GAZE_BOUNDS = { minX: -5.5, maxX: 2, minY: -2.5, maxY: 5 } as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const quarter = (value: number) => Math.round(value * 4) / 4;

/** Where the eyes shift, in viewBox units, to look from the orb in `rect` toward `cursor`. */
export function gazeOffset(
  rect: { left: number; top: number; width: number; height: number },
  cursor: { x: number; y: number },
) {
  const dx = cursor.x - (rect.left + rect.width / 2);
  const dy = cursor.y - (rect.top + rect.height / 2);
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return { x: 0, y: 0 };
  const reach = GAZE_REACH * Math.min(1, distance / GAZE_FULL_REACH_PX);
  return {
    x: quarter(clamp((dx / distance) * reach, GAZE_BOUNDS.minX, GAZE_BOUNDS.maxX)),
    y: quarter(clamp((dy / distance) * reach, GAZE_BOUNDS.minY, GAZE_BOUNDS.maxY)),
  };
}
