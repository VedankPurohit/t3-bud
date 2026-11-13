import type { CompanionState, ThreadDetail, ThreadItem } from "@shared/types";
import { ArrowLeftIcon, CheckIcon, ShieldIcon, ShieldQuestionIcon, SquareArrowOutUpRightIcon, SquarePenIcon, TerminalIcon } from "lucide-react";
import type { ReactNode } from "react";

import { CompanionMascot } from "../../components/Mascot";
import { cn } from "../../t3/lib/utils";
import { Button } from "../../t3/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../../t3/ui/empty";
import { ScrollArea } from "../../t3/ui/scroll-area";
import {
  mockAttentionDetail,
  mockEmptyState,
  mockMood,
  mockProjects,
  mockProviders,
  mockState,
  mockThreadDetail,
} from "../mock";
import type { DesignVariant } from "../types";
import {
  ApprovalBanner,
  AssistantMessage,
  CardRow,
  Composer,
  ModelPickerPopup,
  PanelShell,
  ProjectMonogram,
  ShelfHeader,
  SidebarSearchRow,
  SidebarTopBar,
  SlimRow,
  ThreadHeader,
  UserBubble,
  WorkingRow,
  projectFor,
} from "./sidebar-twin-parts";

const INBOX_VISIBLE = 3;

/* ------------------------------------------------------------------ folded */

const BADGE_TONE = {
  attention: "bg-warning text-black/85",
  done: "bg-success text-white",
  working: "bg-info text-white",
} as const;

