import type { ThreadItem, ThreadSummary } from "@shared/types";
import {
  AlarmClockIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronsDownUpIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  ClockIcon,
  CopyIcon,
  ShieldQuestionIcon,
  SquareArrowOutUpRightIcon,
  SquarePenIcon,
} from "lucide-react";
import type { ReactNode, SVGProps } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { CompanionMascot, type CompanionMood } from "../../components/Mascot";
import { modelLabel, relativeTime } from "../../lib/format";
import { cn } from "../../t3/lib/utils";
import { Button } from "../../t3/ui/button";
import { CollapsibleSectionHeader } from "../../t3/ui/collapsible-section-header";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../../t3/ui/input-group";
import { mockProjects } from "../mock";

/* Provider marks, copied from T3 Code's components/Icons.tsx. */

function ClaudeGlyph({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} preserveAspectRatio="xMidYMid" viewBox="0 0 256 257" className={cn("fill-[#d97757]", className)}>
      <path d="m50.228 170.321 50.357-28.257.843-2.463-.843-1.361h-2.462l-8.426-.518-28.775-.778-24.952-1.037-24.175-1.296-6.092-1.297L0 125.796l.583-3.759 5.12-3.434 7.324.648 16.202 1.101 24.304 1.685 17.629 1.037 26.118 2.722h4.148l.583-1.685-1.426-1.037-1.101-1.037-25.147-17.045-27.22-18.017-14.258-10.37-7.713-5.25-3.888-4.925-1.685-10.758 7-7.713 9.397.649 2.398.648 9.527 7.323 20.35 15.75L94.817 91.9l3.889 3.24 1.555-1.102.195-.777-1.75-2.917-14.453-26.118-15.425-26.572-6.87-11.018-1.814-6.61c-.648-2.723-1.102-4.991-1.102-7.778l7.972-10.823L71.42 0 82.05 1.426l4.472 3.888 6.61 15.101 10.694 23.786 16.591 32.34 4.861 9.592 2.592 8.879.973 2.722h1.685v-1.556l1.36-18.211 2.528-22.36 2.463-28.776.843-8.1 4.018-9.722 7.971-5.25 6.222 2.981 5.12 7.324-.713 4.73-3.046 19.768-5.962 30.98-3.889 20.739h2.268l2.593-2.593 10.499-13.934 17.628-22.036 7.778-8.749 9.073-9.657 5.833-4.601h11.018l8.1 12.055-3.628 12.443-11.342 14.388-9.398 12.184-13.48 18.147-8.426 14.518.778 1.166 2.01-.194 30.46-6.481 16.462-2.982 19.637-3.37 8.88 4.148.971 4.213-3.5 8.62-20.998 5.184-24.628 4.926-36.682 8.685-.454.324.519.648 16.526 1.555 7.065.389h17.304l32.21 2.398 8.426 5.574 5.055 6.805-.843 5.184-12.962 6.611-17.498-4.148-40.83-9.721-14-3.5h-1.944v1.167l11.666 11.406 21.387 19.314 26.767 24.887 1.36 6.157-3.434 4.86-3.63-.518-23.526-17.693-9.073-7.972-20.545-17.304h-1.36v1.814l4.73 6.935 25.017 37.59 1.296 11.536-1.814 3.76-6.481 2.268-7.13-1.297-14.647-20.544-15.1-23.138-12.185-20.739-1.49.843-7.194 77.448-3.37 3.953-7.778 2.981-6.48-4.925-3.436-7.972 3.435-15.749 4.148-20.544 3.37-16.333 3.046-20.285 1.815-6.74-.13-.454-1.49.194-15.295 20.999-23.267 31.433-18.406 19.702-4.407 1.75-7.648-3.954.713-7.064 4.277-6.286 25.47-32.405 15.36-20.092 9.917-11.6-.065-1.686h-.583L44.07 198.125l-12.055 1.555-5.185-4.86.648-7.972 2.463-2.593 20.35-13.999-.064.065Z" />
    </svg>
  );
}

