// Markup and classes copied from T3 Code (apps/web/src), MIT License, Copyright (c) 2026 T3 Tools Inc.
// Logic stripped; layout tuned for a 376px panel.
import type { ProjectSummary, ThreadSummary } from "@shared/types";
import { isWorking } from "@shared/types";
import {
  AlarmClockIcon,
  AlarmClockOffIcon,
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  ClockIcon,
  CopyIcon,
  CornerUpRightIcon,
  SearchIcon,
  ShieldQuestionIcon,
  SquareArrowOutUpRightIcon,
  SquarePenIcon,
  StarIcon,
  Undo2Icon,
} from "lucide-react";
import type { ReactNode, SVGProps } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { relativeTime } from "../../lib/format";
import { cn } from "../../t3/lib/utils";
import { Button } from "../../t3/ui/button";
import { CollapsibleSectionHeader } from "../../t3/ui/collapsible-section-header";
import { mockProjects } from "../mock";

/* ------------------------------------------------------------------ icons */

// T3Wordmark.tsx
export function T3Wordmark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="15.5309 37 94.3941 56.96" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M33.4509 93V47.56H15.5309V37H64.3309V47.56H46.4109V93H33.4509ZM86.7253 93.96C82.832 93.96 78.9653 93.4533 75.1253 92.44C71.2853 91.3733 68.032 89.88 65.3653 87.96L70.4053 78.04C72.5386 79.5867 75.0186 80.8133 77.8453 81.72C80.672 82.6267 83.5253 83.08 86.4053 83.08C89.6586 83.08 92.2186 82.44 94.0853 81.16C95.952 79.88 96.8853 78.12 96.8853 75.88C96.8853 73.7467 96.0586 72.0667 94.4053 70.84C92.752 69.6133 90.0853 69 86.4053 69H80.4853V60.44L96.0853 42.76L97.5253 47.4H68.1653V37H107.365V45.4L91.8453 63.08L85.2853 59.32H89.0453C95.9253 59.32 101.125 60.8667 104.645 63.96C108.165 67.0533 109.925 71.0267 109.925 75.88C109.925 79.0267 109.099 81.9867 107.445 84.76C105.792 87.48 103.259 89.6933 99.8453 91.4C96.432 93.1067 92.0586 93.96 86.7253 93.96Z"
        fill="currentColor"
      />
    </svg>
  );
}

