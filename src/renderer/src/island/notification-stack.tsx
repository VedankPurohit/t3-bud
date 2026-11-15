import { useEffect, useEffectEvent, useRef, type CSSProperties } from "react";
import { ArrowLeftIcon, ArrowUpRightIcon, XIcon } from "lucide-react";
import {
  describeThreadNotice,
  summarizeThreadNotices,
  type ThreadNotice,
} from "../lib/notifications";
import { Button } from "../t3/ui/button";
import {
  NotificationCard,
  ThoughtCloud,
  ThoughtTrail,
  NOTICE_ICONS,
  NOTICE_WINDOW,
} from "./notification";
import { useIsland, driverOf } from "./context";
import { ProjectGlyph } from "./project-icon";
import { ProviderGlyph } from "./icons";
import { relativeTime } from "../lib/format";
import "./notification-stack.css";

const listHeight = (count: number) => Math.min(count, 3) * 68;
export const notificationWindowSize = (count: number, expanded = false) => ({
  width: NOTICE_WINDOW.width,
  height:
    expanded && count > 1 ? listHeight(count) + 60 + (count > 3 ? 14 : 0) : NOTICE_WINDOW.height,
});

function NotificationSummary(props: {
  notices: readonly ThreadNotice[];
  closing: boolean;
  side?: "left" | "right";
  mascotY?: number;
  onReview: () => void;
  onDismiss: () => void;
}) {
  const lookups = useIsland();
  const summary = summarizeThreadNotices(props.notices);
  const Icon = NOTICE_ICONS[summary.kind];
  const projects = [
    ...new Map(
      summary.items.map((notice) => {
        const project = notice.thread
          ? lookups.projectById.get(notice.thread.projectId)
          : undefined;
        return [notice.thread?.projectId ?? "none", project] as const;
      }),
    ).values(),
  ];
  const names = projects.map((project) => project?.title ?? "No project").join(", ");
  return (
    <section
      data-app-sidebar
      role="status"
      aria-label={summary.message}
      className="companion-notice dark"
      data-kind={summary.kind}
      data-side={props.side ?? "left"}
      data-closing={props.closing}
    >
      <ThoughtCloud trail mascotY={props.mascotY} />
      <button
        type="button"
        className="companion-notice-close"
        aria-label="Dismiss all notifications"
        title="Dismiss all"
        onClick={props.onDismiss}
      >
        <XIcon size={13} aria-hidden />
      </button>
      <div className="companion-notice-content">
        <div className="companion-notice-message">
          <Icon size={17} className="companion-notice-status" aria-hidden />
          <p className="companion-notice-title">{summary.message}</p>
        </div>
        <div className="companion-notice-footer">
          <div className="companion-notice-summary-projects" title={names}>
            <span className="companion-notice-summary-icons">
              {projects.slice(0, 3).map((project, index) => (
                <ProjectGlyph key={project?.id ?? index} project={project} className="size-3.5" />
              ))}
            </span>
            <span>{names}</span>
          </div>
          <Button size="xs" variant="outline" onClick={props.onReview}>
            Review updates
          </Button>
        </div>
      </div>
    </section>
  );
}

function NotificationItem(props: {
  notice: ThreadNotice;
  closing: boolean;
  onDismiss: () => void;
  onClosed: () => void;
  onReply: () => void;
  onOpen: () => void;
}) {
  const lookups = useIsland();
  const thread = props.notice.thread;
  const project = thread ? lookups.projectById.get(thread.projectId) : undefined;
  const { title, message, kind } = describeThreadNotice(props.notice);
  const Icon = NOTICE_ICONS[kind];
  return (
    <div
      role="listitem"
      className="companion-notice-item"
      data-kind={kind}
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
      <button
        type="button"
        className="companion-notice-item-main"
        onClick={props.onReply}
        aria-label={`Open ${title} in companion`}
        title={message}
      >
        <Icon className="companion-notice-item-status" size={14} aria-hidden />
        <span className="companion-notice-item-copy">
          <span className="companion-notice-item-title">{message}</span>
          <span className="companion-notice-item-meta">
            <ProjectGlyph projectId={thread?.projectId} className="size-3" />
            <span>{project?.title ?? "No project"}</span>
            {thread ? (
              <ProviderGlyph
                instanceId={thread.providerInstanceId}
                driverKind={driverOf(lookups, thread.providerInstanceId)}
                className="size-3"
              />
            ) : null}
            <span className="companion-notice-item-time">
              {props.notice.kind === "preview"
                ? "Preview"
                : thread
                  ? relativeTime(thread.latestRunCompletedAt ?? thread.updatedAt)
                  : "now"}
            </span>
          </span>
        </span>
      </button>
      <span className="companion-notice-item-actions">
        <button
          type="button"
          aria-label={`Dismiss ${title}`}
          title="Dismiss"
          onClick={props.onDismiss}
        >
          <XIcon size={12} aria-hidden />
        </button>
        <button
          type="button"
          aria-label={`Open ${title} in T3 Code`}
          title="Open in T3 Code"
          onClick={props.onOpen}
        >
          <ArrowUpRightIcon size={12} aria-hidden />
        </button>
      </span>
    </div>
  );
}

