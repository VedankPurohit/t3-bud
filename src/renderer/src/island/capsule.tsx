import type { ThreadSummary } from "@shared/types";
import { useEffect, useEffectEvent, useRef } from "react";

import { CompanionMascot } from "../components/Mascot";
import type { Mood } from "../lib/mood";
import { activityHeight, selectHoverThreads } from "../lib/activity";
import { useIsland } from "./context";
import { ActivityPanel, ACTIVITY_SIZE } from "./activity";
import { useIslandDrag } from "./drag";

export const FOLDED_SIZE = { width: 76, height: 60 } as const;
export const CONTROLS_TOP = FOLDED_SIZE.height + 8;
export const controlsSize = (rowCount: number) => ({
  width: ACTIVITY_SIZE.width,
  height: CONTROLS_TOP + activityHeight(rowCount),
});
export const PANEL_TOP = FOLDED_SIZE.height + 12;

export function IslandCapsule(props: {
  mood: Mood;
  working: readonly ThreadSummary[];
  folded: boolean;
  expanded: boolean;
  revealed: boolean;
  space: boolean;
  onRevealChange: (revealed: boolean) => void;
  onPillHidden: () => void;
  onNewThread: () => void;
  onOpenThread: (threadId: string) => void;
  onOpenInbox: () => void;
  onClick: () => void;
}) {
  const { state } = useIsland();
  const controls = controlsSize(selectHoverThreads(state).length);
  const drag = useIslandDrag(props.onClick);
  const root = useRef<HTMLDivElement>(null);
  const hovered = useRef(false);
  const concealTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const conceal = useEffectEvent(() => props.onRevealChange(false));
  const requestReveal = (next: boolean) => {
    if (!props.folded) return;
    if (next) {
      clearTimeout(concealTimer.current);
      concealTimer.current = undefined;
      props.onRevealChange(true);
    } else if (concealTimer.current === undefined) {
      concealTimer.current = setTimeout(() => {
        concealTimer.current = undefined;
        conceal();
      }, 90);
    }
  };
  const { mood } = props;
  const count = mood.attention || mood.done || props.working.length;
  const connected = state.connection.state === "connected";
  const tone =
    !connected || mood.attention > 0
      ? "attention"
      : mood.mood === "failed"
        ? "failed"
        : mood.done > 0
          ? "done"
          : "working";

  const trackHover = useEffectEvent((cursor: { x: number; y: number }) => {
    const bounds = root.current?.getBoundingClientRect();
    const center = bounds ? bounds.left + bounds.width / 2 : window.innerWidth / 2;
    const onBall =
      Math.abs(cursor.x - center) <= FOLDED_SIZE.width / 2 &&
      cursor.y >= 0 &&
      cursor.y <= FOLDED_SIZE.height;
    const onControls =
      props.space &&
      Math.abs(cursor.x - center) <= controls.width / 2 &&
      cursor.y >= FOLDED_SIZE.height &&
      cursor.y <= controls.height;
    const wasInside = hovered.current;
    hovered.current = onBall || onControls;
    const held =
      document.hasFocus() && Boolean(root.current?.querySelector(":active, :focus-visible"));
    const next = hovered.current || held;
    if (props.revealed !== next || wasInside !== hovered.current) requestReveal(next);
  });
  // Inactive macOS panels may omit pointer-enter events; reuse the mascot's cursor feed.
  useEffect(() => {
    if (!props.folded) return;
    const unsubscribe = window.companion.onCursor(trackHover);
    return () => {
      unsubscribe();
      clearTimeout(concealTimer.current);
      concealTimer.current = undefined;
    };
  }, [props.folded]);

  return (
    <div
      ref={root}
      className="companion-dock"
      style={{ height: controls.height }}
      onPointerEnter={() => {
        hovered.current = true;
        requestReveal(true);
      }}
      onPointerLeave={() => {
        hovered.current = false;
        if (!document.hasFocus() || !root.current?.querySelector(":active, :focus-visible"))
          requestReveal(false);
      }}
      onFocusCapture={() => requestReveal(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget) && !hovered.current)
          requestReveal(false);
      }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`T3 Companion. ${mood.summary}. Drag to move.`}
        aria-expanded={props.expanded}
        {...drag}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            props.onClick();
          }
        }}
        className="companion-orb"
      >
        <CompanionMascot mood={mood.mood} hopKey={mood.hopKey} size={FOLDED_SIZE.height} />
        {count > 0 || !connected ? (
          <span aria-hidden className="companion-count" data-tone={tone}>
            <span className="companion-count-dot" />
            {!connected ? "!" : count > 99 ? "99+" : count}
          </span>
        ) : null}
      </div>
      {props.space ? <div className="companion-hover-bridge" /> : null}
      <div
        data-app-sidebar
        className="companion-controls dark"
        style={{ height: controls.height - CONTROLS_TOP }}
        data-visible={props.revealed}
        inert={!props.revealed}
        onTransitionEnd={(event) => {
          if (
            event.target === event.currentTarget &&
            event.propertyName === "opacity" &&
            !props.revealed
          )
            props.onPillHidden();
        }}
      >
        <ActivityPanel
          summary={mood.summary}
          onOpenInbox={props.onOpenInbox}
          onOpenThread={props.onOpenThread}
          onNewThread={props.onNewThread}
        />
      </div>
    </div>
  );
}
