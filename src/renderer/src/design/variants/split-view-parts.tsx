/*
 * Pieces of T3 Code's own UI, copied markup-first from apps/web/src and stripped of logic, sized
 * for the split-view companion. Source files are named above each piece.
 */
import type { ProjectSummary, ThreadDetail, ThreadSummary } from "@shared/types";
import {
  AlarmClockIcon,
  CheckIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  ShieldIcon,
  ShieldQuestionIcon,
  SquarePenIcon,
  TerminalIcon,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode, SVGProps } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { CollapsibleSectionHeader } from "~/t3/ui/collapsible-section-header";
import { cn } from "~/t3/lib/utils";
import { modelLabel, relativeTime, untilLabel } from "~/lib/format";
import { mockProjects } from "../mock";

/* ---------- ProjectMonogram.tsx + projectIdentity.ts ---------- */

const MONOGRAM_COLORS = [
  "text-red-600 dark:text-red-400",
  "text-orange-600 dark:text-orange-400",
  "text-amber-600 dark:text-amber-400",
  "text-emerald-600 dark:text-emerald-400",
  "text-teal-600 dark:text-teal-400",
  "text-sky-600 dark:text-sky-400",
  "text-blue-600 dark:text-blue-400",
  "text-indigo-600 dark:text-indigo-400",
  "text-violet-600 dark:text-violet-400",
  "text-fuchsia-600 dark:text-fuchsia-400",
  "text-pink-600 dark:text-pink-400",
] as const;

function monogramFor(name: string) {
  const words =
    name
      .normalize("NFKC")
      .trim()
      .match(/[\p{L}\p{N}]+/gu) ?? [];
  const first = Array.from(words[0] ?? "P");
  const second =
    first.slice(1).find((glyph) => /\p{N}/u.test(glyph)) ??
    (words.length > 1 ? Array.from(words.at(-1) ?? "")[0] : first.at(-1)) ??
    first[0];
  return `${first[0]}${second}`.toUpperCase().slice(0, 2);
}

function colorFor(name: string) {
  let index = 0;
  for (const glyph of name.toLowerCase()) {
    index = (index * 31 + (glyph.codePointAt(0) ?? 0)) % MONOGRAM_COLORS.length;
  }
  return MONOGRAM_COLORS[index] ?? MONOGRAM_COLORS[0];
}

export function ProjectMonogram(props: { name: string; className?: string }) {
  const text = monogramFor(props.name);
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex size-4 shrink-0 items-center justify-center", props.className)}
    >
      <svg
        viewBox="0 0 16 16"
        className={cn("size-full overflow-hidden rounded-[25%] font-mono select-none", colorFor(props.name))}
        style={{ backgroundColor: "color-mix(in srgb, currentColor 14%, transparent)" }}
      >
        <text
          x="8"
          y="10.8"
          textAnchor="middle"
          fill="currentColor"
          className="font-mono"
          fontSize="8.25"
          fontWeight="700"
          textLength={text.length === 1 ? 6 : 12}
          lengthAdjust="spacingAndGlyphs"
          textRendering="geometricPrecision"
        >
          {text}
        </text>
      </svg>
    </span>
  );
}

export function projectFor(projectId: string): ProjectSummary {
  return (
    mockProjects.find((project) => project.id === projectId) ?? {
      id: projectId,
      title: projectId,
      workspaceRoot: "",
    }
  );
}

/* ---------- Icons.tsx (provider glyphs) ---------- */

type Icon = (props: SVGProps<SVGSVGElement>) => ReactNode;