export function NotificationStack(props: {
  notices: readonly ThreadNotice[];
  closingIds: readonly string[];
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  side?: "left" | "right";
  mascotY?: number;
  onPauseChange: (paused: boolean) => void;
  onReply: (notice: ThreadNotice) => void;
  onOpen: (notice: ThreadNotice) => void;
  onDismiss: (id: string) => void;
  onClosed: (id: string) => void;
  onClearAll: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const summary = summarizeThreadNotices(props.notices);
  const closingBatch = props.notices.every((notice) => props.closingIds.includes(notice.id));
  const pause = useEffectEvent((next: boolean) => {
    paused.current = next;
    props.onPauseChange(next);
  });
  const trackCursor = useEffectEvent((cursor: { x: number; y: number; overMascot?: boolean }) => {
    const contains = (rect: DOMRect | undefined) =>
      Boolean(
        rect &&
        cursor.x >= rect.left &&
        cursor.x <= rect.right &&
        cursor.y >= rect.top &&
        cursor.y <= rect.bottom,
      );
    const focused = document.hasFocus() && Boolean(root.current?.contains(document.activeElement));
    const next =
      cursor.overMascot ||
      contains(root.current?.getBoundingClientRect()) ||
      focused;
    if (paused.current !== next) pause(next);
  });
  // One cursor subscription pauses the entire stack, including an inactive floating window.
  useEffect(() => {
    if (!("companion" in window)) return;
    const unsubscribe = window.companion.onCursor(trackCursor);
    return () => {
      unsubscribe();
      pause(false);
    };
  }, []);
  return (
    <div
      ref={root}
      className="companion-notice-stack dark"
      data-side={props.side ?? "left"}
      aria-label="Notifications"
      style={{ "--notice-list-height": `${listHeight(summary.items.length)}px` } as CSSProperties}
      onPointerEnter={() => {
        paused.current = true;
        props.onPauseChange(true);
      }}
      onPointerLeave={() => {
        if (!root.current?.contains(document.activeElement)) {
          paused.current = false;
          props.onPauseChange(false);
        }
      }}
      onFocusCapture={() => {
        paused.current = true;
        props.onPauseChange(true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          paused.current = false;
          props.onPauseChange(false);
        }
      }}
    >
      {!props.expanded && props.notices.length > 1 ? (
        <NotificationSummary
          notices={props.notices}
          closing={closingBatch}
          side={props.side}
          mascotY={props.mascotY}
          onReview={() => props.onExpandedChange(true)}
          onDismiss={props.onClearAll}
        />
      ) : !props.expanded ? (
        props.notices.map((notice) => (
          <NotificationCard
            key={notice.id}
            notice={notice}
            closing={props.closingIds.includes(notice.id)}
            side={props.side}
            mascotY={props.mascotY}
            onDismiss={() => props.onDismiss(notice.id)}
            onClosed={() => props.onClosed(notice.id)}
            onReply={() => props.onReply(notice)}
            onOpen={() => props.onOpen(notice)}
          />
        ))
      ) : (
        <>
          <svg className="companion-notice-stack-trail" viewBox="0 0 36 96" aria-hidden>
            <ThoughtTrail mascotY={props.mascotY} offsetX={0} />
          </svg>
          <div data-app-sidebar className="companion-notice-tray">
            <div className="companion-notice-stack-toolbar">
              <button
                type="button"
                className="companion-notice-collapse"
                onClick={() => props.onExpandedChange(false)}
                aria-label="Collapse updates"
              >
                <ArrowLeftIcon size={12} aria-hidden />
                Updates <span className="companion-notice-stack-count">{summary.items.length}</span>
              </button>
              <Button
                size="xs"
                variant="ghost-muted"
                disabled={props.notices.every((notice) => props.closingIds.includes(notice.id))}
                onClick={props.onClearAll}
              >
                Clear all
              </Button>
            </div>
            <div
              role="list"
              aria-label={
                summary.items.length > 3 ? "Notifications, scroll for more" : "Notifications"
              }
              className="companion-notice-stack-list"
            >
              {summary.items.map((notice) => (
                <NotificationItem
                  key={notice.id}
                  notice={notice}
                  closing={props.closingIds.includes(notice.id)}
                  onDismiss={() => props.onDismiss(notice.id)}
                  onClosed={() => props.onClosed(notice.id)}
                  onReply={() => props.onReply(notice)}
                  onOpen={() => props.onOpen(notice)}
                />
              ))}
            </div>
            {summary.items.length > 3 ? (
              <span className="companion-notice-stack-more">Scroll for more</span>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
