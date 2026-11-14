import {
  ArrowUpRightIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  CircleDashedIcon,
  InboxIcon,
  ShieldQuestionIcon,
  SquarePenIcon,
} from "lucide-react";
import type { ThreadSummary } from "@shared/types";

import { activityStatus, selectHoverThreads } from "../lib/activity";
import { driverOf, useIsland } from "./context";
import { ProjectGlyph } from "./project-icon";
import { ProviderGlyph } from "./icons";
import "./activity.css";

export const ACTIVITY_SIZE = { width: 300, height: 108 } as const;

function ActivityRow(props: { thread: ThreadSummary; onOpen: (threadId: string) => void }) {
  const lookups = useIsland();
  const { thread } = props;
  const project = lookups.projectById.get(thread.projectId);
  const provider = thread.providerInstanceId
    ? lookups.providerById.get(thread.providerInstanceId)
    : undefined;
  const status = activityStatus(thread);
  const Icon =
    status.tone === "working"
      ? CircleDashedIcon
      : status.tone === "attention"
        ? ShieldQuestionIcon
        : status.tone === "failed"
          ? CircleAlertIcon
          : CheckCircle2Icon;
  return (
    <button
      type="button"
      className="companion-activity-row"
      data-tone={status.tone}
      onClick={() => props.onOpen(thread.threadId)}
      aria-label={`Open ${thread.title}. ${status.label}. ${project?.title ?? "No project"}`}
      title={`${thread.title}\n${project?.title ?? "No project"}${provider ? ` · ${provider.displayName}` : ""}`}
    >
      <span className="companion-activity-identity">
        <ProjectGlyph projectId={thread.projectId} className="size-5" />
        <span className="companion-activity-provider">
          <ProviderGlyph
            instanceId={thread.providerInstanceId}
            driverKind={driverOf(lookups, thread.providerInstanceId)}
            className="size-2.5"
          />
        </span>
      </span>
      <span className="companion-activity-copy">
        <span className="companion-activity-title">{thread.title}</span>
        <span className="companion-activity-meta">
          <span className="companion-activity-state">{status.label}</span>
          <span aria-hidden>·</span>
          <span className="companion-activity-project">{project?.title ?? "No project"}</span>
        </span>
      </span>
      <span className="companion-activity-indicator">
        <Icon aria-hidden size={15} />
      </span>
    </button>
  );
}

export function ActivityPanel(props: {
  summary: string;
  onOpenInbox: () => void;
  onOpenThread: (threadId: string) => void;
  onNewThread: () => void;
}) {
  const { state } = useIsland();
  const rows = selectHoverThreads(state);
  const connected = state.connection.state === "connected";
  return (
    <div data-app-sidebar className="companion-activity" aria-label="Thread activity">
      <div className="companion-activity-header">
        <button
          type="button"
          className="companion-activity-inbox"
          onClick={props.onOpenInbox}
          aria-label={`Open inbox. ${props.summary}`}
        >
          <InboxIcon aria-hidden size={12} />
          <span>{props.summary}{rows.length > 3 ? " · scroll for more" : ""}</span>
          <ArrowUpRightIcon aria-hidden size={11} />
        </button>
        <button
          type="button"
          className="companion-activity-new"
          onClick={props.onNewThread}
          aria-label="New thread"
          title="New thread"
        >
          <SquarePenIcon aria-hidden size={14} />
        </button>
      </div>
      <div className="companion-activity-rows">
        {connected && rows.length ? (
          rows.map((thread) => (
            <ActivityRow key={thread.threadId} thread={thread} onOpen={props.onOpenThread} />
          ))
        ) : (
          <button type="button" className="companion-activity-empty" onClick={props.onOpenInbox}>
            <span>{connected ? "Ready for your next idea" : "Reconnect to T3 Code"}</span>
            <span>
              {connected
                ? "Start a thread in any project"
                : "Open the companion to check the connection"}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
