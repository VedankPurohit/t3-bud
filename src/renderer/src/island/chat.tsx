import type { ImageAttachment, PendingRequest, RequestResponse, ThreadDetail } from "@shared/types";
import {
  ArrowUpRightIcon,
  ChevronLeftIcon,
  ImageIcon,
  ShieldIcon,
  SquareArrowOutUpRightIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "../t3/lib/utils";
import { Button } from "../t3/ui/button";
import { ProjectGlyph } from "./rows";

/* Chat pieces copied from T3 Code (TimelineUserMessageRow, TimelineAssistantRows, ChatMarkdown,
   WorkspaceBreadcrumb, TimelinePendingApprovalRow), MIT License, with logic replaced. */

function SentImage({ image }: { image: ImageAttachment }) {
  const [url, setUrl] = useState<string | null>(null);
  // Attachment URLs are signed by the environment that owns the thread.
  useEffect(() => {
    let current = true;
    void window.companion.imageUrl(image.id).then((next) => {
      if (current) setUrl(next);
    });
    return () => {
      current = false;
    };
  }, [image.id]);
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" title={image.name}>
      <img src={url} alt={image.name} className="max-h-36 max-w-full rounded-lg object-contain" />
    </a>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <ImageIcon size={14} />
      {image.name}
    </span>
  );
}

export function UserBubble({
  text,
  attachments,
}: {
  text: string;
  attachments?: readonly ImageAttachment[];
}) {
  return (
    <div className="group flex flex-col items-end gap-1">
      <div className="relative min-w-0 max-w-[85%] rounded-2xl bg-message p-3 text-message-foreground">
        {attachments?.length ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((image) => (
              <SentImage key={image.id} image={image} />
            ))}
          </div>
        ) : null}
        {text ? (
          <p
            dir="auto"
            className="selectable text-sm leading-relaxed whitespace-pre-wrap wrap-break-word"
          >
            {text}
          </p>
        ) : null}
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
      {props.time ? (
        <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">{props.time}</p>
      ) : null}
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
          <UserBubble key={item.itemId} text={item.text} attachments={item.attachments} />
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
  projectId?: string;
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
              <ProjectGlyph projectId={props.projectId} className="size-3.5" />
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
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label="Open in T3 Code"
          onClick={props.onOpenInT3}
        >
          <SquareArrowOutUpRightIcon />
        </Button>
      ) : null}
      {props.trailing}
    </div>
  );
}

/**
 * TimelinePendingApprovalRow and ComposerPendingUserInputPanel, cut down: the companion answers
 * approvals and questions in place over T3 Code's client protocol.
 */
export function RequestCard(props: {
  request: PendingRequest;
  onRespond: (response: RequestResponse) => Promise<boolean>;
}) {
  const { request } = props;
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [custom, setCustom] = useState<Record<string, string>>({});
  const respond = async (response: RequestResponse) => {
    setBusy(true);
    const ok = await props.onRespond(response);
    if (!ok) setBusy(false);
  };

  if (request.kind === "approval") {
    return (
      <div
        role="group"
        aria-label="Approval request"
        className="flex min-w-0 flex-col gap-2 rounded-xl border border-warning/30 bg-warning/6 p-3 text-xs"
      >
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-warning-foreground">
          <ShieldIcon aria-hidden className="size-3.5 shrink-0" />
          Waiting for your approval
        </span>
        {request.title ? (
          <code className="selectable block min-w-0 rounded-md bg-background/60 px-2 py-1.5 font-mono text-xs leading-5 whitespace-pre-wrap text-foreground wrap-anywhere">
            {request.title}
          </code>
        ) : null}
        {request.detail ? <span className="text-muted-foreground">{request.detail}</span> : null}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {request.decisions.map((option, index) => (
            <Button
              key={option.decision}
              size="xs"
              disabled={busy}
              variant={index === 0 ? "default" : "outline"}
              title={option.warning ?? undefined}
              onClick={() => void respond({ decision: option.decision })}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  const ready = request.questions.every(
    (question) =>
      (answers[question.id]?.length ?? 0) > 0 || (custom[question.id] ?? "").trim().length > 0,
  );
  const submit = () => {
    const result: Record<string, string | string[]> = {};
    for (const question of request.questions) {
      const typed = (custom[question.id] ?? "").trim();
      const picked = answers[question.id] ?? [];
      result[question.id] = question.multiSelect
        ? [...picked, ...(typed ? [typed] : [])]
        : typed || picked[0] || "";
    }
    void respond({ answers: result });
  };
  return (
    <div
      role="group"
      aria-label="Question"
      className="flex min-w-0 flex-col gap-3 rounded-xl border border-info/30 bg-info/6 p-3 text-xs"
    >
      {request.questions.map((question) => (
        <div key={question.id} className="flex flex-col gap-1.5">
          {question.header ? (
            <span className="text-2xs font-medium text-muted-foreground uppercase">
              {question.header}
            </span>
          ) : null}
          <span className="selectable text-sm text-foreground">{question.question}</span>
          <div className="flex flex-col gap-1">
            {question.options.map((option) => {
              const chosen = answers[question.id]?.includes(option.value) ?? false;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={busy}
                  aria-pressed={chosen}
                  onClick={() => {
                    setAnswers((current) => {
                      const picked = current[question.id] ?? [];
                      const next = question.multiSelect
                        ? chosen
                          ? picked.filter((value) => value !== option.value)
                          : [...picked, option.value]
                        : [option.value];
                      return { ...current, [question.id]: next };
                    });
                    if (!question.multiSelect)
                      setCustom((current) => ({ ...current, [question.id]: "" }));
                  }}
                  className={cn(
                    "flex min-w-0 flex-col items-start rounded-md border px-2.5 py-1.5 text-left text-sm transition-colors",
                    chosen
                      ? "border-primary/60 bg-primary/10 text-foreground"
                      : "border-border bg-background/40 hover:bg-accent",
                  )}
                >
                  {option.label}
                  {option.description && option.description !== option.label ? (
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  ) : null}
                </button>
              );
            })}
            {question.allowCustomAnswer || question.options.length === 0 ? (
              <input
                value={custom[question.id] ?? ""}
                disabled={busy}
                placeholder="Type an answer"
                onChange={(event) => {
                  const value = event.target.value;
                  setCustom((current) => ({ ...current, [question.id]: value }));
                  if (!question.multiSelect && value)
                    setAnswers((current) => ({ ...current, [question.id]: [] }));
                }}
                className="selectable h-8 rounded-md border border-border bg-background/40 px-2.5 text-sm outline-none focus:border-ring"
              />
            ) : null}
          </div>
        </div>
      ))}
      <div className="flex justify-end">
        <Button size="xs" disabled={!ready || busy} onClick={submit}>
          Send answer
        </Button>
      </div>
    </div>
  );
}

/** A subagent's request the companion does not show inline; T3 Code answers it. */
export function HiddenRequestRow(props: { count: number; onOpenInT3: () => void }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-warning/30 bg-warning/6 px-3 py-2 text-xs">
      <ShieldIcon aria-hidden className="size-3.5 shrink-0 text-warning-foreground" />
      <span className="min-w-0 flex-1 text-muted-foreground">
        {props.count === 1
          ? "A subagent is waiting on you."
          : `${props.count} subagent requests are waiting.`}
      </span>
      <Button size="xs" variant="warning-outline" onClick={props.onOpenInT3}>
        Open in T3 Code
        <ArrowUpRightIcon />
      </Button>
    </div>
  );
}