function OpenAIGlyph({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} preserveAspectRatio="xMidYMid" viewBox="100 100 411 411" className={cn("fill-current", className)}>
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
    <svg {...props} viewBox="0 0 466.73 532.09" className={cn("fill-[#26251E] dark:fill-[#EDECEC]", className)}>
      <path d="M457.43,125.94L244.42,2.96c-6.84-3.95-15.28-3.95-22.12,0L9.3,125.94c-5.75,3.32-9.3,9.46-9.3,16.11v247.99c0,6.65,3.55,12.79,9.3,16.11l213.01,122.98c6.84,3.95,15.28,3.95,22.12,0l213.01-122.98c5.75-3.32,9.3-9.46,9.3-16.11v-247.99c0-6.65-3.55-12.79-9.3-16.11h-.01ZM444.05,151.99l-205.63,356.16c-1.39,2.4-5.06,1.42-5.06-1.36v-233.21c0-4.66-2.49-8.97-6.53-11.31L24.87,145.67c-2.4-1.39-1.42-5.06,1.36-5.06h411.26c5.84,0,9.49,6.33,6.57,11.39h-.01Z" />
    </svg>
  );
}

export function ProviderGlyph(props: { providerId: string | null; className?: string }) {
  const className = cn("shrink-0", props.className);
  if (props.providerId === "codex") return <OpenAIGlyph aria-hidden className={cn("text-black dark:text-white", className)} />;
  if (props.providerId === "cursor") return <CursorGlyph aria-hidden className={className} />;
  return <ClaudeGlyph aria-hidden className={className} />;
}

/* Project monogram, copied from T3 Code's ProjectMonogram.tsx with its icon colour classes. */

const MONOGRAM_COLORS = [
  "text-blue-600 dark:text-blue-400",
  "text-violet-600 dark:text-violet-400",
  "text-emerald-600 dark:text-emerald-400",
  "text-amber-600 dark:text-amber-400",
  "text-pink-600 dark:text-pink-400",
  "text-cyan-600 dark:text-cyan-400",
] as const;

export function projectTitle(projectId: string): string {
  return mockProjects.find((project) => project.id === projectId)?.title ?? projectId;
}

export function ProjectMonogram(props: { title: string; className?: string }) {
  let hash = 0;
  for (const char of props.title) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const color = MONOGRAM_COLORS[hash % MONOGRAM_COLORS.length];
  return (
    <span aria-hidden className={cn("inline-flex size-4 shrink-0 items-center justify-center", props.className)}>
      <svg
        viewBox="0 0 16 16"
        className={cn("size-full overflow-hidden rounded-[25%] font-mono select-none", color)}
        style={{ backgroundColor: "color-mix(in srgb, currentColor 14%, transparent)" }}
      >
        <text x="8" y="10.8" textAnchor="middle" fill="currentColor" className="font-mono" fontSize="8.25" fontWeight="700" textLength={6} lengthAdjust="spacingAndGlyphs">
          {props.title.charAt(0).toUpperCase()}
        </text>
      </svg>
    </span>
  );
}

/* Status, from T3 Code's SidebarThreadRow TOP_STATUS_ICONS and its topStatus tones. */

type Status = { label: string; icon: typeof CircleCheckIcon; className: string; duration?: string };

export function threadStatus(thread: ThreadSummary): Status | null {
  if (thread.pendingRequestCount > 0) return { label: "Approval", icon: ShieldQuestionIcon, className: "text-warning-foreground" };
  if (thread.status === "failed") return { label: "Failed", icon: CircleAlertIcon, className: "text-error-foreground" };
  if (thread.status === "running") {
    return { label: "Working", icon: CircleDashedIcon, className: "text-info-foreground", duration: relativeTime(thread.updatedAt).replace("now", "1m") };
  }
  if (thread.snoozed) return { label: "Snoozed", icon: AlarmClockIcon, className: "text-info-foreground" };
  if (thread.unread) return { label: "Done", icon: CircleCheckIcon, className: "text-success-foreground" };
  return null;
}