export const ClaudeAI: Icon = ({ className, ...props }) => (
  <svg
    {...props}
    preserveAspectRatio="xMidYMid"
    viewBox="0 0 256 257"
    className={cn("fill-[#d97757]", className)}
  >
    <path d="m50.228 170.321 50.357-28.257.843-2.463-.843-1.361h-2.462l-8.426-.518-28.775-.778-24.952-1.037-24.175-1.296-6.092-1.297L0 125.796l.583-3.759 5.12-3.434 7.324.648 16.202 1.101 24.304 1.685 17.629 1.037 26.118 2.722h4.148l.583-1.685-1.426-1.037-1.101-1.037-25.147-17.045-27.22-18.017-14.258-10.37-7.713-5.25-3.888-4.925-1.685-10.758 7-7.713 9.397.649 2.398.648 9.527 7.323 20.35 15.75L94.817 91.9l3.889 3.24 1.555-1.102.195-.777-1.75-2.917-14.453-26.118-15.425-26.572-6.87-11.018-1.814-6.61c-.648-2.723-1.102-4.991-1.102-7.778l7.972-10.823L71.42 0 82.05 1.426l4.472 3.888 6.61 15.101 10.694 23.786 16.591 32.34 4.861 9.592 2.592 8.879.973 2.722h1.685v-1.556l1.36-18.211 2.528-22.36 2.463-28.776.843-8.1 4.018-9.722 7.971-5.25 6.222 2.981 5.12 7.324-.713 4.73-3.046 19.768-5.962 30.98-3.889 20.739h2.268l2.593-2.593 10.499-13.934 17.628-22.036 7.778-8.749 9.073-9.657 5.833-4.601h11.018l8.1 12.055-3.628 12.443-11.342 14.388-9.398 12.184-13.48 18.147-8.426 14.518.778 1.166 2.01-.194 30.46-6.481 16.462-2.982 19.637-3.37 8.88 4.148.971 4.213-3.5 8.62-20.998 5.184-24.628 4.926-36.682 8.685-.454.324.519.648 16.526 1.555 7.065.389h17.304l32.21 2.398 8.426 5.574 5.055 6.805-.843 5.184-12.962 6.611-17.498-4.148-40.83-9.721-14-3.5h-1.944v1.167l11.666 11.406 21.387 19.314 26.767 24.887 1.36 6.157-3.434 4.86-3.63-.518-23.526-17.693-9.073-7.972-20.545-17.304h-1.36v1.814l4.73 6.935 25.017 37.59 1.296 11.536-1.814 3.76-6.481 2.268-7.13-1.297-14.647-20.544-15.1-23.138-12.185-20.739-1.49.843-7.194 77.448-3.37 3.953-7.778 2.981-6.48-4.925-3.436-7.972 3.435-15.749 4.148-20.544 3.37-16.333 3.046-20.285 1.815-6.74-.13-.454-1.49.194-15.295 20.999-23.267 31.433-18.406 19.702-4.407 1.75-7.648-3.954.713-7.064 4.277-6.286 25.47-32.405 15.36-20.092 9.917-11.6-.065-1.686h-.583L44.07 198.125l-12.055 1.555-5.185-4.86.648-7.972 2.463-2.593 20.35-13.999-.064.065Z" />
  </svg>
);

export const OpenAI: Icon = ({ className, ...props }) => (
  <svg
    {...props}
    preserveAspectRatio="xMidYMid"
    viewBox="100 100 411 411"
    className={cn("fill-current", className)}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M252.794 108.802C289.191 99.0484 326.265 110.305 351.148 135.135C385.113 126.072 422.85 134.862 449.492 161.505C476.136 188.149 484.925 225.888 475.862 259.85V259.854C500.696 284.735 511.95 321.81 502.198 358.207C492.447 394.602 464.161 421.084 430.215 430.217C421.083 464.162 394.603 492.448 358.206 502.199C321.812 511.951 284.734 500.693 259.852 475.864C225.887 484.927 188.15 476.137 161.507 449.495C134.864 422.851 126.073 385.111 135.136 351.149C110.304 326.266 99.0496 289.192 108.801 252.795C118.552 216.4 146.84 189.918 180.784 180.785C189.917 146.841 216.396 118.553 252.794 108.802ZM374.292 407.145C374.292 411.271 372.092 415.086 368.517 417.148L283.723 466.102C302.487 480.585 327.555 486.459 352.217 479.852C386.997 470.532 410.068 439.312 410.555 405.006V317.717C410.555 315.08 409.125 312.621 406.843 311.303L374.292 292.509V407.145ZM251.868 415.897C248.296 417.959 243.893 417.959 240.317 415.897L155.526 366.942C152.366 390.436 159.811 415.08 177.866 433.136H177.863C203.325 458.594 241.896 462.962 271.85 446.232L347.449 402.586C349.735 401.268 351.148 398.8 351.148 396.163V358.579L251.868 415.897ZM368.602 220.628C366.319 219.309 363.474 219.318 361.191 220.637L328.641 239.431L427.921 296.749C431.496 298.811 433.697 302.627 433.697 306.752V404.661C455.622 395.654 473.244 376.881 479.851 352.218C489.169 317.442 473.668 281.85 444.201 264.274L368.602 220.628ZM177.303 206.34C155.377 215.348 137.756 234.122 131.148 258.783C121.832 293.561 137.331 329.153 166.799 346.727L242.398 390.373C244.68 391.692 247.525 391.684 249.807 390.366L282.357 371.572L183.078 314.253C179.504 312.189 177.303 308.375 177.303 304.251V206.34ZM259.849 279.145V331.858L305.5 358.213L351.15 331.858V279.145L305.5 252.789L259.849 279.145ZM327.276 144.9C308.512 130.418 283.445 124.543 258.782 131.15C224.002 140.471 200.931 171.691 200.445 205.995V293.286C200.445 295.923 201.875 298.381 204.158 299.7L236.707 318.493V203.856C236.707 199.731 238.909 195.916 242.483 193.853L327.276 144.9ZM433.137 177.867C407.675 152.407 369.103 148.038 339.149 164.769L263.55 208.415C261.265 209.734 259.852 212.202 259.852 214.838V252.423L359.132 195.105C362.703 193.041 367.108 193.041 370.682 195.105L455.473 244.06C458.635 220.567 451.189 195.922 433.135 177.867H433.137Z"
    />
  </svg>
);

