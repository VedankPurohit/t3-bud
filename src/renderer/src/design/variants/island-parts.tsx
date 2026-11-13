import type { ThreadDetail, ThreadSummary } from "@shared/types";
import {
  CheckIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  ClockIcon,
  FolderCodeIcon,
  ShieldQuestionIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode, SVGProps } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { type CompanionMood, CompanionMascot } from "../../components/Mascot";
import { modelLabel, relativeTime } from "../../lib/format";
import { cn } from "../../t3/lib/utils";
import { mockProjects } from "../mock";

/*
 * Pieces copied from T3 Code's web app (apps/web/src/components) with the logic stripped, so the
 * island reads as the same product. Each block names the source it was lifted from.
 */

// ── Provider marks (components/Icons.tsx) ───────────────────────────────────────────────────────

type IconProps = SVGProps<SVGSVGElement>;

export function ClaudeIcon({ className, ...props }: IconProps) {
  return (
    <svg
      {...props}
      preserveAspectRatio="xMidYMid"
      viewBox="0 0 256 257"
      className={cn("fill-[#d97757]", className)}
    >
      <path d="m50.228 170.321 50.357-28.257.843-2.463-.843-1.361h-2.462l-8.426-.518-28.775-.778-24.952-1.037-24.175-1.296-6.092-1.297L0 125.796l.583-3.759 5.12-3.434 7.324.648 16.202 1.101 24.304 1.685 17.629 1.037 26.118 2.722h4.148l.583-1.685-1.426-1.037-1.101-1.037-25.147-17.045-27.22-18.017-14.258-10.37-7.713-5.25-3.888-4.925-1.685-10.758 7-7.713 9.397.649 2.398.648 9.527 7.323 20.35 15.75L94.817 91.9l3.889 3.24 1.555-1.102.195-.777-1.75-2.917-14.453-26.118-15.425-26.572-6.87-11.018-1.814-6.61c-.648-2.723-1.102-4.991-1.102-7.778l7.972-10.823L71.42 0 82.05 1.426l4.472 3.888 6.61 15.101 10.694 23.786 16.591 32.34 4.861 9.592 2.592 8.879.973 2.722h1.685v-1.556l1.36-18.211 2.528-22.36 2.463-28.776.843-8.1 4.018-9.722 7.971-5.25 6.222 2.981 5.12 7.324-.713 4.73-3.046 19.768-5.962 30.98-3.889 20.739h2.268l2.593-2.593 10.499-13.934 17.628-22.036 7.778-8.749 9.073-9.657 5.833-4.601h11.018l8.1 12.055-3.628 12.443-11.342 14.388-9.398 12.184-13.48 18.147-8.426 14.518.778 1.166 2.01-.194 30.46-6.481 16.462-2.982 19.637-3.37 8.88 4.148.971 4.213-3.5 8.62-20.998 5.184-24.628 4.926-36.682 8.685-.454.324.519.648 16.526 1.555 7.065.389h17.304l32.21 2.398 8.426 5.574 5.055 6.805-.843 5.184-12.962 6.611-17.498-4.148-40.83-9.721-14-3.5h-1.944v1.167l11.666 11.406 21.387 19.314 26.767 24.887 1.36 6.157-3.434 4.86-3.63-.518-23.526-17.693-9.073-7.972-20.545-17.304h-1.36v1.814l4.73 6.935 25.017 37.59 1.296 11.536-1.814 3.76-6.481 2.268-7.13-1.297-14.647-20.544-15.1-23.138-12.185-20.739-1.49.843-7.194 77.448-3.37 3.953-7.778 2.981-6.48-4.925-3.436-7.972 3.435-15.749 4.148-20.544 3.37-16.333 3.046-20.285 1.815-6.74-.13-.454-1.49.194-15.295 20.999-23.267 31.433-18.406 19.702-4.407 1.75-7.648-3.954.713-7.064 4.277-6.286 25.47-32.405 15.36-20.092 9.917-11.6-.065-1.686h-.583L44.07 198.125l-12.055 1.555-5.185-4.86.648-7.972 2.463-2.593 20.35-13.999-.064.065Z" />
    </svg>
  );
}

