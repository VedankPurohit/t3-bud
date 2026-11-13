// Markup copied from T3 Code (apps/web/src/components), MIT License, Copyright (c) 2026 T3 Tools Inc.
// Logic is stripped; class names are kept so the drawer reads as T3's own sidebar and chat.
import type { ProjectSummary, ThreadItem, ThreadSummary } from "@shared/types";
import {
  AlarmClockIcon,
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  CopyIcon,
  CornerUpRightIcon,
  SearchIcon,
  ShieldQuestionIcon,
  SquarePenIcon,
  Undo2Icon,
} from "lucide-react";
import type { ComponentProps, ReactNode, SVGProps } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { CompanionMascot, type CompanionMood } from "../../components/Mascot";
import { cn } from "../../t3/lib/utils";
import { Button } from "../../t3/ui/button";
import { CollapsibleSectionHeader } from "../../t3/ui/collapsible-section-header";
import { mockProjects } from "../mock";

// ---------------------------------------------------------------------------------------------
// Glyphs (T3 Icons.tsx, T3Wordmark.tsx)

type Icon = (props: SVGProps<SVGSVGElement>) => ReactNode;

export const T3Wordmark: Icon = (props) => (
  <svg {...props} viewBox="15.5309 37 94.3941 56.96" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M33.4509 93V47.56H15.5309V37H64.3309V47.56H46.4109V93H33.4509ZM86.7253 93.96C82.832 93.96 78.9653 93.4533 75.1253 92.44C71.2853 91.3733 68.032 89.88 65.3653 87.96L70.4053 78.04C72.5386 79.5867 75.0186 80.8133 77.8453 81.72C80.672 82.6267 83.5253 83.08 86.4053 83.08C89.6586 83.08 92.2186 82.44 94.0853 81.16C95.952 79.88 96.8853 78.12 96.8853 75.88C96.8853 73.7467 96.0586 72.0667 94.4053 70.84C92.752 69.6133 90.0853 69 86.4053 69H80.4853V60.44L96.0853 42.76L97.5253 47.4H68.1653V37H107.365V45.4L91.8453 63.08L85.2853 59.32H89.0453C95.9253 59.32 101.125 60.8667 104.645 63.96C108.165 67.0533 109.925 71.0267 109.925 75.88C109.925 79.0267 109.099 81.9867 107.445 84.76C105.792 87.48 103.259 89.6933 99.8453 91.4C96.432 93.1067 92.0586 93.96 86.7253 93.96Z"
      fill="currentColor"
    />
  </svg>
);