export const CursorIcon: Icon = ({ className, ...props }) => (
  <svg {...props} viewBox="0 0 466.73 532.09" className={cn("fill-[#26251E] dark:fill-[#EDECEC]", className)}>
    <path d="M457.43,125.94L244.42,2.96c-6.84-3.95-15.28-3.95-22.12,0L9.3,125.94c-5.75,3.32-9.3,9.46-9.3,16.11v247.99c0,6.65,3.55,12.79,9.3,16.11l213.01,122.98c6.84,3.95,15.28,3.95,22.12,0l213.01-122.98c5.75-3.32,9.3-9.46,9.3-16.11v-247.99c0-6.65-3.55-12.79-9.3-16.11h-.01ZM444.05,151.99l-205.63,356.16c-1.39,2.4-5.06,1.42-5.06-1.36v-233.21c0-4.66-2.49-8.97-6.53-11.31L24.87,145.67c-2.4-1.39-1.42-5.06,1.36-5.06h411.26c5.84,0,9.49,6.33,6.57,11.39h-.01Z" />
  </svg>
);

export function ProviderIcon(props: { instanceId: string | null; className?: string }) {
  const Glyph = props.instanceId === "codex" ? OpenAI : props.instanceId === "cursor" ? CursorIcon : ClaudeAI;
  return <Glyph aria-hidden className={cn("size-4 shrink-0", props.className)} />;
}

/* ---------- EffortGlyph.tsx ---------- */

export function EffortGlyph(props: { count: number; filled: number }) {
  const height = 14;
  const maxBar = height - 2;
  const width = 4 * props.count - 2;
  const step = Math.max(1, Math.round(maxBar / 2 / Math.max(props.count - 1, 1)));
  return (
    <svg
      aria-hidden="true"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ width, height }}
      className="shrink-0 text-current"
      data-composer-control-icon
    >
      {Array.from({ length: props.count }, (_, index) => {
        const barHeight = maxBar - (props.count - 1 - index) * step;
        return (
          <rect
            key={index}
            x={index * 4}
            y={maxBar - barHeight}
            width={2}
            height={barHeight}
            fill="currentColor"
            opacity={index < props.filled ? 1 : 0.4}
          />
        );
      })}
    </svg>
  );
}

/* ---------- sidebar/SidebarThreadRow.tsx (slim variant) ---------- */

const TOP_STATUS = {
  working: { icon: CircleDashedIcon, label: "Working", className: "text-info-foreground" },
  approval: { icon: ShieldQuestionIcon, label: "Approval", className: "text-warning-foreground" },
  failed: { icon: CircleAlertIcon, label: "Failed", className: "text-error-foreground" },
  done: { icon: CircleCheckIcon, label: "Done", className: "text-success-foreground" },
} satisfies Record<string, { icon: LucideIcon; label: string; className: string }>;

function topStatusFor(thread: ThreadSummary, shelf: Shelf) {
  if (thread.pendingRequestCount > 0) return TOP_STATUS.approval;
  if (shelf === "working") return TOP_STATUS.working;
  if (thread.status === "failed") return TOP_STATUS.failed;
  if (thread.unread) return TOP_STATUS.done;
  return null;
}

export type Shelf = "inbox" | "working" | "snoozed" | "settled";