export function OpenAIIcon({ className, ...props }: IconProps) {
  return (
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
}

export function CursorIcon({ className, ...props }: IconProps) {
  return (
    <svg
      {...props}
      viewBox="0 0 466.73 532.09"
      className={cn("fill-[#26251E] dark:fill-[#EDECEC]", className)}
    >
      <path d="M457.43,125.94L244.42,2.96c-6.84-3.95-15.28-3.95-22.12,0L9.3,125.94c-5.75,3.32-9.3,9.46-9.3,16.11v247.99c0,6.65,3.55,12.79,9.3,16.11l213.01,122.98c6.84,3.95,15.28,3.95,22.12,0l213.01-122.98c5.75-3.32,9.3-9.46,9.3-16.11v-247.99c0-6.65-3.55-12.79-9.3-16.11h-.01ZM444.05,151.99l-205.63,356.16c-1.39,2.4-5.06,1.42-5.06-1.36v-233.21c0-4.66-2.49-8.97-6.53-11.31L24.87,145.67c-2.4-1.39-1.42-5.06,1.36-5.06h411.26c5.84,0,9.49,6.33,6.57,11.39h-.01Z" />
    </svg>
  );
}

export function ProviderGlyph(props: { instanceId: string | null; className?: string }) {
  if (props.instanceId === "codex") return <OpenAIIcon className={props.className} />;
  if (props.instanceId === "cursor") return <CursorIcon className={props.className} />;
  return <ClaudeIcon className={props.className} />;
}

export const projectTitle = (projectId: string) =>
  mockProjects.find((project) => project.id === projectId)?.title ?? "";

/** T3's ProjectFavicon falls back to this glyph; MCP serves no favicons. */
export function ProjectGlyph({ className }: { className?: string }) {
  return <FolderCodeIcon aria-hidden className={cn("shrink-0 text-icon-muted", className)} />;
}

// ── The island ──────────────────────────────────────────────────────────────────────────────────

/**
 * The always-dark capsule. `dark` plus `data-app-sidebar` scopes T3's own dark sidebar palette to
 * this element (that selector recomputes the contrast tokens), so it reads as T3's true-black
 * surface in either theme. Status colors use the base hues, which hold on black in both themes.
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

export type LiveLine = {
  mood: CompanionMood;
  working: readonly ThreadSummary[];
};

/** The folded island: blob, one live line, and a mark per working thread. */
export function IslandCapsule(props: LiveLine) {
  const needsYou = props.working.filter((thread) => thread.pendingRequestCount > 0).length;
  const quiet = props.working.length === 0;
  return (
    // The island shrinks to fit when nothing runs, the way a live activity ends.
    <Capsule className={cn("h-[34px] gap-1.5 rounded-full ps-1.5 pe-2", quiet ? "w-[128px]" : "w-[240px]")}>
      <CompanionMascot mood={props.mood} hopKey={0} size={24} className="-my-1 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-xs font-medium tabular-nums">
        {quiet ? (
          <span className="text-muted-foreground">All quiet</span>
        ) : (
          <>
            {props.working.length} working
            {needsYou > 0 ? (
              <>
                <span className="mx-0.5 text-muted-foreground/60">·</span>
                <span className="text-warning">{needsYou} needs you</span>
              </>
            ) : null}
          </>
        )}
      </span>
      {quiet ? null : (
        // T3's stacked provider marks (ProviderModelPicker), one per working thread.
        <span className="flex shrink-0 items-center -space-x-1" aria-hidden>
          {props.working.map((thread) => (
            <span
              key={thread.threadId}
              className={cn(
                "relative flex size-4 items-center justify-center rounded-full bg-background ring-2 ring-background",
              )}
            >
              <span
                className={cn(
                  "absolute inset-0 rounded-full border",
                  thread.pendingRequestCount > 0 ? "border-warning" : "border-info/55",
                )}
              />
              <ProviderGlyph
                instanceId={thread.providerInstanceId}
                className="size-2 text-foreground"
              />
            </span>
          ))}
        </span>
      )}
    </Capsule>
  );
}

/**
 * The unfolded popover. The panel starts halfway down the capsule, so the island stays its top
 * edge and the popover reads as hanging from it.
 */
export function IslandPopover(props: {
  live: LiveLine;
  surface: "sidebar" | "chat";
  children: ReactNode;
}) {
  return (
    <div className="relative size-full">
      <div
        {...(props.surface === "sidebar" ? { "data-app-sidebar": true } : {})}
        className={cn(
          "absolute inset-x-2.5 top-[17px] bottom-3 flex flex-col overflow-hidden rounded-2xl border shadow-[0_16px_40px_-18px_rgb(0_0_0/55%)] dark:shadow-[0_18px_44px_-18px_rgb(0_0_0/80%)]",
          props.surface === "sidebar"
            ? "border-sidebar-border bg-sidebar text-sidebar-foreground"
            : "border-border bg-background text-foreground",
        )}
      >
        <div aria-hidden className="h-[23px] shrink-0" />
        {props.children}
      </div>
      <IslandCapsule {...props.live} />
    </div>
  );
}

// ── Sidebar rows (components/sidebar/SidebarThreadRow.tsx, card variant) ──────────────────────

/** `TOP_STATUS_ICONS` and the `topStatus` mapping, cut to the states MCP reports. */
function topStatus(thread: ThreadSummary) {
  if (thread.pendingRequestCount > 0)
    return { label: "Approval", Icon: ShieldQuestionIcon, className: "text-warning-foreground" };
  if (thread.status === "running")
    return { label: "Working", Icon: CircleDashedIcon, className: "text-info-foreground" };
  if (thread.status === "failed")
    return { label: "Failed", Icon: CircleAlertIcon, className: "text-error-foreground" };
  if (thread.fresh)
    return { label: "Done", Icon: CircleCheckIcon, className: "text-success-foreground" };
  return null;
}

/** MCP reports no run start, so the mock fixes how long each working thread has run. */
const WORKING_FOR: Record<string, string> = { w1: "4m", w2: "12m", w3: "2m" };

export function SidebarCardRow(props: {
  thread: ThreadSummary;
  /** Draws the row as hovered, with T3's snooze and settle controls showing. */
  hovered?: boolean;
  /** Overrides the right slot, e.g. a snooze wake time or a settled row's age. */
  trailing?: ReactNode;
  settled?: boolean;
}) {
  const { thread } = props;
  const status = topStatus(thread);
  const recede = props.settled || (status === null && !thread.fresh);
  return (
    <li className="list-none py-0.5">
      <div
        role="button"
        tabIndex={0}
        className={cn(
          "group/sidebar-row relative w-full cursor-pointer overflow-hidden rounded-md text-left outline-none select-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          props.hovered
            ? "bg-sidebar-row-hover text-sidebar-foreground"
            : recede
              ? "text-sidebar-muted-foreground/75 hover:bg-sidebar-row-hover hover:text-sidebar-foreground"
              : "bg-transparent text-sidebar-foreground hover:bg-sidebar-row-hover",
        )}
      >
        <div className="relative z-10 h-auto px-(--sidebar-row-content-inset) py-(--sidebar-content-inset)">
          <div className="flex h-5 min-w-0 items-center gap-1.5">
            <ProjectGlyph
              className={cn("size-4", props.settled && "opacity-40 grayscale")}
            />
            <span className="min-w-0 flex-1 truncate text-xs font-normal text-secondary-label">
              {projectTitle(thread.projectId)}
            </span>
            <span className="relative ml-auto flex h-5 min-w-8 shrink-0 items-stretch justify-end text-xs">
              {props.hovered ? (
                <span className="flex items-stretch">
                  <button
                    type="button"
                    aria-label="Snooze thread"
                    className="inline-flex h-full cursor-pointer items-center gap-0.5 rounded-md bg-transparent px-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ClockIcon className="size-3" />
                  </button>
                  <button
                    type="button"
                    aria-label="Settle thread"
                    className="-mr-1 inline-flex cursor-pointer items-center gap-1 rounded-md bg-transparent px-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <CheckIcon className="size-3.5" />
                    Settle
                  </button>
                </span>
              ) : (
                <span className="flex items-center self-center justify-self-end tabular-nums text-secondary-label">
                  {props.trailing ??
                    (status ? (
                      <span className={cn("inline-flex items-center gap-1 font-medium", status.className)}>
                        <status.Icon aria-hidden className="size-4 shrink-0" />
                        {status.label}
                        {status.label === "Working" ? (
                          <span aria-hidden>{WORKING_FOR[thread.threadId] ?? "1m"}</span>
                        ) : null}
                      </span>
                    ) : (
                      relativeTime(thread.updatedAt)
                    ))}
                </span>
              )}
            </span>
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-start text-sm",
                recede ? "font-normal text-foreground/75" : "font-medium text-foreground",
                props.settled && "text-secondary-label",
              )}
            >
              {thread.title}
            </span>
            <span aria-hidden className="inline-flex shrink-0 items-center">
              <ProviderGlyph
                instanceId={thread.providerInstanceId}
                className={cn("size-3.5 opacity-60", thread.providerInstanceId === "codex" && "text-foreground")}
              />
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}