export function StatusLabel(props: { thread: ThreadSummary }) {
  const status = threadStatus(props.thread);
  if (!status) {
    return <span className="shrink-0 text-xs tabular-nums text-secondary-label">{relativeTime(props.thread.updatedAt)}</span>;
  }
  const Icon = status.icon;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 text-xs font-medium tabular-nums", status.className)}>
      <Icon aria-hidden className="size-3.5 shrink-0" />
      {status.label}
      {status.duration ? <span>{status.duration}</span> : null}
      {status.label === "Done" || status.label === "Failed" ? (
        <span className="font-normal text-secondary-label">· {relativeTime(props.thread.updatedAt)}</span>
      ) : null}
    </span>
  );
}

/* Send button: T3 Code's composer send button (ComposerPrimaryActions), sized down. */

export function SendButton(props: { enabled: boolean; size?: "sm" | "xs"; label?: string }) {
  const small = props.size === "xs";
  return (
    <button
      type="button"
      aria-label={props.label ?? "Send"}
      disabled={!props.enabled}
      className={cn(
        "relative isolate flex shrink-0 items-center justify-center overflow-hidden rounded-full shadow-xs transition-all duration-150 enabled:cursor-pointer enabled:inset-shadow-control-highlight hover:scale-105 disabled:pointer-events-none disabled:shadow-none [&_svg]:pointer-events-none",
        "bg-message-action text-message-action-foreground enabled:shadow-message-action/24 hover:bg-message-action-hover disabled:bg-foreground/12 disabled:text-muted-foreground",
        small ? "size-5.5" : "size-7",
      )}
    >
      <svg width={small ? 10 : 13} height={small ? 10 : 13} viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M7 11.5V2.5M7 2.5L3 6.5M7 2.5L11 6.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/* Composer controls: T3 Code's ComposerControl (size xs) and the model trigger with its effort glyph. */

export const composerControlClassName =
  "relative inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-(--control-radius) border border-transparent outline-none hover:bg-accent data-pressed:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring h-6 gap-1.5 px-1.75 font-normal text-xs text-foreground/70 hover:text-foreground dark:text-muted-foreground [&_svg]:shrink-0";

function EffortGlyph(props: { count: number; filled: number }) {
  const height = 12;
  const maxBar = height - 2;
  const width = 4 * props.count - 2;
  const step = Math.max(1, Math.round(maxBar / 2 / Math.max(props.count - 1, 1)));
  return (
    <svg aria-hidden width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ width, height }} className="shrink-0 text-current">
      {Array.from({ length: props.count }, (_, index) => {
        const barHeight = maxBar - (props.count - 1 - index) * step;
        return <rect key={index} x={index * 4} y={maxBar - barHeight} width={2} height={barHeight} fill="currentColor" opacity={index < props.filled ? 1 : 0.4} />;
      })}
    </svg>
  );
}

export function ModelChip(props: { providerId: string | null; model: string | null; open?: boolean }) {
  return (
    <button type="button" data-pressed={props.open ? "" : undefined} data-popup-open={props.open ? "" : undefined} className={cn(composerControlClassName, "group/model-trigger min-w-0")}>
      <ProviderGlyph providerId={props.providerId} className="size-3.5" />
      <span className="min-w-0 truncate">{modelLabel(props.model)}</span>
      <span className="flex shrink-0 items-center text-muted-foreground group-data-popup-open/model-trigger:text-foreground">
        <EffortGlyph count={3} filled={3} />
      </span>
    </button>
  );
}

export function ProjectChip(props: { title: string }) {
  return (
    <button type="button" className={cn(composerControlClassName, "min-w-0")}>
      <ProjectMonogram title={props.title} className="size-3.5" />
      <span className="min-w-0 truncate">{props.title}</span>
      <ChevronDownIcon aria-hidden className="-ms-0.5 size-3 opacity-60" />
    </button>
  );
}

/* Composer surface: T3 Code's ComposerSurface Shell + Host, with an optional attached banner. */

export const composerShellClassName =
  "relative isolate w-full [--chat-composer-glass-surface:var(--card)] [--chat-composer-outline:rgb(0_0_0/8%)] dark:[--chat-composer-glass-surface:var(--surface-raised)] dark:[--chat-composer-highlight:rgb(255_255_255/3%)] dark:[--chat-composer-outline:color-mix(in_srgb,var(--color-white)_9%,transparent)]";

