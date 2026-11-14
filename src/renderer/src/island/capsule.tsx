import type { Mood } from "../lib/mood";
import { activityHeight, selectHoverThreads } from "../lib/activity";
import { useIsland } from "./context";
import { ActivityPanel, ACTIVITY_SIZE } from "./activity";

export const FOLDED_SIZE = { width: 76, height: 60 } as const;
export const CONTROLS_TOP = FOLDED_SIZE.height + 8;
export const controlsSize = (rowCount: number) => ({
  width: ACTIVITY_SIZE.width,
  height: CONTROLS_TOP + activityHeight(rowCount),
});
export const PANEL_TOP = FOLDED_SIZE.height + 12;

export function IslandCapsule(props: {
  mood: Mood;
  revealed: boolean;
  space: boolean;
  onPillHidden: () => void;
  onNewThread: () => void;
  onOpenThread: (threadId: string) => void;
  onOpenInbox: () => void;
}) {
  const { state } = useIsland();
  const controls = controlsSize(selectHoverThreads(state).length);
  const { mood } = props;
  return (
    <div className="companion-dock">
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
