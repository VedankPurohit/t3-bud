import type { ThreadSearchInput, CompanionWindowLayout } from "@shared/types";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { controlsSize, FOLDED_SIZE, IslandCapsule } from "./island/capsule";
import { selectHoverThreads } from "./lib/activity";
import { NotificationStack, notificationWindowSize } from "./island/notification-stack";
import {
  collectThreadNotices,
  emptyNotificationTracker,
  enqueueThreadNotices,
  dismissThreadNotices,
  previewThreadNotices,
  summarizeThreadNotices,
  threadNoticeIds,
  type ThreadNotice,
} from "./lib/notifications";
import { IslandContext, makeLookups } from "./island/context";
import type { Shelf } from "./island/rows";
import { ConnectScreen, InboxScreen, NewThreadScreen, ThreadScreen } from "./island/screens";
import { escapeAction } from "./lib/escape";
import { useMood } from "./lib/mood";
import { useCompanionState } from "./lib/state";

type Mode =
  | { readonly kind: "folded"; readonly revealed?: boolean }
  | { readonly kind: "open" }
  | { readonly kind: "quick"; readonly pickerOpen?: boolean };
type View =
  | { readonly kind: "inbox" }
  | { readonly kind: "new" }
  | { readonly kind: "thread"; readonly threadId: string };

/** Room around the capsule for its shadow. */
const SHADOW_MARGIN = { x: 16, y: 14 } as const;
const POPOVER_SIZE = { width: 390, height: 540 } as const;
const NOTIFICATION_MS = 8_000;

const api = () => window.companion;

