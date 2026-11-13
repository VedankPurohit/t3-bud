import type { ThreadSummary } from "@shared/types";
import { CommandIcon, CornerDownLeftIcon, PlusIcon, SearchIcon, ShieldIcon, TerminalIcon } from "lucide-react";
import type { ReactNode } from "react";

import { CompanionMascot } from "../../components/Mascot";
import { CollapsibleSectionHeader } from "../../t3/ui/collapsible-section-header";
import { Button } from "../../t3/ui/button";
import { Kbd } from "../../t3/ui/kbd";
import { cn } from "../../t3/lib/utils";
import {
  mockAttentionDetail,
  mockEmptyState,
  mockMood,
  mockState,
  mockThreadDetail,
} from "../mock";
import type { DesignVariant } from "../types";
import {
  ApprovalBanner,
  AssistantMessage,
  Composer,
  Footer,
  FooterMood,
  GroupLabel,
  kbdArrows,
  ModelChip,
  ModelPickerPopup,
  OpenInT3Button,
  Panel,
  ProjectChip,
  ProjectMonogram,
  SendButton,
  SnoozeWake,
  StopButton,
  ThreadHeader,
  ThreadRow,
  Timeline,
  topStatusOf,
  UserMessage,
  windowSize,
} from "./command-bar-parts";

/* ------------------------------------------------------------------------------------------------
 * The bar: a T3 composer on top, live threads under it, palette footer at the bottom.
 * ---------------------------------------------------------------------------------------------- */

const HERO_PLACEHOLDER = "Ask T3 Code anything…";
const HIGH_EFFORT = { count: 4, filled: 3 };

const sendHints = [
  { keys: [<CornerDownLeftIcon key="enter" />], label: "Start" },
  { keys: [<CommandIcon key="cmd" />, "K"], label: "All threads" },
  { keys: ["Esc"], label: "Fold" },
];

function BarComposer(props: { text?: string; modelOpen?: boolean; projectId?: string }) {
  return (
    <Composer
      size="hero"
      focused
      {...(props.text ? { text: props.text } : {})}
      placeholder={HERO_PLACEHOLDER}
      left={<ProjectChip projectId={props.projectId ?? "p-t3"} />}
      right={<ModelChip providerInstanceId="claudeAgent" model="claude-opus-5-5" effort={HIGH_EFFORT} pressed={props.modelOpen ?? false} />}
      action={<SendButton enabled={Boolean(props.text)} />}
    />
  );
}

/** Needs you first, then finished, then working: the order the user acts in. */
function liveGroups(working: readonly ThreadSummary[], inbox: readonly ThreadSummary[]) {
  const live = [...working, ...inbox];
  return [
    { label: "Needs you", threads: live.filter((thread) => topStatusOf(thread) === "approval") },
    {
      label: "Finished",
      threads: live.filter((thread) => topStatusOf(thread) === "done" || topStatusOf(thread) === "failed"),
    },
    { label: "Working", threads: live.filter((thread) => topStatusOf(thread) === "working") },
  ].filter((group) => group.threads.length > 0);
}

