import { useRef, type PointerEvent as ReactPointerEvent } from "react";

const DRAG_THRESHOLD_PX = 4;

interface DragState {
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  /** Where the pointer grabbed the window, so the window follows without jumping. */
  readonly offsetX: number;
  readonly offsetY: number;
  moved: boolean;
  frame: number | null;
  next: { x: number; y: number } | null;
}

/**
 * Drags the whole island window by the capsule. A press that moves less than a few pixels is a
 * click; anything further moves the window and saves the spot on release.
 */
export function useIslandDrag(onClick: () => void) {
  const drag = useRef<DragState | null>(null);
  return {
    onPointerDown(event: ReactPointerEvent<HTMLElement>) {
      if (event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = {
        pointerId: event.pointerId,
        startX: event.screenX,
        startY: event.screenY,
        offsetX: event.screenX - window.screenX,
        offsetY: event.screenY - window.screenY,
        moved: false,
        frame: null,
        next: null,
      };
    },
    onPointerMove(event: ReactPointerEvent<HTMLElement>) {
      const current = drag.current;
      if (current === null || current.pointerId !== event.pointerId) return;
      if (
        !current.moved &&
        Math.hypot(event.screenX - current.startX, event.screenY - current.startY) < DRAG_THRESHOLD_PX
      ) {
        return;
      }
      current.moved = true;
      current.next = { x: event.screenX - current.offsetX, y: event.screenY - current.offsetY };
      // One move per frame keeps IPC to the display's rate however fast the pointer reports.
      if (current.frame !== null) return;
      current.frame = requestAnimationFrame(() => {
        current.frame = null;
        if (current.next) void window.companion.move({ ...current.next, settled: false });
      });
    },
    onPointerUp(event: ReactPointerEvent<HTMLElement>) {
      const current = drag.current;
      drag.current = null;
      if (current === null || current.pointerId !== event.pointerId) return;
      if (current.frame !== null) cancelAnimationFrame(current.frame);
      if (!current.moved) {
        onClick();
        return;
      }
      void window.companion.move({
        x: event.screenX - current.offsetX,
        y: event.screenY - current.offsetY,
        settled: true,
      });
    },
    onPointerCancel() {
      drag.current = null;
    },
  };
}
