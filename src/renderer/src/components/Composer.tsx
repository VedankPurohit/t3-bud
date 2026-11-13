import type { ModelSelection, Provider } from "@shared/types";
import { ArrowUpIcon, CheckIcon, ChevronDownIcon, SquareIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "../lib/cn";
import { modelLabel } from "../lib/format";

const EFFORT = "reasoningEffort";

const effortLabel = (value: string) =>
  ({ xhigh: "Extra High", max: "Max", ultra: "Ultra" })[value] ??
  value.charAt(0).toUpperCase() + value.slice(1);

export function selectionEffort(selection: ModelSelection | null) {
  return selection?.options?.find((option) => option.id === EFFORT)?.value ?? null;
}

export function ModelPicker(props: {
  providers: readonly Provider[];
  selection: ModelSelection | null;
  onChange: (selection: ModelSelection) => void;
  disabled?: boolean;
}) {
  const { providers, selection } = props;
  const [open, setOpen] = useState(false);
  const [providerId, setProviderId] = useState(
    selection?.instanceId ?? providers[0]?.providerInstanceId ?? null,
  );
  const ref = useRef<HTMLDivElement>(null);
  // Closes the popover on outside clicks, which happen outside React's tree.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const provider = providers.find((p) => p.providerInstanceId === providerId) ?? providers[0];
  const current = providers
    .find((p) => p.providerInstanceId === selection?.instanceId)
    ?.models.find((m) => m.id === selection?.model);
  const effortOption = current?.options.find((option) => option.id === EFFORT);
  const effort = selectionEffort(selection) ?? effortOption?.default ?? null;
  const pick = (instanceId: string, model: string, value?: string) => {
    const option = providers
      .find((p) => p.providerInstanceId === instanceId)
      ?.models.find((m) => m.id === model)
      ?.options.find((o) => o.id === EFFORT);
    const chosen = value ?? (option ? (effort && option.values.includes(effort) ? effort : option.default) : undefined);
    props.onChange({
      instanceId,
      model,
      ...(chosen ? { options: [{ id: EFFORT, value: chosen }] } : {}),
    });
    // Stay open while there is a reasoning level left to choose.
    if (!option || value !== undefined) setOpen(false);
  };

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        disabled={props.disabled || providers.length === 0}
        onClick={() => setOpen((value) => !value)}
        className="flex h-7 max-w-full items-center gap-1 rounded-md px-1.5 text-xs text-muted hover:bg-accent hover:text-foreground disabled:opacity-50"
      >
        <span className="truncate font-medium text-foreground/85">{modelLabel(selection?.model ?? null)}</span>
        {effort ? <span className="truncate">{effortLabel(effort)}</span> : null}
        <ChevronDownIcon className="size-3 shrink-0" />
      </button>
      {open && provider ? (
        <div
          data-popup-open
          className="panel-in absolute bottom-9 left-0 z-20 flex max-h-[360px] w-[300px] flex-col overflow-hidden rounded-xl border border-border bg-card text-xs shadow-xl"
        >
          <div className="flex min-h-0 flex-1">
            <div className="flex w-24 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-border p-1">
              {providers.map((p) => (
                <button
                  key={p.providerInstanceId}
                  type="button"
                  onClick={() => setProviderId(p.providerInstanceId)}
                  className={cn(
                    "truncate rounded-md px-2 py-1.5 text-left hover:bg-accent",
                    p.providerInstanceId === provider.providerInstanceId && "bg-accent font-medium",
                  )}
                >
                  {p.displayName}
                </button>
              ))}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-y-auto p-1">
              {provider.models.map((model) => {
                const active =
                  selection?.instanceId === provider.providerInstanceId && selection.model === model.id;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => pick(provider.providerInstanceId, model.id)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent"
                  >
                    <span className="min-w-0 flex-1 truncate">{modelLabel(model.id)}</span>
                    {active ? <CheckIcon className="size-3.5 text-primary" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
          {effortOption && selection ? (
            <div className="flex flex-wrap gap-1 border-t border-border p-1.5">
              {effortOption.values.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => pick(selection.instanceId, selection.model, value)}
                  className={cn(
                    "rounded-md px-2 py-1 hover:bg-accent",
                    value === effort && "bg-accent font-medium text-foreground",
                  )}
                >
                  {effortLabel(value)}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function Composer(props: {
  placeholder: string;
  providers: readonly Provider[];
  selection: ModelSelection | null;
  onSelectionChange: (selection: ModelSelection) => void;
  onSubmit: (message: string) => Promise<boolean>;
  working?: boolean;
  onStop?: () => void;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const submit = async () => {
    const message = text.trim();
    if (!message || sending) return;
    setSending(true);
    const ok = await props.onSubmit(message);
    setSending(false);
    if (ok) setText("");
    textarea.current?.focus();
  };
  const canSend = text.trim().length > 0 && !sending;
  return (
    <div className="m-2 mt-0 rounded-2xl border border-border bg-input shadow-xs focus-within:border-primary/50">
      <textarea
        ref={textarea}
        autoFocus={props.autoFocus}
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
        className="selectable block max-h-40 min-h-[44px] w-full resize-none bg-transparent px-3 pt-3 pb-1 text-[13px] leading-5 outline-none [field-sizing:content] placeholder:text-faint"
      />
      <div className="flex items-center gap-1 px-1.5 pb-1.5">
        <div className="min-w-0 flex-1">
          <ModelPicker
            providers={props.providers}
            selection={props.selection}
            onChange={props.onSelectionChange}
          />
        </div>
        {props.working && !canSend && props.onStop ? (
          <button
            type="button"
            aria-label="Stop"
            onClick={props.onStop}
            className="grid size-7 place-items-center rounded-full bg-danger text-white hover:opacity-90"
          >
            <SquareIcon className="size-3 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Send"
            disabled={!canSend}
            onClick={() => void submit()}
            className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <ArrowUpIcon className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
