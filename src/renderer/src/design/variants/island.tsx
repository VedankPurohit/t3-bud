import {
  ArrowUpRightIcon,
  CheckIcon,
  ChevronLeftIcon,
  SearchIcon,
  ShieldIcon,
  SquareArrowOutUpRightIcon,
  SquarePenIcon,
  StarIcon,
  TerminalIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { CompanionMascot } from "../../components/Mascot";
import { modelLabel } from "../../lib/format";
import { cn } from "../../t3/lib/utils";
import { Button, InlineButton } from "../../t3/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../../t3/ui/empty";
import { Toggle, ToggleGroup } from "../../t3/ui/toggle-group";
import {
  mockAttentionDetail,
  mockEmptyState,
  mockInbox,
  mockProjects,
  mockProviders,
  mockSettled,
  mockSnoozed,
  mockState,
  mockThreadDetail,
  mockWorking,
} from "../mock";
import type { DesignVariant } from "../types";
import {
  Capsule,
  ClaudeIcon,
  Composer,
  CursorIcon,
  IslandCapsule,
  IslandPopover,
  type LiveLine,
  OpenAIIcon,
  ProjectGlyph,
  SidebarCardRow,
  Timeline,
  UserBubble,
  AssistantMessage,
  projectTitle,
} from "./island-parts";

const live: LiveLine = { mood: "attention", working: mockWorking };
const quiet: LiveLine = { mood: "idle", working: [] };

// ── Inbox ───────────────────────────────────────────────────────────────────────────────────────

type Shelf = "inbox" | "working" | "snoozed" | "settled";

/** T3's segmented ToggleGroup (DiffPanel, DiagnosticsSettings) as the shelf switcher. */
function ShelfBar(props: { shelf: Shelf; counts: Record<Shelf, number> }) {
  const shelves: Array<[Shelf, string]> = [
    ["inbox", "Inbox"],
    ["working", "Working"],
    ["snoozed", "Snoozed"],
    ["settled", "Settled"],
  ];
  return (
    <div className="flex shrink-0 items-center gap-1 px-2.5 pb-1.5">
      <ToggleGroup aria-label="Shelf" variant="segmented" defaultValue={[props.shelf]}>
        {shelves.map(([id, label]) => (
          <Toggle key={id} value={id} className="gap-1.5 px-2">
            {label}
            <span className="font-normal text-muted-foreground/70 tabular-nums">{props.counts[id]}</span>
          </Toggle>
        ))}
      </ToggleGroup>
      <Button size="icon-xs" variant="ghost" aria-label="New thread" className="ms-auto">
        <SquarePenIcon />
      </Button>
    </div>
  );
}

/** MCP has no push, so the footer owns up to polling with the last sync time. */
function InboxFooter(props: { shown: number; total: number }) {
  return (
    <div className="flex h-8 shrink-0 items-center gap-1.5 border-t border-sidebar-border px-3 text-xs text-muted-foreground tabular-nums">
      {props.total > 0 ? (
        <>
          <span>
            {props.shown} of {props.total.toLocaleString()}
          </span>
          <span className="text-muted-foreground/50">·</span>
        </>
      ) : null}
      <span>Synced 3s ago</span>
      <InlineButton tone="muted" className="ms-auto font-normal">
        Open T3 Code
        <ArrowUpRightIcon className="size-3" />
      </InlineButton>
    </div>
  );
}

const counts: Record<Shelf, number> = {
  inbox: mockInbox.length + 1,
  working: mockWorking.length,
  snoozed: mockSnoozed.length,
  settled: mockSettled.length,
};

function InboxScreen() {
  // The thread waiting on an approval leads the inbox: it is the one thing that needs the user.
  const needsYou = mockWorking.filter((thread) => thread.pendingRequestCount > 0);
  const rows = [...needsYou, ...mockInbox];
  return (
    <IslandPopover live={live} surface="sidebar">
      <ShelfBar shelf="inbox" counts={counts} />
      <ul className="flex min-h-0 flex-1 flex-col overflow-hidden mask-b-from-[calc(100%-1.5rem)] px-1.5 pb-1">
        {rows.map((thread) => (
          <SidebarCardRow key={thread.threadId} thread={thread} hovered={thread.threadId === "i3"} />
        ))}
      </ul>
      <InboxFooter shown={rows.length} total={mockState.inboxTotal} />
    </IslandPopover>
  );
}

function EmptyScreen() {
  return (
    <IslandPopover live={quiet} surface="sidebar">
      <ShelfBar
        shelf="inbox"
        counts={{
          inbox: mockEmptyState.inbox.length,
          working: mockEmptyState.working.length,
          snoozed: mockEmptyState.snoozed.length,
          settled: mockEmptyState.settled.length,
        }}
      />
      <Empty size="compact">
        <EmptyHeader>
          <EmptyMedia>
            <CompanionMascot mood="idle" hopKey={0} size={64} />
          </EmptyMedia>
          <EmptyTitle>Nothing needs you</EmptyTitle>
          <EmptyDescription>
            Threads land here when they finish. Two are snoozed until later.
          </EmptyDescription>
        </EmptyHeader>
        <Button size="sm" variant="outline">
          <SquarePenIcon />
          New thread
        </Button>
      </Empty>
      <InboxFooter shown={0} total={0} />
    </IslandPopover>
  );
}

// ── Thread ──────────────────────────────────────────────────────────────────────────────────────

/** ChatHeader's breadcrumb (WorkspaceBreadcrumb): project / thread title, cut for the narrow pane. */
function ThreadHeader(props: { project: string; title: string }) {
  return (
    <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button size="icon-xs" variant="ghost" aria-label="Back to inbox">
        <ChevronLeftIcon />
      </Button>
      <ol className="m-0 flex min-w-0 flex-1 list-none items-center gap-2 p-0 text-sm">
        <li className="flex shrink-0 items-center gap-1.5 font-medium text-muted-foreground">
          <ProjectGlyph className="size-3.5" />
          {props.project}
        </li>
        <li aria-hidden className="flex shrink-0 items-center text-icon-muted">
          /
        </li>
        <li aria-current="page" className="flex min-w-0 items-center font-medium text-foreground">
          <h2 className="min-w-0 truncate">{props.title}</h2>
        </li>
      </ol>
      <Button size="icon-xs" variant="ghost" aria-label="Open in T3 Code">
        <SquareArrowOutUpRightIcon />
      </Button>
    </div>
  );
}

/** The timeline sits at its live edge, as T3's does; older turns fade under the header. */
function TimelineViewport({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-end overflow-hidden mask-t-from-[calc(100%-2rem)] px-3 pb-3">
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

function ThreadScreen() {
  const detail = mockThreadDetail;
  return (
    <IslandPopover live={live} surface="chat">
      <ThreadHeader project="t3code" title={detail.title} />
      <TimelineViewport>
        <Timeline detail={detail} />
      </TimelineViewport>
      <Composer
        placeholder="Send a follow-up"
        instanceId={detail.providerInstanceId ?? "claudeAgent"}
        model={detail.model ?? ""}
      />
    </IslandPopover>
  );
}

/**
 * TimelinePendingApprovalRow, with Approve and Decline swapped for the hand-off: MCP cannot answer
 * approvals, so the only honest action is opening the thread in T3 Code.
 */
function PendingApprovalRow() {
  return (
    <div role="group" aria-label="Command approval" className="relative w-full min-w-0 rounded-md px-0.5 py-0.5 text-left">
      <div className="flex min-h-6 min-w-0 items-start gap-1.5 text-sm leading-relaxed">
        <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
          <span className="relative w-6 shrink-0 leading-0">
            <span className="inline-block size-6 overflow-hidden align-[calc(0.5cap_-_0.75rem)]">
              <span className="flex size-full items-center justify-center">
                <TerminalIcon className="block size-4 shrink-0 stroke-2 text-icon-muted" />
              </span>
            </span>
          </span>
          <div className="min-w-0 flex-1 text-secondary-label">
            <code className="block min-w-0 font-mono text-xs leading-5 whitespace-pre-wrap text-foreground wrap-anywhere">
              vp test run apps/desktop
            </code>
          </div>
        </div>
      </div>
      <div className="ms-7.5 flex min-w-0 flex-col gap-1.5 pb-1 text-xs">
        <span className="text-muted-foreground">Writes to a temp directory outside the project.</span>
        <span className="inline-flex items-center gap-1 text-warning-foreground">
          <ShieldIcon aria-hidden className="size-3 shrink-0" />
          Waiting for approval
        </span>
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <Button size="xs" variant="warning-outline">
            Open in T3 Code to approve
            <ArrowUpRightIcon />
          </Button>
          <span className="text-muted-foreground">Approvals only work there.</span>
        </div>
      </div>
    </div>
  );
}

function AttentionScreen() {
  const detail = mockAttentionDetail;
  const [request, reply] = detail.items;
  return (
    <IslandPopover live={live} surface="chat">
      <ThreadHeader project="t3code" title={detail.title} />
      <TimelineViewport>
        {request ? <UserBubble text={request.text} /> : null}
        {reply ? <AssistantMessage text={reply.text} /> : null}
        <div className="border-t border-border/60 pt-2">
          <PendingApprovalRow />
        </div>
      </TimelineViewport>
      <Composer
        placeholder="Steer this run"
        instanceId={detail.providerInstanceId ?? "claudeAgent"}
        model={detail.model ?? ""}
        running
      />
    </IslandPopover>
  );
}

// ── New thread ──────────────────────────────────────────────────────────────────────────────────

/** ComboboxSearchInput's row: an underlined field with a leading search glyph. */
function SearchField(props: { placeholder: string }) {
  return (
    <div className="min-w-0 shrink-0 px-3 pt-2.5">
      <div className="relative -translate-y-px border-b border-border/70 pb-1.5">
        <SearchIcon className="pointer-events-none absolute top-1.5 left-0 size-4 shrink-0 text-muted-foreground/55" />
        <p className="h-6.5 ps-5 text-sm leading-6.5 text-placeholder">{props.placeholder}</p>
      </div>
    </div>
  );
}

/** ComboboxItem's row class, used by T3's project and model pickers. */
const comboboxItem =
  "flex min-h-7 cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-sm outline-none hover:bg-foreground/[0.09]";

function NewThreadBody(props: { pickerOpen: boolean }) {
  const selected = "p-t3";
  return (
    <>
      <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
        <Button size="icon-xs" variant="ghost" aria-label="Back to inbox">
          <ChevronLeftIcon />
        </Button>
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium">New thread</h2>
      </div>
      <SearchField placeholder="Search projects..." />
      <div className="px-2 pt-2.5 pb-1 text-xs font-medium text-muted-foreground">Project</div>
      <div role="listbox" aria-label="Project" className="flex flex-col gap-px px-2">
        {mockProjects.map((project) => (
          <div
            key={project.id}
            role="option"
            aria-selected={project.id === selected}
            className={cn(comboboxItem, project.id === selected && "bg-foreground/[0.06]")}
          >
            <ProjectGlyph className="size-4" />
            <span className="min-w-0 truncate">{project.title}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground/70">
              {project.workspaceRoot}
            </span>
            {project.id === selected ? <CheckIcon className="size-3.5 shrink-0" /> : null}
          </div>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">Send a message to start the conversation.</p>
      </div>
      <Composer
        draft="Add a keyboard shortcut that snoozes the focused thread until tomorrow."
        placeholder=""
        instanceId="claudeAgent"
        model="claude-opus-5-5"
        pickerOpen={props.pickerOpen}
      />
    </>
  );
}

function NewThreadScreen() {
  return (
    <IslandPopover live={live} surface="chat">
      <NewThreadBody pickerOpen={false} />
    </IslandPopover>
  );
}

// ── Model picker (ProviderModelPicker docked: ModelPickerSidebar, ModelListRow, effort column) ──

const COLUMN_ROW =
  "flex h-8 w-full shrink-0 cursor-pointer items-center gap-2 rounded-sm px-2 text-left text-sm text-foreground outline-none hover:bg-foreground/[0.09]";

function ProviderRail() {
  const entries = [
    { id: "claudeAgent", icon: <ClaudeIcon className="size-5" /> },
    { id: "codex", icon: <OpenAIIcon className="size-5 text-foreground" /> },
    { id: "cursor", icon: <CursorIcon className="size-5" /> },
  ];
  const railButton =
    "relative isolate flex aspect-square w-full cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-foreground/10";
  return (
    <div aria-label="Providers" className="w-11 shrink-0 overflow-hidden bg-muted/30">
      <div className="relative flex min-h-full flex-col gap-1 p-1">
        <span className="pointer-events-none absolute right-1 z-10 h-5 w-0.75 rounded-full bg-primary" style={{ top: 58 }} />
        <button type="button" aria-label="Favorites" className={railButton}>
          <StarIcon className="size-5 shrink-0 fill-current text-muted-foreground" aria-hidden />
        </button>
        <div className="border-b border-border/70" aria-hidden />
        {entries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            aria-pressed={entry.id === "claudeAgent"}
            className={cn(railButton, entry.id === "claudeAgent" && "bg-background")}
          >
            {entry.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

function ModelPickerPopup() {
  const claude = mockProviders.find((provider) => provider.providerInstanceId === "claudeAgent");
  const models = claude?.models ?? [];
  const efforts = ["low", "medium", "high", "max"];
  return (
    <div
      data-slot="popover-popup"
      className="dropdown-glass absolute right-5 bottom-[136px] z-30 flex h-[212px] overflow-hidden rounded-lg text-popover-foreground shadow-[0_16px_40px_-18px_rgb(0_0_0/55%)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] dark:shadow-[0_18px_44px_-18px_rgb(0_0_0/80%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]"
    >
      <ProviderRail />
      <div className="flex w-[196px] min-h-0 flex-col overflow-hidden border-l border-border/70 bg-muted/40">
        <SearchField placeholder="Search models..." />
        <div className="flex flex-col gap-0.5 py-1.5 pr-px pl-2">
          {models.map((model, index) => (
            <div
              key={model.id}
              role="option"
              aria-selected={index === 0}
              className={cn(comboboxItem, "me-1", index === 1 && "bg-foreground/[0.09]")}
            >
              <ClaudeIcon className="size-4" />
              <span className="min-w-0 flex-1 truncate leading-snug">{modelLabel(model.id)}</span>
              {index === 0 ? <CheckIcon className="size-3.5 shrink-0" aria-hidden /> : null}
              {index === 0 ? <StarIcon className="size-3 shrink-0 fill-current text-warning" aria-hidden /> : null}
            </div>
          ))}
        </div>
      </div>
      <div className="flex w-[120px] min-h-0 flex-col border-l border-border/70 bg-muted/40">
        <div className="shrink-0 px-3 pt-2.5">
          <div className="flex h-8.25 -translate-y-px items-center gap-2 border-b border-border/70 pb-1.5 text-sm">
            <span className="text-muted-foreground">Effort</span>
          </div>
        </div>
        <div role="radiogroup" aria-label="Effort" className="flex flex-col gap-0.5 px-2 pt-2.5 pb-1.5">
          {efforts.map((effort) => (
            <button
              key={effort}
              type="button"
              role="radio"
              aria-checked={effort === "high"}
              className={COLUMN_ROW}
            >
              <span className="min-w-0 flex-1 truncate capitalize">{effort}</span>
              {effort === "high" ? <CheckIcon aria-hidden className="size-3.5" /> : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ModelPickerScreen() {
  return (
    <IslandPopover live={live} surface="chat">
      <NewThreadBody pickerOpen />
      <ModelPickerPopup />
    </IslandPopover>
  );
}

// ── Folded states ───────────────────────────────────────────────────────────────────────────────

/** The island widens in place for a few seconds when a thread finishes, then folds back. */
function FinishedScreen() {
  const thread = mockInbox[0];
  if (!thread) return null;
  return (
    <div className="relative size-full">
      <Capsule className="top-0 h-14 w-[352px] gap-2.5 rounded-[28px] ps-2.5 pe-2.5">
        <CompanionMascot mood="done" hopKey={1} size={40} className="-my-1 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-medium">{thread.title}</span>
          <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            <span className="inline-flex shrink-0 items-center gap-1 font-medium text-success">
              <CheckIcon aria-hidden className="size-3.5" />
              Done
            </span>
            <span className="text-muted-foreground/60">·</span>
            <span className="truncate">{projectTitle(thread.projectId)}</span>
          </span>
        </div>
        <Button size="sm-pill" variant="default" className="shrink-0">
          Open
        </Button>
      </Capsule>
    </div>
  );
}

function Compact() {
  return (
    <div className="relative size-full">
      <IslandCapsule {...live} />
    </div>
  );
}

export const variant: DesignVariant = {
  id: "island",
  name: "Island",
  pitch:
    "A live-activity capsule at the top of the screen that shows what your agents are doing at a glance and drops into T3's own sidebar and chat when you click it; pick it if the companion should never cover your work.",
  layout:
    "A 240×38 capsule docked top-center under the menu bar. A finished thread widens it in place to 360×64 for a few seconds. Clicking drops a 420×560 popover that hangs from the capsule, which stays as its top edge.",
  compactSize: { width: 240, height: 38 },
  panelSize: { width: 420, height: 560 },
  renderCompact: () => <Compact />,
  screens: [
    { id: "finished", label: "Finished", size: { width: 360, height: 64 }, render: () => <FinishedScreen /> },
    { id: "inbox", label: "Inbox", render: () => <InboxScreen /> },
    { id: "thread", label: "Thread", render: () => <ThreadScreen /> },
    { id: "attention", label: "Needs approval", render: () => <AttentionScreen /> },
    { id: "new-thread", label: "New thread", render: () => <NewThreadScreen /> },
    { id: "model-picker", label: "Model picker", render: () => <ModelPickerScreen /> },
    { id: "empty", label: "Empty inbox", render: () => <EmptyScreen /> },
  ],
};
