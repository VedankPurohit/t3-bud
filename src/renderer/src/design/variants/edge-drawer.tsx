import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  CheckIcon,
  FolderIcon,
  PanelRightCloseIcon,
  SearchIcon,
  SettingsIcon,
  ShieldIcon,
  SquareArrowOutUpRightIcon,
  SquarePenIcon,
  StarIcon,
  TerminalIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { CompanionMascot, type CompanionMood } from "../../components/Mascot";
import { cn } from "../../t3/lib/utils";
import { Button, InlineButton } from "../../t3/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../../t3/ui/empty";
import {
  mockAttentionDetail,
  mockEmptyState,
  mockProjects,
  mockProviders,
  mockState,
  mockThreadDetail,
} from "../mock";
import type { DesignVariant } from "../types";
import {
  AssistantMessage,
  BrandMark,
  ChatHeader,
  Composer,
  ComposerApprovalBanner,
  DrawerShell,
  ModelChip,
  ProjectFavicon,
  ProviderIcon,
  STATUS_PRESENTATION,
  SearchRow,
  ShelfHeader,
  SidebarIconButton,
  ThreadCardRow,
  ThreadSlimRow,
  UserBubble,
  WorkedRow,
  modelLabel,
  rowStatus,
} from "./edge-drawer-parts";

const DRAWER_SIZE = { width: 392, height: 860 };

// ---------------------------------------------------------------------------------------------
// Folded: a tab in the screen edge

const GLYPH_ORDER = ["approval", "failed", "done", "working"] as const;