export const composerHostClassName =
  "relative z-10 w-full rounded-2xl bg-(--chat-composer-glass-surface) shadow-composer dark:shadow-composer-dark after:pointer-events-none after:absolute after:inset-0 after:z-1 after:rounded-[inherit] after:border after:border-(--chat-composer-outline) dark:after:inset-shadow-2xs dark:after:inset-shadow-(color:--chat-composer-highlight)";

export function Composer(props: {
  placeholder: string;
  value?: string;
  banner?: ReactNode;
  leading?: ReactNode;
  providerId: string | null;
  model: string | null;
  modelOpen?: boolean;
  minLines?: number;
}) {
  return (
    <div className={composerShellClassName}>
      {props.banner}
      <div className={composerHostClassName}>
        <div className="relative px-3 pt-2.5 pb-1.5">
          <p
            className={cn("text-sm leading-relaxed", props.value ? "text-foreground" : "text-placeholder")}
            style={{ minHeight: `${(props.minLines ?? 1) * 1.625}rem` }}
          >
            {props.value ?? props.placeholder}
            {props.value ? <span aria-hidden className="ms-px inline-block h-4 w-px translate-y-0.5 bg-foreground" /> : null}
          </p>
        </div>
        <div className="flex min-w-0 flex-nowrap items-center gap-1 px-1.5 pb-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-0.5">
            {props.leading}
            <ModelChip providerId={props.providerId} model={props.model} open={props.modelOpen} />
          </div>
          <SendButton enabled={Boolean(props.value)} />
        </div>
      </div>
    </div>
  );
}

/* Quick reply: T3 Code's InputGroup with the composer send button as its trailing addon. */

export function QuickReply(props: { placeholder: string; value?: string }) {
  return (
    <InputGroup className="min-w-0 flex-1">
      <InputGroupInput size="sm" placeholder={props.placeholder} defaultValue={props.value} />
      <InputGroupAddon align="inline-end">
        <SendButton enabled={Boolean(props.value)} size="xs" label="Send reply" />
      </InputGroupAddon>
    </InputGroup>
  );
}

/* Settle and Snooze, with T3 Code's sidebar row action classes. */

export function SnoozeAction() {
  return (
    <button
      type="button"
      aria-label="Snooze"
      className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-0.5 rounded-md bg-transparent px-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      <ClockIcon className="size-3.5" />
    </button>
  );
}

export function SettleAction() {
  return (
    <button
      type="button"
      className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-md bg-transparent px-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      <CheckIcon className="size-3.5" />
      Settle
    </button>
  );
}

/* Cards: the stack's unit. T3 sidebar card anatomy (project line, title line) on a toast-like surface. */

export const cardSurfaceClassName =
  "relative rounded-xl border border-border/80 bg-card text-card-foreground shadow-composer dark:border-border dark:shadow-none";

export function CardMeta(props: { thread: ThreadSummary; trailing?: ReactNode }) {
  const project = projectTitle(props.thread.projectId);
  return (
    <div className="flex h-5 min-w-0 items-center gap-1.5">
      <ProjectMonogram title={project} />
      <span className="min-w-0 flex-1 truncate text-xs text-secondary-label">{project}</span>
      {props.trailing ?? <StatusLabel thread={props.thread} />}
    </div>
  );
}

export function CardTitle(props: { thread: ThreadSummary; className?: string }) {
  return (
    <div className="mt-1 flex min-w-0 items-center gap-1.5">
      <span className={cn("min-w-0 flex-1 truncate text-sm font-medium text-foreground", props.className)}>{props.thread.title}</span>
      <ProviderGlyph providerId={props.thread.providerInstanceId} className="size-3.5 opacity-60" />
    </div>
  );
}

