/*
 * T3 Code's composer and model picker, copied from apps/web/src/components/chat
 * (ComposerSurface, ComposerBanner, ComposerControl, ComposerPrimaryActions, ProviderModelPicker,
 * ModelPickerSidebar, ModelListRow, ComposerModelEffort) as static markup for the split view.
 */
import {
  CheckIcon,
  ChevronUpIcon,
  CornerUpRightIcon,
  ExternalLinkIcon,
  SearchIcon,
  ShieldOffIcon,
  ShieldQuestionIcon,
  StarIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "~/t3/ui/button";
import { cn } from "~/t3/lib/utils";
import { EffortGlyph, ProviderIcon, modelLabel } from "./split-view-parts";

/* ---------- ComposerSurface.tsx ---------- */

const SHELL_VARS = cn(
  "[--chat-composer-drawer-inset:1.375rem] [--chat-composer-glass-surface:var(--card)] [--chat-composer-outline:rgb(0_0_0/8%)]",
  "dark:[--chat-composer-glass-surface:var(--surface-raised)] dark:[--chat-composer-highlight:rgb(255_255_255/3%)] dark:[--chat-composer-outline:color-mix(in_srgb,var(--color-white)_5%,transparent)]",
);

const OUTLINE =
  "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:border after:border-(--chat-composer-outline) dark:after:inset-shadow-2xs dark:after:inset-shadow-(color:--chat-composer-highlight)";

export interface ComposerModel {
  readonly instanceId: string;
  readonly model: string;
  /** Effort bars: ordinary levels and how many are on. */
  readonly effort?: { readonly count: number; readonly filled: number };
}

export function Composer(props: {
  model: ComposerModel;
  prompt?: string;
  /** A reply composer rests at one line to leave the timeline room; a draft keeps T3's two. */
  lines?: 1 | 2;
  running?: boolean;
  pickerOpen?: boolean;
  banner?: ReactNode;
  popup?: ReactNode;
}) {
  const hasPrompt = Boolean(props.prompt);
  return (
    <div data-slot="composer-shell" className={cn("relative isolate w-full", SHELL_VARS)}>
      {props.popup}
      {props.banner}
      <div
        data-slot="composer-host"
        className={cn(
          "relative z-10 w-full rounded-2xl bg-(--chat-composer-glass-surface) shadow-composer after:z-1 dark:shadow-none",
          OUTLINE,
        )}
      >
        <div className="relative px-3.5 pt-3 pb-1.5">
          <div
            className={cn(
              "composer-tiptap block wrap-break-word whitespace-pre-wrap bg-transparent text-sm leading-relaxed",
              props.lines === 2 ? "min-h-[2lh]" : "min-h-[1lh]",
              hasPrompt ? "text-foreground" : "text-placeholder",
            )}
          >
            {props.prompt ?? "Ask anything..."}
          </div>
        </div>
        <div data-chat-composer-footer="true" className="flex min-w-0 flex-nowrap items-center px-2 pb-2">
          <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-2">
            <div className="relative flex min-w-0 flex-1 items-center justify-end gap-0.5">
              <ModelTrigger model={props.model} open={props.pickerOpen ?? false} />
            </div>
            <SendButton enabled={hasPrompt} running={props.running ?? false} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- ComposerControl.tsx + ProviderModelPicker.tsx trigger ---------- */

function ModelTrigger(props: { model: ComposerModel; open: boolean }) {
  return (
    <button
      type="button"
      data-popup-open={props.open || undefined}
      aria-label={`${modelLabel(props.model.model)}, change model`}
      className={cn(
        "group/model-trigger relative inline-flex h-7 min-w-13 shrink cursor-pointer items-center justify-between gap-1.5 whitespace-nowrap rounded-(--control-radius) border border-transparent px-2 text-sm font-medium text-foreground/80 outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&_svg]:pointer-events-none [&_svg]:shrink-0",
        "data-popup-open:bg-accent data-popup-open:text-foreground",
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <ProviderIcon instanceId={props.model.instanceId} />
        <span className="min-w-0 max-w-56 flex-1 truncate">{modelLabel(props.model.model)}</span>
        {props.model.effort ? (
          <span className="-ms-0.5 flex shrink-0 items-center gap-1.5 text-muted-foreground group-hover/model-trigger:text-foreground group-data-popup-open/model-trigger:text-foreground">
            <EffortGlyph count={props.model.effort.count} filled={props.model.effort.filled} />
          </span>
        ) : null}
      </span>
    </button>
  );
}

/* ---------- ComposerPrimaryActions.tsx ---------- */

function SendButton(props: { enabled: boolean; running: boolean }) {
  return (
    <button
      type="submit"
      disabled={!props.enabled}
      aria-label={props.running ? "Steer message" : "Submit message"}
      className="relative isolate flex size-8 items-center justify-center overflow-hidden rounded-full bg-message-action text-message-action-foreground shadow-xs transition-all duration-150 enabled:cursor-pointer enabled:shadow-message-action/24 enabled:inset-shadow-control-highlight hover:bg-message-action-hover active:inset-shadow-control-pressed disabled:pointer-events-none disabled:bg-foreground/12 disabled:text-muted-foreground disabled:shadow-none [&_svg]:pointer-events-none"
    >
      {props.running ? (
        <CornerUpRightIcon className="size-4" aria-hidden="true" />
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M7 11.5V2.5M7 2.5L3 6.5M7 2.5L11 6.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

/* ---------- ComposerBanner.tsx (warning, approval layout, attached) ---------- */

export function ApprovalBanner(props: { title: string; detail: string }) {
  return (
    <div
      data-slot="composer-banner-attachment"
      className="mx-auto -mb-[calc(1rem+1px)] w-[calc(100%-2*var(--chat-composer-drawer-inset))]"
    >
      <div
        role="alert"
        data-composer-banner-surface="attached"
        data-variant="warning"
        className={cn(
          "relative isolate min-w-0 border-0 bg-transparent px-1 py-1.5 text-xs/4 shadow-none after:block after:h-[calc(1rem+1px)]",
          "[--chat-composer-attached-surface:var(--chat-composer-glass-surface)] [--chat-composer-attached-outline:color-mix(in_srgb,var(--warning)_28%,transparent)] [--chat-composer-attached-tint:color-mix(in_srgb,var(--warning)_8%,transparent)]",
          "before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-t-2xl before:border before:border-(--chat-composer-attached-outline)",
          "before:bg-(--chat-composer-attached-surface) before:bg-linear-to-b before:from-(--chat-composer-attached-tint) before:to-(--chat-composer-attached-tint) before:shadow-composer dark:before:shadow-composer-dark",
        )}
      >
        <div
          data-composer-banner-row="true"
          className="grid w-full min-w-0 grid-cols-[--spacing(7)_minmax(0,1fr)_auto] items-center gap-x-2 text-start"
        >
          <span
            aria-hidden
            className="col-start-1 row-start-1 flex w-7 min-w-0 flex-none items-center justify-center self-start pt-0.5 text-warning [&>svg]:size-4"
          >
            <ShieldQuestionIcon />
          </span>
          <span className="col-start-2 row-start-1 flex min-w-0 flex-col gap-0.5">
            <span className="min-w-0 truncate font-medium text-foreground">{props.title}</span>
            <span className="min-w-0 truncate text-muted-foreground">{props.detail}</span>
          </span>
          <span className="col-start-3 row-start-1 flex items-center justify-end gap-1.5 pe-0.5">
            <Button size="xs" variant="default">
              Open in T3 Code
              <ExternalLinkIcon />
            </Button>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------- ProviderModelPicker.tsx popup: ModelPickerSidebar + ModelPickerContent + ComposerEffortColumn ---------- */

const PICKER_ROW =
  "flex min-h-7 w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-sm outline-none hover:bg-foreground/[0.09]";
const COLUMN_ROW =
  "flex h-7 w-full shrink-0 cursor-pointer items-center gap-2 rounded-sm px-2 text-left text-sm text-foreground outline-none hover:bg-foreground/[0.09]";
const SIDEBAR_BUTTON =
  "relative isolate flex aspect-square w-full cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-foreground/10";

interface PickerModel {
  readonly instanceId: string;
  readonly model: string;
}

export function ModelPickerPopup(props: {
  favorites: readonly PickerModel[];
  selected: PickerModel;
  highlighted: PickerModel;
  effortLevels: readonly string[];
  effort: string;
  defaultEffort: string;
  className?: string;
}) {
  const same = (a: PickerModel, b: PickerModel) => a.instanceId === b.instanceId && a.model === b.model;
  return (
    <div
      data-slot="popover-popup"
      className={cn(
        "dropdown-glass absolute z-50 flex flex-col overflow-hidden rounded-lg text-popover-foreground shadow-lg/8 before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
        props.className,
      )}
    >
      <div className="flex h-54 min-h-0">
        {/* ModelPickerSidebar */}
        <div className="relative w-11 shrink-0 overflow-hidden bg-muted/30" aria-label="Providers">
          <div className="relative flex min-h-full flex-col gap-1 p-1">
            <div
              aria-hidden
              className="pointer-events-none absolute top-[0.875rem] right-1 z-10 h-5 w-0.75 rounded-full bg-primary"
            />
            <button
              type="button"
              aria-label="Favorites"
              aria-pressed
              className={cn(SIDEBAR_BUTTON, "text-foreground")}
            >
              <StarIcon className="size-5 shrink-0 fill-current" aria-hidden />
            </button>
            <div className="border-b border-border/70" aria-hidden="true" />
            {["claudeAgent", "codex", "cursor"].map((instanceId) => (
              <button key={instanceId} type="button" aria-label={instanceId} className={SIDEBAR_BUTTON}>
                <ProviderIcon instanceId={instanceId} className="size-5" />
              </button>
            ))}
          </div>
        </div>
        {/* ModelPickerContent */}
        <div className="flex min-h-0 w-60 flex-col overflow-hidden border-l border-border/70 bg-muted/40">
          <div className="min-w-0 shrink-0 px-3 pt-2.5">
            <div className="relative -translate-y-px border-b border-border/70 pb-1.5">
              <SearchIcon
                aria-hidden="true"
                className="pointer-events-none absolute top-1.5 left-0 size-4 shrink-0 text-muted-foreground/55"
              />
              <div className="flex h-6.5 w-full items-center ps-5 font-sans text-sm leading-6.5 text-placeholder">
                Search models...
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-0.5 py-1.5 pr-px pl-2">
            {props.favorites.map((entry) => {
              const selected = same(entry, props.selected);
              return (
                <div
                  key={`${entry.instanceId}:${entry.model}`}
                  role="option"
                  aria-selected={selected}
                  data-highlighted={same(entry, props.highlighted) || undefined}
                  className={cn(PICKER_ROW, "group data-highlighted:bg-foreground/[0.09]")}
                >
                  <ProviderIcon instanceId={entry.instanceId} />
                  <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <div className="min-w-0 truncate text-sm leading-snug font-normal">
                      {modelLabel(entry.model)}
                    </div>
                    {selected ? <CheckIcon className="size-3.5 shrink-0" aria-hidden="true" /> : null}
                  </div>
                  <StarIcon className="size-3 shrink-0 fill-current text-warning" aria-hidden />
                </div>
              );
            })}
          </div>
        </div>
        {/* ComposerEffortColumn */}
        <div
          data-model-picker-effort
          className="flex min-h-0 w-36 shrink-0 flex-col border-l border-border/70 bg-muted/40"
        >
          <div className="shrink-0 px-3 pt-2.5">
            <div className="flex h-8.25 -translate-y-px items-center gap-2 border-b border-border/70 pb-1.5 text-sm">
              <span className="text-muted-foreground">Effort</span>
              <span className="ms-auto min-w-0 truncate text-xs text-muted-foreground">
                {modelLabel(props.selected.model)}
              </span>
            </div>
          </div>
          <div
            role="radiogroup"
            aria-label="Effort"
            className="flex min-h-0 flex-1 flex-col gap-0.5 px-2 pt-1.5 pb-1.5"
          >
            {props.effortLevels.map((level) => (
              <div key={level} role="radio" aria-checked={level === props.effort} className={COLUMN_ROW}>
                <span className="min-w-0 flex-1 truncate capitalize">{level}</span>
                {level === props.effort ? <CheckIcon aria-hidden="true" className="size-3.5" /> : null}
                {level === props.defaultEffort && level !== props.effort ? (
                  <span className="text-xs text-muted-foreground/70">Default</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* ComposerPickerFooter */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border/70 bg-muted/40 px-3 py-1.5">
        <span className="text-xs text-muted-foreground">Applies to your next message</span>
        <button
          type="button"
          aria-label="Permissions: Full access"
          className="ms-auto flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground outline-none hover:bg-foreground/[0.09] hover:text-foreground"
        >
          <ShieldOffIcon aria-hidden="true" className="size-3.5" />
          Full access
          <ChevronUpIcon aria-hidden="true" className="size-3" />
        </button>
      </div>
    </div>
  );
}
