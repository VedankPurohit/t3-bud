import { useState } from "react";
import type { CompanionState, ProjectSummary } from "@shared/types";

import { CompanionMascot, type CompanionMood } from "../../components/Mascot";
import { deriveProjectIdentity } from "../../t3/projectIdentity";
import { useMood } from "../../lib/mood";
import { activityHeight, selectHoverThreads } from "../../lib/activity";
import { NotificationCard } from "../../island/notification";
import type { CSSProperties } from "react";
import { ActivityPanel } from "../../island/activity";
import { IslandContext, makeLookups } from "../../island/context";
import { mockState, mockInbox, mockWorking } from "../mock";
import type { DesignVariant } from "../types";

const projects: ProjectSummary[] = mockState.projects.map((project) => {
  const identity = deriveProjectIdentity(project.title);
  return {
    ...project,
    projectIcon: { kind: "monogram", text: identity.monogram, color: identity.color },
  };
});
const finished = {
  ...mockInbox[0]!,
  title: "Fix flaky composer focus test",
  unread: true,
  status: "completed" as const,
  pendingRequestCount: 0,
  latestRunCompletedAt: new Date().toISOString(),
};
const active = {
  ...mockWorking[0]!,
  title: "Build the weekly review widget",
  projectId: "p-dash",
  pendingRequestCount: 0,
  status: "running" as const,
};
const state: CompanionState = { ...mockState, projects, inbox: [finished], working: [active] };

function Orb(props: { mood: CompanionMood; count: number }) {
  return (
    <div className="relative flex h-[60px] w-[76px] justify-center">
      <CompanionMascot mood={props.mood} hopKey={0} size={60} />
      {props.count > 0 ? (
        <span
          className="companion-count"
          data-tone={
            props.mood === "attention" ? "attention" : props.mood === "done" ? "done" : "working"
          }
        >
          <span className="companion-count-dot" />
          {props.count}
        </span>
      ) : null}
    </div>
  );
}

function Scene(props: { state: CompanionState; mood: CompanionMood; summary: string }) {
  const [opened, setOpened] = useState("");
  const mood = useMood(props.state);
  const height = activityHeight(selectHoverThreads(props.state).length);
  return (
    <IslandContext value={makeLookups(props.state)}>
      <div className="relative h-full w-full">
        <div className="absolute top-0 left-1/2 -translate-x-1/2">
          <Orb mood={props.mood} count={mood.attention || mood.done || mood.working} />
        </div>
        <div
          className="companion-controls absolute top-[68px] left-4 h-[108px] w-[300px]"
          style={{ height }}
          data-visible="true"
        >
          <ActivityPanel
            summary={props.summary}
            onOpenInbox={() => setOpened("Inbox")}
            onOpenThread={(id) =>
              setOpened(
                [...props.state.inbox, ...props.state.working].find(
                  (thread) => thread.threadId === id,
                )?.title ?? "Thread",
              )
            }
            onNewThread={() => setOpened("New thread")}
          />
        </div>
        {opened ? (
          <p
            role="status"
            className="absolute inset-x-0 truncate text-center text-[10px] text-white/80"
            style={{ top: 75 + height }}
          >
            Preview · {opened}
          </p>
        ) : null}
      </div>
    </IslandContext>
  );
}

function NotificationScene(props: { side?: "left" | "right" }) {
  const [closing, setClosing] = useState(false);
  const [closed, setClosed] = useState(false);
  const [action, setAction] = useState("");
  const mascotX = props.side === "right" ? 46 : 358;
  return (
    <IslandContext value={makeLookups(state)}>
      <div
        className="relative h-full w-full"
        style={{ "--companion-anchor-x": `${mascotX}px` } as CSSProperties}
      >
        <div className="absolute top-0" style={{ left: mascotX - 38 }}>
          <Orb mood="done" count={1} />
        </div>
        {!closed ? (
          <NotificationCard
            notice={{ id: "design-completion", kind: "completed", thread: finished }}
            side={props.side}
            remaining={0}
            closing={closing}
            onPauseChange={() => {}}
            onReply={() => setAction("Reply in companion")}
            onOpen={() => setAction("Open in T3 Code")}
            onDismiss={() => setClosing(true)}
            onClosed={() => setClosed(true)}
          />
        ) : (
          <button
            className="absolute top-12 left-4 text-xs text-white underline"
            onClick={() => {
              setClosing(false);
              setClosed(false);
            }}
          >
            Replay notification
          </button>
        )}
        {action ? (
          <p role="status" className="absolute inset-x-3 bottom-0 text-[10px] text-white/80">
            Preview · {action}
          </p>
        ) : null}
      </div>
    </IslandContext>
  );
}

export const variant: DesignVariant = {
  id: "companion",
  name: "Current companion",
  pitch:
    "The current hover panel, using the same component and color tokens as the running companion.",
  layout:
    "The mascot stays 60px. Hover reveals a 300px activity panel below it, with project and provider icons, a finished thread, and active work. Each thread opens directly; the header opens the inbox.",
  compactSize: { width: 76, height: 60 },
  panelSize: { width: 332, height: 204 },
  renderCompact: () => <Orb mood="working" count={2} />,
  screens: [
    {
      id: "notification",
      label: "Thought bubble",
      size: { width: 404, height: 148 },
      render: () => <NotificationScene />,
    },
    {
      id: "notification-right",
      label: "Thought bubble · left screen edge",
      size: { width: 404, height: 148 },
      render: () => <NotificationScene side="right" />,
    },
    {
      id: "inbox",
      label: "Finished + working",
      render: () => <Scene state={state} mood="done" summary="1 done · 1 working" />,
    },
    {
      id: "thread",
      label: "Working",
      size: { width: 332, height: 240 },
      render: () => (
        <Scene
          state={{
            ...state,
            inbox: [],
            working: [
              active,
              {
                ...active,
                threadId: "second-active",
                projectId: "p-recall",
                title: "Index transcripts for semantic search",
                providerInstanceId: "codex",
              },
              {
                ...active,
                threadId: "third-active",
                title: "Polish the companion notification",
              },
            ],
          }}
          mood="working"
          summary="3 working"
        />
      ),
    },
    {
      id: "attention",
      label: "Needs you",
      size: { width: 332, height: 240 },
      render: () => (
        <Scene
          state={{
            ...state,
            working: [
              {
                ...active,
                threadId: "approval",
                title: "Migrate settings to the new schema",
                pendingRequestCount: 1,
              },
              active,
            ],
          }}
          mood="attention"
          summary="1 needs you · 1 done · 2 working"
        />
      ),
    },
    {
      id: "empty",
      label: "Ready",
      render: () => (
        <Scene state={{ ...state, inbox: [], working: [] }} mood="idle" summary="All caught up" />
      ),
    },
  ],
};
