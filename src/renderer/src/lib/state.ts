import { useEffect, useState } from "react";

import type { CompanionState, ThreadDetail } from "@shared/types";

const api = () => window.companion;

export function useCompanionState(): CompanionState | null {
  const [state, setState] = useState<CompanionState | null>(null);
  // Subscribes to the main process, which owns the MCP connection and polling.
  useEffect(() => {
    let active = true;
    void api()
      .getState()
      .then((initial) => active && setState(initial));
    const unsubscribe = api().onState(setState);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  return state;
}

export function useThreadDetail(threadId: string | null): ThreadDetail | null {
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  // Tells the main process which thread to follow while it is open here.
  useEffect(() => {
    if (threadId === null) return;
    const unsubscribe = api().onThreadDetail((next) => {
      if (next.threadId === threadId) setDetail(next);
    });
    void api().openThread(threadId);
    return () => {
      unsubscribe();
      setDetail(null);
      void api().openThread(null);
    };
  }, [threadId]);
  return detail?.threadId === threadId ? detail : null;
}
