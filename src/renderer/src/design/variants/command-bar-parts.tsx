import type { ProjectSummary, ThreadSummary } from "@shared/types";
import {
  AlarmClockIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowUpRightIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronUpIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  CopyIcon,
  SearchIcon,
  ShieldOffIcon,
  ShieldQuestionIcon,
  StarIcon,
} from "lucide-react";
import type { ComponentProps, ComponentType, ReactNode, SVGProps } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { CompanionMascot, type CompanionMood } from "../../components/Mascot";
import { Button } from "../../t3/ui/button";
import { Kbd, KbdGroup } from "../../t3/ui/kbd";
import { cn } from "../../t3/lib/utils";
import { mockProjects } from "../mock";

/* ------------------------------------------------------------------------------------------------
 * Panel shell. The window is transparent: the panel paints its own surface and shadow, and the
 * window adds a margin so the shadow is not clipped.
 * ---------------------------------------------------------------------------------------------- */

export const PANEL_WIDTH = 620;
/** Window margin around the panel: room for T3's popover shadow inside the transparent window. */
export const WINDOW_INSET = { x: 12, top: 8, bottom: 24 } as const;
export const windowSize = (panelHeight: number) => ({
  width: PANEL_WIDTH + WINDOW_INSET.x * 2,
  height: panelHeight + WINDOW_INSET.top + WINDOW_INSET.bottom,
});

/**
 * T3's command palette surface, made opaque. A backdrop blur over a playing video repaints every
 * frame, so the bar paints the solid canvas instead of `dialog-glass`.
 */