export function StackCard(props: {
  thread: ThreadSummary;
  preview: string;
  reply?: { placeholder: string; value?: string } | null;
  footer?: ReactNode;
  tone?: "warning";
  hovered?: boolean;
}) {
  return (
    <li className="list-none">
      <div
        className={cn(
          cardSurfaceClassName,
          props.tone === "warning" &&
            "border-warning/30 bg-linear-to-b from-warning/8 to-warning/8 dark:border-warning/28",
          props.hovered && "ring-1 ring-ring/40",
        )}
      >
        <div className="px-2.5 py-2">
          <CardMeta thread={props.thread} />
          <CardTitle thread={props.thread} />
          <p className="mt-0.5 line-clamp-2 text-xs leading-4.5 text-muted-foreground">{props.preview}</p>
          {props.reply ? (
            <div className="mt-1.5 flex items-center gap-0.5">
              <QuickReply placeholder={props.reply.placeholder} value={props.reply.value} />
              <SnoozeAction />
              <SettleAction />
            </div>
          ) : null}
          {props.footer}
        </div>
      </div>
    </li>
  );
}

/** A compact one-line card for working threads: the stack's quietest member. */
export function SlimCard(props: { thread: ThreadSummary; preview: string }) {
  return (
    <li className="list-none">
      <div className={cn(cardSurfaceClassName, "bg-card/70 shadow-none")}>
        <div className="px-2.5 py-2">
          <CardMeta thread={props.thread} />
          <CardTitle thread={props.thread} className="font-normal text-foreground/85" />
          <p className="mt-0.5 truncate text-xs leading-4.5 text-muted-foreground">{props.preview}</p>
        </div>
      </div>
    </li>
  );
}

/** Older cards collapse behind the newest one, like T3 Code's stacked toasts. */
export function StackPeek(props: { count: number; children: ReactNode }) {
  return (
    <div>
      <div className="relative pb-2.5">
        <div className="relative z-10">{props.children}</div>
        <div aria-hidden className="absolute inset-x-2 bottom-1 h-4 rounded-b-xl border border-t-0 border-border/80 bg-card/90 dark:border-border" />
        <div aria-hidden className="absolute inset-x-4 bottom-0 h-4 rounded-b-xl border border-t-0 border-border/60 bg-card/70 dark:border-border/70" />
      </div>
      <div className="flex justify-center pt-1">
        <button
          type="button"
          aria-expanded={false}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md py-0.5 text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDownIcon className="size-3.5 shrink-0 opacity-80" strokeWidth={2.25} />
          {props.count} earlier
        </button>
      </div>
    </div>
  );
}

/* Panel chrome. */

export function Panel(props: { children: ReactNode }) {
  return (
    <div className="absolute inset-2 flex flex-col overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-xl shadow-black/25 dark:border-white/12">
      {props.children}
    </div>
  );
}

export function PanelHeader(props: { mood: CompanionMood; summary: string; composing?: boolean }) {
  return (
    <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border/70 ps-2.5 pe-1.5">
      <CompanionMascot mood={props.mood} hopKey={0} size={24} />
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="text-sm font-semibold">Inbox</span>
        <span className="min-w-0 truncate text-xs text-muted-foreground">{props.summary}</span>
      </div>
      <Button size="icon-xs" variant="ghost-muted" aria-label="New thread" data-pressed={props.composing ? "" : undefined}>
        <SquarePenIcon />
      </Button>
      <Button size="icon-xs" variant="ghost-muted" aria-label="Open T3 Code">
        <SquareArrowOutUpRightIcon />
      </Button>
    </header>
  );
}

export function GroupHeader(props: { label: string; count: number; tone?: "muted" | "emphasized" }) {
  return (
    <CollapsibleSectionHeader expanded tone={props.tone ?? "muted"}>
      {props.label}
      <span className="ms-1.5 tabular-nums opacity-70">{props.count}</span>
    </CollapsibleSectionHeader>
  );
}

export function Shelves(props: { snoozed: number; settled: number }) {
  return (
    <footer className="shrink-0 border-t border-border/70 px-1.5 py-1">
      <CollapsibleSectionHeader expanded={false} accessory={<span className="text-2xs tabular-nums text-muted-foreground">{props.snoozed}</span>}>
        Snoozed
      </CollapsibleSectionHeader>
      <CollapsibleSectionHeader expanded={false} accessory={<span className="text-2xs tabular-nums text-muted-foreground">{props.settled}</span>}>
        Settled
      </CollapsibleSectionHeader>
    </footer>
  );
}

