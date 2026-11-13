import type { ThreadSummary } from "@shared/types";
import { CheckIcon, CircleCheckIcon, SearchIcon, ShieldIcon, ShieldQuestionIcon, SquareArrowOutUpRightIcon, SquarePenIcon, StarIcon, TerminalIcon, XIcon } from "lucide-react";

import { CompanionMascot } from "../../components/Mascot";
import { modelLabel } from "../../lib/format";
import { cn } from "../../t3/lib/utils";
import { Button } from "../../t3/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../../t3/ui/empty";
import { Kbd } from "../../t3/ui/kbd";
import { mockAttentionDetail, mockEmptyState, mockMood, mockProviders, mockState, mockThreadDetail } from "../mock";
import type { DesignVariant } from "../types";
import {
  Composer,
  ExpandedCard,
  GroupHeader,
  Panel,
  PanelHeader,
  ProjectChip,
  ProviderGlyph,
  Shelves,
  SlimCard,
  SnoozeAction,
  StackCard,
  StackPeek,
  TimelineItem,
} from "./notification-stack-parts";

/** The last assistant line of each thread, as the inbox would show it. */
const PREVIEWS: Record<string, string> = {
  w1: "I wrote the migration and a test for the old format. Next I need to run the desktop test suite, which writes to a temp directory.",
  w2: "Reading the existing widgets so the review card matches their layout.",
  w3: "Chunking transcripts into 30 second windows and embedding them in batches of 64.",
  i1: "Two more places use a frame wait before asserting focus. Both are in the side chat tests. I fixed them the same way and the suite passes.",
  i2: "changeset version exited with code 1: no changesets found since v0.1.7. Want me to write one from the merged PRs?",
  i3: "Here is a director prompt that cuts on emotional beats instead of fixed timers, with three example transitions.",
};

const find = (list: readonly ThreadSummary[], id: string) => list.find((thread) => thread.threadId === id)!;
const approvalThread = find(mockState.working, "w1");
const failedThread = find(mockState.inbox, "i2");
const doneThread = find(mockState.inbox, "i1");
const freshThread = find(mockState.inbox, "i3");
const quietDone = mockState.inbox.filter((thread) => !thread.unread && thread.status !== "failed");
const runningThreads = mockState.working.filter((thread) => thread.pendingRequestCount === 0);

function OpenToApprove() {
  return (
    <div className="mt-1.5 flex items-center gap-0.5">
      <Button size="xs" variant="warning-outline" className="flex-1">
        <SquareArrowOutUpRightIcon />
        Open in T3 Code to approve
      </Button>
      <SnoozeAction />
    </div>
  );
}

/** The stack, top to bottom: Needs you, Done, Working. */
function Stack(props: { replyValue?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <GroupHeader label="Needs you" count={2} tone="emphasized" />
      <ul className="flex flex-col gap-1.5">
        <StackCard thread={approvalThread} preview={PREVIEWS.w1!} tone="warning" footer={<OpenToApprove />} />
        <StackCard thread={failedThread} preview={PREVIEWS.i2!} reply={{ placeholder: "Reply to Codex" }} />
      </ul>
      <div className="mt-1.5">
        <GroupHeader label="Done" count={2 + quietDone.length} />
      </div>
      <ul className="flex flex-col gap-1.5">
        <StackCard thread={doneThread} preview={PREVIEWS.i1!} reply={{ placeholder: "Reply to Claude", value: props.replyValue }} hovered={Boolean(props.replyValue)} />
      </ul>
      <StackPeek count={quietDone.length}>
        <ul>
          <StackCard thread={freshThread} preview={PREVIEWS.i3!} reply={{ placeholder: "Reply to Claude" }} />
        </ul>
      </StackPeek>
      <div className="mt-1">
        <GroupHeader label="Working" count={runningThreads.length} />
      </div>
      <ul className="flex flex-col gap-1.5">
        {runningThreads.map((thread) => (
          <SlimCard key={thread.threadId} thread={thread} preview={PREVIEWS[thread.threadId] ?? ""} />
        ))}
      </ul>
    </div>
  );
}

function ScrollBody(props: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-0 flex-1">
      <div className="h-full overflow-y-auto px-2 pt-1 pb-3 [scrollbar-width:none]">{props.children}</div>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-linear-to-t from-background to-transparent" />
    </div>
  );
}

/* Screens */

function InboxScreen() {
  return (
    <Panel>
      <PanelHeader mood="attention" summary={mockMood.summary} />
      <ScrollBody>
        <Stack replyValue="Ship it, and open a PR" />
      </ScrollBody>
      <Shelves snoozed={mockState.snoozed.length} settled={mockState.settled.length} />
    </Panel>
  );
}

