import {
  isWorking,
  type Connection,
  type ModelSelection,
  type OrganizeAction,
  type ThreadSummary,
  type ThreadSearchInput,
  type ThreadSearchResult,
} from "@shared/types";
import {
  ArrowUpRightIcon,
  CheckIcon,
  MinusIcon,
  SearchIcon,
  SquarePenIcon,
  XIcon,
  BellIcon,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { CompanionMascot } from "../components/Mascot";
import { useThreadDetail } from "../lib/state";
import { cn } from "../t3/lib/utils";
import { Button, InlineButton } from "../t3/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../t3/ui/empty";
import { Input } from "../t3/ui/input";
import { Toggle, ToggleGroup } from "../t3/ui/toggle-group";
import { HiddenRequestRow, RequestCard, ThreadHeader, Timeline } from "./chat";
import { PANEL_TOP } from "./capsule";
import { Composer } from "./composer";
import { useIsland } from "./context";
import { ProjectGlyph, ThreadRow, type Shelf } from "./rows";

import { ThreadSearchHeader } from "./thread-search";

const api = () => window.companion;

/** The panel hangs below the mascot, which keeps its own size and position. */
export function PopoverPanel(props: { surface: "sidebar" | "chat"; children: ReactNode }) {
  return (
    <div
      {...(props.surface === "sidebar" ? { "data-app-sidebar": true } : {})}
      style={{ top: `var(--companion-panel-top, ${PANEL_TOP}px)`, bottom: "var(--companion-panel-bottom, 12px)" }}
      className={cn(
        "panel-in absolute inset-x-2.5 bottom-3 flex flex-col overflow-hidden rounded-2xl border shadow-[0_16px_40px_-18px_rgb(0_0_0/55%)] dark:shadow-[0_18px_44px_-18px_rgb(0_0_0/80%)]",
        props.surface === "sidebar"
          ? "border-sidebar-border bg-sidebar text-sidebar-foreground"
          : "border-border bg-background text-foreground",
      )}
    >
      <div aria-hidden className="h-2 shrink-0" />
      {props.children}
    </div>
  );
}

// ── Inbox ───────────────────────────────────────────────────────────────────────────────────────

function syncedLabel(syncedAt: string | null, connection: Connection["state"]) {
  if (connection === "offline") return "Can't reach T3 Code, retrying";
  if (!syncedAt) return "Syncing…";
  const seconds = Math.round((Date.now() - Date.parse(syncedAt)) / 1000);
  return seconds < 5 ? "Synced just now" : `Synced ${seconds}s ago`;
}

function MinimizeButton(props: { onMinimize: () => void }) {
  return (
    <Button size="icon-xs" variant="ghost" aria-label="Minimize" onClick={props.onMinimize}>
      <MinusIcon />
    </Button>
  );
}

export function InboxScreen(props: {
  search: ThreadSearchInput;
  onSearchChange: (value: ThreadSearchInput) => void;
  onPreviewNotification: () => void;
  onMinimize: () => void;
  shelf: Shelf;
  onShelf: (shelf: Shelf) => void;
  onOpen: (threadId: string) => void;
  onNewThread: () => void;
  onError: (message: string) => void;
}) {
  const { state } = useIsland();
  const [result, setResult] = useState<{ key: string; value: ThreadSearchResult } | null>(null);
  const searching = props.search.query.trim().length > 0;
  const filtering = props.search.projectIds.length > 0;
  const loadingSettled = props.shelf === "settled" && !searching;
  const searchKey = JSON.stringify([state.environmentId, props.search, loadingSettled, state.connection.state]);
  const active = searching || filtering;
  const requestActive = active || loadingSettled;
  // Debounce the server's message search and discard replies for superseded queries.
  useEffect(() => {
    if (!requestActive) return;
    let current = true;
    const timer = setTimeout(
      () => {
        void api()
          .searchThreads({ ...props.search, includeSettled: loadingSettled })
          .then((value) => {
            if (current) setResult({ key: searchKey, value });
          })
          .catch((error: unknown) => {
            if (current)
              setResult({
                key: searchKey,
                value: {
                  threads: [],
                  error: error instanceof Error ? error.message : "Search failed",
                },
              });
          });
      },
      searching ? 200 : 0,
    );
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [searchKey, requestActive, state.connection.state]);
  const found = result?.key === searchKey ? result.value : null;
  const pending = requestActive && !found;
  const inScope = (thread: ThreadSummary) =>
    !filtering || props.search.projectIds.includes(thread.projectId);
  const live = [...state.inbox, ...state.working, ...state.snoozed, ...state.settled];
  const byId = new Map(live.map((thread) => [thread.threadId, thread]));
  const matched =
    found?.threads.map((thread) => ({ ...thread, ...byId.get(thread.threadId) })) ?? [];
  const source = filtering && found ? matched : live.filter(inScope);
  const needsYou = state.working.filter((thread) => thread.pendingRequestCount > 0);
  const lists: Record<Shelf, readonly ThreadSummary[]> = {
    inbox: filtering
      ? source.filter(
          (thread) =>
            !thread.settled &&
            !thread.snoozed &&
            (!isWorking(thread.status) || thread.pendingRequestCount > 0),
        )
      : [...needsYou, ...state.inbox],
    working: filtering
      ? source.filter((thread) => !thread.settled && !thread.snoozed && isWorking(thread.status))
      : state.working,
    snoozed: filtering ? source.filter((thread) => thread.snoozed) : state.snoozed,
    settled: filtering
      ? source.filter((thread) => thread.settled && !thread.snoozed)
      : state.settled,
  };
  const rows = searching ? matched : lists[props.shelf];
  const pageKey = `${searchKey}:${props.shelf}`;
  const [page, setPage] = useState({ key: "", count: 80 });
  const visibleCount = page.key === pageKey ? page.count : 80;
  const labels: Array<[Shelf, string]> = [
    ["inbox", "Inbox"],
    ["working", "Working"],
    ["snoozed", "Snoozed"],
    ["settled", "Settled"],
  ];
  const organize = async (threadId: string, action: OrganizeAction, snoozedUntil?: string) => {
    const result = await api().organize(threadId, action, snoozedUntil);
    if (!result.ok) props.onError(result.error);
  };

  return (
    <PopoverPanel surface="sidebar">
      <ThreadSearchHeader value={props.search} onChange={props.onSearchChange} />
      {/* T3's segmented ToggleGroup as the shelf switcher. */}
      <div className="flex shrink-0 items-center gap-0.5 px-2.5 pb-1.5">
        {!searching ? (
          <ToggleGroup
            aria-label="Shelf"
            variant="segmented"
            value={[props.shelf]}
            onValueChange={(value: unknown[]) => {
              const next = value[0];
              if (typeof next === "string") props.onShelf(next as Shelf);
            }}
          >
            {labels.map(([id, label]) => (
              <Toggle
                key={id}
                value={id}
                aria-label={`${label} ${lists[id].length}`}
                className="gap-1 px-1.5"
              >
                {label}
                {props.shelf === id ? (
                  <span className="font-normal text-muted-foreground/70 tabular-nums">
                    {lists[id].length}
                  </span>
                ) : null}
              </Toggle>
            ))}
          </ToggleGroup>
        ) : (
          <span role="status" className="px-2 text-xs text-muted-foreground">
            {pending
              ? "Searching…"
              : `${rows.length} ${rows.length === 1 ? "result" : "results"} across all threads`}
          </span>
        )}
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label="New thread"
          className="ms-auto"
          onClick={props.onNewThread}
        >
          <SquarePenIcon />
        </Button>
        <MinimizeButton onMinimize={props.onMinimize} />
      </div>
      {rows.length > 0 ? (
        <ul
          id="companion-thread-results"
          aria-label={searching ? "Search results" : "Threads"}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-1.5 pb-1"
        >
          {rows.slice(0, visibleCount).map((thread) => (
            <ThreadRow
              key={thread.threadId}
              thread={thread}
              snippet={
                "snippet" in thread && typeof thread.snippet === "string"
                  ? thread.snippet
                  : undefined
              }
              shelf={
                searching
                  ? thread.snoozed
                    ? "snoozed"
                    : thread.settled
                      ? "settled"
                      : isWorking(thread.status)
                        ? "working"
                        : "inbox"
                  : props.shelf
              }
              onOpen={() => props.onOpen(thread.threadId)}
              onOrganize={(action, until) => void organize(thread.threadId, action, until)}
            />
          ))}
          {rows.length > visibleCount ? (
            <li className="px-2 py-2">
              <Button
                size="sm"
                variant="ghost-muted"
                onClick={() => setPage({ key: pageKey, count: visibleCount + 80 })}
              >
                Show more threads
              </Button>
            </li>
          ) : null}
        </ul>
      ) : (
        <Empty size="compact" className="min-h-0 flex-1">
          <EmptyHeader>
            <EmptyMedia>
              <CompanionMascot mood="idle" hopKey={0} size={56} />
            </EmptyMedia>
            <EmptyTitle>
              {pending
                ? loadingSettled
                  ? "Loading settled threads…"
                  : "Searching…"
                : active
                  ? "No threads found"
                  : props.shelf === "inbox"
                    ? "Nothing needs you"
                    : `Nothing ${props.shelf}`}
            </EmptyTitle>
            <EmptyDescription>
              {active
                ? "Try another search or clear the project filter."
                : props.shelf === "inbox"
                  ? "Threads land here when they finish, until you settle them."
                  : props.shelf === "working"
                    ? "No agent is running right now."
                    : props.shelf === "snoozed"
                      ? "Snoozed threads wait here until they wake."
                      : "Settled threads show up here."}
            </EmptyDescription>
          </EmptyHeader>
          {active ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => props.onSearchChange({ query: "", projectIds: [] })}
            >
              Clear search and filters
            </Button>
          ) : props.shelf === "inbox" ? (
            <Button size="sm" variant="outline" onClick={props.onNewThread}>
              <SquarePenIcon />
              New thread
            </Button>
          ) : null}
        </Empty>
      )}
      {requestActive && found?.error ? (
        <p role="status" className="shrink-0 px-3 pb-2 text-xs text-warning-foreground">
          {found.error}
        </p>
      ) : null}
      <div className="flex h-8 shrink-0 items-center gap-1.5 border-t border-sidebar-border px-3 text-xs text-muted-foreground tabular-nums">
        {!active && props.shelf === "inbox" && state.inboxTotal > 0 ? (
          <>
            <span>
              {rows.length} of {state.inboxTotal.toLocaleString()}
            </span>
            <span className="text-muted-foreground/50">·</span>
          </>
        ) : null}
        <span className={cn(state.connection.state === "offline" && "text-warning-foreground")}>
          {syncedLabel(state.syncedAt, state.connection.state)}
        </span>
        <span className="ms-auto">
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label="Preview notification"
            title="Preview notification"
            onClick={props.onPreviewNotification}
          >
            <BellIcon />
          </Button>
        </span>
        <InlineButton
          tone="muted"
          className="font-normal"
          onClick={() => void api().openInT3Code(null)}
        >
          Open T3 Code
          <ArrowUpRightIcon className="size-3" />
        </InlineButton>
      </div>
    </PopoverPanel>
  );
}

