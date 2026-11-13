import type { CompanionState, OrganizeAction } from "@shared/types";
import {
  AppWindowIcon,
  ArrowLeftIcon,
  EllipsisIcon,
  LogOutIcon,
  MinusIcon,
  PowerIcon,
  SquarePenIcon,
  WifiOffIcon,
} from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { Connect } from "./components/Connect";
import { Inbox } from "./components/Inbox";
import { CompanionMascot } from "./components/Mascot";
import { NewThread } from "./components/NewThread";
import { ThreadView } from "./components/ThreadView";
import { cn } from "./lib/cn";
import { useMood, type Mood } from "./lib/mood";
import { useCompanionState } from "./lib/state";

type Mode = "compact" | "resizing" | "expanded";
type View = { readonly kind: "inbox" } | { readonly kind: "new" } | { readonly kind: "thread"; readonly threadId: string };

const DRAG_THRESHOLD_PX = 4;
const api = () => window.companion;

export function App() {
  const state = useCompanionState();
  const mood = useMood(state);
  const [mode, setMode] = useState<Mode>("compact");
  const [view, setView] = useState<View>({ kind: "inbox" });
  const [toast, setToast] = useState<string | null>(null);

  const resize = async (expanded: boolean) => {
    // Paint nothing while the window changes size, so neither layout flashes at the wrong size.
    setMode("resizing");
    await api().setExpanded(expanded);
    setMode(expanded ? "expanded" : "compact");
  };
  const collapse = () => void resize(false);
  const showError = (message: string) => setToast(message);

  // Clears an error toast after a few seconds.
  useEffect(() => {
    if (toast === null) return;
    const timer = setTimeout(() => setToast(null), 4_000);
    return () => clearTimeout(timer);
  }, [toast]);

  const collapseOnEscape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) return;
    if (document.querySelector("[data-popup-open]")) return;
    event.preventDefault();
    collapse();
  });
  // Escape folds the panel unless a popover is open; popovers stop the event themselves.
  useEffect(() => {
    if (mode !== "expanded") return;
    window.addEventListener("keydown", collapseOnEscape);
    return () => window.removeEventListener("keydown", collapseOnEscape);
  }, [mode]);

  if (mode === "resizing") return null;
  if (mode === "compact") return <CompactMascot mood={mood} onOpen={() => void resize(true)} />;

  const connected = state?.connection.state === "connected" || state?.connection.state === "offline";
  const threadId = view.kind === "thread" ? view.threadId : null;
  const organize = async (id: string, action: OrganizeAction, snoozedUntil?: string) => {
    const result = await api().organize(id, action, snoozedUntil);
    if (!result.ok) showError(result.error);
  };

  return (
    <div className="h-full w-full p-2">
      <section className="panel-in relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <header className="drag-region flex h-11 shrink-0 items-center gap-0.5 border-b border-border bg-sidebar px-1.5">
          {view.kind !== "inbox" && connected ? (
            <IconButton label="Back to inbox" onClick={() => setView({ kind: "inbox" })}>
              <ArrowLeftIcon />
            </IconButton>
          ) : null}
          <button
            type="button"
            aria-label={`Fold companion. ${mood.summary}`}
            onClick={collapse}
            className="grid size-8 shrink-0 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
          >
            <CompanionMascot mood={mood.mood} hopKey={mood.hopKey} size={26} />
          </button>
          <HeaderTitle state={state} view={view} summary={mood.summary} />
          {connected ? (
            <>
              <IconButton label="New thread" onClick={() => setView({ kind: "new" })}>
                <SquarePenIcon />
              </IconButton>
              <IconButton label="Open in T3 Code" onClick={() => void api().openInT3Code(threadId)}>
                <AppWindowIcon />
              </IconButton>
            </>
          ) : null}
          <OptionsMenu connected={connected} />
          <IconButton label="Minimize" onClick={collapse}>
            <MinusIcon />
          </IconButton>
        </header>
        {state?.connection.state === "offline" ? (
          <div className="flex items-center gap-2 border-b border-border bg-attention/10 px-3 py-1.5 text-2xs text-muted">
            <WifiOffIcon className="size-3.5 text-attention" />
            <span className="min-w-0 flex-1 truncate">Can't reach T3 Code. Retrying…</span>
          </div>
        ) : null}
        {!state ? null : !connected ? (
          <Connect connection={state.connection} />
        ) : view.kind === "thread" ? (
          <ThreadView key={view.threadId} threadId={view.threadId} state={state} onError={showError} />
        ) : view.kind === "new" ? (
          <NewThread
            state={state}
            onError={showError}
            onLaunched={(id) => setView({ kind: "thread", threadId: id })}
          />
        ) : (
          <Inbox
            state={state}
            onOpen={(id) => setView({ kind: "thread", threadId: id })}
            onNewThread={() => setView({ kind: "new" })}
            onOrganize={(id, action, until) => void organize(id, action, until)}
          />
        )}
        {toast ? (
          <div className="absolute inset-x-3 bottom-3 z-30 rounded-lg bg-foreground px-3 py-2 text-xs text-background shadow-lg">
            {toast}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function HeaderTitle(props: { state: CompanionState | null; view: View; summary: string }) {
  const { state, view } = props;
  const thread =
    view.kind === "thread" && state
      ? [...state.inbox, ...state.working, ...state.snoozed, ...state.settled].find(
          (candidate) => candidate.threadId === view.threadId,
        )
      : null;
  const title = view.kind === "thread" ? (thread?.title ?? "Thread") : view.kind === "new" ? "New thread" : "Inbox";
  return (
    <div className="flex min-w-0 flex-1 flex-col px-1 leading-tight">
      <span dir="auto" className="truncate text-[13px] font-medium">
        {title}
      </span>
      {view.kind === "inbox" ? <span className="truncate text-2xs text-muted">{props.summary}</span> : null}
    </div>
  );
}

function IconButton(props: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      title={props.label}
      onClick={props.onClick}
      className="grid size-7 shrink-0 place-items-center rounded-md text-muted hover:bg-accent hover:text-foreground [&_svg]:size-4"
    >
      {props.children}
    </button>
  );
}

function OptionsMenu(props: { connected: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <IconButton label="Companion options" onClick={() => setOpen((value) => !value)}>
        <EllipsisIcon />
      </IconButton>
      {open ? (
        <div
          data-popup-open
          onMouseLeave={() => setOpen(false)}
          className="absolute top-8 right-0 z-20 flex w-44 flex-col rounded-lg border border-border bg-card p-1 text-xs shadow-lg"
        >
          {props.connected ? (
            <MenuItem
              onClick={() => {
                setOpen(false);
                void api().signOut();
              }}
            >
              <LogOutIcon /> Sign out
            </MenuItem>
          ) : null}
          <MenuItem onClick={() => void api().quit()}>
            <PowerIcon /> Quit T3 Companion
          </MenuItem>
        </div>
      ) : null}
    </div>
  );
}

function MenuItem(props: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent [&_svg]:size-3.5 [&_svg]:text-muted"
    >
      {props.children}
    </button>
  );
}

/** The folded companion: drag to move it, click to open the panel. */
function CompactMascot(props: { mood: Mood; onOpen: () => void }) {
  const { mood } = props;
  const drag = useRef<{
    readonly pointerId: number;
    readonly startX: number;
    readonly startY: number;
    readonly offsetX: number;
    readonly offsetY: number;
    moved: boolean;
    frame: number | null;
    next: { x: number; y: number } | null;
  } | null>(null);
  const badge =
    mood.attention > 0
      ? { count: mood.attention, className: "bg-attention" }
      : mood.done > 0
        ? { count: mood.done, className: "bg-done" }
        : mood.working > 0
          ? { count: mood.working, className: "bg-working" }
          : null;

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
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
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (current === null || current.pointerId !== event.pointerId) return;
    if (!current.moved && Math.hypot(event.screenX - current.startX, event.screenY - current.startY) < DRAG_THRESHOLD_PX) {
      return;
    }
    current.moved = true;
    current.next = { x: event.screenX - current.offsetX, y: event.screenY - current.offsetY };
    // One move per frame keeps IPC to the display's rate however fast the pointer reports.
    if (current.frame !== null) return;
    current.frame = requestAnimationFrame(() => {
      current.frame = null;
      if (current.next) void api().move({ ...current.next, settled: false });
    });
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    drag.current = null;
    if (current === null || current.pointerId !== event.pointerId) return;
    if (current.frame !== null) cancelAnimationFrame(current.frame);
    if (!current.moved) {
      props.onOpen();
      return;
    }
    void api().move({
      x: event.screenX - current.offsetX,
      y: event.screenY - current.offsetY,
      settled: true,
    });
  };

  return (
    <div className="flex h-full w-full items-end justify-center pb-1">
      <button
        type="button"
        aria-label={`Open companion. ${mood.summary}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") props.onOpen();
        }}
        className="pop-in relative cursor-grab rounded-full outline-none active:cursor-grabbing"
      >
        <CompanionMascot mood={mood.mood} hopKey={mood.hopKey} size={60} />
        {badge ? (
          <span
            className={cn(
              "absolute -top-0.5 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-semibold text-white tabular-nums shadow-sm ring-2 ring-white/90",
              badge.className,
            )}
          >
            {badge.count}
          </span>
        ) : null}
      </button>
    </div>
  );
}
