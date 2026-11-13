import type { CompanionState, ThreadDetail } from "@shared/types";
import {
  AlarmClockIcon,
  CheckIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  SearchIcon,
  ShieldOffIcon,
  SquarePenIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { CompanionMascot, type CompanionMood } from "~/components/Mascot";
import { Button, InlineButton } from "~/t3/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/t3/ui/empty";
import { Kbd } from "~/t3/ui/kbd";
import { cn } from "~/t3/lib/utils";
import { mockAttentionDetail, mockEmptyState, mockMood, mockState, mockThreadDetail } from "../mock";
import type { DesignVariant } from "../types";
import { ApprovalBanner, Composer, ModelPickerPopup, type ComposerModel } from "./split-view-composer";
import {
  Breadcrumb,
  DraftRow,
  PendingApprovalRow,
  ProjectMonogram,
  ShelfHeader,
  ThreadRow,
  Timeline,
  projectFor,
} from "./split-view-parts";

const PANEL = { width: 720, height: 460 };
const RAIL_WIDTH = 232;

const OPUS: ComposerModel = {
  instanceId: "claudeAgent",
  model: "claude-opus-5-5",
  // Low, Medium, High as bars (Max is named), set to High.
  effort: { count: 3, filled: 3 },
};

/** The panel's own window chrome: the companion window is transparent around it. */
function Panel(props: { children: ReactNode }) {
  return (
    <div className="relative flex size-full overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-2xl">
      {props.children}
    </div>
  );
}

/* ---------- Left rail: T3's sidebar header and slim thread list ---------- */

function Rail(props: {
  state: CompanionState;
  mood: CompanionMood;
  activeId?: string;
  draftProject?: string;
  snoozedOpen?: boolean;
}) {
  const { state } = props;
  return (
    <aside
      data-app-sidebar
      className="flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
      style={{ width: RAIL_WIDTH }}
    >
      {/* SidebarThreadHeader: search and new thread, with the blob as the fold control. */}
      <div className="drag-region flex h-11 shrink-0 items-center gap-1 px-2">
        <button
          type="button"
          aria-label="Fold into the blob (Esc)"
          title="Fold (Esc)"
          className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-(--control-radius) hover:bg-sidebar-row-hover"
        >
          <CompanionMascot mood={props.mood} hopKey={0} size={22} />
        </button>
        <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-sidebar-muted-foreground hover:bg-sidebar-row-hover hover:text-sidebar-foreground">
          <SearchIcon className="size-4 shrink-0 text-(--sidebar-icon-color)" />
          <span className="min-w-0 flex-1 truncate font-normal text-placeholder">Search</span>
        </div>
        <button
          type="button"
          aria-label="New thread"
          title="New thread (⌘N)"
          className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-(--control-radius) text-sidebar-muted-foreground/80 hover:bg-sidebar-row-hover hover:text-sidebar-foreground [&>svg]:size-4 [&>svg]:text-(--sidebar-icon-color) hover:[&>svg]:text-sidebar-foreground"
        >
          <SquarePenIcon />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 [scrollbar-width:none]">
        <ul className="flex min-h-full flex-col">
          {props.draftProject ? <DraftRow projectTitle={props.draftProject} /> : null}
          {state.inbox.length === 0 && !props.draftProject ? (
            <li className="flex list-none flex-col items-center gap-2 px-2 py-6 text-center text-xs text-muted-foreground/60">
              Inbox zero
            </li>
          ) : null}
          {state.inbox.map((thread) => (
            <ThreadRow
              key={thread.threadId}
              thread={thread}
              shelf="inbox"
              active={thread.threadId === props.activeId}
            />
          ))}
          {state.working.length > 0 ? (
            <>
              <ShelfHeader label="Working" count={state.working.length} expanded className="mt-auto pt-1" />
              {state.working.map((thread) => (
                <ThreadRow
                  key={thread.threadId}
                  thread={thread}
                  shelf="working"
                  active={thread.threadId === props.activeId}
                />
              ))}
            </>
          ) : null}
          <ShelfHeader
            label="Snoozed"
            count={state.snoozed.length}
            expanded={props.snoozedOpen ?? false}
            className={cn(state.working.length === 0 && "mt-auto")}
          />
          {props.snoozedOpen
            ? state.snoozed.map((thread) => (
                <ThreadRow key={thread.threadId} thread={thread} shelf="snoozed" />
              ))
            : null}
          <ShelfHeader label="Settled" count={state.settled.length} expanded={false} />
        </ul>
      </div>
    </aside>
  );
}

/* ---------- Right pane: T3's chat header, timeline and composer ---------- */

function PaneHeader(props: { project: string; title: string; actions?: boolean }) {
  return (
    <div className="drag-region flex h-11 shrink-0 items-center gap-2 ps-4 pe-2">
      <Breadcrumb project={props.project} title={props.title} />
      {props.actions === false ? null : (
        <div className="flex shrink-0 items-center gap-0.5">
          <Button size="icon-xs" variant="ghost-muted" aria-label="Snooze thread" title="Snooze">
            <AlarmClockIcon />
          </Button>
          <Button size="icon-xs" variant="ghost-muted" aria-label="Settle thread" title="Settle">
            <CheckIcon />
          </Button>
          <Button size="icon-xs" variant="ghost-muted" aria-label="Open in T3 Code" title="Open in T3 Code">
            <ExternalLinkIcon />
          </Button>
        </div>
      )}
    </div>
  );
}

function ThreadPane(props: {
  detail: ThreadDetail;
  projectId: string;
  composer: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="relative flex min-w-0 flex-1 flex-col">
      <PaneHeader project={projectFor(props.projectId).title} title={props.detail.title} />
      <Timeline detail={props.detail}>{props.children}</Timeline>
      <div className="shrink-0 px-3 pb-3">{props.composer}</div>
    </section>
  );
}

/* ---------- Screens ---------- */

function InboxScreen(props: { pickerOpen?: boolean }) {
  return (
    <Panel>
      <Rail state={mockState} mood="attention" activeId="i1" />
      <ThreadPane
        detail={mockThreadDetail}
        projectId="p-t3"
        composer={
          <Composer
            model={OPUS}
            pickerOpen={props.pickerOpen}
            popup={
              props.pickerOpen ? (
                <ModelPickerPopup
                  className="right-10 bottom-[calc(100%+0.375rem)]"
                  favorites={[
                    { instanceId: "claudeAgent", model: "claude-opus-5-5" },
                    { instanceId: "claudeAgent", model: "claude-sonnet-5-5" },
                    { instanceId: "codex", model: "gpt-6.1-sol" },
                    { instanceId: "codex", model: "gpt-6-luna" },
                    { instanceId: "cursor", model: "auto" },
                  ]}
                  selected={{ instanceId: "claudeAgent", model: "claude-opus-5-5" }}
                  highlighted={{ instanceId: "codex", model: "gpt-6.1-sol" }}
                  effortLevels={["low", "medium", "high", "max"]}
                  effort="high"
                  defaultEffort="high"
                />
              ) : null
            }
          />
        }
      />
    </Panel>
  );
}

function AttentionScreen() {
  return (
    <Panel>
      <Rail state={mockState} mood="attention" activeId="w1" />
      <ThreadPane
        detail={mockAttentionDetail}
        projectId="p-t3"
        composer={
          <Composer
            model={OPUS}
            running
            banner={
              <ApprovalBanner
                title="Claude wants to run a command"
                detail="Approvals only work in T3 Code."
              />
            }
          />
        }
      >
        <PendingApprovalRow
          command="pnpm --filter @t3tools/desktop test"
          reason="Runs the desktop test suite. It writes to a temp directory."
        />
      </ThreadPane>
    </Panel>
  );
}

function NewThreadScreen() {
  const project = projectFor("p-t3");
  return (
    <Panel>
      <Rail state={mockState} mood="attention" draftProject={project.title} />
      <section className="relative flex min-w-0 flex-1 flex-col">
        <PaneHeader project={project.title} title="New thread" actions={false} />
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-5 px-6 pb-6">
          {/* DraftHeroProjectHeading, stacked: the inline form needs a wider pane. */}
          <h1 className="flex w-full flex-col items-center justify-center gap-2 text-center text-2xl font-normal tracking-tight text-foreground">
            <span className="max-w-full">What should we build?</span>
            <span className="flex max-w-full min-w-0 items-baseline justify-center text-base tracking-normal">
              <InlineButton tone="picker" className="min-w-0 max-w-full align-baseline">
                <ProjectMonogram name={project.title} className="size-4 self-center" />
                <span className="min-w-0 truncate">{project.title}</span>
                <ChevronDownIcon aria-hidden className="size-3.5 self-center text-muted-foreground" />
              </InlineButton>
            </span>
          </h1>
          <div>
            <Composer
              model={OPUS}
              lines={2}
              prompt="Make sidebar search match thread titles by word, not only by prefix."
            />
            {/* ComposerSurface.ContextStrip */}
            <div className="relative flex w-full items-center gap-2 overflow-x-clip px-2 pt-2 text-xs text-muted-foreground">
              <span className="min-w-0 truncate font-mono">{project.workspaceRoot}</span>
              <span aria-hidden className="text-muted-foreground/40">
                ·
              </span>
              <span className="shrink-0">Local</span>
              <span className="ms-auto inline-flex shrink-0 items-center gap-1.5">
                <ShieldOffIcon aria-hidden className="size-3.5" />
                Full access
              </span>
            </div>
          </div>
        </div>
      </section>
    </Panel>
  );
}

function EmptyScreen() {
  return (
    <Panel>
      <Rail state={mockEmptyState} mood="idle" snoozedOpen />
      <section className="relative flex min-w-0 flex-1 flex-col">
        <div className="drag-region h-11 shrink-0" />
        <Empty size="compact" className="pb-16">
          <EmptyHeader>
            <EmptyMedia className="mb-3">
              <CompanionMascot mood="done" hopKey={0} size={56} />
            </EmptyMedia>
            <EmptyTitle>Nothing needs you</EmptyTitle>
            <EmptyDescription>
              Finished threads and approvals show up here. The blob turns amber when one needs you.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" variant="outline">
              <SquarePenIcon />
              New thread
              <Kbd className="-me-1">⌘N</Kbd>
            </Button>
          </EmptyContent>
        </Empty>
      </section>
    </Panel>
  );
}

/* ---------- Folded ---------- */

function Folded() {
  return (
    <div className="relative size-full">
      <div className="absolute inset-x-0 bottom-0 flex justify-center">
        <CompanionMascot mood="attention" hopKey={0} size={60} />
      </div>
      <span
        aria-label={mockMood.summary}
        className="absolute top-5 right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1.5 text-2xs font-semibold text-white tabular-nums shadow-sm ring-2 ring-white/90 dark:ring-black/60"
      >
        {mockMood.attention}
      </span>
    </div>
  );
}

export const variant: DesignVariant = {
  id: "split-view",
  name: "Mini window, split view",
  pitch:
    "A 720×460 slice of T3 Code with the thread list and the open conversation side by side, so triaging the inbox is one click per thread and nothing slides in or out.",
  layout:
    "Blob rests bottom-right (76×84). A click unfolds the panel up and to the left from the blob's corner, and the blob moves into the rail header as the fold button (Esc folds too). The panel stays 720×460 on every screen; the model picker and approvals open inside it.",
  compactSize: { width: 76, height: 84 },
  panelSize: PANEL,
  renderCompact: () => <Folded />,
  screens: [
    { id: "inbox", label: "Inbox", render: () => <InboxScreen /> },
    { id: "attention", label: "Needs approval", render: () => <AttentionScreen /> },
    { id: "new-thread", label: "New thread", render: () => <NewThreadScreen /> },
    { id: "model-picker", label: "Model picker", render: () => <InboxScreen pickerOpen /> },
    { id: "empty", label: "Inbox zero", render: () => <EmptyScreen /> },
  ],
};