/* Chat: T3 Code's TimelineUserMessageRow bubble, AssistantTimelineRow + ChatMarkdown, MarkdownCodeBlock. */

function CodeBlock(props: { children?: ReactNode; language: string }) {
  return (
    <div
      dir="ltr"
      data-language={props.language}
      data-wrap="true"
      className="chat-markdown-codeblock my-[0.65rem] overflow-hidden rounded-lg border border-border/70 bg-secondary text-start leading-snug dark:border-transparent dark:bg-input/32"
    >
      <div className="chat-markdown-codeblock-header flex items-center justify-between gap-2 pt-1.5 pr-1.5 pb-0 pl-3 select-none">
        <span className="inline-flex min-w-0 items-center gap-1.5 font-mono text-2xs">{props.language}</span>
        <Button size="icon-micro" variant="ghost-muted" aria-label="Copy code">
          <CopyIcon />
        </Button>
      </div>
      {props.children}
    </div>
  );
}

export function Markdown(props: { text: string }) {
  return (
    <div className="chat-markdown w-full min-w-0 text-sm leading-relaxed text-foreground/90 [overflow-wrap:anywhere] [word-break:break-word]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => {
            const child = Array.isArray(children) ? children[0] : children;
            const className = (child as { props?: { className?: string } } | undefined)?.props?.className ?? "";
            const language = /language-(\w+)/.exec(className)?.[1] ?? "text";
            return (
              <CodeBlock language={language}>
                <pre>{children}</pre>
              </CodeBlock>
            );
          },
        }}
      >
        {props.text}
      </ReactMarkdown>
    </div>
  );
}

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function TimelineItem(props: { item: ThreadItem; showMeta?: boolean }) {
  if (props.item.type === "user_message") {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="relative min-w-0 max-w-[85%] rounded-2xl bg-message px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-message-foreground">
          {props.item.text}
        </div>
      </div>
    );
  }
  return (
    <div className="relative min-w-0 px-1 py-0.5">
      <Markdown text={props.item.text} />
      {props.showMeta ? (
        <div className="mt-1.5 flex items-center gap-2 text-xs tabular-nums">
          <Button size="icon-micro" variant="ghost-muted" aria-label="Copy message">
            <CopyIcon />
          </Button>
          <p className="text-xs tabular-nums text-muted-foreground">{clock(props.item.updatedAt)}</p>
        </div>
      ) : null}
    </div>
  );
}

/* The expanded card: one thread opened in place, keeping the card's own header. */

export function ExpandedCard(props: {
  thread: ThreadSummary;
  children: ReactNode;
  composer: ReactNode;
  tone?: "warning";
}) {
  return (
    <div
      className={cn(
        cardSurfaceClassName,
        "flex min-h-0 flex-1 flex-col overflow-hidden",
        props.tone === "warning" && "border-warning/30 dark:border-warning/28",
      )}
    >
      <div
        className={cn(
          "shrink-0 border-b border-border/70 px-2.5 pt-2 pb-2",
          props.tone === "warning" && "bg-linear-to-b from-warning/8 to-warning/8",
        )}
      >
        <CardMeta
          thread={props.thread}
          trailing={
            <span className="-me-1 flex shrink-0 items-center gap-0.5">
              <StatusLabel thread={props.thread} />
              <span aria-hidden className="mx-1 h-3 w-px bg-border" />
              <Button size="icon-xs" variant="ghost-muted" aria-label="Snooze">
                <ClockIcon />
              </Button>
              <Button size="icon-xs" variant="ghost-muted" aria-label="Open in T3 Code">
                <SquareArrowOutUpRightIcon />
              </Button>
              <Button size="icon-xs" variant="ghost-muted" aria-label="Collapse card">
                <ChevronsDownUpIcon />
              </Button>
            </span>
          }
        />
        <CardTitle thread={props.thread} />
      </div>
      {/* Reverse column so a static render starts scrolled to the newest message. */}
      <div className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto [scrollbar-width:none]">
        <div className="flex flex-col gap-3 px-3 pt-3 pb-3">{props.children}</div>
      </div>
      <div className="shrink-0 px-2 pb-2">{props.composer}</div>
    </div>
  );
}