function FoldedTab() {
  const glyphs = [...mockState.working, ...mockState.inbox]
    .map((thread) => ({ thread, status: rowStatus(thread) }))
    .flatMap((entry) => (entry.status ? [{ thread: entry.thread, status: entry.status }] : []))
    .toSorted((a, b) => GLYPH_ORDER.indexOf(a.status) - GLYPH_ORDER.indexOf(b.status));
  return (
    <div className="relative size-full">
      {/* The monitor's edge, so the tab reads as docked rather than floating. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[400px] -bottom-[400px] left-full w-4 bg-neutral-950 shadow-[inset_1px_0_0_rgb(255_255_255/12%)]"
      />
      <div className="absolute inset-0 flex flex-col items-center overflow-hidden rounded-l-xl border border-r-0 border-sidebar-border bg-sidebar surface-grain text-sidebar-foreground shadow-[-10px_0_28px_-14px_rgb(0_0_0/55%)] dark:border-white/10">
        <div className="relative h-[50px] w-full shrink-0">
          {/* Clipped by the screen edge: the blob peeks out of it. */}
          <CompanionMascot
            mood="attention"
            hopKey={0}
            size={44}
            className="absolute top-1 left-[15px]"
          />
        </div>
        <ul className="flex w-full flex-col items-center pt-1 pb-2">
          {glyphs.map(({ thread, status }) => {
            const presentation = STATUS_PRESENTATION[status];
            return (
              <li key={thread.threadId} className="list-none">
                <span
                  title={`${presentation.label}: ${thread.title}`}
                  className={cn(
                    "flex h-5 w-7 cursor-pointer items-center justify-center rounded-md hover:bg-sidebar-row-hover",
                    presentation.className,
                    status === "working" && "opacity-70",
                  )}
                >
                  <presentation.Icon aria-hidden className="size-3.5" />
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Drawer chrome

function DrawerHeader(props: { mood: CompanionMood }) {
  return (
    <div className="relative flex h-[var(--workspace-topbar-height)] shrink-0 items-center gap-2 pr-2 pl-3.5">
      <BrandMark mood={props.mood} />
      <div className="ml-auto flex shrink-0 items-center">
        <SidebarIconButton label="Open T3 Code">
          <SquareArrowOutUpRightIcon />
        </SidebarIconButton>
        <SidebarIconButton label="Tuck into the edge">
          <PanelRightCloseIcon />
        </SidebarIconButton>
      </div>
    </div>
  );
}

function DrawerFooter() {
  return (
    <div className="flex shrink-0 items-center gap-1 px-2 pt-1 pb-2">
      <SidebarIconButton label="Settings">
        <SettingsIcon />
      </SidebarIconButton>
      <span className="ml-auto inline-flex min-w-0 items-center gap-1.5 pe-2 text-xs text-muted-foreground">
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-success" />
        <span className="truncate">Connected · 127.0.0.1:3773</span>
      </span>
    </div>
  );
}

function SidebarList(props: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden px-(--sidebar-content-inset) pt-1 pb-(--sidebar-content-inset)">
      <ul role="presentation" className="relative flex flex-1 flex-col gap-px">
        {props.children}
      </ul>
    </div>
  );
}

const WORKING_FOR: Record<string, string> = { w2: "42s", w3: "3m" };

function InboxScreen() {
  const needsYou = mockState.working.filter((thread) => thread.pendingRequestCount > 0);
  const working = mockState.working.filter((thread) => thread.pendingRequestCount === 0);
  return (
    <DrawerShell>
      <DrawerHeader mood="attention" />
      <div className="shrink-0 px-2 pb-1">
        <SearchRow />
      </div>
      <SidebarList>
        {[...needsYou, ...mockState.inbox].map((thread) => (
          <ThreadCardRow key={thread.threadId} thread={thread} hovered={thread.threadId === "i4"} />
        ))}
        <ShelfHeader className="mt-auto" label="Working" count={working.length} expanded />
        {working.map((thread) => (
          <ThreadCardRow
            key={thread.threadId}
            thread={thread}
            workingFor={WORKING_FOR[thread.threadId]}
          />
        ))}
        <ShelfHeader label="Snoozed" count={mockState.snoozed.length} expanded={false} />
        <ShelfHeader label="Settled" count={mockState.settled.length} expanded={false} />
      </SidebarList>
      <DrawerFooter />
    </DrawerShell>
  );
}

const WAKE_LABELS: Record<string, string> = { s1: "3h", s2: "Tomorrow" };

function EmptyScreen() {
  return (
    <DrawerShell>
      <DrawerHeader mood="idle" />
      <div className="shrink-0 px-2 pb-1">
        <SearchRow />
      </div>
      <SidebarList>
        <li className="flex flex-1 list-none flex-col">
          <Empty size="compact" className="min-h-0">
            <EmptyHeader>
              <EmptyMedia>
                <CompanionMascot mood="done" hopKey={0} size={64} />
              </EmptyMedia>
              <EmptyTitle>All caught up</EmptyTitle>
              <EmptyDescription>
                Nothing is working or waiting on you. Threads land here when an agent finishes.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" size="sm">
                <SquarePenIcon />
                New thread
              </Button>
            </EmptyContent>
          </Empty>
        </li>
        <ShelfHeader className="mt-auto" label="Snoozed" count={mockEmptyState.snoozed.length} expanded />
        {mockEmptyState.snoozed.map((thread) => (
          <ThreadSlimRow
            key={thread.threadId}
            thread={thread}
            shelf="snoozed"
            wake={WAKE_LABELS[thread.threadId]}
          />
        ))}
        <ShelfHeader label="Settled" count={mockEmptyState.settled.length} expanded />
        {mockEmptyState.settled.map((thread) => (
          <ThreadSlimRow key={thread.threadId} thread={thread} shelf="settled" />
        ))}
      </SidebarList>
      <DrawerFooter />
    </DrawerShell>
  );
}

// ---------------------------------------------------------------------------------------------
// Thread views

function ContextStrip(props: { project: string; synced?: string }) {
  return (
    <>
      <span className="inline-flex min-w-0 items-center gap-1 text-xs">
        <FolderIcon aria-hidden className="size-3 shrink-0" />
        <span className="truncate">{props.project}</span>
      </span>
      <span className="inline-flex items-center gap-1 text-xs">
        <ShieldIcon aria-hidden className="size-3 shrink-0" />
        Full access
      </span>
      {props.synced ? (
        <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground/70">
          {props.synced}
        </span>
      ) : null}
    </>
  );
}

/** Pinned to the latest message, as T3's timeline is; older turns fade under the header. */
function Timeline(props: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-end overflow-hidden px-3 [--font-size-code:12px] mask-t-from-[calc(100%-2rem)]">
      <div className="flex flex-col gap-4 pt-2 pb-5">{props.children}</div>
    </div>
  );
}

function OpenInT3Button() {
  return (
    <Button variant="ghost" size="icon-sm" aria-label="Open in T3 Code">
      <SquareArrowOutUpRightIcon className="size-4" />
    </Button>
  );
}

function ThreadScreen() {
  const detail = mockThreadDetail;
  const [ask, answer, followUp, reply] = detail.items;
  return (
    <DrawerShell surface="background">
      <ChatHeader title={detail.title} projectId="p-t3" trailing={<OpenInT3Button />} />
      <Timeline>
          {ask ? <UserBubble item={ask} /> : null}
          <WorkedRow label="Worked for 1m 12s" />
          {answer ? <AssistantMessage item={answer} /> : null}
          {followUp ? <UserBubble item={followUp} /> : null}
          <WorkedRow label="Worked for 38s" />
          {reply ? <AssistantMessage item={reply} meta="2m ago" /> : null}
      </Timeline>
      <div className="shrink-0 px-3 pb-3">
        <Composer
          placeholder="Ask anything..."
          modelChip={
            <ModelChip providerInstanceId="claudeAgent" model={detail.model ?? ""} effort="High" />
          }
          context={<ContextStrip project="t3code" synced="Synced 3s ago" />}
        />
      </div>
    </DrawerShell>
  );
}

/** T3 `TimelinePendingApprovalRow`, with the approve actions swapped for a hand-off. */
function PendingApprovalRow() {
  return (
    <div role="group" aria-label="Command approval" className="flex flex-col gap-1 px-1 py-1">
      <div className="flex min-w-0 items-start gap-2.5">
        <TerminalIcon aria-hidden className="mt-0.5 block size-4 shrink-0 stroke-2 text-icon-muted" />
        <code className="block min-w-0 whitespace-pre-wrap font-mono text-xs leading-5 text-foreground select-text [overflow-wrap:anywhere]">
          vp test run apps/desktop/src/settings
        </code>
      </div>
      <div className="ms-6.5 flex min-w-0 flex-col gap-1 pb-1 text-xs">
        <span className="text-muted-foreground select-text">
          Runs the desktop suite, which writes to a temp directory.
        </span>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="inline-flex items-center gap-1 text-warning">
            <ShieldIcon aria-hidden className="size-3 shrink-0" />
            Waiting for approval
          </span>
          <span aria-hidden className="text-muted-foreground">
            ·
          </span>
          <InlineButton tone="muted">
            Open in T3 Code
            <ArrowUpRightIcon aria-hidden className="size-3" />
          </InlineButton>
        </div>
      </div>
    </div>
  );
}

function AttentionScreen() {
  const detail = mockAttentionDetail;
  const [ask, progress] = detail.items;
  return (
    <DrawerShell surface="background">
      <ChatHeader title={detail.title} projectId="p-t3" trailing={<OpenInT3Button />} />
      <Timeline>
          {ask ? <UserBubble item={ask} /> : null}
          <WorkedRow label="Worked for 2m 04s" />
          {progress ? <AssistantMessage item={progress} /> : null}
          <PendingApprovalRow />
      </Timeline>
      <div className="shrink-0 px-3 pb-3">
        <Composer
          running
          placeholder="Reply while it waits"
          banner={
            <ComposerApprovalBanner
              title="Approval needed to run a command"
              detail="The companion can't answer permission requests. Approve or decline it in T3 Code."
              action={
                <Button size="xs" variant="default">
                  Open in T3 Code
                  <ArrowUpRightIcon />
                </Button>
              }
            />
          }
          modelChip={
            <ModelChip providerInstanceId="claudeAgent" model={detail.model ?? ""} effort="High" />
          }
          context={<ContextStrip project="t3code" synced="Synced 2s ago" />}
        />
      </div>
    </DrawerShell>
  );
}

// ---------------------------------------------------------------------------------------------
// New thread and the model picker

const COLUMN_LABEL = "px-2 pt-1.5 pb-1 font-medium text-muted-foreground text-xs";
const COLUMN_ROW =
  "flex h-8 w-full shrink-0 cursor-pointer items-center gap-2 rounded-sm px-2 text-left text-sm text-foreground outline-none hover:bg-foreground/[0.09]";

function ProjectPicker(props: { selectedId: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className={COLUMN_LABEL}>Start in</div>
      {mockProjects.map((project) => {
        const selected = project.id === props.selectedId;
        return (
          <button
            key={project.id}
            type="button"
            role="radio"
            aria-checked={selected}
            className={cn(COLUMN_ROW, selected && "bg-foreground/[0.06]")}
          >
            <ProjectFavicon project={project} />
            <span className="min-w-0 flex-1 truncate">{project.title}</span>
            {selected ? (
              <CheckIcon aria-hidden className="size-3.5 shrink-0" />
            ) : (
              <span className="min-w-0 max-w-32 shrink truncate text-xs text-muted-foreground/70">
                {project.workspaceRoot.replace("~/Github/", "~/")}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

const FOOTER_SEGMENT =
  "flex h-6 flex-1 cursor-pointer items-center justify-center gap-1 px-2 text-muted-foreground text-xs outline-none first:rounded-l-md last:rounded-r-md hover:text-foreground data-checked:bg-input/72 data-checked:text-foreground";

/** T3's provider model picker (ModelPickerSidebar, ModelPickerContent, ModelListRow) with the
 * effort column folded under the list, as T3 does on narrow screens. */
function ModelPickerPopup() {
  const claude = mockProviders.find((provider) => provider.providerInstanceId === "claudeAgent");
  const selected = "claude-opus-5-5";
  return (
    <div className="absolute inset-x-0 bottom-full z-30 mb-1.5">
      <div className="relative flex w-full flex-col overflow-hidden rounded-lg text-popover-foreground outline-none dropdown-glass shadow-[0_16px_40px_-18px_rgb(0_0_0/55%)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] dark:shadow-[0_18px_44px_-18px_rgb(0_0_0/80%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]">
        <div className="flex min-h-0">
          <div className="w-11 shrink-0 overflow-hidden bg-muted/30">
            <div className="relative flex min-h-full flex-col gap-1 p-1">
              <div
                aria-hidden
                className="pointer-events-none absolute right-1 z-10 h-5 w-0.75 rounded-full bg-primary"
                style={{ top: 4 + 36 + 1 + 4 + 4 + 18 - 10 }}
              />
              <button
                type="button"
                aria-label="Favorites"
                className="relative isolate flex aspect-square w-full cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/10"
              >
                <StarIcon className="size-5 shrink-0 fill-current" aria-hidden />
              </button>
              <div className="border-b border-border/70" aria-hidden="true" />
              {mockProviders.map((provider) => (
                <button
                  key={provider.providerInstanceId}
                  type="button"
                  aria-label={provider.displayName}
                  aria-pressed={provider.providerInstanceId === "claudeAgent"}
                  className="relative isolate flex aspect-square w-full cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-foreground/10"
                >
                  <ProviderIcon providerInstanceId={provider.providerInstanceId} />
                </button>
              ))}
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="min-w-0 shrink-0 px-3 pt-2.5">
              <div className="relative -translate-y-px border-b border-border/70 pb-1.5">
                <SearchIcon
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1.5 left-0 size-4 shrink-0 text-muted-foreground/55"
                />
                <span className="block h-6.5 ps-5 text-sm leading-6.5 text-muted-foreground/70">
                  Search models...
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-0.5 py-1.5 pr-1.5 pl-2">
              {claude?.models.map((model, index) => {
                const isSelected = model.id === selected;
                return (
                  <div
                    key={model.id}
                    data-highlighted={index === 1 || undefined}
                    className="group relative flex min-h-8 w-full min-w-0 cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-base outline-none hover:bg-foreground/[0.09] data-highlighted:bg-foreground/[0.09]"
                  >
                    <ProviderIcon providerInstanceId="claudeAgent" className="size-4" />
                    <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
                      <div className="min-w-0 truncate text-sm font-normal leading-snug">
                        {modelLabel(model.id)}
                      </div>
                      {isSelected ? <CheckIcon className="size-3.5 shrink-0" aria-hidden /> : null}
                    </div>
                    <StarIcon
                      aria-hidden
                      className={cn(
                        "me-1 size-3 shrink-0",
                        isSelected
                          ? "fill-current text-warning"
                          : "text-muted-foreground opacity-0 group-data-highlighted:opacity-100",
                      )}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="border-t border-border/70 bg-muted/40 px-3 pt-2 pb-2.5">
          <div className="flex items-center gap-2 pb-2 text-sm">
            <span className="text-muted-foreground">Effort</span>
            <span className="ms-auto min-w-0 truncate text-muted-foreground text-xs">
              {modelLabel(selected)}
            </span>
          </div>
          <div role="radiogroup" aria-label="Effort" className="flex rounded-lg bg-input/40 p-0.5">
            {["Low", "Medium", "High", "Max"].map((effort) => (
              <button
                key={effort}
                type="button"
                role="radio"
                aria-checked={effort === "High"}
                data-checked={effort === "High" || undefined}
                className={FOOTER_SEGMENT}
              >
                {effort}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NewThreadScreen(props: { pickerOpen: boolean }) {
  return (
    <DrawerShell surface="background">
      <div className="relative flex h-[var(--workspace-topbar-height)] shrink-0 items-center gap-1 px-2">
        <Button variant="ghost" size="icon-sm" aria-label="Back to inbox">
          <ArrowLeftIcon className="size-4" />
        </Button>
        <h2 className="min-w-0 truncate text-sm font-medium text-foreground">New thread</h2>
      </div>
      <div className="shrink-0 px-2">
        <ProjectPicker selectedId="p-t3" />
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-6">
        <p className="text-center text-sm text-muted-foreground">
          Send a message to start the conversation.
        </p>
      </div>
      <div className="shrink-0 px-3 pb-3">
        <Composer
          placeholder="Ask anything..."
          draft="The sidebar drops frames when 50 threads are working. Profile it and fix the worst offender."
          popup={props.pickerOpen ? <ModelPickerPopup /> : null}
          modelChip={
            <ModelChip
              providerInstanceId="claudeAgent"
              model="claude-opus-5-5"
              effort="High"
              open={props.pickerOpen}
            />
          }
          context={<ContextStrip project="t3code" />}
        />
      </div>
    </DrawerShell>
  );
}

// ---------------------------------------------------------------------------------------------

export const variant: DesignVariant = {
  id: "edge-drawer",
  name: "Edge drawer",
  pitch:
    "A tab of status glyphs tucked into the screen edge that pulls out into T3's own sidebar, full height, so it costs 48px when folded and feels like T3 Code the moment it opens.",
  layout:
    "Folded: 48×184 tab flush to the right screen edge, one glyph per thread that is working or waiting. Open: a 380px drawer flush right at full work-area height (860 shown, 12px left gutter for its shadow); opening a thread pushes the chat into the same drawer.",
  compactSize: { width: 48, height: 184 },
  panelSize: DRAWER_SIZE,
  renderCompact: () => <FoldedTab />,
  screens: [
    { id: "inbox", label: "Inbox", render: () => <InboxScreen /> },
    { id: "thread", label: "Thread", render: () => <ThreadScreen /> },
    { id: "attention", label: "Needs approval", render: () => <AttentionScreen /> },
    { id: "new-thread", label: "New thread", render: () => <NewThreadScreen pickerOpen={false} /> },
    { id: "model-picker", label: "Model picker", render: () => <NewThreadScreen pickerOpen /> },
    { id: "empty", label: "Empty", render: () => <EmptyScreen /> },
  ],
};