// ── Chat (components/chat/TimelineUserMessageRow.tsx, TimelineAssistantRows.tsx, ChatMarkdown) ──

export function UserBubble({ text }: { text: string }) {
  return (
    <div className="group flex flex-col items-end gap-1">
      <div className="relative min-w-0 max-w-[85%] rounded-2xl bg-message p-3 text-message-foreground">
        <p className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">{text}</p>
      </div>
    </div>
  );
}

export function AssistantMessage(props: { text: string; time?: string; streaming?: boolean }) {
  return (
    <div className="relative min-w-0 px-1 py-0.5">
      <div className="chat-markdown w-full min-w-0 text-sm leading-relaxed text-foreground/[calc(90%+var(--appearance-contrast-boost)/10)] [overflow-wrap:anywhere] [word-break:break-word]">
        <Markdown remarkPlugins={[remarkGfm]}>{props.text}</Markdown>
      </div>
      {props.time ? (
        <div className="mt-1.5 flex items-center gap-2 text-xs tabular-nums">
          {props.streaming ? (
            <span className="rounded-full border border-border/70 px-1.5 py-0.5 font-mono text-3xs text-muted-foreground">
              in_progress
            </span>
          ) : null}
          <p className="text-xs text-muted-foreground tabular-nums">{props.time}</p>
        </div>
      ) : null}
    </div>
  );
}