// ── Thread ──────────────────────────────────────────────────────────────────────────────────────

export function ThreadScreen(props: {
  threadId: string;
  onBack: () => void;
  onMinimize: () => void;
  onError: (message: string) => void;
}) {
  const { state, projectById } = useIsland();
  const detail = useThreadDetail(props.threadId);
  const [override, setOverride] = useState<ModelSelection | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const summary = [...state.inbox, ...state.working, ...state.snoozed, ...state.settled].find(
    (thread) => thread.threadId === props.threadId,
  );

  // Follows new messages while the reader is at the live edge, as T3's timeline does.
  useLayoutEffect(() => {
    const node = viewport.current;
    if (node && stick.current) node.scrollTop = node.scrollHeight;
  }, [detail?.items, detail?.pendingRequestCount]);

  const selection: ModelSelection | null =
    override ??
    (detail?.providerInstanceId && detail.model
      ? { instanceId: detail.providerInstanceId, model: detail.model }
      : null);
  const running = detail ? isWorking(detail.status) : false;
  const pending = detail?.pendingRequestCount ?? 0;
  const openInT3 = () => void api().openInT3Code(props.threadId);

  return (
    <PopoverPanel surface="chat">
      <ThreadHeader
        project={projectById.get(summary?.projectId ?? "")?.title ?? ""}
        projectId={summary?.projectId}
        title={detail?.title ?? summary?.title ?? "Thread"}
        onBack={props.onBack}
        onOpenInT3={openInT3}
        trailing={<MinimizeButton onMinimize={props.onMinimize} />}
      />
      <div
        ref={viewport}
        onScroll={(event) => {
          const node = event.currentTarget;
          stick.current = node.scrollHeight - node.scrollTop - node.clientHeight < 48;
        }}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-3 pb-3"
      >
        <div className="flex min-h-full flex-col justify-end gap-4">
          {!detail || (detail.loading && detail.items.length === 0) ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Loading messages…</p>
          ) : detail.items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Send a message to start the conversation.
            </p>
          ) : (
            <Timeline detail={detail} />
          )}
          {running &&
          pending === 0 &&
          (detail?.items.at(-1)?.status ?? "completed") === "completed" ? (
            <p className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
              <span className="inline-block size-1.5 rounded-full bg-info" />
              Working…
            </p>
          ) : null}
          {detail?.requests.map((request) => (
            <RequestCard
              key={request.requestId}
              request={request}
              onRespond={async (response) => {
                stick.current = true;
                const result = await api().respond(request.threadId, request.requestId, response);
                if (!result.ok) props.onError(result.error);
                return result.ok;
              }}
            />
          ))}
          {detail && detail.hiddenRequestCount > 0 ? (
            <HiddenRequestRow count={detail.hiddenRequestCount} onOpenInT3={openInT3} />
          ) : null}
          {detail?.error ? (
            <p className="px-1 text-xs text-destructive-foreground">{detail.error}</p>
          ) : null}
        </div>
      </div>
      <Composer
        key={`${state.environmentId}:${props.threadId}`}
        draftKey={JSON.stringify([state.environmentId, "thread", props.threadId])}
        placeholder={running ? "Steer this run" : "Send a follow-up"}
        providers={state.providers}
        selection={selection}
        running={running}
        onStop={() => void api().interrupt(props.threadId)}
        // A model change applies from the next message, which works with every provider.
        onSelectionChange={setOverride}
        onSubmit={async (message, images) => {
          stick.current = true;
          const result = await api().send(props.threadId, message, override, images);
          if (!result.ok) props.onError(result.error);
          else setOverride(null);
          return result.ok;
        }}
      />
    </PopoverPanel>
  );
}

