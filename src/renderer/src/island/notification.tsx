import {
  BellIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  ShieldQuestionIcon,
  XIcon,
} from "lucide-react";

import { describeThreadNotice, type ThreadNotice } from "../lib/notifications";
import { relativeTime } from "../lib/format";
import { Button } from "../t3/ui/button";
import { useIsland, driverOf } from "./context";
import { ProviderGlyph } from "./icons";
import { ProjectGlyph } from "./project-icon";
import "./notification.css";

export const NOTICE_SIZE = { width: 280, height: 128 } as const;
export const NOTICE_WINDOW = { width: 404, height: 142 } as const;
export const NOTICE_ICONS = {
  attention: ShieldQuestionIcon,
  failed: CircleAlertIcon,
  preview: BellIcon,
  completed: CheckCircle2Icon,
};

export function ThoughtTrail({
  mascotY = 24,
  offsetX = 280,
}: {
  mascotY?: number;
  offsetX?: number;
}) {
  const targetY = mascotY + 30 - 2;
  const bigY = 65 + (targetY - 65) * (12 / 38);
  const smallY = 65 + (targetY - 65) * (28 / 38);
  return (
    <g transform={`translate(${offsetX} 0)`}>
      <ellipse className="companion-notice-thought" cx="10" cy={bigY} rx="7" ry="6" />
      <circle className="companion-notice-thought" cx="26" cy={smallY} r="3.5" />
    </g>
  );
}

export function ThoughtCloud({ trail, mascotY }: { trail: boolean; mascotY?: number }) {
  return (
    <svg
      className="companion-notice-cloud"
      viewBox="0 0 280 128"
      preserveAspectRatio="none"
      aria-hidden
    >
      <rect className="companion-notice-body" x="2" y="10" width="276" height="110" rx="26" />
      {trail ? <ThoughtTrail mascotY={mascotY} /> : null}
    </svg>
  );
}

export function NotificationCard(props: {
  notice: ThreadNotice;
  closing: boolean;
  trail?: boolean;
  mascotY?: number;
  side?: "left" | "right";
  onReply: () => void;
  onOpen: () => void;
  onDismiss: () => void;
  onClosed: () => void;
}) {
  const lookups = useIsland();
  const thread = props.notice.thread;
  const project = thread ? lookups.projectById.get(thread.projectId) : undefined;
  const provider = thread?.providerInstanceId
    ? lookups.providerById.get(thread.providerInstanceId)
    : undefined;
  const kind = props.notice.kind;
  const { kind: displayKind, title, message } = describeThreadNotice(props.notice);
  const Icon = NOTICE_ICONS[displayKind];

  return (
    <section
      data-app-sidebar
      role="status"
      aria-label={kind === "preview" ? `Notification preview: ${message}` : message}
      className="companion-notice dark"
      data-kind={displayKind}
      data-side={props.side ?? "left"}
      data-closing={props.closing}
      onTransitionEnd={(event) => {
        if (
          event.target === event.currentTarget &&
          event.propertyName === "opacity" &&
          props.closing
        )
          props.onClosed();
      }}
    >
      <ThoughtCloud trail={props.trail ?? true} mascotY={props.mascotY} />
      <button
        type="button"
        className="companion-notice-close"
        aria-label={`Dismiss ${title}`}
        title="Dismiss"
        onClick={props.onDismiss}
      >
        <XIcon aria-hidden size={13} />
      </button>
      <div className="companion-notice-content">
        <div className="companion-notice-message">
          <Icon aria-hidden className="companion-notice-status" size={17} />
          <p className="companion-notice-title" title={message}>
            {message}
          </p>
        </div>
        <div className="companion-notice-footer">
          <div
            className="companion-notice-identity"
            title={`${project?.title ?? "T3 Companion"}${provider ? ` · ${provider.displayName}` : ""}`}
          >
            {project ? (
              <span className="companion-notice-project-icon">
                <ProjectGlyph project={project} className="size-4" />
                {thread ? (
                  <span className="companion-notice-provider">
                    <ProviderGlyph
                      instanceId={thread.providerInstanceId}
                      driverKind={driverOf(lookups, thread.providerInstanceId)}
                      className="size-2"
                    />
                  </span>
                ) : null}
              </span>
            ) : null}
            <span className="companion-notice-meta">
              <span>{project?.title ?? "T3 Companion"}</span>
              <span>
                {kind === "preview"
                  ? "Preview"
                  : thread
                    ? relativeTime(thread.latestRunCompletedAt ?? thread.updatedAt)
                    : "just now"}
              </span>
            </span>
          </div>
          <div className="companion-notice-actions">
            {thread ? (
              <Button size="xs" variant="ghost-muted" onClick={props.onReply}>
                Reply
              </Button>
            ) : null}
            <Button size="xs" variant="outline" onClick={props.onOpen}>
              {thread ? "Open" : "Inbox"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