// Icons.tsx: ClaudeAI, OpenAI, CursorIcon.
function ClaudeGlyph({ className, ...props }: SVGProps<SVGSVGElement>) {
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

function OpenAIGlyph({ className, ...props }: SVGProps<SVGSVGElement>) {
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

function CursorGlyph({ className, ...props }: SVGProps<SVGSVGElement>) {
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

/** ProviderInstanceIcon, reduced to the three mock providers. */
export function ProviderGlyph(props: { instanceId: string | null; className?: string }) {
  if (props.instanceId === "codex") {
    return (
      <OpenAIGlyph aria-hidden className={cn("shrink-0 text-black dark:text-white", props.className)} />
    );
  }
  if (props.instanceId === "cursor") {
    return <CursorGlyph aria-hidden className={cn("shrink-0", props.className)} />;
  }
  return <ClaudeGlyph aria-hidden className={cn("shrink-0", props.className)} />;
}

// projectIconColors.ts; MCP serves no favicons, so every project gets T3's monogram tile.
const PROJECT_COLORS: Record<string, string> = {
  "p-t3": "text-sky-600 dark:text-sky-400",
  "p-dash": "text-emerald-600 dark:text-emerald-400",
  "p-recall": "text-orange-600 dark:text-orange-400",
  "p-rp": "text-red-600 dark:text-red-400",
  "p-agents": "text-amber-600 dark:text-amber-400",
};

/** ProjectMonogram.tsx */
export function ProjectMonogram(props: { project: ProjectSummary; className?: string }) {
  const text = props.project.title.charAt(0).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex size-4 shrink-0 items-center justify-center", props.className)}
    >
      <svg
        viewBox="0 0 16 16"
        className={cn(
          "size-full overflow-hidden rounded-[25%] font-mono select-none",
          PROJECT_COLORS[props.project.id] ?? "text-gray-600 dark:text-gray-400",
        )}
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
          textLength={6}
          lengthAdjust="spacingAndGlyphs"
          textRendering="geometricPrecision"
        >
          {text}
        </text>
      </svg>
    </span>
  );
}

export const projectFor = (id: string): ProjectSummary =>
  mockProjects.find((project) => project.id === id) ?? mockProjects[0]!;

const MODEL_NAMES: Record<string, string> = {
  "claude-opus-5-5": "Opus 5.5",
  "claude-sonnet-5-5": "Sonnet 5.5",
  "claude-haiku-5-5": "Haiku 5.5",
  "gpt-6.1-sol": "GPT-6.1 Sol",
  "gpt-6-astra": "GPT-6 Astra",
  "gpt-6.1-terra": "GPT-6.1 Terra",
  "gpt-6-luna": "GPT-6 Luna",
  auto: "Auto",
};
export const modelName = (model: string) => MODEL_NAMES[model] ?? model;

/* ------------------------------------------------------------------ panel */

/** The floating window is transparent; this is the only thing that paints. */
export function PanelShell(props: { surface: "sidebar" | "background"; children: ReactNode }) {
  return (
    <div className="absolute inset-0 p-2">
      <div
        className={cn(
          // dialog-glass border and drop, on an opaque surface so video behind never bleeds through.
          "relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-foreground/10 shadow-[0_24px_64px_-24px_rgb(0_0_0/65%)] dark:border-white/8 dark:shadow-[inset_0_1px_rgb(255_255_255/4%),0_24px_72px_-20px_rgb(0_0_0/90%)]",
          props.surface === "sidebar"
            ? "bg-sidebar text-sidebar-foreground"
            : "bg-background text-foreground",
        )}
      >
        {props.children}
      </div>
    </div>
  );
}

// SidebarHeaderIconButton: SidebarMenuButton size="icon" narrowed to size-7.
const sidebarIconButtonClassName =
  "relative flex size-7 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[var(--control-radius)] p-0 font-medium text-sidebar-muted-foreground/80 outline-hidden ring-ring hover:bg-sidebar-row-hover hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-inset active:bg-sidebar-row-active active:text-sidebar-foreground [&>svg:not([class*='size-'])]:size-4 [&>svg]:shrink-0 [&>svg]:text-[var(--sidebar-icon-color)] hover:[&>svg]:text-sidebar-foreground";

export function SidebarIconButton(props: { label: string; children: ReactNode }) {
  return (
    <button type="button" aria-label={props.label} title={props.label} className={sidebarIconButtonClassName}>
      {props.children}
    </button>
  );
}

/** SidebarChrome's brand row: wordmark, then the window's own controls. */
export function SidebarTopBar() {
  return (
    <div className="relative flex h-11 shrink-0 items-center gap-2 ps-3.5 pe-2">
      <span className="inline-flex min-w-0 items-baseline gap-1 text-sm font-medium tracking-tight text-foreground">
        <T3Wordmark aria-label="T3" className="h-[1cap] w-auto shrink-0" />
        <span className="truncate text-muted-foreground [text-box:trim-both_cap_alphabetic] supports-[text-box:trim-both_cap_alphabetic]:py-1">
          Companion
        </span>
      </span>
      <span className="flex-1" />
      <SidebarIconButton label="Open T3 Code">
        <SquareArrowOutUpRightIcon />
      </SidebarIconButton>
      <SidebarIconButton label="Fold">
        <ChevronDownIcon />
      </SidebarIconButton>
    </div>
  );
}

/** SidebarThreadHeader: search field and the new-thread pen. */
export function SidebarSearchRow() {
  return (
    <div className="flex shrink-0 items-center gap-1 px-2 pb-1.5">
      <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-sidebar-muted-foreground hover:bg-sidebar-row-hover hover:text-sidebar-foreground focus-within:bg-sidebar-row-hover focus-within:text-sidebar-foreground focus-within:ring-1 focus-within:ring-inset focus-within:ring-ring/70">
        <SearchIcon className="size-4 shrink-0 text-(--sidebar-icon-color)" />
        <input
          type="search"
          placeholder="Search"
          aria-label="Search threads"
          className="h-auto min-w-0 flex-1 bg-transparent p-0 text-sm leading-normal font-medium text-sidebar-foreground outline-none placeholder:text-sidebar-muted-foreground"
        />
      </div>
      <SidebarIconButton label="New thread">
        <SquarePenIcon />
      </SidebarIconButton>
    </div>
  );
}

/* ------------------------------------------------------------------ rows */

// SidebarThreadRow: TOP_STATUS_ICONS and the topStatus ladder.
const TOP_STATUS = {
  approval: { label: "Approval", Icon: ShieldQuestionIcon, className: "text-warning-foreground" },
  working: { label: "Working", Icon: CircleDashedIcon, className: "text-info-foreground" },
  failed: { label: "Failed", Icon: CircleAlertIcon, className: "text-error-foreground" },
  done: { label: "Done", Icon: CircleCheckIcon, className: "text-success-foreground" },
} as const;

// MCP reports no run start time; the design pins plausible durations.
const WORKING_FOR: Record<string, string> = { w1: "4m", w2: "38s", w3: "11m" };

function topStatusKey(thread: ThreadSummary): keyof typeof TOP_STATUS | null {
  if (thread.pendingRequestCount > 0) return "approval";
  if (isWorking(thread.status)) return "working";
  if (thread.status === "failed") return "failed";
  if (thread.unread) return "done";
  return null;
}

function rowSurfaceClassName(input: { recede: boolean; hovered: boolean; settled?: boolean }) {
  return cn(
    "group/sidebar-row relative w-full cursor-pointer overflow-hidden rounded-md text-left outline-none select-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
    input.settled && !input.hovered && "[&:not(:hover):not(:focus-within)_*]:text-secondary-label",
    input.hovered
      ? "bg-sidebar-row-hover text-sidebar-foreground"
      : input.recede
        ? "text-sidebar-muted-foreground/75 hover:bg-sidebar-row-hover hover:text-sidebar-foreground"
        : "bg-transparent text-sidebar-foreground hover:bg-sidebar-row-hover",
  );
}

/**
 * SidebarThreadRow variant="card". `hovered` pins the hover state for the static gallery;
 * real hover uses the same group-any-hover classes T3 Code does.
 */
export function CardRow(props: { thread: ThreadSummary; hovered?: boolean }) {
  const { thread } = props;
  const hovered = props.hovered ?? false;
  const statusKey = topStatusKey(thread);
  const status = statusKey ? TOP_STATUS[statusKey] : null;
  const working = statusKey === "working";
  const recede = working || (statusKey === null && thread.status === "completed");
  const project = projectFor(thread.projectId);
  return (
    <li className="list-none py-0.5">
      <div
        role="button"
        tabIndex={0}
        className={cn(
          rowSurfaceClassName({ recede, hovered }),
          recede && working && !hovered && "opacity-70 transition-opacity hover:opacity-100",
        )}
      >
        <div className="relative z-10 h-auto px-(--sidebar-row-content-inset) py-(--sidebar-content-inset)">
          <div className="flex h-5 min-w-0 items-center gap-1.5">
            <ProjectMonogram project={project} className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-xs font-normal text-secondary-label">
              {project.title}
            </span>
            <span className="group/sidebar-status-slot relative ml-auto flex h-5 min-w-8 shrink-0 items-stretch justify-end text-xs">
              <span
                className={cn(
                  "flex items-center self-center justify-self-end tabular-nums text-secondary-label",
                  hovered
                    ? "pointer-events-none absolute right-0 opacity-0"
                    : "pointer-events-none group-any-hover/sidebar-row:absolute group-any-hover/sidebar-row:right-0 group-any-hover/sidebar-row:opacity-0",
                )}
              >
                {status ? (
                  <span className={cn("inline-flex items-center gap-1 font-medium", status.className)}>
                    <status.Icon aria-hidden className="size-4 shrink-0" />
                    {status.label}
                    {working ? <span aria-hidden>{WORKING_FOR[thread.threadId] ?? ""}</span> : null}
                  </span>
                ) : (
                  relativeTime(thread.updatedAt)
                )}
              </span>
              <span
                className={cn(
                  "absolute inset-y-0 right-0 flex items-stretch",
                  hovered
                    ? "static opacity-100"
                    : "pointer-events-none opacity-0 group-any-hover/sidebar-row:pointer-events-auto group-any-hover/sidebar-row:static group-any-hover/sidebar-row:opacity-100",
                )}
              >
                {working ? null : (
                  <button
                    type="button"
                    aria-label="Snooze thread"
                    className="inline-flex h-full cursor-pointer items-center gap-0.5 rounded-md bg-transparent px-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ClockIcon className="size-3" />
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Settle thread"
                  className="-mr-1 inline-flex cursor-pointer items-center gap-1 rounded-md bg-transparent px-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <CheckIcon className="size-3.5" />
                  Settle
                </button>
              </span>
            </span>
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-start text-sm",
                recede ? "font-normal" : "font-medium",
                recede
                  ? "text-foreground/75 group-hover/sidebar-row:text-foreground"
                  : thread.status === "failed" && !thread.unread
                    ? "text-foreground/95"
                    : "text-foreground",
                hovered && "text-foreground",
              )}
            >
              {thread.title}
            </span>
            <span aria-hidden className="inline-flex shrink-0 items-center gap-1">
              <ProviderGlyph instanceId={thread.providerInstanceId} className="size-3.5 opacity-60" />
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}

// threadSettled.ts snoozeWakeLabel
function wakeLabel(iso: string) {
  const remainingMs = Date.parse(iso) - Date.now();
  if (Number.isNaN(remainingMs) || remainingMs <= 0) return "now";
  if (remainingMs < 3_600_000) return `${Math.max(1, Math.ceil(remainingMs / 60_000))}m`;
  if (remainingMs < 86_400_000) return `${Math.ceil(remainingMs / 3_600_000)}h`;
  return `${Math.ceil(remainingMs / 86_400_000)}d`;
}

/** SidebarThreadRow variant="slim", for the Snoozed and Settled shelves. */
export function SlimRow(props: { thread: ThreadSummary; shelf: "snoozed" | "settled" }) {
  const { thread, shelf } = props;
  const project = projectFor(thread.projectId);
  return (
    <li className="list-none">
      <div
        role="button"
        tabIndex={0}
        className={cn(
          rowSurfaceClassName({ recede: true, hovered: false, settled: shelf === "settled" }),
          "flex h-9 items-center gap-2.5 px-2.5",
        )}
      >
        <span className="flex shrink-0 items-center opacity-40 grayscale transition-opacity group-hover/sidebar-row:opacity-100 group-hover/sidebar-row:grayscale-0">
          <ProjectMonogram project={project} className="size-4" />
        </span>
        <span className="min-w-0 flex-1 truncate text-start text-sm font-normal text-secondary-label group-hover/sidebar-row:text-foreground">
          {thread.title}
        </span>
        <span className="relative ml-auto flex h-6 min-w-8 shrink-0 items-center justify-end">
          <span className="inline-flex justify-end tabular-nums text-secondary-label transition-opacity group-any-hover/sidebar-row:opacity-0">
            {shelf === "snoozed" && thread.snoozedUntil ? (
              <span className="inline-flex items-center gap-1 text-xs text-info-foreground tabular-nums">
                <AlarmClockIcon aria-hidden className="size-3" />
                {wakeLabel(thread.snoozedUntil)}
              </span>
            ) : (
              <span className="text-xs">{relativeTime(thread.updatedAt)}</span>
            )}
          </span>
          <button
            type="button"
            aria-label={shelf === "snoozed" ? "Wake thread now" : "Un-settle thread"}
            className="pointer-events-none absolute inset-y-0 right-0 -mr-1 inline-flex cursor-pointer items-center gap-1 rounded-md bg-transparent px-1.5 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-any-hover/sidebar-row:pointer-events-auto group-any-hover/sidebar-row:opacity-100"
          >
            {shelf === "snoozed" ? (
              <AlarmClockOffIcon className="mb-px size-3" />
            ) : (
              <Undo2Icon className="mb-px size-3.5" />
            )}
          </button>
        </span>
      </div>
    </li>
  );
}

/** SidebarSectionHeader */
export function ShelfHeader(props: { label: string; count: number; expanded: boolean }) {
  return (
    <li className="relative mx-0.5 h-8 list-none">
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

/* ------------------------------------------------------------------ chat */

/** ChatHeader's breadcrumb, with a back arrow in place of the sidebar trigger. */
export function ThreadHeader(props: { project: ProjectSummary | null; title: string }) {
  return (
    <div className="flex h-11 shrink-0 items-center gap-1.5 ps-1.5 pe-2">
      <Button variant="ghost" size="icon-sm" aria-label="Back to inbox">
        <ArrowLeftIcon className="size-3.5" />
      </Button>
      <nav aria-label="Thread breadcrumb" className="min-w-0 flex-1 overflow-clip [overflow-clip-margin:2px]">
        <ol className="m-0 flex min-w-0 list-none items-center gap-2 p-0 text-sm">
          {props.project ? (
            <>
              <li className="flex min-w-0 shrink items-center font-medium text-muted-foreground">
                <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                  <ProjectMonogram project={props.project} className="size-3.5" />
                  <span className="block max-w-24 min-w-0 truncate [text-box:trim-both_cap_alphabetic] supports-[text-box:trim-both_cap_alphabetic]:py-1.5">
                    {props.project.title}
                  </span>
                </span>
              </li>
              <li aria-hidden="true" className="flex shrink-0 items-center text-icon-muted">
                /
              </li>
            </>
          ) : null}
          <li aria-current="page" className="flex min-w-10 flex-1 items-center font-medium text-foreground">
            <h2 className="min-w-0 truncate">{props.title}</h2>
          </li>
        </ol>
      </nav>
      <Button variant="ghost" size="icon-sm" aria-label="Open in T3 Code" title="Open in T3 Code">
        <SquareArrowOutUpRightIcon className="size-3.5" />
      </Button>
    </div>
  );
}

/** MarkdownCodeBlock: language header and copy button, wrapped to fit the narrow column. */
function CodeBlock(props: { language: string; children: ReactNode }) {
  return (
    <div
      dir="ltr"
      className="chat-markdown-codeblock my-[0.65rem] overflow-hidden rounded-lg border border-border/70 bg-secondary text-start leading-snug dark:border-transparent dark:bg-input/32"
      data-language={props.language}
      data-wrap="true"
    >
      <div className="chat-markdown-codeblock-header flex items-center justify-between gap-2 pt-1.5 pr-1.5 pb-0 pl-3 select-none">
        <span className="inline-flex min-w-0 items-center gap-1.5 font-mono text-2xs">
          <span className="truncate">{props.language}</span>
        </span>
        <Button type="button" variant="ghost-muted" size="icon-xs" aria-label="Copy code">
          <CopyIcon className="size-3" />
        </Button>
      </div>
      <pre>{props.children}</pre>
    </div>
  );
}

const markdownComponents: Components = {
  pre: ({ node, children }) => {
    const code = node?.children[0];
    const classes = code?.type === "element" ? code.properties.className : undefined;
    const language =
      (Array.isArray(classes) ? classes : [])
        .map(String)
        .find((name) => name.startsWith("language-"))
        ?.slice("language-".length) ?? "text";
    return <CodeBlock language={language}>{children}</CodeBlock>;
  },
};

/** ChatMarkdown's root classes around react-markdown. */
export function ChatMarkdown(props: { text: string; className?: string }) {
  return (
    <div
      className={cn(
        // Code at 12px suits a 376px column; T3 Code reads the same token from Appearance.
        "chat-markdown w-full min-w-0 [overflow-wrap:anywhere] [word-break:break-word] text-sm leading-relaxed text-foreground/[calc(90%+var(--appearance-contrast-boost)/10)] select-text [--font-size-code:0.75rem]",
        props.className,
      )}
    >
      <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {props.text}
      </Markdown>
    </div>
  );
}

/** TimelineUserMessageRow */
export function UserBubble(props: { text: string }) {
  return (
    <div className="group flex flex-col items-end gap-1">
      <div className="relative min-w-0 max-w-[85%] rounded-2xl bg-message p-3 text-message-foreground">
        <ChatMarkdown text={props.text} className="text-foreground" />
      </div>
    </div>
  );
}

/** TimelineAssistantRows' message row; the meta line shows on hover, as in T3 Code. */
export function AssistantMessage(props: { text: string; time: string }) {
  return (
    <div className="group/assistant relative min-w-0 px-1 py-0.5">
      <ChatMarkdown text={props.text} />
      <div className="mt-1.5 flex items-center gap-2 text-xs tabular-nums opacity-0 transition-opacity duration-200 group-hover/assistant:opacity-100">
        <p className="text-xs text-muted-foreground tabular-nums">{props.time}</p>
      </div>
    </div>
  );
}

/** WorkingTimelineRow without the shimmer: polled threads have no live token stream. */
export function WorkingRow(props: { label: string; checked: string }) {
  return (
    <div className="pb-1 pt-1">
      <div className="flex h-6 min-w-0 items-baseline gap-2 px-1 text-sm leading-relaxed text-muted-foreground tabular-nums">
        <span className="relative shrink-0 overflow-hidden whitespace-nowrap">{props.label}</span>
        <span className="ms-auto text-xs text-muted-foreground/70">{props.checked}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ composer */

// ComposerSurface.Shell / Host / Main, minus the per-theme overrides.
const composerOutline =
  "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:border after:border-(--chat-composer-outline) dark:after:inset-shadow-2xs dark:after:inset-shadow-(color:--chat-composer-highlight)";

const composerShellClassName = cn(
  "@container/composer-surface group/composer-surface relative isolate w-full",
  "[--chat-composer-drawer-inset:1rem] [--chat-composer-glass-surface:var(--card)] [--chat-composer-outline:rgb(0_0_0/8%)]",
  "dark:[--chat-composer-glass-surface:var(--surface-raised)] dark:[--chat-composer-highlight:rgb(255_255_255/3%)] dark:[--chat-composer-outline:color-mix(in_srgb,var(--color-white)_5%,transparent)]",
  "before:pointer-events-none before:absolute before:inset-0 before:z-0 before:rounded-2xl before:bg-(--chat-composer-glass-surface)/(--glass-opacity) before:backdrop-blur-(--glass-blur) before:backdrop-saturate-(--glass-saturation)",
  "has-data-[composer-banner-surface=attached]:before:hidden",
);

const composerHostClassName = cn(
  "relative z-10 w-full rounded-2xl shadow-composer after:z-1 dark:shadow-none",
  composerOutline,
  "group-has-data-[composer-banner-surface=attached]/composer-surface:shadow-none group-has-data-[composer-banner-surface=attached]/composer-surface:before:hidden group-has-data-[composer-banner-surface=attached]/composer-surface:after:hidden",
);

const composerMainClassName = cn(
  "group relative z-10 rounded-2xl p-px",
  composerOutline,
  "after:z-20 after:hidden group-has-data-[composer-banner-surface=attached]/composer-surface:after:block",
  "group-has-data-[composer-banner-surface=attached]/composer-surface:bg-(--chat-composer-glass-surface)/(--glass-opacity) group-has-data-[composer-banner-surface=attached]/composer-surface:backdrop-blur-(--glass-blur)",
  "group-has-data-[composer-banner-surface=attached]/composer-surface:shadow-composer dark:group-has-data-[composer-banner-surface=attached]/composer-surface:shadow-none",
);

// ComposerControl size="sm"
const composerControlClassName =
  "relative inline-flex min-w-0 shrink cursor-pointer items-center justify-between whitespace-nowrap rounded-(--control-radius) border border-transparent text-base outline-none hover:bg-accent data-pressed:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background [&_svg]:pointer-events-none [&_svg]:shrink-0 h-7 gap-1.5 px-2 font-medium text-foreground/80 [&_svg:not([class*='text-'])]:text-muted-foreground hover:text-foreground sm:text-sm";

/** EffortGlyph with effortBarHeights inlined for a 3-level scale. */
function EffortGlyph(props: { count: number; filled: number }) {
  const height = 14;
  const maxBar = height - 2;
  const step = Math.max(1, Math.round(maxBar / 2 / Math.max(props.count - 1, 1)));
  const width = 4 * props.count - 2;
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

export function ModelControl(props: { instanceId: string; model: string; open?: boolean }) {
  return (
    <button
      type="button"
      aria-label={`Model: ${modelName(props.model)}`}
      data-pressed={props.open ? "" : undefined}
      className={composerControlClassName}
    >
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <ProviderGlyph instanceId={props.instanceId} className="size-4" />
        <span className="min-w-0 flex-1 truncate">{modelName(props.model)}</span>
        <span
          className={cn(
            "flex shrink-0 items-center gap-1.5 text-muted-foreground",
            props.open && "text-foreground",
          )}
        >
          <EffortGlyph count={3} filled={3} />
        </span>
      </span>
    </button>
  );
}

const sendButtonClassName =
  "relative isolate flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-xs transition-all duration-150 enabled:cursor-pointer enabled:inset-shadow-control-highlight hover:scale-105 active:inset-shadow-control-pressed active:shadow-none disabled:pointer-events-none disabled:shadow-none disabled:hover:scale-100 bg-message-action text-message-action-foreground enabled:shadow-message-action/24 hover:bg-message-action-hover disabled:bg-foreground/12 disabled:text-muted-foreground [&_svg]:pointer-events-none";

function SendArrow() {
  return (
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
}

/** ChatComposer: body, then the footer row with controls right-aligned against send. */
export function Composer(props: {
  value?: string;
  placeholder?: string;
  instanceId: string;
  model: string;
  modelOpen?: boolean;
  /** A running thread with an empty composer offers Stop, as T3 Code does. */
  running?: boolean;
  banner?: ReactNode;
}) {
  const hasText = Boolean(props.value);
  return (
    <div className="relative z-20 shrink-0 px-2 pb-2">
      <div data-slot="composer-shell" className={composerShellClassName}>
        {props.banner}
        <div className={composerHostClassName}>
          <div className={composerMainClassName}>
            <div className="rounded-2xl">
              <div className="relative px-3.5 pb-1.5 pt-3">
                <p
                  className={cn(
                    "min-h-6 text-sm leading-6 select-text",
                    hasText ? "text-foreground" : "text-placeholder",
                  )}
                >
                  {props.value ?? props.placeholder ?? "Ask anything. @ files, $ skills, / commands"}
                </p>
              </div>
              <div className="flex min-w-0 flex-nowrap items-center overflow-visible px-2 pb-2">
                <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-2">
                  <div className="relative flex min-w-0 flex-1 items-center justify-end gap-0.5">
                    <ModelControl
                      instanceId={props.instanceId}
                      model={props.model}
                      open={props.modelOpen ?? false}
                    />
                  </div>
                  {props.running && !hasText ? (
                    <button
                      type="button"
                      aria-label="Stop generation"
                      title="Interrupt"
                      className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-destructive/90 text-white shadow-xs shadow-destructive/24 inset-shadow-control-highlight transition-colors duration-150 hover:bg-destructive active:inset-shadow-control-pressed active:shadow-none [&_svg]:pointer-events-none"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                        <rect x="2" y="2" width="8" height="8" rx="1.5" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      aria-label={props.running ? "Steer message" : "Submit message"}
                      disabled={!hasText}
                      className={sendButtonClassName}
                    >
                      {props.running ? <CornerUpRightIcon className="size-4" /> : <SendArrow />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ banner */

// ComposerBanner Surface + Root + Row, variant="warning", attached to the composer below.
const bannerSurfaceClassName = cn(
  "[--chat-composer-attached-surface:var(--chat-composer-glass-surface,var(--card))] dark:[--chat-composer-attached-surface:var(--chat-composer-glass-surface,var(--surface-raised))]",
  "relative isolate border-0 bg-transparent shadow-none [--chat-composer-attached-tint:transparent]",
  "[--chat-composer-attached-outline:color-mix(in_srgb,var(--warning)_28%,transparent)] [--chat-composer-attached-tint:color-mix(in_srgb,var(--warning)_8%,transparent)]",
  "[--chat-composer-attachment-overlap:calc(1rem+1px)] before:rounded-t-2xl before:mask-t-from-transparent before:mask-t-from-4 before:mask-t-to-black before:mask-t-to-4",
  "before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:border before:border-(--chat-composer-attached-outline)",
  "before:bg-(--chat-composer-attached-surface)/(--glass-opacity) before:bg-linear-to-b before:from-(--chat-composer-attached-tint) before:to-(--chat-composer-attached-tint) before:backdrop-blur-(--glass-blur) before:backdrop-saturate-(--glass-saturation)",
  "before:shadow-composer dark:before:shadow-composer-dark",
  "dark:supports-[(backdrop-filter:blur(1px))_or_(-webkit-backdrop-filter:blur(1px))]:before:bg-composer-seam-above",
);

export function ApprovalBanner(props: { children: ReactNode; action: ReactNode; icon: ReactNode }) {
  return (
    <div
      data-slot="composer-banner-attachment"
      className="mx-auto -mb-[calc(1rem+1px)] w-[calc(100%-2*var(--chat-composer-drawer-inset))]"
    >
      <div
        data-composer-banner-surface="attached"
        data-variant="warning"
        className={cn(
          bannerSurfaceClassName,
          "@container min-w-0 px-1 py-(--composer-banner-padding-block) text-xs/4 after:block after:h-(--chat-composer-attachment-overlap) [--composer-banner-corner-top:var(--radius-xl)] [--composer-banner-icon-column:--spacing(7)] [--composer-banner-padding-block:--spacing(1.25)] sm:[--composer-banner-icon-column:--spacing(6)]",
        )}
      >
        <div className="group/banner-row grid min-h-(--composer-banner-icon-column) w-full min-w-0 grid-cols-[var(--composer-banner-icon-column)_minmax(0,1fr)_auto] items-center gap-x-1 text-start">
          <span
            aria-hidden
            className="col-start-1 row-start-1 flex w-(--composer-banner-icon-column) min-w-0 flex-none items-center justify-center text-warning [&>svg]:size-3.5"
          >
            {props.icon}
          </span>
          <span className="col-start-2 row-start-1 flex min-w-0 items-center gap-1">{props.children}</span>
          <span className="col-start-3 row-start-1 flex flex-wrap items-center justify-end gap-1">
            {props.action}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ picker */

// ModelPickerSidebar rail button.
const railButtonClassName =
  "relative isolate flex aspect-square w-full cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-foreground/10 focus-visible:bg-foreground/10 focus-visible:outline-none";

// ComboboxItem
const comboboxItemClassName =
  "group relative flex min-h-8 w-full min-w-0 cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-base outline-none not-data-disabled:hover:bg-foreground/[0.09] data-highlighted:bg-foreground/[0.09] data-highlighted:text-accent-foreground sm:min-h-7 sm:text-sm";

// ComposerModelEffort FOOTER_SEGMENT
const footerSegmentClassName =
  "flex h-6 cursor-pointer items-center justify-center gap-1 px-2 text-muted-foreground text-xs outline-none first:rounded-l-md last:rounded-r-md hover:text-foreground data-checked:bg-input/72 data-checked:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset";

export function ModelPickerPopup(props: {
  providers: ReadonlyArray<{ providerInstanceId: string; displayName: string; models: ReadonlyArray<{ id: string }> }>;
  activeInstanceId: string;
  selectedModel: string;
  highlightedModel: string;
  className?: string;
}) {
  const active = props.providers.find((p) => p.providerInstanceId === props.activeInstanceId);
  return (
    <div
      role="dialog"
      aria-label="Model picker"
      className={cn(
        // PopoverPopup with dropdown-glass.
        "relative flex overflow-hidden rounded-lg text-popover-foreground outline-none dropdown-glass shadow-[0_16px_40px_-18px_rgb(0_0_0/55%)] dark:shadow-[0_18px_44px_-18px_rgb(0_0_0/80%)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
        props.className,
      )}
    >
      <div className="flex w-full min-w-0 flex-col">
        <div className="relative flex min-h-0 flex-row">
          <div className="w-11 shrink-0 overflow-hidden bg-muted/30">
            <div className="relative flex min-h-full flex-col gap-1 p-1">
              <button type="button" aria-label="Favorites" className={railButtonClassName}>
                <StarIcon className="size-5 shrink-0 fill-current text-muted-foreground" aria-hidden />
              </button>
              <div className="border-b border-border/70" aria-hidden="true" />
              {props.providers.map((provider) => (
                <button
                  key={provider.providerInstanceId}
                  type="button"
                  aria-label={provider.displayName}
                  aria-pressed={provider.providerInstanceId === props.activeInstanceId}
                  className={railButtonClassName}
                >
                  <ProviderGlyph instanceId={provider.providerInstanceId} className="size-5" />
                  {provider.providerInstanceId === props.activeInstanceId ? (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute top-1/2 right-0 z-10 h-5 w-0.75 -translate-y-1/2 rounded-full bg-primary"
                    />
                  ) : null}
                </button>
              ))}
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-l border-border/70 bg-muted/40">
            <div className="min-w-0 shrink-0 px-3 pt-2.5">
              <div className="relative -translate-y-px border-b border-border/70 pb-1.5 transition-colors focus-within:border-ring">
                <SearchIcon className="pointer-events-none absolute top-1.5 left-0 size-4 shrink-0 text-muted-foreground/55" />
                <input
                  placeholder="Search models..."
                  className="h-6.5 w-full bg-transparent ps-5 font-sans text-sm leading-6.5 outline-none placeholder:text-muted-foreground/72"
                />
              </div>
            </div>
            <div role="listbox" className="flex flex-col gap-0.5 py-1.5 pr-1 pl-2">
              <div className="px-2 pt-1 pb-1 text-xs font-medium text-muted-foreground">
                {active?.displayName}
              </div>
              {active?.models.map((model) => (
                <div
                  key={model.id}
                  role="option"
                  aria-selected={model.id === props.selectedModel}
                  data-highlighted={model.id === props.highlightedModel ? "" : undefined}
                  className={comboboxItemClassName}
                >
                  <ProviderGlyph instanceId={props.activeInstanceId} className="size-4" />
                  <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <div className="min-w-0 truncate text-sm leading-snug font-normal">
                      {modelName(model.id)}
                    </div>
                    {model.id === props.selectedModel ? (
                      <CheckIcon className="size-3.5 shrink-0" aria-hidden="true" />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-border/70 bg-muted/40 px-3 py-2">
          <div role="radiogroup" aria-label="Effort" className="flex rounded-lg bg-input/40 p-0.5">
            {["Low", "Medium", "High", "Max"].map((level) => (
              <button
                key={level}
                type="button"
                role="radio"
                aria-checked={level === "High"}
                data-checked={level === "High" ? "" : undefined}
                className={footerSegmentClassName}
              >
                {level}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="Permissions: Full access"
            className="ms-auto flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground outline-none hover:bg-foreground/[0.09] hover:text-foreground"
          >
            Full access
            <ChevronUpIcon aria-hidden="true" className="size-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
