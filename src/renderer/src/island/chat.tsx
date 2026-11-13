import type { ThreadDetail } from "@shared/types";
import { ArrowUpRightIcon, ChevronLeftIcon, ShieldIcon, SquareArrowOutUpRightIcon } from "lucide-react";
import type { ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "../t3/ui/button";
import { ProjectGlyph } from "./rows";

/* Chat pieces copied from T3 Code (TimelineUserMessageRow, TimelineAssistantRows, ChatMarkdown,
   WorkspaceBreadcrumb, TimelinePendingApprovalRow), MIT License, with logic replaced. */

export function UserBubble({ text }: { text: string }) {
  return (
    <div className="group flex flex-col items-end gap-1">
      <div className="relative min-w-0 max-w-[85%] rounded-2xl bg-message p-3 text-message-foreground">
        <p dir="auto" className="selectable text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
          {text}
        </p>
      </div>
    </div>
  );
}

export function AssistantMessage(props: { text: string; time?: string; plan?: boolean }) {
  return (
    <div className="relative min-w-0 px-1 py-0.5">
      {props.plan ? <p className="mb-1 text-xs font-medium text-muted-foreground">Plan</p> : null}
      <div className="selectable chat-markdown w-full min-w-0 text-sm leading-relaxed text-foreground/[calc(90%+var(--appearance-contrast-boost)/10)] [overflow-wrap:anywhere] [word-break:break-word]">
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            ),
          }}
        >
          {props.text}
        </Markdown>
      </div>
      {props.time ? <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">{props.time}</p> : null}
    </div>
  );
}

const clockTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

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
            plan={item.type === "plan"}
            {...(index === detail.items.length - 1 && item.status === "completed"
              ? { time: clockTime(item.updatedAt) }
              : {})}
          />
        ),
      )}
    </>
  );
}

/** ChatHeader's breadcrumb: back, project / thread title, and a hand-off to T3 Code. */
export function ThreadHeader(props: {
  project: string;
  title: ReactNode;
  onBack: () => void;
  onOpenInT3?: () => void;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button size="icon-xs" variant="ghost" aria-label="Back to inbox" onClick={props.onBack}>
        <ChevronLeftIcon />
      </Button>
      <ol className="m-0 flex min-w-0 flex-1 list-none items-center gap-2 p-0 text-sm">
        {props.project ? (
          <>
            <li className="flex max-w-[40%] shrink-0 items-center gap-1.5 font-medium text-muted-foreground">
              <ProjectGlyph className="size-3.5" />
              <span className="truncate">{props.project}</span>
            </li>
            <li aria-hidden className="flex shrink-0 items-center text-icon-muted">
              /
            </li>
          </>
        ) : null}
        <li aria-current="page" className="flex min-w-0 items-center font-medium text-foreground">
          <h2 dir="auto" className="min-w-0 truncate">
            {props.title}
          </h2>
        </li>
      </ol>
      {props.onOpenInT3 ? (
        <Button size="icon-xs" variant="ghost" aria-label="Open in T3 Code" onClick={props.onOpenInT3}>
          <SquareArrowOutUpRightIcon />
        </Button>
      ) : null}
      {props.trailing}
    </div>
  );
}

/**
 * TimelinePendingApprovalRow with Approve and Decline swapped for the hand-off: MCP cannot answer
 * permission requests, so the honest action is opening the thread in T3 Code.
 */
export function PendingRequestRow(props: { count: number; onOpenInT3: () => void }) {
  return (
    <div role="group" aria-label="Waiting on you" className="flex min-w-0 flex-col gap-1.5 px-1 py-0.5 text-xs">
      <span className="inline-flex items-center gap-1 text-sm font-medium text-warning-foreground">
        <ShieldIcon aria-hidden className="size-3.5 shrink-0" />
        {props.count === 1 ? "Waiting for your approval" : `${props.count} requests waiting on you`}
      </span>
      <span className="text-muted-foreground">
        The agent paused until you answer. Approvals only work in T3 Code.
      </span>
      <div className="pt-0.5">
        <Button size="xs" variant="warning-outline" onClick={props.onOpenInT3}>
          Open in T3 Code to approve
          <ArrowUpRightIcon />
        </Button>
      </div>
    </div>
  );
}
