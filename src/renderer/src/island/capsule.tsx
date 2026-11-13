import type { ThreadSummary } from "@shared/types";
import { CheckIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { CompanionMascot } from "../components/Mascot";
import type { Mood } from "../lib/mood";
import { cn } from "../t3/lib/utils";
import { Button } from "../t3/ui/button";
import { driverOf, useIsland } from "./context";
import { useIslandDrag } from "./drag";
import { ProviderGlyph } from "./icons";

export const CAPSULE_HEIGHT = 34;
export const CAPSULE_QUIET_WIDTH = 132;
export const CAPSULE_LIVE_WIDTH = 240;
export const ANNOUNCE_SIZE = { width: 352, height: 56 } as const;

/**
 * The always-dark capsule. `dark` plus `data-app-sidebar` scopes T3's own dark sidebar palette to
 * this element, so it reads as T3's true-black surface in either theme.
 */
export function Capsule({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-app-sidebar
      className={cn(
        "dark absolute top-0 left-1/2 z-20 flex -translate-x-1/2 items-center overflow-hidden bg-background text-foreground ring-1 ring-foreground/10 shadow-[0_10px_24px_-12px_rgb(0_0_0/70%)]",
        className,
      )}
      {...props}
    />
  );
}

export function capsuleWidth(working: number, mood: Mood) {
  return working > 0 || mood.done > 0 || mood.attention > 0 ? CAPSULE_LIVE_WIDTH : CAPSULE_QUIET_WIDTH;
}

/** The folded island: blob, one live line, and a provider mark per working thread. */
export function IslandCapsule(props: { mood: Mood; working: readonly ThreadSummary[]; onClick: () => void }) {
  const lookups = useIsland();
  const { mood, working } = props;
  const drag = useIslandDrag(props.onClick);
  const connection = lookups.state.connection.state;
  const width = capsuleWidth(working.length, mood);
  const line =
    connection === "offline" ? (
      <span className="text-warning">Can't reach T3 Code</span>
    ) : connection !== "connected" ? (
      <span className="text-muted-foreground">Connect T3 Code</span>
    ) : working.length === 0 && mood.done === 0 && mood.attention === 0 ? (
      <span className="text-muted-foreground">All quiet</span>
    ) : (
      <>
        {working.length > 0 ? <>{working.length} working</> : null}
        {mood.attention > 0 ? (
          <>
            {working.length > 0 ? <span className="mx-0.5 text-muted-foreground/60">·</span> : null}
            <span className="text-warning">{mood.attention} needs you</span>
          </>
        ) : null}
        {mood.done > 0 && mood.attention === 0 ? (
          <>
            {working.length > 0 ? <span className="mx-0.5 text-muted-foreground/60">·</span> : null}
            <span className="text-success">{mood.done} done</span>
          </>
        ) : null}
      </>
    );
  return (
    <Capsule
      role="button"
      tabIndex={0}
      aria-label={`T3 Companion. ${mood.summary}. Drag to move.`}
      {...drag}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") props.onClick();
      }}
      style={{ width, height: CAPSULE_HEIGHT }}
      className="cursor-grab touch-none gap-1.5 rounded-full ps-1.5 pe-2 transition-[width] duration-200 ease-out outline-none select-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
    >
      <CompanionMascot mood={mood.mood} hopKey={mood.hopKey} size={24} className="-my-1 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-xs font-medium tabular-nums">{line}</span>
      {working.length > 0 ? (
        // T3's stacked provider marks, one per working thread, amber when it waits on the user.
        <span className="flex shrink-0 items-center -space-x-1" aria-hidden>
          {working.slice(0, 5).map((thread) => (
            <span
              key={thread.threadId}
              className="relative flex size-4 items-center justify-center rounded-full bg-background ring-2 ring-background"
            >
              <span
                className={cn(
                  "absolute inset-0 rounded-full border",
                  thread.pendingRequestCount > 0 ? "border-warning" : "border-info/55",
                )}
              />
              <ProviderGlyph driverKind={driverOf(lookups, thread.providerInstanceId)} className="size-2" />
            </span>
          ))}
        </span>
      ) : null}
    </Capsule>
  );
}

/** The island widens in place for a few seconds when a thread finishes. */
export function AnnounceCapsule(props: {
  thread: ThreadSummary;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const lookups = useIsland();
  const drag = useIslandDrag(props.onDismiss);
  const failed = props.thread.status === "failed";
  return (
    <Capsule
      role="button"
      tabIndex={0}
      {...drag}
      style={ANNOUNCE_SIZE}
      className="pop-in cursor-grab touch-none gap-2.5 rounded-[28px] ps-2.5 pe-2.5"
    >
      <CompanionMascot mood={failed ? "failed" : "done"} hopKey={1} size={40} className="-my-1 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium" dir="auto">
          {props.thread.title}
        </span>
        <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
          {failed ? (
            <span className="shrink-0 font-medium text-destructive-foreground">Failed</span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 font-medium text-success">
              <CheckIcon aria-hidden className="size-3.5" />
              Done
            </span>
          )}
          <span className="text-muted-foreground/60">·</span>
          <span className="truncate">{lookups.projectById.get(props.thread.projectId)?.title ?? ""}</span>
        </span>
      </div>
      <Button
        size="sm-pill"
        variant="default"
        className="shrink-0"
        onClick={(event) => {
          event.stopPropagation();
          props.onOpen();
        }}
      >
        Open
      </Button>
    </Capsule>
  );
}
