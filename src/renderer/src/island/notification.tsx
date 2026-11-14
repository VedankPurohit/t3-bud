import {
  BellIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  ShieldQuestionIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useEffectEvent, useRef } from "react";

import type { ThreadNotice } from "../lib/notifications";
import { relativeTime } from "../lib/format";
import { Button } from "../t3/ui/button";
import { useIsland, driverOf } from "./context";
import { ProviderGlyph } from "./icons";
import { ProjectGlyph } from "./project-icon";
import "./notification.css";

export const NOTICE_SIZE = { width: 280, height: 128 } as const;
export const NOTICE_WINDOW = { width: 404, height: 142 } as const;

function ThoughtCloud() {
  return (
    <svg
      className="companion-notice-cloud"
      viewBox="0 0 280 128"
      preserveAspectRatio="none"
      aria-hidden
    >
      <rect
        className="companion-notice-body"
        x="2"
        y="10"
        width="276"
        height="110"
        rx="26"
      />
      <ellipse className="companion-notice-thought" cx="290" cy="43" rx="7" ry="6" />
      <circle className="companion-notice-thought" cx="306" cy="34" r="3.5" />
    </svg>
  );
}

export function NotificationCard(props: {
  notice: ThreadNotice;
  remaining: number;
  closing: boolean;
  side?: "left" | "right";
  onPauseChange: (paused: boolean) => void;
  onReply: () => void;
  onOpen: () => void;
  onDismiss: () => void;
  onClosed: () => void;
}) {
  const lookups = useIsland();
  const root = useRef<HTMLElement>(null);
  const paused = useRef(false);
  const thread = props.notice.thread;
  const project = thread ? lookups.projectById.get(thread.projectId) : undefined;
  const provider = thread?.providerInstanceId
    ? lookups.providerById.get(thread.providerInstanceId)
    : undefined;
  const kind = props.notice.kind;
  const displayKind = kind === "preview" && thread?.status === "completed" ? "completed" : kind;
  const Icon =
    displayKind === "attention"
      ? ShieldQuestionIcon
      : displayKind === "failed"
        ? CircleAlertIcon
        : displayKind === "preview"
          ? BellIcon
          : CheckCircle2Icon;
  const title = thread?.title ?? "Your thread updates appear here";
  const message =
    displayKind === "completed"
      ? `${title} is done`
      : displayKind === "failed"
        ? `${title} ran into a problem`
        : displayKind === "attention"
          ? `${title} needs your input`
          : title;
  const pause = (value: boolean) => {
    paused.current = value;
    props.onPauseChange(value);
  };
  const trackCursor = useEffectEvent((cursor: { x: number; y: number }) => {
    const rect = root.current?.getBoundingClientRect();
    const orb = document.querySelector(".companion-orb")?.getBoundingClientRect();
    const contains = (area: DOMRect | undefined) =>
      Boolean(
        area &&
        cursor.x >= area.left &&
        cursor.x <= area.right &&
        cursor.y >= area.top &&
        cursor.y <= area.bottom,
      );
    const focused = document.hasFocus() && Boolean(root.current?.contains(document.activeElement));
    const next = contains(rect) || contains(orb) || focused;
    if (paused.current !== next) pause(next);
  });
  // The native cursor feed also covers hovering an inactive floating window.
  useEffect(() => {
    if (!("companion" in window)) return;
    return window.companion.onCursor(trackCursor);
  }, []);

  return (
    <section
      data-app-sidebar
      ref={root}
      role="status"
      aria-label={kind === "preview" ? `Notification preview: ${message}` : message}
      className="companion-notice dark"
      data-kind={displayKind}
      data-side={props.side ?? "left"}
      data-closing={props.closing}
      onPointerEnter={() => pause(true)}
      onPointerLeave={() => {
        if (!root.current?.contains(document.activeElement)) pause(false);
      }}
      onFocusCapture={() => pause(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) pause(false);
      }}
      onTransitionEnd={(event) => {
        if (
          event.target === event.currentTarget &&
          event.propertyName === "opacity" &&
          props.closing
        )
          props.onClosed();
      }}
    >
      <ThoughtCloud />
      <button
        type="button"
        className="companion-notice-close"
        aria-label="Dismiss notification"
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
                  : props.remaining > 0
                    ? `${props.remaining} more waiting`
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