// ── New thread ──────────────────────────────────────────────────────────────────────────────────

const LAST_PROJECT_KEY = "t3-companion:last-project";
const LAST_MODEL_KEY = "t3-companion:last-model";

function readStored<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function store(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

const comboboxItem =
  "flex min-h-7 w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-left text-sm outline-none hover:bg-foreground/[0.09] focus-visible:bg-foreground/[0.09]";

export function NewThreadScreen(props: {
  compact?: boolean;
  above?: boolean;
  onPickerOpenChange?: (open: boolean) => void;
  onContentHeightChange?: (height: number) => void;
  onBack: () => void;
  onMinimize: () => void;
  onLaunched: (threadId: string) => void;
  onError: (message: string) => void;
}) {
  const { state } = useIsland();
  const quickPanel = useRef<HTMLDivElement>(null);
  // The native window must grow with pasted images and multiline drafts in the quick composer.
  useEffect(() => {
    if (!props.compact || !quickPanel.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry)
        props.onContentHeightChange?.(
          Math.ceil(entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height) + PANEL_TOP + 12,
        );
    });
    observer.observe(quickPanel.current);
    return () => observer.disconnect();
  }, [props.compact, props.onContentHeightChange]);
  const projects = state.projects.filter((project) => !project.archivedAt);
  const providers = state.providers.filter((provider) => provider.available !== false);
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState<string | null>(() => {
    const last = readStored<string>(LAST_PROJECT_KEY);
    return projects.some((project) => project.id === last) ? last : (projects[0]?.id ?? null);
  });
  const [chosen, setSelection] = useState<ModelSelection | null>(() =>
    readStored<ModelSelection>(LAST_MODEL_KEY),
  );
  const available = (selection: ModelSelection | null) =>
    selection &&
    providers.some(
      (provider) =>
        provider.providerInstanceId === selection.instanceId &&
        provider.models.some((model) => model.id === selection.model),
    );
  const latest = [...state.working, ...state.inbox]
    .filter((thread) =>
      available(
        thread.providerInstanceId && thread.model
          ? { instanceId: thread.providerInstanceId, model: thread.model }
          : null,
      ),
    )
    .toSorted((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0];
  const first = providers.find((provider) => provider.models.length > 0);
  const selection = available(chosen)
    ? chosen
    : latest?.providerInstanceId && latest.model
      ? { instanceId: latest.providerInstanceId, model: latest.model }
      : first?.models[0]
        ? { instanceId: first.providerInstanceId, model: first.models[0].id }
        : null;
  const needle = query.trim().toLowerCase();
  const matches = needle
    ? projects.filter(
        (project) =>
          project.title.toLowerCase().includes(needle) ||
          project.workspaceRoot.toLowerCase().includes(needle),
      )
    : projects;
  const project = projects.find((candidate) => candidate.id === projectId) ?? null;

  const contents = (
    <>
      {props.compact ? (
        <div className="flex items-center gap-2 px-3 pt-2.5 pb-2">
          <ProjectGlyph project={project ?? undefined} className="size-4" />
          <select
            aria-label="Project"
            value={projectId ?? ""}
            onChange={(event) => setProjectId(event.target.value)}
            className="min-w-0 flex-1 cursor-pointer bg-transparent text-xs text-foreground outline-none"
          >
            {projects.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.title}
              </option>
            ))}
          </select>
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label="Close new thread"
            onClick={props.onMinimize}
          >
            <XIcon />
          </Button>
        </div>
      ) : (
        <>
          <ThreadHeader
            project=""
            title="New thread"
            onBack={props.onBack}
            trailing={<MinimizeButton onMinimize={props.onMinimize} />}
          />
          {/* ComboboxSearchInput's underlined field. */}
          <div className="min-w-0 shrink-0 px-3 pt-2.5">
            <label className="relative block -translate-y-px border-b border-border/70 pb-1.5">
              <SearchIcon className="pointer-events-none absolute top-1.5 left-0 size-4 shrink-0 text-muted-foreground/55" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search projects..."
                className="h-6.5 w-full bg-transparent ps-5 text-sm leading-6.5 outline-none placeholder:text-placeholder"
              />
            </label>
          </div>
          <div className="px-2 pt-2.5 pb-1 text-xs font-medium text-muted-foreground">Project</div>
          <div
            role="listbox"
            aria-label="Project"
            className="flex min-h-0 flex-1 flex-col gap-px overflow-y-auto overscroll-contain px-2 pb-2"
          >
            {matches.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                role="option"
                aria-selected={candidate.id === projectId}
                onClick={() => setProjectId(candidate.id)}
                className={cn(comboboxItem, candidate.id === projectId && "bg-foreground/[0.06]")}
              >
                <ProjectGlyph project={candidate} className="size-4" />
                <span className="max-w-[45%] shrink-0 truncate">{candidate.title}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground/70">
                  {candidate.workspaceRoot}
                </span>
                {candidate.id === projectId ? <CheckIcon className="size-3.5 shrink-0" /> : null}
              </button>
            ))}
            {matches.length === 0 ? (
              <p className="px-2 py-4 text-sm text-muted-foreground">
                {projects.length === 0 ? "Add a project in T3 Code first." : "No matching projects"}
              </p>
            ) : null}
          </div>
        </>
      )}
      <Composer
        pickerPlacement={props.compact && !props.above ? "below" : "above"}
        onPickerOpenChange={props.onPickerOpenChange}
        key={`${state.environmentId}:new-thread`}
        draftKey={JSON.stringify([state.environmentId, "new-thread"])}
        placeholder={project ? `Start a thread in ${project.title}` : "Pick a project first"}
        providers={providers}
        selection={selection}
        disabled={!project || !selection}
        onSelectionChange={(next) => {
          setSelection(next);
          store(LAST_MODEL_KEY, next);
        }}
        onSubmit={async (message, images) => {
          if (!project) return false;
          if (!selection) {
            props.onError("Choose a model first.");
            return false;
          }
          store(LAST_PROJECT_KEY, project.id);
          const result = await api().launch({
            projectId: project.id,
            message,
            modelSelection: selection,
            images,
          });
          if (!result.ok) {
            props.onError(result.error);
            return false;
          }
          props.onLaunched(result.value.threadId);
          return true;
        }}
      />
    </>
  );
  return props.compact ? (
    <div
      ref={quickPanel}
      className="quick-thread panel-in absolute inset-x-2.5 rounded-2xl border border-border bg-background text-foreground shadow-[0_10px_28px_-12px_rgb(0_0_0/65%)]"
      style={props.above
        ? { bottom: "var(--companion-panel-bottom, 12px)" }
        : { top: `var(--companion-panel-top, ${PANEL_TOP}px)` }}
    >
      {contents}
    </div>
  ) : (
    <PopoverPanel surface="chat">{contents}</PopoverPanel>
  );
}

