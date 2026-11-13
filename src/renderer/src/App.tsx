import { useEffect, useEffectEvent, useRef, useState } from "react";

import { AnnounceCapsule, ANNOUNCE_SIZE, CAPSULE_HEIGHT, capsuleWidth, IslandCapsule } from "./island/capsule";
import { IslandContext, makeLookups } from "./island/context";
import type { Shelf } from "./island/rows";
import { ConnectScreen, InboxScreen, NewThreadScreen, ThreadScreen } from "./island/screens";
import { useMood } from "./lib/mood";
import { useCompanionState } from "./lib/state";

type Mode = { readonly kind: "folded" } | { readonly kind: "announce"; readonly threadId: string } | { readonly kind: "open" };
type View = { readonly kind: "inbox" } | { readonly kind: "new" } | { readonly kind: "thread"; readonly threadId: string };

/** Room around the capsule for its shadow. */
const SHADOW_MARGIN = { x: 16, y: 14 } as const;
const POPOVER_SIZE = { width: 420, height: 560 } as const;
const ANNOUNCE_MS = 6_000;

const api = () => window.companion;

export function App() {
  const state = useCompanionState();
  const mood = useMood(state);
  const [mode, setMode] = useState<Mode>({ kind: "folded" });
  const [view, setView] = useState<View>({ kind: "inbox" });
  const [shelf, setShelf] = useState<Shelf>("inbox");
  const [toast, setToast] = useState<string | null>(null);
  const announced = useRef<Set<string> | null>(null);

  const working = state?.working ?? [];
  const foldedWidth = capsuleWidth(working.length, mood);

  // The window always matches what the island shows, so nothing invisible blocks clicks below it.
  useEffect(() => {
    if (mode.kind === "open") return;
    void api().resize(
      mode.kind === "announce"
        ? { width: ANNOUNCE_SIZE.width + SHADOW_MARGIN.x, height: ANNOUNCE_SIZE.height + SHADOW_MARGIN.y, focus: false }
        : { width: foldedWidth + SHADOW_MARGIN.x, height: CAPSULE_HEIGHT + SHADOW_MARGIN.y, focus: false },
    );
  }, [mode.kind, foldedWidth]);

  // Announces a thread the moment it finishes; threads already done at launch stay quiet.
  useEffect(() => {
    if (!state) return;
    const fresh = state.inbox.filter((thread) => thread.unread);
    if (announced.current === null) {
      announced.current = new Set(fresh.map((thread) => thread.threadId));
      return;
    }
    const known = announced.current;
    const newest = fresh.find((thread) => !known.has(thread.threadId));
    for (const thread of fresh) known.add(thread.threadId);
    if (newest && mode.kind === "folded") setMode({ kind: "announce", threadId: newest.threadId });
  }, [state, mode.kind]);

  // Folds the announcement back after a few seconds.
  useEffect(() => {
    if (mode.kind !== "announce") return;
    const timer = setTimeout(() => setMode({ kind: "folded" }), ANNOUNCE_MS);
    return () => clearTimeout(timer);
  }, [mode]);

  // Cmd+W reaches the main process as a close; it folds the island instead.
  useEffect(() => api().onFoldRequest(() => setMode({ kind: "folded" })), []);

  // Clears an error toast after a few seconds.
  useEffect(() => {
    if (toast === null) return;
    const timer = setTimeout(() => setToast(null), 4_000);
    return () => clearTimeout(timer);
  }, [toast]);

  const open = async (next?: View) => {
    if (next) setView(next);
    await api().resize({ ...POPOVER_SIZE, focus: true });
    setMode({ kind: "open" });
  };
  const fold = () => setMode({ kind: "folded" });

  const foldOnEscape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) return;
    if (document.querySelector("[data-popup-open], [data-slot$='-popup'][data-open]")) return;
    event.preventDefault();
    fold();
  });
  // Escape folds the open island unless a menu or picker is open. Clicking other apps leaves it open.
  useEffect(() => {
    if (mode.kind !== "open") return;
    window.addEventListener("keydown", foldOnEscape);
    return () => window.removeEventListener("keydown", foldOnEscape);
  }, [mode.kind]);

  if (!state) return null;
  const lookups = makeLookups(state);
  const connected = state.connection.state === "connected" || state.connection.state === "offline";
  const announcing =
    mode.kind === "announce"
      ? [...state.inbox, ...state.working].find((thread) => thread.threadId === mode.threadId)
      : undefined;

  return (
    <IslandContext value={lookups}>
      <div className="relative size-full">
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
              onMinimize={fold}
              shelf={shelf}
              onShelf={setShelf}
              onOpen={(threadId) => setView({ kind: "thread", threadId })}
              onNewThread={() => setView({ kind: "new" })}
              onError={setToast}
            />
          )
        ) : null}
        {announcing ? (
          <AnnounceCapsule
            thread={announcing}
            onOpen={() => void open({ kind: "thread", threadId: announcing.threadId })}
            onDismiss={fold}
          />
        ) : (
          <IslandCapsule
            mood={mood}
            working={working}
            onClick={() => (mode.kind === "open" ? fold() : void open())}
          />
        )}
        {toast && mode.kind === "open" ? (
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