/** No headings: each row's status names its group, and a rule marks where the next one starts. */
function LiveList(props: { activeId?: string }) {
  return (
    <div role="listbox" aria-label="Live threads" className="min-h-0 flex-1 overflow-hidden px-2 pt-1 pb-2">
      {liveGroups(mockState.working, mockState.inbox).map((group, index) => (
        <div key={group.label} role="group" aria-label={group.label}>
          {index > 0 ? <div aria-hidden className="mx-2 my-1 h-px bg-border/70" /> : null}
          {group.threads.map((thread) => (
            <ThreadRow
              key={thread.threadId}
              thread={thread}
              active={thread.threadId === props.activeId}
              recede={topStatusOf(thread) === "working"}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function BarFooter() {
  return (
    <Footer
      hints={sendHints}
      trailing={<FooterMood mood="attention" summary={mockMood.summary} />}
    />
  );
}

function BarScreen() {
  return (
    <Panel>
      <div className="shrink-0 p-2">
        <BarComposer />
      </div>
      <LiveList />
      <BarFooter />
    </Panel>
  );
}

function ModelPickerScreen() {
  return (
    <Panel>
      <div className="shrink-0 p-2">
        <BarComposer text="Add a global shortcut that opens the companion bar" modelOpen />
      </div>
      <LiveList />
      <BarFooter />
      {/* Opens under the trigger, aligned to its end, over the list. */}
      <ModelPickerPopup className="absolute top-[7.25rem] right-14 z-20" />
    </Panel>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Thread pane: the bar's top edge stays put; the composer moves under the newest turn.
 * ---------------------------------------------------------------------------------------------- */

const threadHints = [
  { keys: [<CornerDownLeftIcon key="enter" />], label: "Send" },
  { keys: [<CommandIcon key="cmd" />, "O"], label: "Open in T3 Code" },
  { keys: ["Esc"], label: "Back" },
];

function ReplyComposer(props: { running?: boolean; banner?: ReactNode; placeholder: string }) {
  return (
    <div className="shrink-0 px-2 pb-2">
      <Composer
        size="reply"
        placeholder={props.placeholder}
        {...(props.banner ? { banner: props.banner } : {})}
        right={<ModelChip providerInstanceId="claudeAgent" model="claude-opus-5-5" effort={HIGH_EFFORT} />}
        action={props.running ? <StopButton /> : <SendButton enabled={false} />}
      />
    </div>
  );
}

function ThreadScreen() {
  const detail = mockThreadDetail;
  const items = detail.items;
  return (
    <Panel>
      <ThreadHeader title={detail.title} projectId="p-t3" status="done" />
      <Timeline>
        {items.map((item, index) =>
          item.type === "user_message" ? (
            <UserMessage key={item.itemId} text={item.text} />
          ) : (
            <AssistantMessage key={item.itemId} text={item.text} showMeta={index === items.length - 1} time="2:41 PM" />
          ),
        )}
      </Timeline>
      <ReplyComposer placeholder="Reply to continue this thread…" />
      <Footer hints={threadHints} />
    </Panel>
  );
}

/** T3's TimelinePendingApprovalRow, minus the decision buttons MCP cannot press. */
function PendingApprovalRow() {
  return (
    <div role="group" aria-label="Command approval" className="flex flex-col gap-1 px-1">
      <div className="flex min-w-0 items-start gap-2.5">
        <TerminalIcon aria-hidden className="mt-0.5 size-4 shrink-0 stroke-2 text-icon-muted" />
        <code className="block min-w-0 whitespace-pre-wrap font-mono text-xs leading-5 text-foreground wrap-anywhere">
          vp test run apps/desktop/src/settings
        </code>
      </div>
      <div className="ms-6.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1 text-warning">
          <ShieldIcon aria-hidden className="size-3 shrink-0" />
          Waiting for approval
        </span>
        <span aria-hidden className="text-muted-foreground">
          ·
        </span>
        <span className="text-muted-foreground">Writes to a temp directory</span>
      </div>
    </div>
  );
}

function AttentionScreen() {
  const detail = mockAttentionDetail;
  return (
    <Panel>
      <ThreadHeader
        title={detail.title}
        projectId="p-t3"
        status="approval"
      />
      <Timeline>
        {detail.items.map((item) =>
          item.type === "user_message" ? (
            <UserMessage key={item.itemId} text={item.text} />
          ) : (
            <AssistantMessage key={item.itemId} text={item.text} />
          ),
        )}
        <PendingApprovalRow />
      </Timeline>
      <ReplyComposer
        running
        placeholder="Steer the agent while it waits…"
        banner={
          <ApprovalBanner
            title="Command approval"
            description="Approvals only work in T3 Code itself."
            action={<OpenInT3Button variant="default" />}
          />
        }
      />
      <Footer
        hints={threadHints}
        trailing={<FooterMood mood="attention" summary="Checked 3s ago" />}
      />
    </Panel>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Inbox: ⌘K swaps the composer for T3's palette search and lists every shelf.
 * ---------------------------------------------------------------------------------------------- */

function InboxScreen() {
  const state = mockState;
  return (
    <Panel>
      <div className="flex h-13 shrink-0 items-center gap-2 border-b border-border/70 ps-4 pe-2.5">
        <SearchIcon aria-hidden className="size-4.5 shrink-0 translate-x-0.5 text-icon-muted" />
        <span className="min-w-0 flex-1 ps-2 text-base text-placeholder">Search threads…</span>
        <Button size="xs" variant="ghost-muted">
          <PlusIcon />
          New thread
          <Kbd className="ms-0.5">⌘N</Kbd>
        </Button>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="flex flex-col px-2 pt-1.5">
          <GroupLabel trailing={state.inboxTotal.toLocaleString("en-US")}>Inbox</GroupLabel>
          {state.inbox.map((thread, index) => (
            <ThreadRow key={thread.threadId} thread={thread} active={index === 0} />
          ))}
          <div className="pt-1.5">
            <CollapsibleSectionHeader expanded accessory={<span className="text-3xs tabular-nums">{state.working.length}</span>}>
              Working
            </CollapsibleSectionHeader>
            {state.working.map((thread) => (
              <ThreadRow key={thread.threadId} thread={thread} recede />
            ))}
          </div>
          <div className="pt-1.5">
            <CollapsibleSectionHeader expanded accessory={<span className="text-3xs tabular-nums">{state.snoozed.length}</span>}>
              Snoozed
            </CollapsibleSectionHeader>
            {state.snoozed.map((thread) => (
              <ThreadRow
                key={thread.threadId}
                thread={thread}
                recede
                trailing={thread.snoozedUntil ? <SnoozeWake until={thread.snoozedUntil} /> : undefined}
              />
            ))}
          </div>
          <div className="pt-1.5">
            <CollapsibleSectionHeader expanded={false} accessory={<span className="text-3xs tabular-nums">{state.settled.length}</span>}>
              Settled
            </CollapsibleSectionHeader>
          </div>
        </div>
      </div>
      <Footer
        hints={[
          { keys: kbdArrows, label: "Navigate" },
          { keys: [<CornerDownLeftIcon key="enter" />], label: "Open" },
          { keys: ["Esc"], label: "Back to bar" },
        ]}
      />
    </Panel>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Empty: nothing live, so the space under the composer offers projects to start in.
 * ---------------------------------------------------------------------------------------------- */

function EmptyScreen() {
  const projects = mockEmptyState.projects.slice(0, 4);
  return (
    <Panel>
      <div className="shrink-0 p-2">
        <BarComposer />
      </div>
      <div className="flex shrink-0 items-center gap-3 px-4 pt-2 pb-3">
        <CompanionMascot mood="idle" hopKey={0} size={40} className="shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Nothing running</p>
          <p className="text-xs text-muted-foreground">Start a thread in any project. It shows up here while it works.</p>
        </div>
      </div>
      <div role="listbox" aria-label="Start in" className="min-h-0 flex-1 px-2 pb-2">
        <GroupLabel>Start in</GroupLabel>
        {projects.map((project, index) => (
          <div
            key={project.id}
            role="option"
            aria-selected={index === 0}
            className={cn(
              "flex h-8 cursor-pointer select-none items-center gap-2 rounded-sm px-2 text-sm",
              index === 0 ? "bg-accent text-accent-foreground" : "hover:bg-foreground/[0.06]",
            )}
          >
            <ProjectMonogram projectId={project.id} />
            <span className="truncate text-foreground">{project.title}</span>
            <span className="min-w-0 flex-1 truncate text-muted-foreground/70 text-xs">{project.workspaceRoot}</span>
            <kbd className="ms-auto font-medium font-sans text-secondary-label text-xs tracking-widest">⌘{index + 1}</kbd>
          </div>
        ))}
      </div>
      <Footer hints={sendHints} trailing={<FooterMood mood="idle" summary="All quiet" />} />
    </Panel>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Folded: the blob with one count badge in the colour of what matters most.
 * ---------------------------------------------------------------------------------------------- */

function Compact() {
  return (
    <div className="relative flex size-full items-end justify-center pb-1">
      <CompanionMascot mood="attention" hopKey={0} size={60} />
      <span
        aria-label={`${mockMood.attention} needs you`}
        className="absolute top-2 right-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1.5 text-2xs font-semibold tabular-nums text-white shadow-sm ring-2 ring-background"
      >
        {mockMood.attention}
      </span>
    </div>
  );
}

export const variant: DesignVariant = {
  id: "command-bar",
  name: "Command bar",
  pitch:
    "T3's own composer as a Spotlight bar: summon it over anything, type, press Enter, and the threads you care about sit right under the cursor, so starting work from YouTube or Twitter is one shortcut and one line.",
  layout:
    "Folded: a 60px blob in a screen corner with one count badge (amber needs you, green done, blue working). ⌥Space or a click on the blob opens a 620px bar centered in the top third of the active display, cursor already in the composer. It grows downward only: 392 for the bar, 452 with the model picker open, 440 to 560 for a thread, 596 for all threads. Esc steps back, then folds.",
  compactSize: { width: 76, height: 84 },
  panelSize: windowSize(392),
  renderCompact: () => <Compact />,
  screens: [
    { id: "new-thread", label: "Bar (open)", size: windowSize(392), render: () => <BarScreen /> },
    { id: "model-picker", label: "Model picker", size: windowSize(452), render: () => <ModelPickerScreen /> },
    { id: "thread", label: "Thread", size: windowSize(560), render: () => <ThreadScreen /> },
    { id: "attention", label: "Needs approval", size: windowSize(440), render: () => <AttentionScreen /> },
    { id: "inbox", label: "All threads (⌘K)", size: windowSize(596), render: () => <InboxScreen /> },
    { id: "empty", label: "Empty", size: windowSize(392), render: () => <EmptyScreen /> },
  ],
};