function ThreadScreen() {
  const items = mockThreadDetail.items;
  return (
    <Panel>
      <PanelHeader mood="done" summary={mockMood.summary} />
      <div className="flex min-h-0 flex-1 flex-col px-2 pt-2 pb-0">
        <div className="relative flex min-h-0 flex-1 flex-col">
          <ExpandedCard
            thread={{ ...doneThread }}
            composer={<Composer placeholder="Reply to Claude" providerId="claudeAgent" model="claude-opus-5-5" />}
          >
            {items.map((item, index) => (
              <TimelineItem key={item.itemId} item={item} showMeta={index === items.length - 1} />
            ))}
          </ExpandedCard>
        </div>
        {/* The rest of the stack waits underneath. */}
        <div aria-hidden className="relative z-0 mx-2 -mt-px h-2 rounded-b-xl border border-t-0 border-border/80 bg-card/90 dark:border-border" />
        <div aria-hidden className="relative z-0 mx-4 mb-1.5 h-2 rounded-b-xl border border-t-0 border-border/60 bg-card/70 dark:border-border/70" />
      </div>
      <Shelves snoozed={mockState.snoozed.length} settled={mockState.settled.length} />
    </Panel>
  );
}

function ApprovalBanner() {
  return (
    <div className="mx-auto -mb-4 w-[calc(100%-1.25rem)]">
      <div className="relative rounded-t-2xl border border-b-0 border-warning/30 bg-card bg-linear-to-b from-warning/8 to-warning/8 px-1 pt-1.5 pb-[calc(1rem+0.375rem)] text-xs/4 shadow-composer dark:border-warning/28 dark:bg-(--surface-raised)">
        <div className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-x-1 gap-y-2">
          <span aria-hidden className="flex w-7 justify-center pt-0.5 text-warning">
            <ShieldQuestionIcon className="size-4" />
          </span>
          <span className="min-w-0 pt-0.5 pe-1.5">
            <span className="font-medium text-foreground">Claude wants to run a command.</span>{" "}
            <span className="text-muted-foreground">Approvals only happen in T3 Code.</span>
          </span>
          <span className="col-start-2 flex items-center gap-1.5 pe-1">
            <Button size="xs" variant="default">
              <SquareArrowOutUpRightIcon />
              Open in T3 Code to approve
            </Button>
          </span>
        </div>
      </div>
    </div>
  );
}

function AttentionScreen() {
  const [user, assistant] = mockAttentionDetail.items;
  return (
    <Panel>
      <PanelHeader mood="attention" summary={mockMood.summary} />
      <div className="flex min-h-0 flex-1 flex-col px-2 pt-2 pb-2">
        <ExpandedCard
          thread={approvalThread}
          tone="warning"
          composer={
            <Composer
              banner={<ApprovalBanner />}
              placeholder="Queue a follow-up"
              providerId="claudeAgent"
              model="claude-opus-5-5"
            />
          }
        >
          {user ? <TimelineItem item={user} /> : null}
          {assistant ? <TimelineItem item={assistant} /> : null}
          {/* T3 Code's TimelinePendingApprovalRow, with the approve buttons swapped for a pointer. */}
          <div role="group" aria-label="Command approval" className="py-0.5">
            <div className="flex min-h-6 min-w-0 items-start gap-1.5 text-sm leading-relaxed">
              <span className="flex size-6 shrink-0 items-center justify-center">
                <TerminalIcon className="block size-4 shrink-0 stroke-2 text-icon-muted" />
              </span>
              <code className="block min-w-0 pt-0.5 font-mono text-xs leading-5 whitespace-pre-wrap text-foreground wrap-anywhere">
                pnpm --filter @t3tools/desktop test
              </code>
            </div>
            <div className="ms-7.5 flex min-w-0 flex-col gap-1 pb-1 text-xs">
              <span className="text-muted-foreground">Writes fixtures to a temp directory.</span>
              <span className="inline-flex items-center gap-1 text-warning-foreground">
                <ShieldIcon aria-hidden className="size-3 shrink-0" />
                Waiting for approval
              </span>
            </div>
          </div>
          <div className="flex h-6 min-w-0 items-baseline gap-2 border-t border-border/60 px-1 pt-1.5 text-xs text-muted-foreground tabular-nums">
            <span>Paused for 1m</span>
            <span className="ms-auto">Checked 4s ago</span>
          </div>
        </ExpandedCard>
      </div>
    </Panel>
  );
}

function NewThreadCard(props: { modelOpen?: boolean }) {
  return (
    <div className="pb-1">
      <div className="flex h-8 items-center gap-2 px-2 text-xs font-medium text-sidebar-foreground/80">
        <SquarePenIcon aria-hidden className="size-3.5 text-muted-foreground" />
        <span className="flex-1">New thread</span>
        <Kbd>Esc</Kbd>
      </div>
      <Composer
        placeholder="What should the agent do?"
        value="Add a weekly streak counter to the review widget"
        minLines={2}
        providerId="claudeAgent"
        model="claude-opus-5-5"
        modelOpen={props.modelOpen}
        leading={
          <>
            <ProjectChip title="personal-dashboard" />
            <span aria-hidden className="mx-0.5 h-3 w-px bg-border" />
          </>
        }
      />
    </div>
  );
}

