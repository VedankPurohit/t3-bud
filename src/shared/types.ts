/** Run states reported by T3 Code's `t3_thread_list`. */
export type ThreadStatus =
  | "idle"
  | "preparing"
  | "queued"
  | "starting"
  | "running"
  | "waiting"
  | "completed"
  | "interrupted"
  | "failed"
  | "cancelled"
  | "rolled_back";

export const WORKING_STATUSES: readonly ThreadStatus[] = [
  "preparing",
  "queued",
  "starting",
  "running",
  "waiting",
];

export const isWorking = (status: ThreadStatus) => WORKING_STATUSES.includes(status);

export interface ThreadSummary {
  readonly threadId: string;
  readonly projectId: string;
  readonly title: string;
  readonly status: ThreadStatus;
  readonly settled: boolean;
  readonly snoozed: boolean;
  readonly snoozedUntil: string | null;
  readonly providerInstanceId: string | null;
  readonly model: string | null;
  readonly runtimeMode: string | null;
  readonly createdBy: string;
  readonly updatedAt: string;
  /** Approvals and questions waiting on the user, including ones from its subagents. */
  readonly pendingRequestCount: number;
  /** T3 Code's unread: the latest run finished after the user last looked at the thread. */
  readonly unread: boolean;
}

export interface ProjectSummary {
  readonly id: string;
  readonly title: string;
  readonly workspaceRoot: string;
}

export interface ModelOption {
  readonly id: string;
  readonly values: readonly string[];
  readonly default?: string;
}

export interface ProviderModel {
  readonly id: string;
  readonly label?: string;
  readonly options: readonly ModelOption[];
}

export interface Provider {
  readonly providerInstanceId: string;
  readonly driverKind: string;
  readonly displayName: string;
  readonly models: readonly ProviderModel[];
}

export interface ModelSelection {
  readonly instanceId: string;
  readonly model: string;
  readonly options?: ReadonlyArray<{ readonly id: string; readonly value: string }>;
}

export type Connection =
  | { readonly state: "unconfigured"; readonly suggestedUrl: string | null }
  | { readonly state: "pairing"; readonly serverUrl: string }
  | { readonly state: "connected"; readonly serverUrl: string }
  | { readonly state: "needs-auth"; readonly serverUrl: string; readonly reason: string }
  | { readonly state: "offline"; readonly serverUrl: string; readonly error: string };

export interface CompanionState {
  readonly connection: Connection;
  readonly environmentId: string | null;
  readonly inbox: readonly ThreadSummary[];
  readonly working: readonly ThreadSummary[];
  readonly snoozed: readonly ThreadSummary[];
  readonly settled: readonly ThreadSummary[];
  readonly inboxTotal: number;
  readonly projects: readonly ProjectSummary[];
  readonly providers: readonly Provider[];
  /** When the live connection last delivered an update. */
  readonly syncedAt: string | null;
}

export interface ThreadItem {
  readonly itemId: string;
  readonly position: number;
  readonly type: string;
  readonly text: string;
  readonly status: string;
  readonly createdBy: string;
  readonly updatedAt: string;
}

export interface PendingQuestion {
  readonly id: string;
  readonly header: string | null;
  readonly question: string;
  readonly options: ReadonlyArray<{ readonly label: string; readonly value: string; readonly description: string | null }>;
  readonly multiSelect: boolean;
  readonly allowCustomAnswer: boolean;
}

/** An approval or question the agent is blocked on; answered with `respond`. */
export interface PendingRequest {
  /** The thread that asked, which can be a subagent of the open thread. */
  readonly threadId: string;
  readonly requestId: string;
  readonly kind: "approval" | "question";
  /** For approvals: what it wants to do, e.g. a command. */
  readonly title: string | null;
  readonly detail: string | null;
  readonly decisions: ReadonlyArray<{ readonly decision: string; readonly label: string; readonly warning: string | null }>;
  readonly questions: readonly PendingQuestion[];
}

export interface ThreadDetail {
  readonly threadId: string;
  readonly title: string;
  readonly status: ThreadStatus;
  readonly pendingRequestCount: number;
  readonly providerInstanceId: string | null;
  readonly model: string | null;
  readonly items: readonly ThreadItem[];
  readonly requests: readonly PendingRequest[];
  /** A request from a subagent the companion cannot show; it opens in T3 Code. */
  readonly hiddenRequestCount: number;
  readonly loading: boolean;
  readonly error: string | null;
}

export type RequestResponse =
  | { readonly decision: string }
  | { readonly answers: Readonly<Record<string, string | readonly string[]>> };

export type ActionResult<T = void> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };

export type OrganizeAction = "settle" | "unsettle" | "snooze" | "unsnooze" | "mark_unread";

/** What the renderer may ask of the main process. */
export interface CompanionApi {
  getState(): Promise<CompanionState>;
  onState(listener: (state: CompanionState) => void): () => void;
  /** Pairs with a link from T3 Code, or a bare code plus the address it belongs to. */
  connect(pairing: string, address: string | null): Promise<ActionResult>;
  signOut(): Promise<void>;
  /** Sizes the window to what the island shows; `focus` when it takes keyboard input. */
  resize(size: { width: number; height: number; focus: boolean }): Promise<void>;
  /** Moves the window while the capsule is dragged; `settled` ends the drag and saves the spot. */
  move(position: { x: number; y: number; settled: boolean }): Promise<void>;
  /** The window was asked to close (Cmd+W); the island folds instead. */
  onFoldRequest(listener: () => void): () => void;
  openThread(threadId: string | null): Promise<void>;
  onThreadDetail(listener: (detail: ThreadDetail) => void): () => void;
  /** Sends a message; a model selection switches the model starting with this turn. */
  send(threadId: string, message: string, modelSelection: ModelSelection | null): Promise<ActionResult>;
  respond(threadId: string, requestId: string, response: RequestResponse): Promise<ActionResult>;
  launch(input: {
    projectId: string;
    message: string;
    modelSelection: ModelSelection | null;
  }): Promise<ActionResult<{ threadId: string }>>;
  organize(threadId: string, action: OrganizeAction, snoozedUntil?: string): Promise<ActionResult>;
  interrupt(threadId: string): Promise<ActionResult>;
  openInT3Code(threadId: string | null): Promise<void>;
  quit(): Promise<void>;
}