export const clockTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/** Renders a thread's items with T3's user and assistant rows. */
export function Timeline({ detail }: { detail: ThreadDetail }) {
  return (
    <>
      {detail.items.map((item, index) =>
        item.type === "user_message" ? (
          <UserBubble key={item.itemId} text={item.text} />
        ) : (
          <AssistantMessage
            key={item.itemId}
            text={item.text}
            streaming={item.status === "in_progress"}
            {...(index === detail.items.length - 1 ? { time: clockTime(item.updatedAt) } : {})}
          />
        ),
      )}
    </>
  );
}

// ── Composer (ComposerSurface.tsx, ChatComposer.tsx, ComposerControl.tsx, ComposerPrimaryActions) ─

/** ComposerControl at size "xs", the class string T3 builds in composerControlClassName. */
export const composerControlXs =
  "relative inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-(--control-radius) border border-transparent outline-none hover:bg-accent data-pressed:bg-accent aria-expanded:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&_svg]:pointer-events-none [&_svg]:shrink-0 h-6 gap-1.5 px-1.75 font-normal text-xs text-foreground/70 hover:text-foreground dark:text-muted-foreground";

/** EffortGlyph: rising bars on whole pixels, filled up to the current level. */
export function EffortGlyph(props: { count: number; filled: number }) {
  const height = 12;
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

export function ModelChip(props: { instanceId: string; model: string; open?: boolean }) {
  return (
    <button
      type="button"
      aria-expanded={props.open ?? false}
      aria-label={`Model: ${modelLabel(props.model)}, high effort`}
      className={cn(composerControlXs, "min-w-0 shrink justify-between", props.open && "text-foreground")}
    >
      <span className="flex min-w-0 flex-1 items-center gap-1">
        <ProviderGlyph
          instanceId={props.instanceId}
          className={cn("size-3.5", props.instanceId === "codex" && "text-foreground")}
        />
        <span className="min-w-0 flex-1 truncate">{modelLabel(props.model)}</span>
        <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
          <EffortGlyph count={3} filled={3} />
        </span>
      </span>
    </button>
  );
}

const sendArrow = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path
      d="M7 11.5V2.5M7 2.5L3 6.5M7 2.5L11 6.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function SendButton({ disabled }: { disabled: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      aria-label="Submit message"
      className="relative isolate flex size-8 items-center justify-center overflow-hidden rounded-full bg-message-action text-message-action-foreground shadow-xs transition-all duration-150 enabled:cursor-pointer enabled:shadow-message-action/24 enabled:inset-shadow-control-highlight hover:scale-105 hover:bg-message-action-hover active:inset-shadow-control-pressed active:shadow-none disabled:pointer-events-none disabled:bg-foreground/12 disabled:text-muted-foreground disabled:shadow-none [&_svg]:pointer-events-none"
    >
      {sendArrow}
    </button>
  );
}

