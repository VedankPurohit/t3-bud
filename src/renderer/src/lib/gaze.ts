/** Cursor distance, in screen pixels, at which the face reaches its full turn. */
const FULL_TURN_PX = 120;
const clamp = (value: number) => Math.min(1, Math.max(-1, value));
const precise = (value: number) => Math.round(value * 1_000) / 1_000 + 0;

/** A bounded face pose around the orb's centre, in its 64-unit viewBox. */
export function gazeOffset(
  rect: { left: number; top: number; width: number; height: number },
  cursor: { x: number; y: number },
) {
  const dx = cursor.x - (rect.left + rect.width / 2);
  const dy = cursor.y - (rect.top + rect.height / 2);
  const nearCenter = Math.hypot(dx, dy) < 1;
  const horizontal = nearCenter ? 0 : clamp(dx / FULL_TURN_PX);
  const vertical = nearCenter ? 0 : clamp(dy / FULL_TURN_PX);
  return {
    x: precise(horizontal * 7.5),
    y: precise(vertical * 4.5),
    rotation: precise(horizontal * 6),
    scaleX: precise(1 - Math.abs(horizontal) * 0.12),
    scaleY: precise(1 - Math.abs(vertical) * 0.06),
  };
}
