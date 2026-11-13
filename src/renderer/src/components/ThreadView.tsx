import { isWorking, type CompanionState, type ModelSelection } from "@shared/types";
import { AppWindowIcon, ShieldQuestionIcon } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "../lib/cn";
import { useThreadDetail } from "../lib/state";
import { Composer } from "./Composer";

/** One thread: its messages, live while it works, and a composer to continue it. */
export function ThreadView(props: { threadId: string; state: CompanionState; onError: (message: string) => void }) {
  const detail = useThreadDetail(props.threadId);
  const [override, setOverride] = useState<ModelSelection | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const lastCount = useRef(0);

  // Follows new messages while the reader is at the bottom, like T3 Code's timeline.
  useLayoutEffect(() => {
    const node = scroller.current;
    const count = detail?.items.length ?? 0;
    if (node && (stick.current || lastCount.current === 0) && count > 0) node.scrollTop = node.scrollHeight;
    lastCount.current = count;
  }, [detail?.items]);

  const selection: ModelSelection | null =
    override ??
    (detail?.providerInstanceId && detail.model
      ? { instanceId: detail.providerInstanceId, model: detail.model }
      : null);
  const working = detail ? isWorking(detail.status) : false;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div
        ref={scroller}
        onScroll={(event) => {
          const node = event.currentTarget;
          stick.current = node.scrollHeight - node.scrollTop - node.clientHeight < 40;
        }}
        className="selectable min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3"
      >
        {!detail || (detail.loading && detail.items.length === 0) ? (
          <p className="py-10 text-center text-xs text-muted">Loading messages…</p>
        ) : detail.items.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted">No messages yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {detail.items.map((item) =>
              item.type === "user_message" ? (
                <div key={item.itemId} className="flex justify-end">
                  <div
                    dir="auto"
                    className="max-w-[85%] rounded-2xl bg-bubble px-3 py-2 text-[13px] leading-5 whitespace-pre-wrap"
                  >
                    {item.text}
                  </div>
                </div>
              ) : (
                <div key={item.itemId} className={cn("markdown", item.type === "plan" && "rounded-lg border border-border p-2.5")}>
                  {item.type === "plan" ? <p className="mb-1 text-2xs font-medium text-muted uppercase">Plan</p> : null}
                  <Markdown remarkPlugins={[remarkGfm]}>{item.text}</Markdown>
                </div>
              ),
            )}
          </div>
        )}
        {working ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
            <span className="inline-block size-1.5 rounded-full bg-working" /> Working…
          </p>
        ) : null}
        {detail?.error ? <p className="mt-3 text-xs text-danger">{detail.error}</p> : null}
      </div>
      {detail && detail.pendingRequestCount > 0 ? (
        <div className="mx-2 mb-2 flex items-center gap-2 rounded-xl border border-attention/40 bg-attention/10 px-3 py-2 text-xs">
          <ShieldQuestionIcon className="size-4 shrink-0 text-attention" />
          <span className="min-w-0 flex-1">
            Waiting on {detail.pendingRequestCount === 1 ? "your answer or approval" : `${detail.pendingRequestCount} requests`}.
          </span>
          <button
            type="button"
            onClick={() => void window.companion.openInT3Code(props.threadId)}
            className="flex shrink-0 items-center gap-1 rounded-md bg-card px-2 py-1 font-medium shadow-xs hover:bg-accent"
          >
            <AppWindowIcon className="size-3.5" /> Open
          </button>
        </div>
      ) : null}
      <Composer
        placeholder={working ? "Steer or queue a follow-up…" : "Reply…"}
        providers={props.state.providers}
        selection={selection}
        working={working}
        autoFocus
        onSelectionChange={(next) => {
          setOverride(next);
          void window.companion.configure(props.threadId, next).then((result) => {
            if (!result.ok) {
              setOverride(null);
              props.onError(result.error);
            }
          });
        }}
        onStop={() => void window.companion.interrupt(props.threadId)}
        onSubmit={async (message) => {
          stick.current = true;
          const result = await window.companion.send(props.threadId, message);
          if (!result.ok) props.onError(result.error);
          return result.ok;
        }}
      />
    </div>
  );
}