function Folded() {
  // One badge, for the most urgent kind: amber needs you, then green done, then blue working.
  const tone = mockMood.attention > 0 ? "attention" : mockMood.done > 0 ? "done" : "working";
  const count = mockMood[tone];
  return (
    <div className="relative size-full" title={mockMood.summary}>
      <div className="absolute inset-x-0 bottom-0 flex justify-center">
        <CompanionMascot mood="attention" hopKey={0} size={60} />
      </div>
      <span
        className={cn(
          "absolute top-6 right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-2xs font-semibold tabular-nums shadow-sm ring-2 ring-white/90 dark:ring-black/60",
          BADGE_TONE[tone],
        )}
      >
        {count}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ inbox */

function Inbox(props: { state: CompanionState }) {
  const { state } = props;
  // Approvals are the reason to look, so they lead the inbox rather than hide in Working.
  const needsYou = state.working.filter((thread) => thread.pendingRequestCount > 0);
  const working = state.working.filter((thread) => thread.pendingRequestCount === 0);
  const inbox = [...needsYou, ...state.inbox];
  const shown = inbox.slice(0, INBOX_VISIBLE);
  const more = state.inboxTotal + needsYou.length - shown.length;
  return (
    <PanelShell surface="sidebar">
      <SidebarTopBar />
      <SidebarSearchRow />
      <ScrollArea scrollFade className="min-h-0 flex-1">
        <ul className="flex flex-col px-2 pb-2">
          {shown.map((thread, index) => (
            <CardRow key={thread.threadId} thread={thread} hovered={index === 1} />
          ))}
          {more > 0 ? (
            <li className="list-none">
              <button
                type="button"
                className="flex h-7 w-full cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs text-muted-foreground hover:bg-sidebar-row-hover hover:text-sidebar-foreground"
              >
                Show more
                <span className="tabular-nums text-muted-foreground/60">{more.toLocaleString()}</span>
              </button>
            </li>
          ) : null}
          <ShelfHeader label="Working" count={working.length} expanded />
          {working.map((thread) => (
            <CardRow key={thread.threadId} thread={thread} />
          ))}
          <ShelfHeader label="Snoozed" count={state.snoozed.length} expanded />
          {state.snoozed.map((thread) => (
            <SlimRow key={thread.threadId} thread={thread} shelf="snoozed" />
          ))}
          <ShelfHeader label="Settled" count={state.settled.length} expanded={false} />
        </ul>
      </ScrollArea>
    </PanelShell>
  );
}

function EmptyInbox() {
  const state = mockEmptyState;
  return (
    <PanelShell surface="sidebar">
      <SidebarTopBar />
      <SidebarSearchRow />
      <Empty size="compact" className="min-h-0">
        <EmptyHeader>
          <EmptyMedia>
            <CompanionMascot mood="done" hopKey={0} size={56} />
          </EmptyMedia>
          <EmptyTitle>Nothing needs you</EmptyTitle>
          <EmptyDescription>Threads land here when they finish or ask for something.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm">
            <SquarePenIcon />
            New thread
          </Button>
        </EmptyContent>
      </Empty>
      <ul className="flex shrink-0 flex-col px-2 pb-2">
        <ShelfHeader label="Snoozed" count={state.snoozed.length} expanded={false} />
        <ShelfHeader label="Settled" count={state.settled.length} expanded={false} />
      </ul>
    </PanelShell>
  );
}

/* ------------------------------------------------------------------ thread */

const timeOf = (item: ThreadItem) =>
  new Date(item.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

function Timeline(props: { detail: ThreadDetail; children?: ReactNode }) {
  return (
    <ScrollArea scrollFade className="min-h-0 flex-1">
      <div className="flex flex-col gap-4 px-3 pt-1 pb-5">
        {props.detail.items.map((item) =>
          item.type === "user_message" ? (
            <UserBubble key={item.itemId} text={item.text} />
          ) : (
            <AssistantMessage key={item.itemId} text={item.text} time={timeOf(item)} />
          ),
        )}
        {props.children}
      </div>
    </ScrollArea>
  );
}

function ThreadScreen() {
  const detail = mockThreadDetail;
  const summary = mockState.inbox.find((thread) => thread.threadId === detail.threadId);
  return (
    <PanelShell surface="background">
      <ThreadHeader project={summary ? projectFor(summary.projectId) : null} title={detail.title} />
      <Timeline detail={detail} />
      <Composer instanceId={detail.providerInstanceId ?? "claudeAgent"} model={detail.model ?? ""} />
    </PanelShell>
  );
}

/** TimelinePendingApprovalRow, with "Open in T3 Code" where Approve and Decline would be. */
function PendingApprovalRow() {
  return (
    <div
      role="group"
      aria-label="Command approval"
      className="group/timeline-row relative w-full min-w-0 rounded-md px-0.5 py-0.5 text-left"
    >
      <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
        <span className="relative w-6 shrink-0 leading-0">
          <span className="inline-block size-6 overflow-hidden align-[calc(0.5cap_-_0.75rem)]">
            <span className="flex size-full items-center justify-center">
              <TerminalIcon className="block size-4 shrink-0 stroke-2 text-icon-muted" />
            </span>
          </span>
        </span>
        <div className="min-w-0 flex-1 text-secondary-label">
          <code className="block max-h-40 min-w-0 overflow-auto font-mono text-xs leading-5 whitespace-pre-wrap text-foreground select-text wrap-anywhere">
            vp test run apps/desktop
          </code>
        </div>
      </div>
      <div className="ms-7.5 flex min-w-0 flex-col gap-1 pb-1 text-xs">
        <span className="text-muted-foreground">Writes test fixtures to a temp directory.</span>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="inline-flex items-center gap-1 text-warning">
            <ShieldIcon aria-hidden className="size-3 shrink-0" />
            Waiting for approval
          </span>
        </div>
      </div>
    </div>
  );
}

function AttentionScreen() {
  const detail = mockAttentionDetail;
  const summary = mockState.working.find((thread) => thread.threadId === detail.threadId);
  return (
    <PanelShell surface="background">
      <ThreadHeader project={summary ? projectFor(summary.projectId) : null} title={detail.title} />
      <Timeline detail={detail}>
        <div className="-mt-1 flex flex-col gap-1">
          <PendingApprovalRow />
          <WorkingRow label="Working for 4m 12s" checked="Checked 3s ago" />
        </div>
      </Timeline>
      <Composer
        instanceId={detail.providerInstanceId ?? "claudeAgent"}
        model={detail.model ?? ""}
        running
        banner={
          <ApprovalBanner
            icon={<ShieldQuestionIcon />}
            action={
              <Button size="xs" variant="ghost">
                Open in T3 Code
                <SquareArrowOutUpRightIcon />
              </Button>
            }
          >
            <span className="truncate font-medium text-foreground">Needs your approval</span>
          </ApprovalBanner>
        }
      />
    </PanelShell>
  );
}

/* ------------------------------------------------------------------ new thread */

const NEW_THREAD_PROJECT = "p-dash";
const NEW_THREAD_PROMPT = "Add a weekly summary card to the dashboard";

function ProjectPicker() {
  return (
    <ScrollArea scrollFade className="min-h-0 flex-1">
      <div className="px-2 pb-2">
        <div className="px-2.5 pt-1.5 pb-1 text-xs font-medium text-sidebar-muted-foreground">Project</div>
        <ul className="flex flex-col gap-px">
          {mockProjects.map((project) => {
            const selected = project.id === NEW_THREAD_PROJECT;
            return (
              <li key={project.id} className="list-none">
                <div
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    "group/sidebar-row flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-left outline-none select-none",
                    selected
                      ? "bg-sidebar-row-selected text-sidebar-foreground light:ring-1 light:ring-inset light:ring-sidebar-border/70"
                      : "text-sidebar-foreground hover:bg-sidebar-row-hover",
                  )}
                >
                  <ProjectMonogram project={project} className="size-4" />
                  <span className={cn("min-w-0 shrink-0 truncate text-sm", selected ? "font-medium" : "font-normal")}>
                    {project.title}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-end text-xs text-secondary-label">
                    {project.workspaceRoot}
                  </span>
                  {selected ? <CheckIcon aria-hidden className="size-3.5 shrink-0 text-foreground" /> : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </ScrollArea>
  );
}

function NewThreadHeader() {
  return (
    <div className="flex h-11 shrink-0 items-center gap-1.5 ps-1.5 pe-2">
      <Button variant="ghost" size="icon-sm" aria-label="Back to inbox">
        <ArrowLeftIcon className="size-3.5" />
      </Button>
      <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">New thread</h2>
    </div>
  );
}

function NewThreadScreen(props: { pickerOpen: boolean }) {
  const claude = mockProviders[0]!;
  return (
    <PanelShell surface="sidebar">
      <NewThreadHeader />
      <ProjectPicker />
      <div className="relative">
        {props.pickerOpen ? (
          <ModelPickerPopup
            providers={mockProviders}
            activeInstanceId={claude.providerInstanceId}
            selectedModel="claude-opus-5-5"
            highlightedModel="claude-sonnet-5-5"
            className="absolute right-2 bottom-full left-2 z-30 mb-1"
          />
        ) : null}
        <Composer
          instanceId={claude.providerInstanceId}
          model="claude-opus-5-5"
          modelOpen={props.pickerOpen}
          value={NEW_THREAD_PROMPT}
        />
      </div>
    </PanelShell>
  );
}

/* ------------------------------------------------------------------ variant */

export const variant: DesignVariant = {
  id: "sidebar-twin",
  name: "Sidebar twin",
  pitch:
    "A 376px slice of T3 Code's own sidebar and chat column, built from the same rows, shelves, composer and model picker, so it reads as T3 Code shrunk to a corner rather than a lookalike.",
  layout:
    "Blob (60px, 76×84 window) sits bottom-right with one count badge. Clicking it opens a 392×600 window above the blob, right edges aligned, holding a 376×584 panel plus its shadow. The size never changes between views; lists and threads scroll inside.",
  compactSize: { width: 76, height: 84 },
  panelSize: { width: 392, height: 600 },
  renderCompact: () => <Folded />,
  screens: [
    { id: "inbox", label: "Inbox", render: () => <Inbox state={mockState} /> },
    { id: "thread", label: "Thread", render: () => <ThreadScreen /> },
    { id: "attention", label: "Needs approval", render: () => <AttentionScreen /> },
    { id: "new-thread", label: "New thread", render: () => <NewThreadScreen pickerOpen={false} /> },
    { id: "model-picker", label: "Model picker", render: () => <NewThreadScreen pickerOpen /> },
    { id: "empty", label: "Empty inbox", render: () => <EmptyInbox /> },
  ],
};