// ── Connect ─────────────────────────────────────────────────────────────────────────────────────

export function ConnectScreen(props: { connection: Connection; onMinimize: () => void }) {
  const { connection } = props;
  const knownAddress =
    connection.state === "unconfigured"
      ? connection.suggestedUrl
      : "serverUrl" in connection
        ? connection.serverUrl
        : null;
  const [pairing, setPairing] = useState("");
  const [address, setAddress] = useState(knownAddress ?? "http://127.0.0.1:3773");
  const [error, setError] = useState<string | null>(null);
  const busy = connection.state === "pairing";
  const connect = async () => {
    setError(null);
    const result = await api().connect(pairing, address.trim() || null);
    if (!result.ok) setError(result.error);
  };
  const strong = (text: string) => <b className="font-medium text-foreground">{text}</b>;
  const bareCode = /^[A-Za-z0-9]{12}$/.test(pairing.trim());

  return (
    <PopoverPanel surface="sidebar">
      <div className="selectable flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-2 pb-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Pair with T3 Code</h2>
            <MinimizeButton onMinimize={props.onMinimize} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {connection.state === "needs-auth"
              ? connection.reason
              : "The companion connects like T3 Code's phone app: live updates, and approvals answered right here."}
          </p>
        </div>
        <ol className="flex list-decimal flex-col gap-1.5 ps-4 text-sm text-muted-foreground">
          <li>In T3 Code, open {strong("Settings → Sharing & access")}.</li>
          <li>
            Under {strong("Authorized clients")}, choose {strong("Create link")} and keep the
            default permissions.
          </li>
          <li>Copy the link and paste it here. It works once, for 5 minutes.</li>
        </ol>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Pairing link</span>
          <Input
            autoFocus
            value={pairing}
            spellCheck={false}
            placeholder="http://…/pair#token=…"
            onChange={(event) => setPairing(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void connect();
            }}
            className="font-mono"
          />
        </label>
        {bareCode ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">T3 Code address</span>
            <Input
              value={address}
              spellCheck={false}
              onChange={(event) => setAddress(event.target.value)}
              className="font-mono"
            />
            <span className="text-xs text-muted-foreground">
              {knownAddress
                ? "Found T3 Code running on this Mac."
                : "Where T3 Code runs, such as a Tailscale address."}
            </span>
          </label>
        ) : null}
        <p className="text-xs text-muted-foreground">
          The pairing lasts 30 days. Revoke it any time under Authorized clients. On the host you
          can also run <code className="font-mono">t3 pair</code>.
        </p>
        {error ? <p className="text-sm text-destructive-foreground">{error}</p> : null}
        <Button
          className="mt-auto"
          disabled={busy || pairing.trim().length === 0}
          onClick={() => void connect()}
        >
          {busy ? "Pairing…" : "Pair"}
        </Button>
      </div>
    </PopoverPanel>
  );
}
