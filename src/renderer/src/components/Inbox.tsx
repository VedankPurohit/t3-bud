import type { CompanionState, OrganizeAction, ThreadSummary } from "@shared/types";
import {
  AlarmClockIcon,
  AlarmClockOffIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  CircleDotDashedIcon,
  ShieldQuestionIcon,
  SquarePenIcon,
  Undo2Icon,
} from "lucide-react";
import { useState } from "react";

import { cn } from "../lib/cn";
import { modelLabel, relativeTime, rowTone, untilLabel, type RowTone } from "../lib/format";
import { ProjectMark } from "./ProjectMark";

type Shelf = "working" | "snoozed" | "settled";

const TONE_ICON: Record<Exclude<RowTone, "quiet">, { icon: typeof CircleDashedIcon; className: string; label: string }> = {
  attention: { icon: ShieldQuestionIcon, className: "text-attention", label: "Needs you" },
  failed: { icon: CircleAlertIcon, className: "text-danger", label: "Failed" },
  done: { icon: CircleCheckIcon, className: "text-done", label: "Done" },
  working: { icon: CircleDashedIcon, className: "text-working", label: "Working" },
  waiting: { icon: CircleDotDashedIcon, className: "text-muted", label: "Waiting" },
};

const inHours = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();
const tomorrowAt = (hour: number) => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

export function Inbox(props: {
  state: CompanionState;
  onOpen: (threadId: string) => void;
  onNewThread: () => void;
  onOrganize: (threadId: string, action: OrganizeAction, snoozedUntil?: string) => void;
}) {
  const { state } = props;
  const [open, setOpen] = useState<Record<Shelf, boolean>>({
    working: true,
    snoozed: false,
    settled: false,
  });
  const projectsById = new Map(state.projects.map((project) => [project.id, project]));
  const row = (thread: ThreadSummary, shelf: Shelf | "inbox") => (
    <ThreadRow
      key={thread.threadId}
      thread={thread}
      shelf={shelf}
      projectTitle={projectsById.get(thread.projectId)?.title ?? ""}
      onOpen={() => props.onOpen(thread.threadId)}
      onOrganize={(action, until) => props.onOrganize(thread.threadId, action, until)}
    />
  );
  const shelves: Array<{ shelf: Shelf; label: string; threads: readonly ThreadSummary[] }> = [
    { shelf: "working", label: "Working", threads: state.working },
    { shelf: "snoozed", label: "Snoozed", threads: state.snoozed },
    { shelf: "settled", label: "Settled", threads: state.settled },
  ];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-sidebar px-1.5 pt-1.5 pb-3">
      <ul className="flex flex-col gap-px">{state.inbox.map((thread) => row(thread, "inbox"))}</ul>
      {state.inbox.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 px-6 py-7 text-center">
          <p className="text-sm font-medium">All caught up</p>
          <p className="text-xs text-muted">Finished threads land here until you settle them.</p>
          <button
            type="button"
            onClick={props.onNewThread}
            className="mt-2 flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium hover:bg-accent"
          >
            <SquarePenIcon className="size-3.5" /> New thread
          </button>
        </div>
      ) : null}
      {shelves.map(({ shelf, label, threads }) =>
        threads.length === 0 ? null : (
          <section key={shelf} className="mt-2">
            <button
              type="button"
              onClick={() => setOpen((current) => ({ ...current, [shelf]: !current[shelf] }))}
              className="flex h-8 w-full items-center gap-1 rounded-md px-2 text-xs font-medium text-muted hover:text-foreground"
            >
              <span className="flex-1 text-left">{label}</span>
              <span className="tabular-nums">{threads.length}</span>
              <ChevronRightIcon
                className={cn("size-3.5 transition-transform duration-150", open[shelf] && "rotate-90")}
              />
            </button>
            {open[shelf] ? (
              <ul className="flex flex-col gap-px">{threads.map((thread) => row(thread, shelf))}</ul>
            ) : null}
          </section>
        ),
      )}
    </div>
  );
}

