import type { ModelSelection, Provider } from "@shared/types";
import { CheckIcon, SearchIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { modelLabel } from "../lib/format";
import { cn } from "../t3/lib/utils";
import { ProviderGlyph } from "./icons";

/* The composer and model picker copied from T3 Code (ComposerSurface, ChatComposer,
   ComposerControl, ComposerPrimaryActions, ProviderModelPicker, ModelPickerSidebar, ModelListRow,
   ComposerModelEffort, EffortGlyph), MIT License, with logic replaced. */

const EFFORT = "reasoningEffort";

const effortLabel = (value: string) =>
  ({ xhigh: "Extra high", max: "Max", ultra: "Ultra" })[value] ?? value.charAt(0).toUpperCase() + value.slice(1);

/** ComposerControl at size "xs". */
const composerControlXs =
  "relative inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-(--control-radius) border border-transparent outline-none hover:bg-accent data-pressed:bg-accent aria-expanded:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&_svg]:pointer-events-none [&_svg]:shrink-0 h-6 gap-1.5 px-1.75 font-normal text-xs text-foreground/70 hover:text-foreground dark:text-muted-foreground";

/** EffortGlyph: rising bars on whole pixels, filled up to the current level. */
function EffortGlyph(props: { count: number; filled: number }) {
  const height = 12;
  const maxBar = height - 2;
  const width = 4 * props.count - 2;
  const step = Math.max(1, Math.round(maxBar / 2 / Math.max(props.count - 1, 1)));
  return (
    <svg aria-hidden="true" width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0">
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

function effortOf(providers: readonly Provider[], selection: ModelSelection | null) {
  const option = providers
    .find((provider) => provider.providerInstanceId === selection?.instanceId)
    ?.models.find((model) => model.id === selection?.model)
    ?.options.find((candidate) => candidate.id === EFFORT);
  if (!option) return null;
  const value = selection?.options?.find((candidate) => candidate.id === EFFORT)?.value ?? option.default ?? null;
  return { option, value };
}

const COLUMN_ROW =
  "flex h-8 w-full shrink-0 cursor-pointer items-center gap-2 rounded-sm px-2 text-left text-sm text-foreground outline-none hover:bg-foreground/[0.09]";
const comboboxItem =
  "flex min-h-7 cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-sm outline-none hover:bg-foreground/[0.09]";

/** ProviderModelPicker docked above the composer: provider rail, model list, effort column. */
function ModelPicker(props: {
  providers: readonly Provider[];
  selection: ModelSelection | null;
  onChange: (selection: ModelSelection) => void;
  onClose: () => void;
}) {
  const { providers, selection } = props;
  const [providerId, setProviderId] = useState(selection?.instanceId ?? providers[0]?.providerInstanceId ?? "");
  const [query, setQuery] = useState("");
  const provider = providers.find((candidate) => candidate.providerInstanceId === providerId) ?? providers[0];
  const needle = query.trim().toLowerCase();
  const models = (provider?.models ?? []).filter(
    (model) => !needle || model.id.toLowerCase().includes(needle) || modelLabel(model.id).toLowerCase().includes(needle),
  );
  const effort = effortOf(providers, selection);
  const pick = (instanceId: string, model: string, value?: string) => {
    const option = providers
      .find((candidate) => candidate.providerInstanceId === instanceId)
      ?.models.find((candidate) => candidate.id === model)
      ?.options.find((candidate) => candidate.id === EFFORT);
    const keep = effort?.value && option?.values.includes(effort.value) ? effort.value : option?.default;
    const chosen = value ?? keep;
    props.onChange({ instanceId, model, ...(option && chosen ? { options: [{ id: EFFORT, value: chosen }] } : {}) });
    if (!option || value !== undefined) props.onClose();
  };
  const railButton =
    "relative isolate flex aspect-square w-full cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-foreground/10";

  return (
    <div
      data-popup-open
      data-slot="popover-popup"
      className="dropdown-glass panel-in absolute right-2.5 bottom-[calc(100%+6px)] left-2.5 z-30 flex h-[232px] overflow-hidden rounded-lg text-popover-foreground shadow-[0_16px_40px_-18px_rgb(0_0_0/55%)] dark:shadow-[0_18px_44px_-18px_rgb(0_0_0/80%)]"
    >
      <div aria-label="Providers" className="w-11 shrink-0 overflow-y-auto bg-muted/30">
        <div className="flex flex-col gap-1 p-1">
          {providers.map((candidate) => (
            <button
              key={candidate.providerInstanceId}
              type="button"
              title={candidate.displayName}
              aria-label={candidate.displayName}
              aria-pressed={candidate.providerInstanceId === provider?.providerInstanceId}
              onClick={() => setProviderId(candidate.providerInstanceId)}
              className={cn(railButton, candidate.providerInstanceId === provider?.providerInstanceId && "bg-background")}
            >
              <ProviderGlyph driverKind={candidate.driverKind} className="size-5" />
            </button>
          ))}
        </div>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l border-border/70 bg-muted/40">
        <div className="min-w-0 shrink-0 px-3 pt-2.5">
          <label className="relative block -translate-y-px border-b border-border/70 pb-1.5">
            <SearchIcon className="pointer-events-none absolute top-1.5 left-0 size-4 shrink-0 text-muted-foreground/55" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${provider?.displayName ?? ""} models...`}
              className="h-6.5 w-full bg-transparent ps-5 text-sm leading-6.5 outline-none placeholder:text-placeholder"
            />
          </label>
        </div>
        <div role="listbox" aria-label="Models" className="flex min-h-0 flex-col gap-0.5 overflow-y-auto py-1.5 pr-px pl-2">
          {models.map((model) => {
            const active = selection?.instanceId === provider?.providerInstanceId && selection?.model === model.id;
            return (
              <button
                key={model.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => provider && pick(provider.providerInstanceId, model.id)}
                className={cn(comboboxItem, "me-1 text-left", active && "bg-foreground/[0.06]")}
              >
                <ProviderGlyph driverKind={provider?.driverKind ?? null} className="size-4" />
                <span className="min-w-0 flex-1 truncate leading-snug">{modelLabel(model.id)}</span>
                {active ? <CheckIcon className="size-3.5 shrink-0" aria-hidden /> : null}
              </button>
            );
          })}
          {models.length === 0 ? <p className="px-2 py-3 text-xs text-muted-foreground">No matching models</p> : null}
        </div>
      </div>
      {effort && selection ? (
        <div className="flex w-[112px] min-h-0 shrink-0 flex-col border-l border-border/70 bg-muted/40">
          <div className="shrink-0 px-3 pt-2.5">
            <div className="flex h-8.25 -translate-y-px items-center border-b border-border/70 pb-1.5 text-sm text-muted-foreground">
              Effort
            </div>
          </div>
          <div role="radiogroup" aria-label="Effort" className="flex min-h-0 flex-col gap-0.5 overflow-y-auto px-2 pt-2.5 pb-1.5">
            {effort.option.values.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={value === effort.value}
                onClick={() => pick(selection.instanceId, selection.model, value)}
                className={COLUMN_ROW}
              >
                <span className="min-w-0 flex-1 truncate">{effortLabel(value)}</span>
                {value === effort.value ? <CheckIcon aria-hidden className="size-3.5" /> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Unsent text survives folding the island and switching threads. */
const drafts = new Map<string, string>();

const sendArrow = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M7 11.5V2.5M7 2.5L3 6.5M7 2.5L11 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** ComposerSurface Shell + Host + Main, with a real prompt, model chip, and send or stop. */
export function Composer(props: {
  draftKey: string;
  placeholder: string;
  providers: readonly Provider[];
  selection: ModelSelection | null;
  onSelectionChange: (selection: ModelSelection) => void;
  onSubmit: (message: string) => Promise<boolean>;
  running?: boolean;
  onStop?: () => void;
  disabled?: boolean;
}) {
  const [text, setTextState] = useState(() => drafts.get(props.draftKey) ?? "");
  const [sending, setSending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const setText = (value: string) => {
    drafts.set(props.draftKey, value);
    setTextState(value);
  };
  // Closes the model picker on outside clicks and Escape, before Escape can fold the island.
  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (event: MouseEvent) => {
      if (!shell.current?.contains(event.target as Node)) setPickerOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setPickerOpen(false);
      input.current?.focus();
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [pickerOpen]);

  const submit = async () => {
    const message = text.trim();
    if (!message || sending || props.disabled) return;
    setSending(true);
    const ok = await props.onSubmit(message);
    setSending(false);
    if (ok) setText("");
    input.current?.focus();
  };
  const canSend = text.trim().length > 0 && !sending && !props.disabled;
  const provider = props.providers.find((candidate) => candidate.providerInstanceId === props.selection?.instanceId);
  const effort = effortOf(props.providers, props.selection);
  const effortIndex = effort?.value ? effort.option.values.indexOf(effort.value) : -1;

  return (
    <div ref={shell} className="relative shrink-0 px-2.5 pb-2.5">
      {pickerOpen ? (
        <ModelPicker
          providers={props.providers}
          selection={props.selection}
          onChange={props.onSelectionChange}
          onClose={() => {
            setPickerOpen(false);
            input.current?.focus();
          }}
        />
      ) : null}
      <div
        data-slot="composer-shell"
        className="group/composer-surface relative isolate w-full [--chat-composer-glass-surface:var(--card)] [--chat-composer-outline:rgb(0_0_0/8%)] before:pointer-events-none before:absolute before:inset-0 before:z-0 before:rounded-2xl before:bg-(--chat-composer-glass-surface)/(--glass-opacity) dark:[--chat-composer-glass-surface:var(--surface-raised)] dark:[--chat-composer-highlight:rgb(255_255_255/3%)] dark:[--chat-composer-outline:color-mix(in_srgb,var(--color-white)_5%,transparent)]"
      >
        <div
          data-slot="composer-host"
          className="relative z-10 w-full rounded-2xl shadow-composer after:pointer-events-none after:absolute after:inset-0 after:z-1 after:rounded-[inherit] after:border after:border-(--chat-composer-outline) dark:shadow-none dark:after:inset-shadow-2xs dark:after:inset-shadow-(color:--chat-composer-highlight)"
        >
          <div className="group relative z-10 rounded-2xl p-px">
            <div className="relative px-4 pt-3.5 pb-2">
              <textarea
                ref={input}
                autoFocus
                rows={1}
                value={text}
                placeholder={props.placeholder}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void submit();
                  }
                }}
                className="selectable block max-h-32 min-h-6 w-full resize-none bg-transparent text-sm leading-relaxed text-foreground outline-none [field-sizing:content] placeholder:text-placeholder"
              />
            </div>
            <div className="flex min-w-0 flex-nowrap items-center overflow-visible px-2 pb-2">
              <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-2">
                <div className="relative flex min-w-0 flex-1 items-center justify-end gap-0.5">
                  <button
                    type="button"
                    aria-expanded={pickerOpen}
                    aria-label="Choose model"
                    disabled={props.providers.length === 0}
                    onClick={() => setPickerOpen((open) => !open)}
                    className={cn(composerControlXs, "min-w-0 shrink justify-between", pickerOpen && "text-foreground")}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-1">
                      {props.selection ? (
                        <ProviderGlyph driverKind={provider?.driverKind ?? props.selection.instanceId} className="size-3.5" />
                      ) : null}
                      <span className="min-w-0 flex-1 truncate">
                        {props.selection ? modelLabel(props.selection.model) : "Choose a model"}
                      </span>
                      {effort && effortIndex >= 0 ? (
                        <span className="flex shrink-0 items-center text-muted-foreground" title={effortLabel(effort.value ?? "")}>
                          <EffortGlyph
                            count={3}
                            filled={Math.max(1, Math.ceil(((effortIndex + 1) / effort.option.values.length) * 3))}
                          />
                        </span>
                      ) : null}
                    </span>
                  </button>
                </div>
                {props.running && !canSend && props.onStop ? (
                  <button
                    type="button"
                    aria-label="Stop"
                    onClick={props.onStop}
                    className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-destructive/90 text-white shadow-xs shadow-destructive/24 inset-shadow-control-highlight transition-colors duration-150 hover:bg-destructive active:inset-shadow-control-pressed active:shadow-none"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                      <rect x="2" y="2" width="8" height="8" rx="1.5" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!canSend}
                    aria-label="Send"
                    onClick={() => void submit()}
                    className="relative isolate flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-message-action text-message-action-foreground shadow-xs transition-all duration-150 enabled:cursor-pointer enabled:shadow-message-action/24 enabled:inset-shadow-control-highlight hover:scale-105 hover:bg-message-action-hover active:inset-shadow-control-pressed active:shadow-none disabled:pointer-events-none disabled:bg-foreground/12 disabled:text-muted-foreground disabled:shadow-none"
                  >
                    {sendArrow}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
