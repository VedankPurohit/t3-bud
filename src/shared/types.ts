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
  /** Approvals and questions waiting on the user; only known for working threads. */
  readonly pendingRequestCount: number;
  /** Finished while the companion watched, and not opened since. */
  readonly fresh: boolean;
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
  | { readonly state: "authorizing"; readonly serverUrl: string }
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

export interface ThreadDetail {
  readonly threadId: string;
  readonly title: string;
  readonly status: ThreadStatus;
  readonly pendingRequestCount: number;
  readonly providerInstanceId: string | null;
  readonly model: string | null;
  readonly items: readonly ThreadItem[];
  readonly loading: boolean;
  readonly error: string | null;
}

export type ActionResult<T = void> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };

export type OrganizeAction = "settle" | "unsettle" | "snooze" | "unsnooze" | "mark_unread";

/** What the renderer may ask of the main process. */
export interface CompanionApi {
  getState(): Promise<CompanionState>;
  onState(listener: (state: CompanionState) => void): () => void;
  connect(serverUrl: string): Promise<ActionResult>;
  signOut(): Promise<void>;
  setExpanded(expanded: boolean): Promise<void>;
  move(position: { x: number; y: number; settled: boolean }): Promise<void>;
  openThread(threadId: string | null): Promise<void>;
  onThreadDetail(listener: (detail: ThreadDetail) => void): () => void;
  send(threadId: string, message: string): Promise<ActionResult>;
  launch(input: {
    projectId: string;
    message: string;
    modelSelection: ModelSelection | null;
  }): Promise<ActionResult<{ threadId: string }>>;
  organize(threadId: string, action: OrganizeAction, snoozedUntil?: string): Promise<ActionResult>;
  configure(threadId: string, modelSelection: ModelSelection): Promise<ActionResult>;
  interrupt(threadId: string): Promise<ActionResult>;
  openInT3Code(threadId: string | null): Promise<void>;
  quit(): Promise<void>;
}
