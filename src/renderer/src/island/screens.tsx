import { isWorking, type Connection, type ModelSelection, type OrganizeAction, type ThreadSummary } from "@shared/types";
import { ArrowUpRightIcon, CheckIcon, MinusIcon, SearchIcon, SquarePenIcon } from "lucide-react";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { CompanionMascot } from "../components/Mascot";
import { useThreadDetail } from "../lib/state";
import { cn } from "../t3/lib/utils";
import { Button, InlineButton } from "../t3/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../t3/ui/empty";
import { Input } from "../t3/ui/input";
import { Toggle, ToggleGroup } from "../t3/ui/toggle-group";
import { HiddenRequestRow, RequestCard, ThreadHeader, Timeline } from "./chat";
import { Composer } from "./composer";
import { useIsland } from "./context";
import { ProjectGlyph, ThreadRow, type Shelf } from "./rows";

const api = () => window.companion;

/** The popover body. It starts halfway down the capsule, so the island stays its top edge. */
export function PopoverPanel(props: { surface: "sidebar" | "chat"; children: ReactNode }) {
  return (
    <div
      {...(props.surface === "sidebar" ? { "data-app-sidebar": true } : {})}
      className={cn(
        "panel-in absolute inset-x-2.5 top-[17px] bottom-3 flex flex-col overflow-hidden rounded-2xl border shadow-[0_16px_40px_-18px_rgb(0_0_0/55%)] dark:shadow-[0_18px_44px_-18px_rgb(0_0_0/80%)]",
        props.surface === "sidebar"
          ? "border-sidebar-border bg-sidebar text-sidebar-foreground"
          : "border-border bg-background text-foreground",
      )}
    >
      <div aria-hidden className="h-[23px] shrink-0" />
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
  onMinimize: () => void;
  shelf: Shelf;
  onShelf: (shelf: Shelf) => void;
  onOpen: (threadId: string) => void;
  onNewThread: () => void;
  onError: (message: string) => void;
}) {
  const { state } = useIsland();
  const needsYou = state.working.filter((thread) => thread.pendingRequestCount > 0);
  const lists: Record<Shelf, readonly ThreadSummary[]> = {
    inbox: [...needsYou, ...state.inbox],
    working: state.working,
    snoozed: state.snoozed,
    settled: state.settled,
  };
  const rows = lists[props.shelf];
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
      {/* T3's segmented ToggleGroup as the shelf switcher. */}
      <div className="flex shrink-0 items-center gap-0.5 px-2.5 pb-1.5">
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
            <Toggle key={id} value={id} className="gap-1 px-1.5">
              {label}
              <span className="font-normal text-muted-foreground/70 tabular-nums">{lists[id].length}</span>
            </Toggle>
          ))}
        </ToggleGroup>
        <Button size="icon-xs" variant="ghost" aria-label="New thread" className="ms-auto" onClick={props.onNewThread}>
          <SquarePenIcon />
        </Button>
        <MinimizeButton onMinimize={props.onMinimize} />
      </div>
      {rows.length > 0 ? (
        <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-1.5 pb-1">
          {rows.map((thread) => (
            <ThreadRow
              key={thread.threadId}
              thread={thread}
              shelf={props.shelf === "inbox" && thread.pendingRequestCount > 0 ? "inbox" : props.shelf}
              onOpen={() => props.onOpen(thread.threadId)}
              onOrganize={(action, until) => void organize(thread.threadId, action, until)}
            />
          ))}
        </ul>
      ) : (
        <Empty size="compact" className="min-h-0 flex-1">
          <EmptyHeader>
            <EmptyMedia>
              <CompanionMascot mood="idle" hopKey={0} size={56} />
            </EmptyMedia>
            <EmptyTitle>
              {props.shelf === "inbox" ? "Nothing needs you" : `Nothing ${props.shelf}`}
            </EmptyTitle>
            <EmptyDescription>
              {props.shelf === "inbox"
                ? "Threads land here when they finish, until you settle them."
                : props.shelf === "working"
                  ? "No agent is running right now."
                  : props.shelf === "snoozed"
                    ? "Snoozed threads wait here until they wake."
                    : "Settled threads show up here."}
            </EmptyDescription>
          </EmptyHeader>
          {props.shelf === "inbox" ? (
            <Button size="sm" variant="outline" onClick={props.onNewThread}>
              <SquarePenIcon />
              New thread
            </Button>
          ) : null}
        </Empty>
      )}
      <div className="flex h-8 shrink-0 items-center gap-1.5 border-t border-sidebar-border px-3 text-xs text-muted-foreground tabular-nums">
        {props.shelf === "inbox" && state.inboxTotal > 0 ? (
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
        <InlineButton tone="muted" className="ms-auto font-normal" onClick={() => void api().openInT3Code(null)}>
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
    (detail?.providerInstanceId && detail.model ? { instanceId: detail.providerInstanceId, model: detail.model } : null);
  const running = detail ? isWorking(detail.status) : false;
  const pending = detail?.pendingRequestCount ?? 0;
  const openInT3 = () => void api().openInT3Code(props.threadId);

  return (
    <PopoverPanel surface="chat">
      <ThreadHeader
        project={projectById.get(summary?.projectId ?? "")?.title ?? ""}
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
            <p className="py-10 text-center text-sm text-muted-foreground">Send a message to start the conversation.</p>
          ) : (
            <Timeline detail={detail} />
          )}
          {running && pending === 0 && (detail?.items.at(-1)?.status ?? "completed") === "completed" ? (
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
          {detail?.error ? <p className="px-1 text-xs text-destructive-foreground">{detail.error}</p> : null}
        </div>
      </div>
      <Composer
        draftKey={props.threadId}
        placeholder={running ? "Steer this run" : "Send a follow-up"}
        providers={state.providers}
        selection={selection}
        running={running}
        onStop={() => void api().interrupt(props.threadId)}
        // A model change applies from the next message, which works with every provider.
        onSelectionChange={setOverride}
        onSubmit={async (message) => {
          stick.current = true;
          const result = await api().send(props.threadId, message, override);
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
  onBack: () => void;
  onMinimize: () => void;
  onLaunched: (threadId: string) => void;
  onError: (message: string) => void;
}) {
  const { state } = useIsland();
  const { projects, providers } = state;
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState<string | null>(() => {
    const last = readStored<string>(LAST_PROJECT_KEY);
    return projects.some((project) => project.id === last) ? last : (projects[0]?.id ?? null);
  });
  // The last model picked here, else the one the most recent thread used.
  const [selection, setSelection] = useState<ModelSelection | null>(() => {
    const stored = readStored<ModelSelection>(LAST_MODEL_KEY);
    if (stored && providers.some((provider) => provider.providerInstanceId === stored.instanceId)) return stored;
    const latest = [...state.working, ...state.inbox]
      .filter((thread) => thread.providerInstanceId && thread.model)
      .toSorted((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0];
    return latest?.providerInstanceId && latest.model ? { instanceId: latest.providerInstanceId, model: latest.model } : null;
  });
  const needle = query.trim().toLowerCase();
  const matches = needle
    ? projects.filter(
        (project) => project.title.toLowerCase().includes(needle) || project.workspaceRoot.toLowerCase().includes(needle),
      )
    : projects;
  const project = projects.find((candidate) => candidate.id === projectId) ?? null;

  return (
    <PopoverPanel surface="chat">
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
      <div role="listbox" aria-label="Project" className="flex min-h-0 flex-1 flex-col gap-px overflow-y-auto overscroll-contain px-2 pb-2">
        {matches.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            role="option"
            aria-selected={candidate.id === projectId}
            onClick={() => setProjectId(candidate.id)}
            className={cn(comboboxItem, candidate.id === projectId && "bg-foreground/[0.06]")}
          >
            <ProjectGlyph className="size-4" />
            <span className="max-w-[45%] shrink-0 truncate">{candidate.title}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground/70">{candidate.workspaceRoot}</span>
            {candidate.id === projectId ? <CheckIcon className="size-3.5 shrink-0" /> : null}
          </button>
        ))}
        {matches.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">
            {projects.length === 0 ? "Add a project in T3 Code first." : "No matching projects"}
          </p>
        ) : null}
      </div>
      <Composer
        draftKey="new-thread"
        placeholder={project ? `Start a thread in ${project.title}` : "Pick a project first"}
        providers={providers}
        selection={selection}
        disabled={!project}
        onSelectionChange={(next) => {
          setSelection(next);
          store(LAST_MODEL_KEY, next);
        }}
        onSubmit={async (message) => {
          if (!project) return false;
          if (!selection) {
            props.onError("Choose a model first.");
            return false;
          }
          store(LAST_PROJECT_KEY, project.id);
          const result = await api().launch({ projectId: project.id, message, modelSelection: selection });
          if (!result.ok) {
            props.onError(result.error);
            return false;
          }
          props.onLaunched(result.value.threadId);
          return true;
        }}
      />
    </PopoverPanel>
  );
}

// ── Connect ─────────────────────────────────────────────────────────────────────────────────────

export function ConnectScreen(props: { connection: Connection; onMinimize: () => void }) {
  const { connection } = props;
  const knownAddress =
    connection.state === "unconfigured" ? connection.suggestedUrl : "serverUrl" in connection ? connection.serverUrl : null;
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
          <li>
            In T3 Code, open {strong("Settings → Sharing & access")}.
          </li>
          <li>
            Under {strong("Authorized clients")}, choose {strong("Create link")} and keep the default permissions.
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
            <Input value={address} spellCheck={false} onChange={(event) => setAddress(event.target.value)} className="font-mono" />
            <span className="text-xs text-muted-foreground">
              {knownAddress ? "Found T3 Code running on this Mac." : "Where T3 Code runs, such as a Tailscale address."}
            </span>
          </label>
        ) : null}
        <p className="text-xs text-muted-foreground">
          The pairing lasts 30 days. Revoke it any time under Authorized clients. On the host you can also run{" "}
          <code className="font-mono">t3 pair</code>.
        </p>
        {error ? <p className="text-sm text-destructive-foreground">{error}</p> : null}
        <Button className="mt-auto" disabled={busy || pairing.trim().length === 0} onClick={() => void connect()}>
          {busy ? "Pairing…" : "Pair"}
        </Button>
      </div>
    </PopoverPanel>
  );
}