export function Panel(props: { children: ReactNode; className?: string }) {
  return (
    <div
      className="absolute"
      style={{
        left: WINDOW_INSET.x,
        right: WINDOW_INSET.x,
        top: WINDOW_INSET.top,
        bottom: WINDOW_INSET.bottom,
      }}
    >
      <div
        className={cn(
          "relative isolate flex size-full flex-col overflow-hidden rounded-2xl border border-border bg-background text-foreground",
          "shadow-[0_16px_40px_-18px_rgb(0_0_0/55%)] dark:shadow-[inset_0_1px_rgb(255_255_255/4%),0_18px_44px_-18px_rgb(0_0_0/80%)]",
          props.className,
        )}
      >
        {props.children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Icons copied from T3 Code (Icons.tsx, ProjectMonogram.tsx, EffortGlyph.tsx).
 * ---------------------------------------------------------------------------------------------- */

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

export const ClaudeAI: Icon = ({ className, ...props }) => (
  <svg {...props} preserveAspectRatio="xMidYMid" viewBox="0 0 256 257" className={cn("fill-[#d97757]", className)}>
    <path d="m50.228 170.321 50.357-28.257.843-2.463-.843-1.361h-2.462l-8.426-.518-28.775-.778-24.952-1.037-24.175-1.296-6.092-1.297L0 125.796l.583-3.759 5.12-3.434 7.324.648 16.202 1.101 24.304 1.685 17.629 1.037 26.118 2.722h4.148l.583-1.685-1.426-1.037-1.101-1.037-25.147-17.045-27.22-18.017-14.258-10.37-7.713-5.25-3.888-4.925-1.685-10.758 7-7.713 9.397.649 2.398.648 9.527 7.323 20.35 15.75L94.817 91.9l3.889 3.24 1.555-1.102.195-.777-1.75-2.917-14.453-26.118-15.425-26.572-6.87-11.018-1.814-6.61c-.648-2.723-1.102-4.991-1.102-7.778l7.972-10.823L71.42 0 82.05 1.426l4.472 3.888 6.61 15.101 10.694 23.786 16.591 32.34 4.861 9.592 2.592 8.879.973 2.722h1.685v-1.556l1.36-18.211 2.528-22.36 2.463-28.776.843-8.1 4.018-9.722 7.971-5.25 6.222 2.981 5.12 7.324-.713 4.73-3.046 19.768-5.962 30.98-3.889 20.739h2.268l2.593-2.593 10.499-13.934 17.628-22.036 7.778-8.749 9.073-9.657 5.833-4.601h11.018l8.1 12.055-3.628 12.443-11.342 14.388-9.398 12.184-13.48 18.147-8.426 14.518.778 1.166 2.01-.194 30.46-6.481 16.462-2.982 19.637-3.37 8.88 4.148.971 4.213-3.5 8.62-20.998 5.184-24.628 4.926-36.682 8.685-.454.324.519.648 16.526 1.555 7.065.389h17.304l32.21 2.398 8.426 5.574 5.055 6.805-.843 5.184-12.962 6.611-17.498-4.148-40.83-9.721-14-3.5h-1.944v1.167l11.666 11.406 21.387 19.314 26.767 24.887 1.36 6.157-3.434 4.86-3.63-.518-23.526-17.693-9.073-7.972-20.545-17.304h-1.36v1.814l4.73 6.935 25.017 37.59 1.296 11.536-1.814 3.76-6.481 2.268-7.13-1.297-14.647-20.544-15.1-23.138-12.185-20.739-1.49.843-7.194 77.448-3.37 3.953-7.778 2.981-6.48-4.925-3.436-7.972 3.435-15.749 4.148-20.544 3.37-16.333 3.046-20.285 1.815-6.74-.13-.454-1.49.194-15.295 20.999-23.267 31.433-18.406 19.702-4.407 1.75-7.648-3.954.713-7.064 4.277-6.286 25.47-32.405 15.36-20.092 9.917-11.6-.065-1.686h-.583L44.07 198.125l-12.055 1.555-5.185-4.86.648-7.972 2.463-2.593 20.35-13.999-.064.065Z" />
  </svg>
);

export const OpenAI: Icon = ({ className, ...props }) => (
  <svg {...props} preserveAspectRatio="xMidYMid" viewBox="100 100 411 411" className={cn("fill-current", className)}>
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

export function ProviderIcon(props: { providerInstanceId: string | null; className?: string }) {
  const Glyph =
    props.providerInstanceId === "codex" ? OpenAI : props.providerInstanceId === "cursor" ? CursorIcon : ClaudeAI;
  return <Glyph aria-hidden className={cn("size-4 shrink-0", props.className)} />;
}

const PROJECT_COLOR: Record<string, string> = {
  "p-t3": "text-blue-600 dark:text-blue-400",
  "p-dash": "text-emerald-600 dark:text-emerald-400",
  "p-recall": "text-violet-600 dark:text-violet-400",
  "p-rp": "text-orange-600 dark:text-orange-400",
  "p-agents": "text-pink-600 dark:text-pink-400",
};

function monogramText(title: string) {
  const parts = title
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[\s\-_]+/)
    .filter(Boolean);
  const text = parts.length > 1 ? `${parts[0]![0]}${parts[1]![0]}` : title.slice(0, 2);
  return text.toUpperCase();
}

/** T3's ProjectMonogram: MCP serves no favicons, so every project gets its tile. */
export function ProjectMonogram(props: { projectId: string; className?: string }) {
  const project = projectById(props.projectId);
  const text = monogramText(project.title);
  return (
    <span aria-hidden className={cn("inline-flex size-4 shrink-0 items-center justify-center", props.className)}>
      <svg
        viewBox="0 0 16 16"
        className={cn(
          "size-full overflow-hidden rounded-[25%] font-mono select-none",
          PROJECT_COLOR[project.id] ?? "text-gray-600 dark:text-gray-400",
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

/** T3's effort bars: one per level, filled up to the current one. */
export function EffortGlyph(props: { count: number; filled: number }) {
  const height = 14;
  const maxBar = height - 2;
  const width = 4 * props.count - 2;
  const step = Math.max(1, Math.round(maxBar / 2 / Math.max(props.count - 1, 1)));
  return (
    <svg aria-hidden width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ width, height }} className="shrink-0 text-current">
      {Array.from({ length: props.count }, (_, index) => {
        const barHeight = maxBar - (props.count - 1 - index) * step;
        return (
          <rect key={index} x={index * 4} y={maxBar - barHeight} width={2} height={barHeight} fill="currentColor" opacity={index < props.filled ? 1 : 0.4} />
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Data helpers.
 * ---------------------------------------------------------------------------------------------- */

export function projectById(projectId: string): ProjectSummary {
  return mockProjects.find((project) => project.id === projectId) ?? mockProjects[0]!;
}

export function modelLabel(model: string | null) {
  if (!model) return "Choose model";
  const claude = /^claude-(\w+)-(\d+)-(\d+)$/.exec(model);
  if (claude) return `${claude[1]![0]!.toUpperCase()}${claude[1]!.slice(1)} ${claude[2]}.${claude[3]}`;
  const gpt = /^gpt-([\d.]+)-(\w+)$/.exec(model);
  if (gpt) return `GPT-${gpt[1]} ${gpt[2]![0]!.toUpperCase()}${gpt[2]!.slice(1)}`;
  return model === "auto" ? "Auto" : model;
}

export function relativeTime(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export function wakeLabel(iso: string) {
  const hours = Math.round((Date.parse(iso) - Date.now()) / 3_600_000);
  return hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
}

/* ------------------------------------------------------------------------------------------------
 * Status, copied from SidebarThreadRow's TOP_STATUS_ICONS and topStatus.
 * ---------------------------------------------------------------------------------------------- */

const TOP_STATUS = {
  approval: { label: "Approval", icon: ShieldQuestionIcon, className: "text-warning-foreground" },
  working: { label: "Working", icon: CircleDashedIcon, className: "text-info-foreground" },
  failed: { label: "Failed", icon: CircleAlertIcon, className: "text-error-foreground" },
  done: { label: "Done", icon: CircleCheckIcon, className: "text-success-foreground" },
} as const;
export type TopStatusKind = keyof typeof TOP_STATUS;

export function topStatusOf(thread: ThreadSummary): TopStatusKind | null {
  if (thread.pendingRequestCount > 0) return "approval";
  if (["preparing", "queued", "starting", "running", "waiting"].includes(thread.status)) return "working";
  if (thread.status === "failed") return "failed";
  return thread.unread ? "done" : null;
}

export function TopStatus(props: { kind: TopStatusKind; className?: string }) {
  const status = TOP_STATUS[props.kind];
  const StatusIcon = status.icon;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 text-xs font-medium", status.className, props.className)}>
      <StatusIcon aria-hidden className="size-3 shrink-0" />
      {status.label}
    </span>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Composer, copied from ComposerSurface (Host + Main), ChatComposer's body/footer, ComposerControl,
 * ProviderModelPicker's trigger and ComposerPrimaryActions' send and stop buttons.
 * ---------------------------------------------------------------------------------------------- */

const composerOutline =
  "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:border after:border-(--chat-composer-outline) dark:after:inset-shadow-2xs dark:after:inset-shadow-(color:--chat-composer-highlight)";

const composerVars =
  "[--chat-composer-outline:rgb(0_0_0/8%)] dark:[--chat-composer-highlight:rgb(255_255_255/3%)] dark:[--chat-composer-outline:color-mix(in_srgb,var(--color-white)_5%,transparent)]";

/** ComposerControl at size sm, with T3's sm: values applied directly so it holds in a narrow window. */
export const composerControlClassName =
  "relative inline-flex h-7 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-(--control-radius) border border-transparent px-2 text-sm font-medium text-foreground/80 outline-none hover:bg-accent hover:text-foreground data-pressed:bg-accent data-pressed:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='text-'])]:text-muted-foreground";

export function ComposerControl({ className, pressed, ...props }: ComponentProps<"button"> & { pressed?: boolean }) {
  return (
    <button
      type="button"
      data-pressed={pressed || undefined}
      className={cn(composerControlClassName, className)}
      {...props}
    />
  );
}

export function ProjectChip(props: { projectId: string }) {
  const project = projectById(props.projectId);
  return (
    <ComposerControl aria-label={`Project: ${project.title}`} className="ps-1.5 pe-1.5">
      <ProjectMonogram projectId={project.id} />
      <span className="max-w-36 truncate">{project.title}</span>
      <ChevronDownIcon className="-ms-0.5 size-3.5" />
    </ComposerControl>
  );
}

export function ModelChip(props: {
  providerInstanceId: string | null;
  model: string | null;
  effort?: { count: number; filled: number } | null;
  pressed?: boolean;
}) {
  return (
    <ComposerControl pressed={props.pressed} aria-label={`Model: ${modelLabel(props.model)}`} className="pe-2">
      <ProviderIcon providerInstanceId={props.providerInstanceId} />
      <span className="min-w-0 max-w-40 truncate">{modelLabel(props.model)}</span>
      {props.effort ? (
        <span className={cn("-ms-0.5 flex shrink-0 items-center text-muted-foreground", props.pressed && "text-foreground")}>
          <EffortGlyph count={props.effort.count} filled={props.effort.filled} />
        </span>
      ) : null}
    </ComposerControl>
  );
}

export function SendButton(props: { enabled: boolean }) {
  return (
    <button
      type="button"
      aria-label="Start thread"
      disabled={!props.enabled}
      className={cn(
        "relative isolate flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-xs transition-all duration-150 enabled:cursor-pointer enabled:inset-shadow-control-highlight hover:scale-105 disabled:pointer-events-none disabled:shadow-none",
        "bg-message-action text-message-action-foreground enabled:shadow-message-action/24 hover:bg-message-action-hover disabled:bg-foreground/12 disabled:text-muted-foreground",
      )}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <path d="M7 11.5V2.5M7 2.5L3 6.5M7 2.5L11 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export function StopButton() {
  return (
    <button
      type="button"
      aria-label="Stop generation"
      className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-destructive/90 text-white shadow-xs shadow-destructive/24 inset-shadow-control-highlight transition-colors duration-150 hover:bg-destructive"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
        <rect x="2" y="2" width="8" height="8" rx="1.5" />
      </svg>
    </button>
  );
}

/** A caret drawn once, never blinking: the bar idles at zero frames. */
function Caret() {
  return <span aria-hidden className="pointer-events-none absolute top-[0.2em] left-0 h-[1.15em] w-px bg-foreground" />;
}

export function Composer(props: {
  size: "hero" | "reply";
  text?: string;
  placeholder: string;
  focused?: boolean;
  left?: ReactNode;
  right: ReactNode;
  action: ReactNode;
  banner?: ReactNode;
}) {
  const prompt = props.text ? (
    <span className="text-foreground">
      {props.text}
      {props.focused ? <span aria-hidden className="ms-px inline-block h-[1.15em] w-px translate-y-[0.2em] bg-foreground" /> : null}
    </span>
  ) : (
    <>
      {props.focused ? <Caret /> : null}
      <span className="pointer-events-none text-placeholder">{props.placeholder}</span>
    </>
  );
  return (
    <div className={cn("relative isolate w-full", composerVars)}>
      {props.banner}
      <div
        className={cn(
          "relative z-10 w-full rounded-2xl bg-card shadow-composer after:z-1 dark:shadow-none",
          composerOutline,
        )}
      >
        {props.size === "hero" ? (
          <>
            <div className="relative px-4 pt-4 pb-2">
              <div className="relative min-h-[calc(2lh)] whitespace-pre-wrap wrap-break-word text-base leading-relaxed">{prompt}</div>
            </div>
            <div className="flex min-w-0 flex-nowrap items-center px-2 pb-2">
              <div className="flex min-w-0 items-center gap-0.5">{props.left}</div>
              <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-2">
                <div className="relative flex min-w-0 flex-1 items-center justify-end gap-0.5">{props.right}</div>
                {props.action}
              </div>
            </div>
          </>
        ) : (
          // ChatComposer's collapsed prompt row: one line until the reply grows.
          <div className="flex items-center justify-between gap-2 py-2 ps-4 pe-2">
            <div className="relative min-w-0 flex-1 truncate text-sm leading-relaxed">{prompt}</div>
            <div className="flex shrink-0 items-center gap-0.5">{props.right}</div>
            {props.action}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * An approval notice attached above the composer: ComposerBanner.Root, warning variant, tucked
 * under the card by the composer seam overlap.
 */
export function ApprovalBanner(props: { title: string; description: string; action: ReactNode }) {
  return (
    <div className="relative mx-[1.375rem] -mb-[calc(1rem+1px)]">
      <div
        role="alert"
        className={cn(
          "relative isolate rounded-t-2xl border border-warning/28 bg-card px-1 pt-1 text-xs/4 shadow-composer dark:shadow-composer-dark",
          "before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-t-2xl before:bg-warning/8",
        )}
      >
        <div className="grid min-h-7 w-full min-w-0 grid-cols-[--spacing(7)_minmax(0,1fr)_auto] items-center gap-x-1 py-0.5">
          <span aria-hidden className="flex w-7 items-center justify-center self-start pt-1.5 text-warning">
            <ShieldQuestionIcon className="size-4" />
          </span>
          <span className="flex min-w-0 flex-col py-1">
            <span className="truncate font-medium text-foreground">{props.title}</span>
            <span className="truncate text-muted-foreground">{props.description}</span>
          </span>
          <span className="flex items-center justify-end gap-1.5 pe-1">{props.action}</span>
        </div>
        <div aria-hidden className="h-[calc(1rem+1px)]" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Palette list rows, copied from CommandPaletteResults and the folder variant of SidebarThreadRow.
 * ---------------------------------------------------------------------------------------------- */

/** AutocompleteGroupLabel / CommandListHeading. */
export function GroupLabel(props: { children: ReactNode; trailing?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 font-medium text-muted-foreground text-xs">
      <span className="min-w-0 truncate">{props.children}</span>
      {props.trailing ? <span className="ms-auto shrink-0 tabular-nums text-muted-foreground/70">{props.trailing}</span> : null}
    </div>
  );
}

export function ThreadRow(props: {
  thread: ThreadSummary;
  active?: boolean;
  showProject?: boolean;
  trailing?: ReactNode;
  recede?: boolean;
}) {
  const { thread } = props;
  const status = topStatusOf(thread);
  const project = projectById(thread.projectId);
  return (
    <div
      role="option"
      aria-selected={props.active || undefined}
      className={cn(
        "group/row flex h-8 cursor-pointer select-none items-center gap-2 rounded-sm px-2 text-sm outline-none",
        props.active ? "bg-accent text-accent-foreground" : "hover:bg-foreground/[0.06]",
      )}
    >
      <span className="flex h-5 shrink-0 items-center">
        <ProjectMonogram projectId={thread.projectId} />
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <span
          className={cn(
            "truncate",
            props.recede ? "text-foreground/75" : "text-foreground",
            thread.unread && "font-medium",
          )}
        >
          {thread.title}
        </span>
        {props.showProject !== false ? (
          <span className="max-w-[45%] shrink-0 truncate text-muted-foreground/70 text-xs">{project.title}</span>
        ) : null}
      </span>
      {props.trailing ??
        (status ? (
          <TopStatus kind={status} />
        ) : (
          <span className="min-w-8 shrink-0 text-right text-xs tabular-nums text-secondary-label">
            {relativeTime(thread.updatedAt)}
          </span>
        ))}
    </div>
  );
}

export function SnoozeWake(props: { until: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-xs text-info-foreground tabular-nums">
      <AlarmClockIcon aria-hidden className="size-3" />
      {wakeLabel(props.until)}
    </span>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Footer, copied from CommandFooter + CommandPaletteContent's KbdGroups.
 * ---------------------------------------------------------------------------------------------- */

export function Footer(props: { hints: ReadonlyArray<{ keys: ReactNode[]; label: string }>; trailing?: ReactNode }) {
  return (
    <div className="relative flex h-10 shrink-0 items-center justify-between gap-2 border-t border-foreground/[0.07] bg-foreground/[0.025] px-4 font-medium text-sm text-muted-foreground [&_[data-slot=kbd-group]]:font-sans [&_[data-slot=kbd]]:bg-foreground/[0.08] [&_[data-slot=kbd]]:text-foreground [&_[data-slot=kbd]]:ring-0">
      <div className="flex min-w-0 items-center gap-3 text-xs">
        {props.hints.map((hint) => (
          <KbdGroup key={hint.label}>
            {hint.keys.map((key, index) => (
              <Kbd key={index}>{key}</Kbd>
            ))}
            <span>{hint.label}</span>
          </KbdGroup>
        ))}
      </div>
      {props.trailing}
    </div>
  );
}

export const kbdArrows = [<ArrowUpIcon key="up" />, <ArrowDownIcon key="down" />];

/** The blob signs the footer and carries the mood, so the bar still reads as the companion. */
export function FooterMood(props: { mood: CompanionMood; summary: ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-xs">
      <span className="truncate">{props.summary}</span>
      <CompanionMascot mood={props.mood} hopKey={0} size={22} className="-my-1 shrink-0" />
    </span>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Thread pane: header, T3 timeline rows (TimelineUserMessageRow, TimelineAssistantRows, ChatMarkdown).
 * ---------------------------------------------------------------------------------------------- */

export function OpenInT3Button(props: { variant?: "outline" | "default" }) {
  return (
    <Button size="xs" variant={props.variant ?? "outline"}>
      Open in T3 Code
      <ArrowUpRightIcon />
    </Button>
  );
}

export function ThreadHeader(props: { title: string; projectId: string; status: TopStatusKind | null; meta?: ReactNode }) {
  const project = projectById(props.projectId);
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border/70 ps-2 pe-3">
      <Button size="icon-xs" variant="ghost-muted" aria-label="Back to the bar">
        <ChevronLeftIcon />
      </Button>
      <ProjectMonogram projectId={props.projectId} />
      <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
        <span className="truncate text-sm font-medium text-foreground">{props.title}</span>
        <span className="shrink-0 truncate text-muted-foreground/70 text-xs">{project.title}</span>
      </div>
      {props.meta}
      {props.status ? <TopStatus kind={props.status} /> : null}
      <OpenInT3Button />
    </div>
  );
}

export function UserMessage(props: { text: string }) {
  return (
    <div className="flex flex-col items-end">
      <div className="relative min-w-0 max-w-[80%] whitespace-pre-wrap rounded-2xl bg-message p-3 text-sm leading-relaxed text-message-foreground">
        {props.text}
      </div>
    </div>
  );
}

export function AssistantMessage(props: { text: string; time?: string; showMeta?: boolean }) {
  return (
    <div className="relative min-w-0 px-1 py-0.5">
      <div className="chat-markdown w-full min-w-0 text-sm leading-relaxed text-foreground/90 [overflow-wrap:anywhere] [word-break:break-word] select-text">
        <Markdown remarkPlugins={[remarkGfm]}>{props.text}</Markdown>
      </div>
      {props.showMeta ? (
        <div className="mt-1.5 flex items-center gap-2 text-xs tabular-nums">
          <Button size="icon-xs" variant="ghost-muted" aria-label="Copy message" className="-ms-1.5">
            <CopyIcon className="size-3.5" />
          </Button>
          <p className="text-muted-foreground text-xs tabular-nums">{props.time}</p>
        </div>
      ) : null}
    </div>
  );
}

/** Long threads open scrolled to the newest turn; the fade marks the clipped top. */
export function Timeline(props: { children: ReactNode }) {
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div className="flex h-full flex-col justify-end gap-4 px-4 pt-3 pb-4 [mask-image:linear-gradient(to_bottom,transparent,black_2.5rem)]">
        {props.children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Model picker popup, copied from ProviderModelPicker (docked), ModelPickerSidebar, ModelListRow,
 * ComposerModelEffort's effort column and ComposerPickerFooter.
 * ---------------------------------------------------------------------------------------------- */

const COLUMN_ROW =
  "flex h-8 w-full shrink-0 cursor-pointer items-center gap-2 rounded-sm px-2 text-left text-sm text-foreground outline-none hover:bg-foreground/[0.09]";

function PickerProviderButton(props: { children: ReactNode; label: string; selected?: boolean }) {
  return (
    <div className="relative w-full">
      {props.selected ? <div className="pointer-events-none absolute top-[0.6875rem] right-1 z-10 h-5 w-0.75 rounded-full bg-primary" /> : null}
      <button
        type="button"
        aria-label={props.label}
        aria-pressed={props.selected}
        className="relative isolate flex aspect-square w-full cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-foreground/10"
      >
        {props.children}
      </button>
    </div>
  );
}

function PickerModelRow(props: { providerInstanceId: string; model: string; selected?: boolean; highlighted?: boolean; favorite?: boolean }) {
  const full = props.providerInstanceId === "claudeAgent" ? `Claude ${modelLabel(props.model)}` : modelLabel(props.model);
  return (
    <div
      role="option"
      aria-selected={props.selected}
      className={cn(
        "group flex min-h-7 w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-sm outline-none",
        props.highlighted ? "bg-foreground/[0.09] text-accent-foreground" : "hover:bg-foreground/[0.09]",
      )}
    >
      <ProviderIcon providerInstanceId={props.providerInstanceId} />
      <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <div className="min-w-0 truncate text-sm font-normal leading-snug">{full}</div>
        {props.selected ? <CheckIcon className="size-3.5 shrink-0" aria-hidden /> : null}
      </div>
      <StarIcon
        aria-hidden
        className={cn("size-3 shrink-0", props.favorite ? "fill-current text-warning" : "text-muted-foreground opacity-0 group-hover:opacity-100")}
      />
    </div>
  );
}

export function ModelPickerPopup(props: { className?: string }) {
  const efforts = ["Low", "Medium", "High", "Max"];
  return (
    <div
      className={cn(
        "dropdown-glass relative flex flex-col overflow-hidden rounded-lg text-popover-foreground",
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
        "shadow-[0_16px_40px_-18px_rgb(0_0_0/55%)] dark:shadow-[0_18px_44px_-18px_rgb(0_0_0/80%)]",
        props.className,
      )}
    >
      <div className="flex h-60 min-h-0">
        <div className="relative flex w-80 flex-row overflow-hidden">
          <div className="w-11 shrink-0 overflow-hidden bg-muted/30">
            <div className="relative flex min-h-full flex-col gap-1 p-1">
              <PickerProviderButton label="Favorites">
                <StarIcon className="size-5 shrink-0 fill-current text-muted-foreground" aria-hidden />
              </PickerProviderButton>
              <div className="border-b border-border/70" aria-hidden />
              <PickerProviderButton label="Claude" selected>
                <ClaudeAI className="size-5" />
              </PickerProviderButton>
              <PickerProviderButton label="Codex">
                <OpenAI className="size-5" />
              </PickerProviderButton>
              <PickerProviderButton label="Cursor">
                <CursorIcon className="size-5" />
              </PickerProviderButton>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-l border-border/70 bg-muted/40">
            <div className="min-w-0 shrink-0 px-3 pt-2.5">
              <div className="relative -translate-y-px border-b border-border/70 pb-1.5">
                <SearchIcon className="pointer-events-none absolute top-1.5 left-0 size-4 shrink-0 text-muted-foreground/55" />
                <div className="flex h-6.5 items-center ps-5 text-sm text-placeholder">Search models...</div>
              </div>
            </div>
            <div className="flex flex-col gap-0.5 py-1.5 pr-px pl-2">
              <PickerModelRow providerInstanceId="claudeAgent" model="claude-opus-5-5" selected highlighted favorite />
              <PickerModelRow providerInstanceId="claudeAgent" model="claude-sonnet-5-5" favorite />
              <PickerModelRow providerInstanceId="claudeAgent" model="claude-haiku-5-5" />
            </div>
          </div>
        </div>
        <div className="flex min-h-0 w-44 shrink-0 flex-col border-l border-border/70 bg-muted/40">
          <div className="shrink-0 px-3 pt-2.5">
            <div className="flex h-8.25 -translate-y-px items-center gap-2 border-b border-border/70 pb-1.5 text-sm">
              <span className="text-muted-foreground">Effort</span>
              <span className="ms-auto min-w-0 truncate text-muted-foreground text-xs">Opus 5.5</span>
            </div>
          </div>
          <div role="radiogroup" aria-label="Effort" className="flex min-h-0 flex-1 flex-col gap-0.5 px-2 pt-2.5 pb-1.5">
            {efforts.map((effort) => (
              <button key={effort} type="button" role="radio" aria-checked={effort === "High"} className={COLUMN_ROW}>
                <span className="min-w-0 flex-1 truncate">{effort}</span>
                {effort === "High" ? <CheckIcon aria-hidden className="size-3.5" /> : null}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border/70 bg-muted/40 px-3 py-2">
        <span className="text-muted-foreground text-xs">Applies to the next thread</span>
        <button
          type="button"
          aria-label="Permissions: Full access"
          className="ms-auto flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-muted-foreground text-xs outline-none hover:bg-foreground/[0.09] hover:text-foreground"
        >
          <ShieldOffIcon aria-hidden className="size-3.5" />
          Full access
          <ChevronUpIcon aria-hidden className="size-3" />
        </button>
      </div>
    </div>
  );
}