function ThreadRow(props: {
  thread: ThreadSummary;
  shelf: Shelf | "inbox";
  projectTitle: string;
  onOpen: () => void;
  onOrganize: (action: OrganizeAction, snoozedUntil?: string) => void;
}) {
  const { thread, shelf } = props;
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const tone = rowTone(thread, shelf === "working");
  const status = tone === "quiet" ? null : TONE_ICON[tone];
  const slim = shelf === "snoozed" || shelf === "settled";
  const emphasized = tone === "attention" || tone === "done" || tone === "failed";
  const action = (event: React.MouseEvent, run: () => void) => {
    event.stopPropagation();
    run();
  };
  return (
    <li className="group/row relative list-none">
      <div
        role="button"
        tabIndex={0}
        onClick={props.onOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") props.onOpen();
        }}
        className={cn(
          "w-full cursor-pointer rounded-lg px-2.5 text-left outline-none hover:bg-accent focus-visible:bg-accent",
          slim ? "py-1.5" : "py-2",
          !slim && "data-[emphasized=true]:bg-card data-[emphasized=true]:shadow-xs",
        )}
        data-emphasized={emphasized}
      >
        {slim ? null : (
          <div className="flex items-center gap-1.5 text-2xs text-muted">
            <ProjectMark title={props.projectTitle} />
            <span className="min-w-0 flex-1 truncate">{props.projectTitle}</span>
            <span className="tabular-nums group-hover/row:invisible">{relativeTime(thread.updatedAt)}</span>
          </div>
        )}
        <div className={cn("flex items-center gap-2", !slim && "mt-1")}>
          <span
            dir="auto"
            className={cn(
              "min-w-0 flex-1 truncate text-[13px]",
              emphasized ? "font-medium text-foreground" : "text-foreground/80",
            )}
          >
            {thread.title}
          </span>
          {shelf === "snoozed" && thread.snoozedUntil ? (
            <span className="text-2xs text-muted tabular-nums group-hover/row:invisible">
              {untilLabel(thread.snoozedUntil)}
            </span>
          ) : null}
          {status ? (
            <status.icon aria-label={status.label} className={cn("size-3.5 shrink-0", status.className)} />
          ) : (
            <span className="truncate text-2xs text-faint group-hover/row:invisible">
              {slim ? "" : modelLabel(thread.model)}
            </span>
          )}
        </div>
      </div>
      <div className="absolute top-1.5 right-1.5 hidden items-center gap-0.5 rounded-md bg-card p-0.5 shadow-sm group-hover/row:flex">
        {shelf === "inbox" || shelf === "working" ? (
          <>
            <RowAction label="Snooze" onClick={(event) => action(event, () => setSnoozeOpen((v) => !v))}>
              <AlarmClockIcon />
            </RowAction>
            <RowAction label="Settle" onClick={(event) => action(event, () => props.onOrganize("settle"))}>
              <CircleCheckIcon />
            </RowAction>
          </>
        ) : shelf === "snoozed" ? (
          <RowAction label="Wake" onClick={(event) => action(event, () => props.onOrganize("unsnooze"))}>
            <AlarmClockOffIcon />
          </RowAction>
        ) : (
          <RowAction label="Un-settle" onClick={(event) => action(event, () => props.onOrganize("unsettle"))}>
            <Undo2Icon />
          </RowAction>
        )}
      </div>
      {snoozeOpen ? (
        <div
          data-popup-open
          className="absolute top-9 right-1.5 z-10 flex w-36 flex-col rounded-lg border border-border bg-card p-1 text-xs shadow-lg"
          onMouseLeave={() => setSnoozeOpen(false)}
        >
          {[
            ["1 hour", inHours(1)],
            ["3 hours", inHours(3)],
            ["Tomorrow 9 AM", tomorrowAt(9)],
          ].map(([label, until]) => (
            <button
              key={label}
              type="button"
              className="rounded-md px-2 py-1.5 text-left hover:bg-accent"
              onClick={() => {
                setSnoozeOpen(false);
                props.onOrganize("snooze", until);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </li>
  );
}

function RowAction(props: {
  label: string;
  onClick: (event: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={props.label}
      title={props.label}
      onClick={props.onClick}
      className="grid size-6 place-items-center rounded text-muted hover:bg-accent hover:text-foreground [&_svg]:size-3.5"
    >
      {props.children}
    </button>
  );
}