export function StopButton() {
  return (
    <button
      type="button"
      aria-label="Stop generation"
      className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-destructive/90 text-white shadow-xs shadow-destructive/24 inset-shadow-control-highlight transition-colors duration-150 hover:bg-destructive active:inset-shadow-control-pressed active:shadow-none [&_svg]:pointer-events-none"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
        <rect x="2" y="2" width="8" height="8" rx="1.5" />
      </svg>
    </button>
  );
}

/** ComposerSurface Shell + Host + Main, with T3's glass surface and hairline outline. */
export function Composer(props: {
  draft?: string;
  placeholder: string;
  instanceId: string;
  model: string;
  running?: boolean;
  pickerOpen?: boolean;
}) {
  return (
    <div className="shrink-0 px-2.5 pb-2.5">
      <div
        data-slot="composer-shell"
        className="group/composer-surface relative isolate w-full [--chat-composer-glass-surface:var(--card)] [--chat-composer-outline:rgb(0_0_0/8%)] before:pointer-events-none before:absolute before:inset-0 before:z-0 before:rounded-2xl before:bg-(--chat-composer-glass-surface)/(--glass-opacity) before:backdrop-blur-(--glass-blur) before:backdrop-saturate-(--glass-saturation) dark:[--chat-composer-glass-surface:var(--surface-raised)] dark:[--chat-composer-highlight:rgb(255_255_255/3%)] dark:[--chat-composer-outline:color-mix(in_srgb,var(--color-white)_5%,transparent)]"
      >
        <div
          data-slot="composer-host"
          className="relative z-10 w-full rounded-2xl shadow-composer after:pointer-events-none after:absolute after:inset-0 after:z-1 after:rounded-[inherit] after:border after:border-(--chat-composer-outline) dark:shadow-none dark:after:inset-shadow-2xs dark:after:inset-shadow-(color:--chat-composer-highlight)"
        >
          <div className="group relative z-10 rounded-2xl p-px">
            <div className="relative px-4 pt-3.5 pb-2">
              <p
                className={cn(
                  "min-h-6 text-sm leading-relaxed",
                  props.draft ? "text-foreground" : "text-placeholder",
                )}
              >
                {props.draft ?? props.placeholder}
                {props.draft ? (
                  <span aria-hidden className="ms-px inline-block h-4 w-px translate-y-[3px] bg-foreground" />
                ) : null}
              </p>
            </div>
            <div className="flex min-w-0 flex-nowrap items-center overflow-visible px-2 pb-2">
              <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-2">
                <div className="relative flex min-w-0 flex-1 items-center justify-end gap-0.5">
                  <ModelChip instanceId={props.instanceId} model={props.model} open={props.pickerOpen ?? false} />
                </div>
                {props.running ? <StopButton /> : <SendButton disabled={!props.draft} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