export function ThreadRow(props: { thread: ThreadSummary; shelf: Shelf; active?: boolean }) {
  const { thread, shelf } = props;
  const project = projectFor(thread.projectId);
  const settled = shelf === "settled";
  const rawStatus = settled ? null : topStatusFor(thread, shelf);
  // Opening a finished thread reads it, so the active row drops its Done mark.
  const status = props.active && rawStatus === TOP_STATUS.done ? null : rawStatus;
  const unread = thread.unread || status !== null;
  const recede = settled;
  return (
    <li className="list-none">
      <div
        role="button"
        tabIndex={0}
        aria-current={props.active ? "page" : undefined}
        className={cn(
          "group/sidebar-row relative flex h-8 w-full cursor-pointer items-center gap-2.5 overflow-hidden rounded-md px-2.5 text-left outline-none select-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          settled && !props.active && "[&:not(:hover):not(:focus-within)_*]:text-secondary-label",
          props.active
            ? "bg-sidebar-row-active text-sidebar-foreground light:ring-1 light:ring-inset light:ring-sidebar-border/70"
            : recede
              ? "text-sidebar-muted-foreground/75 hover:bg-sidebar-row-hover hover:text-sidebar-foreground"
              : "bg-transparent text-sidebar-foreground hover:bg-sidebar-row-hover",
        )}
      >
        <span
          className={cn(
            "flex shrink-0 items-center transition-opacity",
            !props.active &&
              "opacity-40 grayscale group-hover/sidebar-row:opacity-100 group-hover/sidebar-row:grayscale-0",
          )}
        >
          <ProjectMonogram name={project.title} />
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-start text-sm group-hover/sidebar-row:text-foreground",
            recede ? "font-normal" : "font-medium",
            recede
              ? "text-secondary-label"
              : props.active || thread.pendingRequestCount > 0
                ? "text-foreground"
                : unread
                  ? "text-muted-foreground"
                  : "text-secondary-label/70",
          )}
        >
          {thread.title}
        </span>
        <span className="relative ml-auto flex h-6 min-w-8 shrink-0 items-center justify-end">
          <span className="inline-flex justify-end transition-opacity group-hover/sidebar-row:opacity-0">
            {shelf === "snoozed" && thread.snoozedUntil ? (
              <span className="inline-flex items-center gap-1 text-xs text-info-foreground tabular-nums">
                <AlarmClockIcon aria-hidden className="size-3" />
                {untilLabel(thread.snoozedUntil).replace(/^in /, "")}
              </span>
            ) : status === TOP_STATUS.approval ? (
              <span className={cn("inline-flex items-center gap-1 text-xs font-medium", status.className)}>
                <status.icon aria-hidden className="size-3 shrink-0" />
                {status.label}
              </span>
            ) : status ? (
              // The rail is narrow, so quieter states keep their icon and give the label's room to the title.
              <span className="inline-flex items-center gap-1 text-xs text-secondary-label tabular-nums">
                <span role="img" aria-label={status.label} className={cn("inline-flex", status.className)}>
                  <status.icon aria-hidden className="size-3 shrink-0" />
                </span>
                {relativeTime(thread.updatedAt)}
              </span>
            ) : (
              <span className="inline-flex justify-end text-xs text-secondary-label tabular-nums">
                {relativeTime(thread.updatedAt)}
              </span>
            )}
          </span>
          {settled || shelf === "snoozed" ? null : (
            <button
              type="button"
              aria-label="Settle thread"
              className="pointer-events-none absolute inset-y-0 right-0 inline-flex cursor-pointer items-center gap-1 rounded-md bg-transparent px-2 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/sidebar-row:pointer-events-auto group-hover/sidebar-row:opacity-100"
            >
              <CheckIcon className="size-3" />
            </button>
          )}
        </span>
      </div>
    </li>
  );
}

/** The draft row T3 shows while a new thread is being written. */
export function DraftRow(props: { projectTitle: string }) {
  return (
    <li className="list-none">
      <div className="group/sidebar-row relative flex h-8 w-full items-center gap-2.5 overflow-hidden rounded-md bg-sidebar-row-active px-2.5 text-sidebar-foreground light:ring-1 light:ring-inset light:ring-sidebar-border/70">
        <ProjectMonogram name={props.projectTitle} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-muted-foreground">New thread</span>
        <SquarePenIcon aria-hidden className="size-3 shrink-0 text-muted-foreground/65" />
      </div>
    </li>
  );
}

/* ---------- sidebar/SidebarListMarkers.tsx ---------- */

export function ShelfHeader(props: { label: string; count: number; expanded: boolean; className?: string }) {
  return (
    <li className={cn("relative mx-0.5 h-8 list-none", props.className)}>
      <CollapsibleSectionHeader
        expanded={props.expanded}
        tone="muted"
        accessory={<span className="font-normal tabular-nums">{props.count}</span>}
      >
        {props.label}
      </CollapsibleSectionHeader>
    </li>
  );
}

/* ---------- chat/TimelineUserMessageRow.tsx, TimelineAssistantRows.tsx, ChatMarkdown.tsx ---------- */