const ClaudeAI: Icon = ({ className, ...props }) => (
  <svg
    {...props}
    preserveAspectRatio="xMidYMid"
    viewBox="0 0 256 257"
    className={cn("fill-[#d97757]", className)}
  >
    <path d="m50.228 170.321 50.357-28.257.843-2.463-.843-1.361h-2.462l-8.426-.518-28.775-.778-24.952-1.037-24.175-1.296-6.092-1.297L0 125.796l.583-3.759 5.12-3.434 7.324.648 16.202 1.101 24.304 1.685 17.629 1.037 26.118 2.722h4.148l.583-1.685-1.426-1.037-1.101-1.037-25.147-17.045-27.22-18.017-14.258-10.37-7.713-5.25-3.888-4.925-1.685-10.758 7-7.713 9.397.649 2.398.648 9.527 7.323 20.35 15.75L94.817 91.9l3.889 3.24 1.555-1.102.195-.777-1.75-2.917-14.453-26.118-15.425-26.572-6.87-11.018-1.814-6.61c-.648-2.723-1.102-4.991-1.102-7.778l7.972-10.823L71.42 0 82.05 1.426l4.472 3.888 6.61 15.101 10.694 23.786 16.591 32.34 4.861 9.592 2.592 8.879.973 2.722h1.685v-1.556l1.36-18.211 2.528-22.36 2.463-28.776.843-8.1 4.018-9.722 7.971-5.25 6.222 2.981 5.12 7.324-.713 4.73-3.046 19.768-5.962 30.98-3.889 20.739h2.268l2.593-2.593 10.499-13.934 17.628-22.036 7.778-8.749 9.073-9.657 5.833-4.601h11.018l8.1 12.055-3.628 12.443-11.342 14.388-9.398 12.184-13.48 18.147-8.426 14.518.778 1.166 2.01-.194 30.46-6.481 16.462-2.982 19.637-3.37 8.88 4.148.971 4.213-3.5 8.62-20.998 5.184-24.628 4.926-36.682 8.685-.454.324.519.648 16.526 1.555 7.065.389h17.304l32.21 2.398 8.426 5.574 5.055 6.805-.843 5.184-12.962 6.611-17.498-4.148-40.83-9.721-14-3.5h-1.944v1.167l11.666 11.406 21.387 19.314 26.767 24.887 1.36 6.157-3.434 4.86-3.63-.518-23.526-17.693-9.073-7.972-20.545-17.304h-1.36v1.814l4.73 6.935 25.017 37.59 1.296 11.536-1.814 3.76-6.481 2.268-7.13-1.297-14.647-20.544-15.1-23.138-12.185-20.739-1.49.843-7.194 77.448-3.37 3.953-7.778 2.981-6.48-4.925-3.436-7.972 3.435-15.749 4.148-20.544 3.37-16.333 3.046-20.285 1.815-6.74-.13-.454-1.49.194-15.295 20.999-23.267 31.433-18.406 19.702-4.407 1.75-7.648-3.954.713-7.064 4.277-6.286 25.47-32.405 15.36-20.092 9.917-11.6-.065-1.686h-.583L44.07 198.125l-12.055 1.555-5.185-4.86.648-7.972 2.463-2.593 20.35-13.999-.064.065Z" />
  </svg>
);