function NewThreadScreen() {
  return (
    <Panel>
      <PanelHeader mood="idle" summary={mockMood.summary} composing />
      <ScrollBody>
        <NewThreadCard />
        <Stack />
      </ScrollBody>
      <Shelves snoozed={mockState.snoozed.length} settled={mockState.settled.length} />
    </Panel>
  );
}

/* T3 Code's ProviderModelPicker popup: provider rail, search, model rows, and the effort column's rows. */

const COLUMN_ROW =
  "flex h-7 w-full shrink-0 cursor-pointer items-center gap-2 rounded-sm px-2 text-left text-sm text-foreground outline-none hover:bg-foreground/[0.09]";
const COMBOBOX_ITEM =
  "group relative flex min-h-7 w-full min-w-0 cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-sm outline-none hover:bg-foreground/[0.09]";

function ModelPickerPopup() {
  const claude = mockProviders[0]!;
  return (
    <div
      role="dialog"
      aria-label="Choose a model"
      className="dropdown-glass absolute top-[11rem] left-3 z-50 flex w-[19.5rem] overflow-hidden rounded-lg text-popover-foreground shadow-[0_16px_40px_-18px_rgb(0_0_0/55%)] dark:shadow-[0_18px_44px_-18px_rgb(0_0_0/80%)]"
    >
      <div className="relative flex w-11 shrink-0 flex-col gap-1 bg-muted/30 p-1">
        <span className="flex aspect-square w-full items-center justify-center rounded-md text-muted-foreground">
          <StarIcon className="size-4.5 fill-current" aria-hidden />
        </span>
        <div className="border-b border-border/70" aria-hidden />
        {mockProviders.map((provider) => (
          <span
            key={provider.providerInstanceId}
            className={cn(
              "relative flex aspect-square w-full items-center justify-center rounded-md",
              provider === claude && "bg-foreground/10",
            )}
          >
            <ProviderGlyph providerId={provider.providerInstanceId} className="size-4.5" />
            {provider === claude ? (
              <span aria-hidden className="absolute top-1/2 -right-1 h-5 w-0.75 -translate-y-1/2 rounded-full bg-primary" />
            ) : null}
          </span>
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col border-l border-border/70 bg-muted/40">
        <div className="min-w-0 shrink-0 px-3 pt-2.5">
          <div className="relative flex items-center border-b border-border/70 pb-1.5">
            <SearchIcon aria-hidden className="pointer-events-none absolute top-1.5 left-0 size-4 shrink-0 text-muted-foreground/55" />
            <span className="h-6.5 ps-5 text-sm leading-6.5 text-placeholder">Search models...</span>
          </div>
        </div>
        <div className="flex flex-col p-1 pt-1.5">
          {claude.models.map((model, index) => {
            const selected = index === 0;
            return (
              <div key={model.id} className={cn(COMBOBOX_ITEM, index === 1 && "bg-foreground/[0.09]")}>
                <ProviderGlyph providerId="claudeAgent" className="size-4" />
                <span className="min-w-0 truncate text-sm leading-snug">{modelLabel(model.id)}</span>
                {selected ? <CheckIcon className="size-3.5 shrink-0" aria-hidden /> : null}
                <span className="ms-auto flex size-6 items-center justify-center">
                  <StarIcon
                    aria-hidden
                    className={cn("size-3", selected ? "fill-current text-warning" : "text-muted-foreground opacity-0", index === 1 && "opacity-100")}
                  />
                </span>
              </div>
            );
          })}
        </div>
        <div className="mx-3 border-t border-border/70" />
        <div className="flex items-center gap-2 px-3 pt-2 pb-1 text-sm">
          <span className="text-muted-foreground">Effort</span>
          <span className="ms-auto truncate text-xs text-muted-foreground">Opus 5.5</span>
        </div>
        <div role="radiogroup" aria-label="Effort" className="flex flex-col gap-0.5 px-1 pb-1.5">
          {(claude.models[0]?.options[0]?.values ?? []).map((value) => (
            <div key={value} role="radio" aria-checked={value === "high"} className={COLUMN_ROW}>
              <span className="min-w-0 flex-1 truncate capitalize">{value}</span>
              {value === "high" ? (
                <>
                  <span className="text-xs text-muted-foreground/70">Default</span>
                  <CheckIcon aria-hidden className="size-3.5" />
                </>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ModelPickerScreen() {
  return (
    <Panel>
      <PanelHeader mood="idle" summary={mockMood.summary} composing />
      <ScrollBody>
        <NewThreadCard modelOpen />
        <Stack />
      </ScrollBody>
      <Shelves snoozed={mockState.snoozed.length} settled={mockState.settled.length} />
      <ModelPickerPopup />
    </Panel>
  );
}

function EmptyScreen() {
  return (
    <Panel>
      <PanelHeader mood="idle" summary="All caught up" />
      <Empty size="compact">
        <EmptyHeader>
          <EmptyMedia>
            <CompanionMascot mood="idle" hopKey={0} size={72} />
          </EmptyMedia>
          <EmptyTitle>Nothing needs you</EmptyTitle>
          <EmptyDescription>Keep working. When a thread finishes, I'll pop up with it.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button size="sm" variant="outline">
            <SquarePenIcon />
            New thread
          </Button>
        </EmptyContent>
      </Empty>
      <Shelves snoozed={mockEmptyState.snoozed.length} settled={mockEmptyState.settled.length} />
    </Panel>
  );
}

/* Folded and speaking. The blob sits bottom-right; a T3 toast speaks for it. */

const toastCornerOrbClass =
  "inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border/60 bg-popover/92 text-muted-foreground shadow-sm outline-none backdrop-blur-sm hover:bg-popover hover:text-foreground";

function FoldedBlob(props: { mood: "attention" | "done"; count?: number }) {
  return (
    <div className="relative size-15">
      <CompanionMascot mood={props.mood} hopKey={0} size={60} />
      {props.count ? (
        <span className="absolute -top-0.5 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-border/60 bg-popover px-1 text-2xs font-semibold tabular-nums text-warning-foreground shadow-sm">
          {props.count}
        </span>
      ) : null}
    </div>
  );
}

function SpeakingScreen() {
  return (
    <div className="absolute inset-0">
      <div className="absolute right-1 bottom-1">
        <FoldedBlob mood="done" />
      </div>
      {/* T3 Code's toast: dropdown-glass surface, stacked action layout, corner dismiss orb. */}
      <div className="dropdown-glass absolute top-2 right-[4.5rem] bottom-2 left-1.5 rounded-lg text-popover-foreground shadow-xl shadow-black/25">
        <div className="absolute -top-1.5 -right-1.5 z-20">
          <button type="button" aria-label="Dismiss notification" className={toastCornerOrbClass}>
            <XIcon className="size-3" strokeWidth={2.25} />
          </button>
        </div>
        <div className="flex h-full flex-col justify-between gap-2 py-2.5 ps-3 pe-3 text-sm">
          <div className="flex min-h-0 min-w-0 gap-2 pe-3">
            <div className="flex h-lh w-4 shrink-0 items-center justify-center">
              <CircleCheckIcon aria-hidden className="size-4 text-success-foreground" />
            </div>
            <div className="min-w-0">
              <p className="line-clamp-2 font-medium leading-5">Fix flaky composer focus test is done</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">t3code · just now</span>
            <Button size="xs" variant="outline">
              Reply
            </Button>
            <Button size="xs" variant="default">
              Open
            </Button>
          </div>
        </div>
      </div>
      {/* The tail points at the blob. */}
      <div
        aria-hidden
        className="dropdown-glass absolute right-[3.95rem] bottom-[2.25rem] h-3.5 w-2.5 border-0"
        style={{ clipPath: "polygon(0 0, 100% 50%, 0 100%)" }}
      />
    </div>
  );
}

export const variant: DesignVariant = {
  id: "notification-stack",
  name: "Notification stack",
  pitch:
    "Threads arrive as T3 Code toast cards you can answer in place: the blob speaks up the moment one finishes, and the unfolded stack lets you reply, settle or snooze without opening anything.",
  layout:
    "Blob 60px bottom-right; a 270px toast bubble slides out beside it when a thread finishes. Unfolds into a 372×620 card column above the blob; a card expands in place to the full thread, the rest of the stack peeking underneath.",
  compactSize: { width: 68, height: 68 },
  panelSize: { width: 388, height: 636 },
  renderCompact: () => (
    <div className="flex size-full items-end justify-end">
      <FoldedBlob mood="attention" count={mockMood.attention + mockMood.done} />
    </div>
  ),
  screens: [
    { id: "speaking", label: "Speaking", size: { width: 340, height: 110 }, render: () => <SpeakingScreen /> },
    { id: "inbox", label: "Inbox", render: () => <InboxScreen /> },
    { id: "thread", label: "Thread (expanded card)", render: () => <ThreadScreen /> },
    { id: "attention", label: "Needs you", render: () => <AttentionScreen /> },
    { id: "new-thread", label: "New thread", render: () => <NewThreadScreen /> },
    { id: "model-picker", label: "Model picker", render: () => <ModelPickerScreen /> },
    { id: "empty", label: "Empty", render: () => <EmptyScreen /> },
  ],
};
