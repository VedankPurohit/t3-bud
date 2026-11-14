import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import type { PointerEvent } from "react";
import { useIslandDrag } from "./drag";

afterEach(() => vi.unstubAllGlobals());

describe("mascot dragging", () => {
  it("keeps the grab point when a pending hover resize moves the window", () => {
    const move = vi.fn();
    const nativeWindow = { screenX: 674, screenY: 100, companion: { move } };
    vi.stubGlobal("window", nativeWindow);
    vi.stubGlobal("requestAnimationFrame", (callback: () => void) => { callback(); return 1; });
    let drag!: ReturnType<typeof useIslandDrag>;
    function Harness() { drag = useIslandDrag(() => {}); return null; }
    renderToString(createElement(Harness));
    const event = {
      button: 0, pointerId: 1, screenX: 720, screenY: 130, clientX: 46, clientY: 30,
      target: { closest: () => null },
      currentTarget: {
        setPointerCapture() {},
        getBoundingClientRect: () => ({ left: 8, top: 0, width: 76, height: 60 }),
      },
    } as unknown as PointerEvent<HTMLElement>;
    drag.onPointerDown(event);
    nativeWindow.screenX = 562;
    drag.onPointerMove({ ...event, screenX: 725 } as PointerEvent<HTMLElement>);
    expect(move).toHaveBeenCalledWith({ x: 725, y: 100, settled: false });
  });
});