const OpenAI: Icon = ({ className, ...props }) => (
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

const CursorIcon: Icon = ({ className, ...props }) => (
  <svg
    {...props}
    viewBox="0 0 466.73 532.09"
    className={cn("fill-[#26251E] dark:fill-[#EDECEC]", className)}
  >
    <path d="M457.43,125.94L244.42,2.96c-6.84-3.95-15.28-3.95-22.12,0L9.3,125.94c-5.75,3.32-9.3,9.46-9.3,16.11v247.99c0,6.65,3.55,12.79,9.3,16.11l213.01,122.98c6.84,3.95,15.28,3.95,22.12,0l213.01-122.98c5.75-3.32,9.3-9.46,9.3-16.11v-247.99c0-6.65-3.55-12.79-9.3-16.11h-.01ZM444.05,151.99l-205.63,356.16c-1.39,2.4-5.06,1.42-5.06-1.36v-233.21c0-4.66-2.49-8.97-6.53-11.31L24.87,145.67c-2.4-1.39-1.42-5.06,1.36-5.06h411.26c5.84,0,9.49,6.33,6.57,11.39h-.01Z" />
  </svg>
);

const PROVIDER_ICONS: Record<string, Icon> = {
  claudeAgent: ClaudeAI,
  codex: OpenAI,
  cursor: CursorIcon,
};

/** T3 `ProviderInstanceIcon`; `compact` is the sidebar row size. */
export function ProviderIcon(props: {
  providerInstanceId: string | null;
  className?: string;
}) {
  const Glyph = PROVIDER_ICONS[props.providerInstanceId ?? ""] ?? ClaudeAI;
  return <Glyph aria-hidden className={cn("size-5 shrink-0", props.className)} />;
}

// T3 ProjectMonogram with projectIconColors; MCP serves no favicons, so every project gets one.
const PROJECT_COLORS = [
  "text-blue-600 dark:text-blue-400",
  "text-emerald-600 dark:text-emerald-400",
  "text-violet-600 dark:text-violet-400",
  "text-orange-600 dark:text-orange-400",
  "text-pink-600 dark:text-pink-400",
  "text-teal-600 dark:text-teal-400",
];

export function ProjectFavicon(props: { project: ProjectSummary | undefined; className?: string }) {
  const title = props.project?.title ?? "?";
  const index = Math.max(0, mockProjects.findIndex((project) => project.id === props.project?.id));
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex size-4 shrink-0 items-center justify-center", props.className)}
    >
      <svg
        viewBox="0 0 16 16"
        className={cn(
          "size-full overflow-hidden rounded-[25%] font-mono select-none",
          PROJECT_COLORS[index % PROJECT_COLORS.length],
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
        >
          {title.charAt(0).toUpperCase()}
        </text>
      </svg>
    </span>
  );
}

// ---------------------------------------------------------------------------------------------
// Data helpers

export const projectOf = (projectId: string) =>
  mockProjects.find((project) => project.id === projectId);

const MODEL_LABELS: Record<string, string> = {
  "claude-opus-5-5": "Opus 5.5",
  "claude-sonnet-5-5": "Sonnet 5.5",
  "claude-haiku-5-5": "Haiku 5.5",
  "gpt-6.1-sol": "GPT-6.1 Sol",
  "gpt-6-astra": "GPT-6 Astra",
  "gpt-6.1-terra": "GPT-6.1 Terra",
  "gpt-6-luna": "GPT-6 Luna",
  auto: "Auto",
};

export const modelLabel = (model: string | null) => (model ? (MODEL_LABELS[model] ?? model) : "");

/** T3 `compactSidebarTimeLabel(formatRelativeTimeLabel(...))`. */
export function relativeLabel(iso: string) {
  const minutes = Math.floor((Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export type RowStatus = "approval" | "working" | "done" | "failed" | null;

export function rowStatus(thread: ThreadSummary): RowStatus {
  if (thread.pendingRequestCount > 0) return "approval";
  if (thread.status === "running") return "working";
  if (thread.status === "failed") return "failed";
  if (thread.fresh) return "done";
  return null;
}

// T3 `TOP_STATUS_ICONS` and the topStatus label/className table in SidebarThreadRow.
export const STATUS_PRESENTATION = {
  approval: { label: "Approval", Icon: ShieldQuestionIcon, className: "text-warning-foreground" },
  working: { label: "Working", Icon: CircleDashedIcon, className: "text-info-foreground" },
  done: { label: "Done", Icon: CircleCheckIcon, className: "text-success-foreground" },
  failed: { label: "Failed", Icon: CircleAlertIcon, className: "text-error-foreground" },
} as const;

// ---------------------------------------------------------------------------------------------
// Sidebar chrome (SidebarChrome.tsx, SidebarThreadHeader.tsx, ui/sidebar.tsx)

const sidebarMenuButtonClassName =
  "peer/menu-button flex cursor-pointer items-center gap-[var(--sidebar-control-gap)] overflow-hidden text-left outline-hidden ring-ring hover:bg-sidebar-row-hover hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-inset active:bg-sidebar-row-active [&>svg:not([class*='size-'])]:size-4 [&>svg]:shrink-0 [&>svg]:text-[var(--sidebar-icon-color)] hover:[&>svg]:text-sidebar-foreground font-medium text-sidebar-muted-foreground/80";

/** T3 `SidebarHeaderIconButton`: a `SidebarMenuButton size="icon"` at size-7. */
export function SidebarIconButton(props: ComponentProps<"button"> & { label: string }) {
  const { label, className, ...rest } = props;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        sidebarMenuButtonClassName,
        "relative size-7 shrink-0 justify-center rounded-[var(--control-radius)] p-0",
        className,
      )}
      {...rest}
    />
  );
}

/** The drawer itself: flush to the right screen edge, rounded only on the inner side. */
export function DrawerShell(props: { surface?: "sidebar" | "background"; children: ReactNode }) {
  return (
    <div className="absolute inset-0">
      <div
        className={cn(
          "absolute inset-y-0 right-0 flex w-[380px] flex-col overflow-hidden rounded-l-2xl border border-r-0 border-sidebar-border surface-grain text-sidebar-foreground",
          "shadow-[-18px_0_40px_-22px_rgb(0_0_0/45%)] dark:border-white/8 dark:shadow-[-18px_0_44px_-18px_rgb(0_0_0/85%)]",
          props.surface === "background" ? "bg-background" : "bg-sidebar",
        )}
      >
        {props.children}
      </div>
    </div>
  );
}

export function BrandMark(props: { mood: CompanionMood }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <CompanionMascot mood={props.mood} hopKey={0} size={22} className="-my-1 shrink-0" />
      <span className="inline-flex min-w-0 items-baseline gap-1 text-sm font-medium tracking-tight text-foreground">
        <T3Wordmark aria-label="T3" className="h-[1cap] w-auto shrink-0" />
        <span className="truncate [text-box:trim-both_cap_alphabetic] supports-[text-box:trim-both_cap_alphabetic]:py-1 text-muted-foreground">
          Code
        </span>
      </span>
    </span>
  );
}

/** `SidebarThreadHeader`: the search field and the new-thread button. */
export function SearchRow(props: { query?: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-sidebar-muted-foreground hover:bg-sidebar-row-hover hover:text-sidebar-foreground">
        <SearchIcon className="size-4 shrink-0 text-(--sidebar-icon-color)" />
        <span
          className={cn(
            "min-w-0 flex-1 truncate leading-normal",
            props.query ? "text-sidebar-foreground" : "text-sidebar-muted-foreground",
          )}
        >
          {props.query ?? "Search"}
        </span>
        <kbd className="pointer-events-none inline-flex h-5 min-w-5 items-center justify-center rounded bg-foreground/[0.07] px-1 font-sans text-xs font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </div>
      <div className="flex shrink-0 items-center">
        <SidebarIconButton label="New thread">
          <SquarePenIcon />
        </SidebarIconButton>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Thread rows (SidebarThreadRow.tsx)

const rowSurfaceClassName = (state: { hovered?: boolean; recede?: boolean; settled?: boolean }) =>
  cn(
    "group/sidebar-row relative w-full cursor-pointer overflow-hidden rounded-md text-left outline-none select-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
    state.settled && !state.hovered && "[&_*]:text-secondary-label",
    state.hovered
      ? "bg-sidebar-row-hover text-sidebar-foreground"
      : state.recede
        ? "text-sidebar-muted-foreground/75 hover:bg-sidebar-row-hover hover:text-sidebar-foreground"
        : "bg-transparent text-sidebar-foreground hover:bg-sidebar-row-hover",
  );

/** The card variant T3 uses for the active list and the Working shelf. */
export function ThreadCardRow(props: {
  thread: ThreadSummary;
  workingFor?: string;
  /** Draws the row in its hover state, so the static mock shows Snooze and Settle. */
  hovered?: boolean;
}) {
  const { thread } = props;
  const project = projectOf(thread.projectId);
  const status = rowStatus(thread);
  const presentation = status ? STATUS_PRESENTATION[status] : null;
  const recede = status === "working" || status === null;
  return (
    <li className="list-none py-0.5">
      <div
        role="button"
        tabIndex={0}
        className={cn(
          rowSurfaceClassName({ hovered: props.hovered, recede }),
          status === "working" && !props.hovered && "opacity-70",
        )}
      >
        <div className="relative z-10 h-auto px-(--sidebar-row-content-inset) py-(--sidebar-content-inset)">
          <div className="flex h-5 min-w-0 items-center gap-1.5">
            <ProjectFavicon project={project} className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate font-normal text-secondary-label text-xs">
              {project?.title}
            </span>
            <span className="relative ml-auto flex h-5 min-w-8 shrink-0 items-stretch justify-end text-xs">
              {props.hovered ? (
                <span className="flex items-stretch">
                  <span className="inline-flex cursor-pointer items-center rounded-md bg-transparent px-1.5 text-xs text-muted-foreground hover:text-foreground">
                    <AlarmClockIcon className="size-3.5" />
                  </span>
                  <span className="-mr-1 inline-flex cursor-pointer items-center gap-1 rounded-md bg-transparent px-1.5 text-xs text-muted-foreground hover:text-foreground">
                    <CheckIcon className="size-3.5" />
                    Settle
                  </span>
                </span>
              ) : (
                <span className="flex items-center self-center tabular-nums text-secondary-label">
                  {presentation ? (
                    <span
                      className={cn("inline-flex items-center gap-1 font-medium", presentation.className)}
                    >
                      <presentation.Icon aria-hidden className="size-4 shrink-0" />
                      {presentation.label}
                      {props.workingFor ? <span>{props.workingFor}</span> : null}
                    </span>
                  ) : (
                    relativeLabel(thread.updatedAt)
                  )}
                </span>
              )}
            </span>
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-start text-sm",
                recede ? "font-normal" : "font-medium",
                recede
                  ? "text-foreground/75 group-hover/sidebar-row:text-foreground"
                  : status === "failed"
                    ? "text-foreground/95"
                    : "text-foreground",
                props.hovered && "text-foreground",
              )}
            >
              {thread.title}
            </span>
            <span aria-hidden className="inline-flex shrink-0 items-center gap-1">
              <ProviderIcon
                providerInstanceId={thread.providerInstanceId}
                className="size-3.5 opacity-60"
              />
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}

/** The slim variant T3 uses on the Snoozed and Settled shelves. */
export function ThreadSlimRow(props: { thread: ThreadSummary; shelf: "snoozed" | "settled"; wake?: string }) {
  const { thread } = props;
  const project = projectOf(thread.projectId);
  return (
    <li className="list-none">
      <div
        role="button"
        tabIndex={0}
        className={cn(
          rowSurfaceClassName({ recede: true, settled: props.shelf === "settled" }),
          "flex h-9 items-center gap-2.5 px-2.5",
        )}
      >
        <span className="flex shrink-0 items-center opacity-40 grayscale transition-opacity group-hover/sidebar-row:opacity-100 group-hover/sidebar-row:grayscale-0">
          <ProjectFavicon project={project} className="size-4" />
        </span>
        <span className="min-w-0 flex-1 truncate text-start text-sm font-normal text-secondary-label group-hover/sidebar-row:text-foreground">
          {thread.title}
        </span>
        <span className="relative ml-auto flex h-6 min-w-8 shrink-0 items-center justify-end">
          <span className="inline-flex justify-end tabular-nums text-secondary-label transition-opacity group-hover/sidebar-row:opacity-0">
            {props.shelf === "snoozed" ? (
              <span className="inline-flex items-center gap-1 text-xs text-info-foreground tabular-nums">
                <AlarmClockIcon aria-hidden className="size-3" />
                {props.wake}
              </span>
            ) : (
              <span className="text-xs">{relativeLabel(thread.updatedAt)}</span>
            )}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 -mr-1 inline-flex items-center gap-1 rounded-md px-1.5 text-xs text-muted-foreground opacity-0 transition-opacity group-hover/sidebar-row:pointer-events-auto group-hover/sidebar-row:opacity-100">
            {props.shelf === "snoozed" ? (
              <AlarmClockIcon className="mb-px size-3" />
            ) : (
              <Undo2Icon className="mb-px size-3.5" />
            )}
          </span>
        </span>
      </div>
    </li>
  );
}

/** `SidebarSectionHeader`: a shelf toggle with a muted trailing count. */
export function ShelfHeader(props: {
  label: string;
  count: number;
  expanded: boolean;
  className?: string;
}) {
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

// ---------------------------------------------------------------------------------------------
// Chat (ChatHeader.tsx, TimelineUserMessageRow.tsx, TimelineAssistantRows.tsx, ChatMarkdown.tsx)

export function ChatHeader(props: { title: string; projectId: string; trailing?: ReactNode }) {
  return (
    <div className="relative flex h-[var(--workspace-topbar-height)] shrink-0 items-center gap-1 pr-2 pl-2">
      <Button variant="ghost" size="icon-sm" aria-label="Back to inbox" className="shrink-0">
        <ArrowLeftIcon className="size-4" />
      </Button>
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-clip text-sm">
        <span className="inline-flex shrink-0 items-center text-muted-foreground">
          <ProjectFavicon project={projectOf(props.projectId)} className="size-3.5" />
        </span>
        <ChevronRightIcon aria-hidden className="size-3 shrink-0 text-muted-foreground/60" />
        <h2 className="min-w-0 truncate font-medium text-foreground">{props.title}</h2>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">{props.trailing}</div>
    </div>
  );
}

export function UserBubble(props: { item: ThreadItem; meta?: string }) {
  return (
    <div className="group flex flex-col items-end gap-1">
      <div className="relative min-w-0 max-w-[85%] rounded-2xl bg-message p-3 text-message-foreground">
        <p className="text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] select-text">
          {props.item.text}
        </p>
      </div>
      {props.meta ? (
        <p className="me-1 text-muted-foreground text-xs tabular-nums">{props.meta}</p>
      ) : null}
    </div>
  );
}

export function AssistantMessage(props: { item: ThreadItem; meta?: string }) {
  return (
    <div className="relative min-w-0 px-1 py-0.5">
      <div className="chat-markdown w-full min-w-0 [overflow-wrap:anywhere] [word-break:break-word] text-sm leading-relaxed text-foreground/[calc(90%+var(--appearance-contrast-boost)/10)] select-text">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{props.item.text}</ReactMarkdown>
      </div>
      {props.meta ? (
        <div className="mt-1.5 flex items-center gap-2">
          <p className="text-muted-foreground text-xs tabular-nums">{props.meta}</p>
          <Button variant="ghost-muted" size="icon-micro" aria-label="Copy message">
            <CopyIcon />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** The collapsed work group T3 draws between a prompt and its answer. */
export function WorkedRow(props: { label: string }) {
  return (
    <div className="group/timeline-row border-b border-border/60 pb-2 pe-0.5 pt-1">
      <div className="relative flex items-center gap-1">
        <button
          type="button"
          className="flex cursor-pointer select-none items-center gap-1 rounded-md px-1 text-sm leading-relaxed text-muted-foreground tabular-nums transition-colors hover:text-foreground"
        >
          {props.label}
          <ChevronRightIcon className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Composer (ComposerSurface.tsx, ChatComposer.tsx, ComposerControl.tsx, ComposerPrimaryActions.tsx)

const composerShellClassName = cn(
  "@container/composer-surface group/composer-surface relative isolate w-full",
  "[--chat-composer-drawer-inset:1.375rem] [--chat-composer-glass-surface:var(--card)] [--chat-composer-outline:rgb(0_0_0/8%)]",
  "dark:[--chat-composer-glass-surface:var(--surface-raised)] dark:[--chat-composer-highlight:rgb(255_255_255/3%)] dark:[--chat-composer-outline:color-mix(in_srgb,var(--color-white)_5%,transparent)]",
);

const composerOutlineClassName =
  "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:border after:border-(--chat-composer-outline) dark:after:inset-shadow-2xs dark:after:inset-shadow-(color:--chat-composer-highlight)";

/** T3 `ComposerControl size="sm"` holding the provider model picker trigger. */
export function ModelChip(props: { providerInstanceId: string; model: string; effort: string; open?: boolean }) {
  return (
    <button
      type="button"
      data-pressed={props.open || undefined}
      className="relative inline-flex h-7 min-w-0 shrink cursor-pointer items-center justify-between gap-1.5 whitespace-nowrap rounded-(--control-radius) border border-transparent px-2 text-sm font-medium text-foreground/80 outline-none hover:bg-accent hover:text-foreground data-pressed:bg-accent [&_svg]:shrink-0"
    >
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <ProviderIcon providerInstanceId={props.providerInstanceId} className="size-4" />
        <span className="min-w-0 truncate">{modelLabel(props.model)}</span>
        <span className="font-normal text-muted-foreground">{props.effort}</span>
      </span>
      <ChevronDownIcon aria-hidden className="-me-0.5 size-3.5 text-muted-foreground" />
    </button>
  );
}

const SendArrow = () => (
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

export function Composer(props: {
  placeholder: string;
  draft?: string;
  running?: boolean;
  banner?: ReactNode;
  popup?: ReactNode;
  modelChip: ReactNode;
  context?: ReactNode;
}) {
  const hasContent = Boolean(props.draft);
  return (
    <div className={composerShellClassName}>
      {props.popup}
      {props.banner ? (
        <div className="mx-auto -mb-[calc(1rem+1px)] flex w-[calc(100%-2*var(--chat-composer-drawer-inset))] items-end gap-1">
          <div className="flex min-w-0 flex-1 flex-col">{props.banner}</div>
        </div>
      ) : null}
      <div
        className={cn(
          "relative z-10 w-full rounded-2xl shadow-composer dark:shadow-none",
          "before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-2xl before:bg-(--chat-composer-glass-surface)",
          composerOutlineClassName,
        )}
      >
        <div className="group relative z-10 rounded-2xl p-px">
          <div className="rounded-2xl">
            <div className="relative px-4 pt-3.5 pb-2">
              <div className="-m-1 block min-h-[calc(2lh+--spacing(2))] p-1 text-sm leading-relaxed whitespace-pre-wrap">
                {hasContent ? (
                  <span className="text-foreground">{props.draft}</span>
                ) : (
                  <span className="text-placeholder">{props.placeholder}</span>
                )}
              </div>
            </div>
            <div className="flex min-w-0 flex-nowrap items-center overflow-visible px-2 pb-2">
              <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-2">
                <div className="relative flex min-w-0 flex-1 items-center justify-start gap-0.5">
                  {props.modelChip}
                </div>
                <button
                  type="button"
                  disabled={!hasContent}
                  aria-label={props.running ? "Steer" : "Send"}
                  className="relative isolate flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-message-action text-message-action-foreground shadow-xs transition-all duration-150 enabled:cursor-pointer enabled:shadow-message-action/24 enabled:inset-shadow-control-highlight hover:bg-message-action-hover disabled:pointer-events-none disabled:bg-foreground/12 disabled:text-muted-foreground disabled:shadow-none [&_svg]:pointer-events-none"
                >
                  {props.running ? <CornerUpRightIcon className="size-4" /> : <SendArrow />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {props.context ? (
        <div className="relative flex w-full items-center gap-2 overflow-x-clip px-2 pt-2 text-muted-foreground">
          {props.context}
        </div>
      ) : null}
    </div>
  );
}

/** `ComposerBanner.Root` attached above the card, warning variant, approval row layout. */
export function ComposerApprovalBanner(props: { title: string; detail: string; action: ReactNode }) {
  return (
    <div
      data-composer-banner-surface="attached"
      data-variant="warning"
      className={cn(
        "[--chat-composer-attached-surface:var(--chat-composer-glass-surface,var(--card))]",
        "[--chat-composer-attached-outline:color-mix(in_srgb,var(--warning)_28%,transparent)] [--chat-composer-attached-tint:color-mix(in_srgb,var(--warning)_8%,transparent)]",
        "relative isolate min-w-0 border-0 bg-transparent px-1 py-1.5 text-xs/4 shadow-none",
        "before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-t-2xl before:border before:border-(--chat-composer-attached-outline)",
        "before:bg-(--chat-composer-attached-surface) before:bg-linear-to-b before:from-(--chat-composer-attached-tint) before:to-(--chat-composer-attached-tint)",
        "before:shadow-composer dark:before:shadow-composer-dark",
        "after:block after:h-[calc(1rem+1px)]",
      )}
    >
      <div className="grid w-full min-w-0 grid-cols-[--spacing(7)_minmax(0,1fr)] items-start gap-x-1 gap-y-2 text-start">
        <span
          aria-hidden
          className="col-start-1 row-start-1 flex w-7 flex-none items-center justify-center pt-0.5 text-warning [&>svg]:size-4"
        >
          <ShieldQuestionIcon />
        </span>
        <span className="col-start-2 row-start-1 flex min-w-0 flex-col gap-0.5 pe-2">
          <span className="font-medium text-foreground">{props.title}</span>
          <span className="text-muted-foreground">{props.detail}</span>
        </span>
        <span className="col-start-2 row-start-2 flex items-center gap-1.5 pe-1 pb-0.5">
          {props.action}
        </span>
      </div>
    </div>
  );
}
