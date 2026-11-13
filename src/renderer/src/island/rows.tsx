import type { OrganizeAction, ThreadSummary } from "@shared/types";
import {
  AlarmClockOffIcon,
  CheckIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  ClockIcon,
  FolderCodeIcon,
  ShieldQuestionIcon,
  Undo2Icon,
} from "lucide-react";
import type { ReactNode } from "react";

import { relativeTime, untilLabel } from "../lib/format";
import { cn } from "../t3/lib/utils";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "../t3/ui/menu";
import { driverOf, useIsland } from "./context";
import { ProviderGlyph } from "./icons";

/* Rows copied from T3 Code's SidebarThreadRow (card variant), MIT License, with logic replaced. */

export type Shelf = "inbox" | "working" | "snoozed" | "settled";

/** T3's ProjectFavicon falls back to this glyph; the companion fetches no favicons. */
export function ProjectGlyph({ className }: { className?: string }) {
  return <FolderCodeIcon aria-hidden className={cn("shrink-0 text-icon-muted", className)} />;
}

/** `TOP_STATUS_ICONS` and the `topStatus` mapping, cut to the states the shell stream reports. */
function topStatus(thread: ThreadSummary, shelf: Shelf) {
  if (thread.pendingRequestCount > 0)
    return { label: "Needs you", Icon: ShieldQuestionIcon, className: "text-warning-foreground" };
  if (shelf === "working" || ["preparing", "queued", "starting", "running", "waiting"].includes(thread.status))
    return { label: "Working", Icon: CircleDashedIcon, className: "text-info-foreground" };
  if (thread.status === "failed")
    return { label: "Failed", Icon: CircleAlertIcon, className: "text-error-foreground" };
  if (thread.unread) return { label: "Done", Icon: CircleCheckIcon, className: "text-success-foreground" };
  return null;
}

const inHours = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();
const tomorrowAt = (hour: number) => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};
const SNOOZE_PRESETS = [
  { label: "1 hour", until: () => inHours(1) },
  { label: "3 hours", until: () => inHours(3) },
  { label: "Tomorrow, 9 AM", until: () => tomorrowAt(9) },
];

const rowAction =
  "inline-flex h-full cursor-pointer items-center gap-1 rounded-md bg-transparent px-1.5 text-xs text-muted-foreground hover:text-foreground";

export function ThreadRow(props: {
  thread: ThreadSummary;
  shelf: Shelf;
  onOpen: () => void;
  onOrganize: (action: OrganizeAction, snoozedUntil?: string) => void;
}) {
  const { thread, shelf } = props;
  const lookups = useIsland();
  const status = topStatus(thread, shelf);
  const settled = shelf === "settled";
  const recede = settled || shelf === "snoozed" || (status === null && !thread.unread);
  const trailing: ReactNode =
    shelf === "snoozed" && thread.snoozedUntil ? (
      <span className="inline-flex items-center gap-1 text-info-foreground">
        <ClockIcon aria-hidden className="size-3" />
        {untilLabel(thread.snoozedUntil)}
      </span>
    ) : status ? (
      <span className={cn("inline-flex items-center gap-1 font-medium", status.className)}>
        <status.Icon aria-hidden className="size-4 shrink-0" />
        {status.label}
      </span>
    ) : (
      relativeTime(thread.updatedAt)
    );

  return (
    <li className="list-none py-0.5">
      <div
        role="button"
        tabIndex={0}
        onClick={props.onOpen}
        onKeyDown={(event) => {
          if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            props.onOpen();
          }
        }}
        className={cn(
          "group/sidebar-row relative w-full cursor-pointer overflow-hidden rounded-md text-left outline-none select-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          recede
            ? "text-sidebar-muted-foreground/75 hover:bg-sidebar-row-hover hover:text-sidebar-foreground"
            : "bg-transparent text-sidebar-foreground hover:bg-sidebar-row-hover",
        )}
      >
        <div className="relative z-10 h-auto px-(--sidebar-row-content-inset) py-(--sidebar-content-inset)">
          <div className="flex h-5 min-w-0 items-center gap-1.5">
            <ProjectGlyph className={cn("size-4", settled && "opacity-40 grayscale")} />
            <span className="min-w-0 flex-1 truncate text-xs font-normal text-secondary-label">
              {lookups.projectById.get(thread.projectId)?.title ?? ""}
            </span>
            <span className="relative ml-auto flex h-5 min-w-8 shrink-0 items-stretch justify-end text-xs">
              <span className="flex items-center self-center tabular-nums text-secondary-label group-hover/sidebar-row:hidden group-focus-within/sidebar-row:hidden">
                {trailing}
              </span>
              <span
                className="hidden items-stretch group-hover/sidebar-row:flex group-focus-within/sidebar-row:flex"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                {shelf === "snoozed" ? (
                  <button type="button" className={rowAction} onClick={() => props.onOrganize("unsnooze")}>
                    <AlarmClockOffIcon className="size-3.5" />
                    Wake
                  </button>
                ) : settled ? (
                  <button type="button" className={rowAction} onClick={() => props.onOrganize("unsettle")}>
                    <Undo2Icon className="size-3.5" />
                    Un-settle
                  </button>
                ) : (
                  <>
                    <Menu>
                      <MenuTrigger aria-label="Snooze thread" className={cn(rowAction, "gap-0.5")}>
                        <ClockIcon className="size-3" />
                      </MenuTrigger>
                      <MenuPopup align="end">
                        {SNOOZE_PRESETS.map((preset) => (
                          <MenuItem key={preset.label} onClick={() => props.onOrganize("snooze", preset.until())}>
                            {preset.label}
                          </MenuItem>
                        ))}
                      </MenuPopup>
                    </Menu>
                    <button
                      type="button"
                      aria-label="Settle thread"
                      className={cn(rowAction, "-mr-1")}
                      onClick={() => props.onOrganize("settle")}
                    >
                      <CheckIcon className="size-3.5" />
                      Settle
                    </button>
                  </>
                )}
              </span>
            </span>
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-1.5">
            <span
              dir="auto"
              className={cn(
                "min-w-0 flex-1 truncate text-start text-sm",
                recede ? "font-normal text-foreground/75" : "font-medium text-foreground",
                settled && "text-secondary-label",
              )}
            >
              {thread.title}
            </span>
            <span aria-hidden className="inline-flex shrink-0 items-center">
              <ProviderGlyph
                driverKind={driverOf(lookups, thread.providerInstanceId)}
                className="size-3.5 opacity-60"
              />
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}
