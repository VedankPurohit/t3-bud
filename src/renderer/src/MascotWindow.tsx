import { useEffect, useState } from "react";
import { CompanionMascot } from "./components/Mascot";
import { FOLDED_SIZE } from "./island/capsule";
import { useIslandDrag } from "./island/drag";
import { useCompanionState } from "./lib/state";
import { useMood } from "./lib/mood";

/** This renderer never opens panels or resizes its native window. */
export function MascotWindow() {
  const state = useCompanionState();
  const mood = useMood(state);
  const [expanded, setExpanded] = useState(false);
  const toggle = () => void window.companion.togglePanel();
  const drag = useIslandDrag(toggle);
  useEffect(() => {
    let active = true;
    void window.companion.getExpanded().then((next) => {
      if (active) setExpanded(next);
    });
    const unsubscribe = window.companion.onExpandedChange(setExpanded);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  if (!state) return null;
  const connected = state.connection.state === "connected";
  const count = mood.attention || mood.done || state.working.length;
  const tone =
    !connected || mood.attention > 0 ? "attention"
      : mood.mood === "failed" ? "failed"
        : mood.done > 0 ? "done" : "working";
  return (
    <div className="relative size-full">
      <div
        className="companion-orb"
        role="button"
        tabIndex={0}
        aria-label={`T3 Companion. ${mood.summary}. Drag to move.`}
        aria-expanded={expanded}
        {...drag}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggle();
          }
        }}
      >
        <CompanionMascot mood={mood.mood} hopKey={mood.hopKey} size={FOLDED_SIZE.height} />
        {count > 0 || !connected ? (
          <span data-app-sidebar aria-hidden className="companion-count" data-tone={tone}>
            <span className="companion-count-dot" />
            {!connected ? "!" : count > 99 ? "99+" : count}
          </span>
        ) : null}
      </div>
    </div>
  );
}