function Markdown(props: { text: string; className?: string }) {
  return (
    <div
      className={cn(
        "chat-markdown w-full min-w-0 [overflow-wrap:anywhere] [word-break:break-word] text-sm leading-relaxed text-foreground/[calc(90%+var(--appearance-contrast-boost)/10)]",
        // T3's code block wrap toggle, on by default in a pane this narrow.
        "[&_pre]:whitespace-pre-wrap [&_pre]:wrap-anywhere",
        props.className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{props.text}</ReactMarkdown>
    </div>
  );
}

export function UserMessage(props: { text: string }) {
  return (
    <div className="group flex flex-col items-end gap-1">
      <div className="relative min-w-0 max-w-[80%] rounded-2xl bg-message p-3 text-message-foreground">
        <Markdown text={props.text} className="text-foreground" />
      </div>
    </div>
  );
}

export function AssistantMessage(props: { text: string; meta?: string }) {
  return (
    <div className="group/assistant relative min-w-0 px-1 py-0.5">
      <Markdown text={props.text} />
      {props.meta ? (
        <div className="mt-1.5 flex items-center gap-2 text-xs tabular-nums">
          <p className="text-muted-foreground text-xs tabular-nums">{props.meta}</p>
        </div>
      ) : null}
    </div>
  );
}

export function Timeline(props: { detail: ThreadDetail; children?: ReactNode }) {
  return (
    // Column-reverse pins the newest turn to the bottom, the way T3 follows the end.
    <div className="topbar-scroll-fade flex min-h-0 flex-1 flex-col-reverse overflow-y-auto [--workspace-titlebar-scroll-fade-height:1rem] [scrollbar-width:none]">
      <div className="flex flex-col gap-4 px-4 pt-4 pb-3">
        {props.detail.items.map((entry) =>
          entry.type === "user_message" ? (
            <UserMessage key={entry.itemId} text={entry.text} />
          ) : (
            <AssistantMessage key={entry.itemId} text={entry.text} />
          ),
        )}
        {props.children}
      </div>
    </div>
  );
}

/* ---------- chat/WorkLog.tsx + TimelinePendingApprovalRow.tsx ---------- */

export function PendingApprovalRow(props: { command: string; reason: string }) {
  return (
    <div
      role="group"
      aria-label="Command approval"
      className="group/timeline-row relative w-full min-w-0 rounded-md px-0.5 py-0.5 text-left"
    >
      <div className="flex min-h-6 min-w-0 items-start gap-1.5 text-sm leading-relaxed">
        <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
          <span className="relative w-6 shrink-0 leading-0">
            <span className="inline-block size-6 overflow-hidden align-[calc(0.5cap_-_0.75rem)]">
              <span className="flex size-full items-center justify-center">
                <TerminalIcon className="block size-4 shrink-0 stroke-2 text-icon-muted" />
              </span>
            </span>
          </span>
          <div className="min-w-0 flex-1 text-secondary-label">
            <code className="block min-w-0 whitespace-pre-wrap font-mono text-xs leading-5 text-foreground wrap-anywhere">
              {props.command}
            </code>
          </div>
        </div>
      </div>
      <div className="ms-7.5 flex min-w-0 flex-col gap-1 pb-1 text-xs">
        <span className="text-muted-foreground wrap-anywhere">{props.reason}</span>
        <span className="inline-flex items-center gap-1 text-warning">
          <ShieldIcon aria-hidden className="size-3 shrink-0" />
          Waiting for approval
        </span>
      </div>
    </div>
  );
}

/* ---------- chat/ChatHeader.tsx + WorkspaceBreadcrumb.tsx ---------- */

export function Breadcrumb(props: { project: string; title: string }) {
  return (
    <nav aria-label="Thread breadcrumb" className="min-w-0 flex-1 overflow-clip [overflow-clip-margin:2px]">
      <ol className="m-0 flex min-w-0 list-none items-center gap-2 p-0 text-sm">
        <li className="flex min-w-0 shrink items-center font-medium text-muted-foreground">
          <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-sm hover:text-foreground">
            <ProjectMonogram name={props.project} className="size-3.5" />
            <span className="block min-w-0 max-w-28 truncate">{props.project}</span>
          </span>
        </li>
        <li aria-hidden="true" className="flex shrink-0 items-center text-icon-muted">
          /
        </li>
        <li aria-current="page" className="flex min-w-10 flex-1 items-center font-medium text-foreground">
          <h2 className="min-w-0 truncate">{props.title}</h2>
        </li>
      </ol>
    </nav>
  );
}

export { modelLabel };