export function App() {
  const state = useCompanionState();
  const mood = useMood(state);
  const [windowLayout, setWindowLayout] = useState<CompanionWindowLayout | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: "folded" });
  const [view, setView] = useState<View>({ kind: "inbox" });
  const [threadSearch, setThreadSearch] = useState<ThreadSearchInput>({
    query: "",
    projectIds: [],
  });
  const [shelf, setShelf] = useState<Shelf>("inbox");
  const [toast, setToast] = useState<string | null>(null);
  const [hoverSpace, setHoverSpace] = useState(false);
  const [quickHeight, setQuickHeight] = useState(208);
  const tracker = useRef(emptyNotificationTracker);
  const [notices, setNotices] = useState<ThreadNotice[]>([]);
  const [noticePaused, setNoticePaused] = useState(false);
  const [noticeExpanded, setNoticeExpanded] = useState(false);
  const [closingNoticeIds, setClosingNoticeIds] = useState<readonly string[]>([]);
  const notice = notices[0];
  const noticeVisible = Boolean(notice) && mode.kind === "folded";
  const noticeClosing =
    notices.length > 0 && notices.every((item) => closingNoticeIds.includes(item.id));

  const controls = controlsSize(state ? selectHoverThreads(state).length : 0);
  const revealed = mode.kind === "folded" && mode.revealed === true;
  const panelAbove = windowLayout?.panelAbove === true;
  const baseSize =
    mode.kind === "open"
      ? POPOVER_SIZE
      : mode.kind === "quick"
        ? {
            width: mode.pickerOpen ? 420 : 380,
            height: mode.pickerOpen ? Math.max(472, quickHeight + 240) : Math.max(208, quickHeight),
          }
        : noticeVisible
          ? notificationWindowSize(summarizeThreadNotices(notices).items.length, noticeExpanded)
          : hoverSpace
            ? {
                width: controls.width + SHADOW_MARGIN.x,
                height: controls.height + SHADOW_MARGIN.y,
              }
            : {
                width: FOLDED_SIZE.width + SHADOW_MARGIN.x,
                height: FOLDED_SIZE.height + SHADOW_MARGIN.y,
              };
  const size = {
    ...baseSize,
    height: baseSize.height + (panelAbove && !noticeVisible &&
      (mode.kind !== "folded" || hoverSpace) ? SHADOW_MARGIN.y : 0),
  };
  const focus = mode.kind === "open" || mode.kind === "quick";
  const hoverLayout = mode.kind === "folded" && !noticeVisible;
  const panelVisible = focus || noticeVisible || hoverSpace;

  // Keep room for the pill until its exit transition finishes, then release the transparent area.
  useLayoutEffect(() => {
    let current = true;
    void api()
      .resize({
        ...size, focus, notification: noticeVisible, hover: hoverLayout, visible: panelVisible,
      })
      .then((layout) => {
        if (current && layout) setWindowLayout(layout);
      });
    return () => {
      current = false;
    };
  }, [size.width, size.height, focus, noticeVisible, hoverLayout, panelVisible]);

  // Native dragging and display changes can flip the thought bubble to the other side.
  useEffect(() => api().onWindowLayout?.(setWindowLayout), []);
  const mascotX =
    windowLayout?.width === size.width
      ? windowLayout.mascotX
      : noticeVisible
        ? size.width - 46
        : size.width / 2;
  const mascotY = windowLayout?.width === size.width ? (windowLayout.mascotY ?? 0) : 0;
  const insets = windowLayout?.anchorInsets;
  // The content window positions its panels around the anchor of the separate mascot window.
  const anchorX = !noticeVisible
    ? insets
      ? `clamp(calc(100vw - ${insets.right}px), 50vw, ${insets.left}px)`
      : "50vw"
    : `${mascotX}px`;
  const preferredY = windowLayout?.panelAbove ? "calc(100vh - 74px)" : "0px";
  const anchorY = !noticeVisible
    ? insets
      ? `clamp(calc(100vh - ${insets.bottom}px), ${preferredY}, ${insets.top}px)`
      : "0px"
    : `${mascotY}px`;

  const reveal = (next: boolean) => {
    if (mode.kind !== "folded") return;
    if (next) setHoverSpace(true);
    setMode((current) =>
      current.kind === "folded" && Boolean(current.revealed) !== next
        ? { kind: "folded", revealed: next }
        : current,
    );
  };

  const revealFromNative = useEffectEvent(reveal);
  const toggleFromNative = useEffectEvent(() => {
    if (mode.kind === "open" || mode.kind === "quick") fold();
    else void open();
  });
  useEffect(() => api().onRevealRequest(revealFromNative), []);
  useEffect(() => api().onToggleRequest(toggleFromNative), []);

  // Compare run completions, not unread state; a thread can finish repeatedly without a visit.
  useEffect(() => {
    if (!state) return;
    if (
      tracker.current.environmentId !== null &&
      tracker.current.environmentId !== state.environmentId
    ) {
      setNotices([]);
      setClosingNoticeIds([]);
      setNoticePaused(false);
      setNoticeExpanded(false);
    }
    const next = collectThreadNotices(tracker.current, state);
    tracker.current = next.tracker;
    if (next.notices.length > 0)
      setNotices((current) => enqueueThreadNotices(current, next.notices));
  }, [state]);

  // Show each batch once; explicit review keeps its details open until the user closes them.
  useEffect(() => {
    if (
      !notices.length ||
      notices.every((item) => item.kind === "preview") ||
      !noticeVisible ||
      noticePaused ||
      noticeClosing ||
      noticeExpanded
    )
      return;
    const ids = notices.map((item) => item.id);
    const timer = setTimeout(
      () => setClosingNoticeIds((current) => [...new Set([...current, ...ids])]),
      NOTIFICATION_MS,
    );
    return () => clearTimeout(timer);
  }, [notices, noticeVisible, noticePaused, noticeClosing, noticeExpanded]);

  const dismissNotice = (id?: string) => {
    const ids = id ? threadNoticeIds(notices, id) : notices.map((item) => item.id);
    setClosingNoticeIds((current) => [...new Set([...current, ...ids])]);
  };
  const removeNotice = (id: string) => {
    const related = threadNoticeIds(notices, id);
    const ids = noticeClosing
      ? closingNoticeIds
      : closingNoticeIds.includes(id)
        ? related.filter((item) => closingNoticeIds.includes(item))
        : related;
    setNotices((current) => dismissThreadNotices(current, ids));
    setClosingNoticeIds((current) => current.filter((item) => !ids.includes(item)));
    if (notices.every((item) => ids.includes(item.id))) setNoticeExpanded(false);
    setHoverSpace(mode.kind === "folded" && Boolean(mode.revealed));
  };

  // Hidden windows can omit transition-end events; finish only the batch that started closing.
  useEffect(() => {
    if (!closingNoticeIds.length) return;
    const ids = closingNoticeIds;
    const timer = setTimeout(() => {
      setNotices((current) => dismissThreadNotices(current, ids));
      setClosingNoticeIds((current) => current.filter((id) => !ids.includes(id)));
      if (notices.every((item) => ids.includes(item.id))) setNoticeExpanded(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [closingNoticeIds]);

  // Cmd+W reaches the main process as a close; it folds the island instead.
  useEffect(
    () =>
      api().onFoldRequest(() => {
        setHoverSpace(false);
        setMode({ kind: "folded" });
      }),
    [],
  );

  // Clears an error toast after a few seconds.
  useEffect(() => {
    if (toast === null) return;
    const timer = setTimeout(() => setToast(null), 4_000);
    return () => clearTimeout(timer);
  }, [toast]);

  const open = async (next?: View) => {
    setNoticeExpanded(false);
    if (next) setView(next);
    setMode({ kind: "open" });
  };
  const fold = () => {
    setNoticeExpanded(false);
    setHoverSpace(false);
    setMode({ kind: "folded" });
  };

  const foldOnEscape = useEffectEvent((event: KeyboardEvent) => {
    const action = escapeAction({
      key: event.key,
      defaultPrevented: event.defaultPrevented,
      isComposing: event.isComposing,
      popupOpen: Boolean(
        document.querySelector("[data-popup-open], [data-slot$='-popup'][data-open]"),
      ),
      composerOpen: Boolean(document.querySelector("[data-companion-composer]")),
      noticeVisible,
    });
    if (action === "ignore") return;
    event.preventDefault();
    if (action === "dismiss-notice") dismissNotice();
    else fold();
  });
  // Dictation tools use Escape; only fold from views without a composer.
  useEffect(() => {
    if (mode.kind !== "open" && mode.kind !== "quick" && !noticeVisible) return;
    window.addEventListener("keydown", foldOnEscape);
    return () => window.removeEventListener("keydown", foldOnEscape);
  }, [mode.kind, noticeVisible]);

  if (!state) return null;
  const lookups = makeLookups(state);
  const connected = state.connection.state === "connected" || state.connection.state === "offline";
  return (
    <IslandContext value={lookups}>
      <div
        className="relative size-full"
        style={
          {
            "--companion-anchor-x": anchorX,
            "--companion-anchor-y": anchorY,
            "--companion-panel-top": panelAbove ? "12px" : `calc(${anchorY} + 72px)`,
            "--companion-panel-bottom": panelAbove ? `calc(100vh - ${anchorY} + 12px)` : "12px",
            "--companion-controls-y": !noticeVisible && panelAbove
              ? `calc(${anchorY} - ${controls.height - FOLDED_SIZE.height}px)`
              : `calc(${anchorY} + 68px)`,
            "--companion-bridge-y": !noticeVisible && panelAbove
              ? `calc(${anchorY} - 8px)`
              : `calc(${anchorY} + 60px)`,
          } as CSSProperties
        }
      >
        {mode.kind === "open" ? (
          !connected ? (
            <ConnectScreen connection={state.connection} onMinimize={fold} />
          ) : view.kind === "thread" ? (
            <ThreadScreen
              key={view.threadId}
              threadId={view.threadId}
              onBack={() => setView({ kind: "inbox" })}
              onMinimize={fold}
              onError={setToast}
            />
          ) : view.kind === "new" ? (
            <NewThreadScreen
              onBack={() => setView({ kind: "inbox" })}
              onMinimize={fold}
              onLaunched={(threadId) => setView({ kind: "thread", threadId })}
              onError={setToast}
            />
          ) : (
            <InboxScreen
              search={threadSearch}
              onSearchChange={setThreadSearch}
              onPreviewNotification={() => {
                setNotices((current) => [
                  ...previewThreadNotices(state),
                  ...current.filter((item) => item.kind !== "preview"),
                ]);
                setClosingNoticeIds([]);
                setNoticePaused(false);
                fold();
              }}
              onMinimize={fold}
              shelf={shelf}
              onShelf={setShelf}
              onOpen={(threadId) => setView({ kind: "thread", threadId })}
              onNewThread={() => setView({ kind: "new" })}
              onError={setToast}
            />
          )
        ) : null}
        {mode.kind === "quick" ? (
          <NewThreadScreen
            compact
            above={panelAbove}
            onContentHeightChange={setQuickHeight}
            onPickerOpenChange={(pickerOpen) =>
              setMode((current) =>
                current.kind === "quick" ? { kind: "quick", pickerOpen } : current,
              )
            }
            onBack={fold}
            onMinimize={fold}
            onLaunched={(threadId) => void open({ kind: "thread", threadId })}
            onError={setToast}
          />
        ) : null}
        <IslandCapsule
          mood={mood}
          revealed={revealed && !noticeVisible}
          space={hoverSpace && !noticeVisible}
          onPillHidden={() => {
            if (mode.kind === "folded" && !revealed) setHoverSpace(false);
          }}
          onOpenThread={(threadId) => void open({ kind: "thread", threadId })}
          onOpenInbox={() => void open({ kind: "inbox" })}
          onNewThread={() => (connected ? setMode({ kind: "quick" }) : void open())}
        />
        {notice && noticeVisible ? (
          <NotificationStack
            notices={notices}
            closingIds={closingNoticeIds}
            expanded={noticeExpanded}
            mascotY={mascotY}
            onExpandedChange={setNoticeExpanded}
            side={mascotX > size.width / 2 ? "left" : "right"}
            onPauseChange={setNoticePaused}
            onDismiss={dismissNotice}
            onClosed={removeNotice}
            onClearAll={() => dismissNotice()}
            onReply={(notice) => {
              removeNotice(notice.id);
              void open(
                notice.thread
                  ? { kind: "thread", threadId: notice.thread.threadId }
                  : { kind: "inbox" },
              );
            }}
            onOpen={(notice) => {
              removeNotice(notice.id);
              if (notice.thread) {
                void api().openInT3Code(notice.thread.threadId);
                return;
              }
              void open({ kind: "inbox" });
            }}
          />
        ) : null}
        {toast && (mode.kind === "open" || mode.kind === "quick") ? (
          <div
            role="status"
            className="dropdown-glass absolute inset-x-6 bottom-6 z-40 rounded-lg px-3 py-2 text-sm text-popover-foreground shadow-lg"
          >
            {toast}
          </div>
        ) : null}
      </div>
    </IslandContext>
  );
}
