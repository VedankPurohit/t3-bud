import type { CompanionState } from "@shared/types";
import { useState } from "react";

import type { CompanionMood } from "../components/Mascot";

export interface Mood {
  readonly mood: CompanionMood;
  readonly attention: number;
  readonly done: number;
  readonly working: number;
  readonly hopKey: number;
  readonly summary: string;
}

/** What the blob shows: the inbox's most urgent state. */
export function useMood(state: CompanionState | null): Mood {
  const threads = state ? [...state.inbox, ...state.working] : [];
  const attention = threads.filter((thread) => thread.pendingRequestCount > 0).length;
  const failed = threads.filter((thread) => thread.status === "failed" && thread.unread).length;
  const done = state?.inbox.filter((thread) => thread.unread && thread.status !== "failed").length ?? 0;
  const working = state?.working.length ?? 0;
  const connected = state?.connection.state === "connected";

  const news = attention + failed + done;
  const [seen, setSeen] = useState(news);
  const [hopKey, setHopKey] = useState(0);
  if (news !== seen) {
    if (news > seen) setHopKey((key) => key + 1);
    setSeen(news);
  }

  const mood: CompanionMood = !connected
    ? "idle"
    : attention > 0
      ? "attention"
      : failed > 0
        ? "failed"
        : done > 0
          ? "done"
          : working > 0
            ? "working"
            : "idle";
  const parts = [
    attention > 0 ? `${attention} need${attention === 1 ? "s" : ""} you` : null,
    failed > 0 ? `${failed} failed` : null,
    done > 0 ? `${done} done` : null,
    working > 0 ? `${working} working` : null,
  ].filter((part) => part !== null);
  const summary = !state
    ? "Starting…"
    : state.connection.state === "connected"
      ? parts.length > 0
        ? parts.join(" · ")
        : "All caught up"
      : state.connection.state === "offline"
        ? "Can't reach T3 Code"
        : "Not connected";
  return { mood, attention, done: done + failed, working, hopKey, summary };
}
