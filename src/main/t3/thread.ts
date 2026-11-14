import type { ImageAttachment } from "../../shared/types";

/** One conversation, kept live from `orchestration.subscribeThread`. Mirrors T3 Code's projection. */

export interface RawMessage {
  readonly id: string;
  readonly role: "user" | "assistant" | "system";
  readonly text: string;
  readonly streaming?: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly attachments?: readonly ImageAttachment[];
}

export interface RawTurnItem {
  readonly id: string;
  readonly type: string;
  readonly requestId?: string;
  readonly requestKind?: string;
  readonly prompt?: string | null;
  readonly reason?: string | null;
  readonly title?: string | null;
  readonly options?: ReadonlyArray<{
    readonly decision: string;
    readonly label: string;
    readonly warning?: string;
  }>;
  readonly questions?: ReadonlyArray<{
    readonly id: string;
    readonly header?: string;
    readonly question: string;
    readonly options?: ReadonlyArray<{
      readonly label: string;
      readonly description?: string;
      readonly value?: string;
    }>;
    readonly multiSelect?: boolean;
    readonly allowCustomAnswer?: boolean;
  }>;
}

export interface RawRuntimeRequest {
  readonly id: string;
  readonly status: string;
  readonly kind?: string;
}

export interface ThreadProjection {
  readonly thread: Record<string, unknown> & { readonly id: string };
  readonly messages: readonly RawMessage[];
  readonly turnItems: readonly RawTurnItem[];
  readonly runtimeRequests: readonly RawRuntimeRequest[];
  readonly runs?: ReadonlyArray<{
    readonly id: string;
    readonly status: string;
    readonly queuePosition?: number;
  }>;
}

export interface ThreadStreamState {
  readonly sequence: number;
  readonly projection: ThreadProjection | null;
  readonly synchronized: boolean;
}

export const emptyThreadStream: ThreadStreamState = {
  sequence: -1,
  projection: null,
  synchronized: false,
};

function upsert<T extends { id: string }>(list: readonly T[] | undefined, value: T): T[] {
  const items = [...(list ?? [])];
  const index = items.findIndex((item) => item.id === value.id);
  if (index === -1) items.push(value);
  else items[index] = value;
  return items;
}

type StreamItem =
  | { kind: "snapshot"; snapshotSequence: number; projection: ThreadProjection }
  | { kind: "synchronized" }
  | {
      kind: "event";
      sequence: number;
      event: { threadId: string; type: string; payload: unknown };
    };

export function applyThreadItem(
  state: ThreadStreamState,
  threadId: string,
  value: unknown,
): ThreadStreamState {
  const item = value as StreamItem;
  if (item.kind === "snapshot")
    return { ...state, sequence: item.snapshotSequence, projection: item.projection };
  if (item.kind === "synchronized") return { ...state, synchronized: true };
  if (item.kind !== "event" || item.sequence <= state.sequence) return state;
  const projection = state.projection;
  const next = { ...state, sequence: item.sequence };
  if (!projection || item.event.threadId !== threadId) return next;
  const { type, payload } = item.event;
  if (type.startsWith("thread.") && type !== "thread.pull-request-link-updated") {
    return {
      ...next,
      projection: { ...projection, thread: payload as ThreadProjection["thread"] },
    };
  }
  switch (type) {
    // Each message update carries the full text so far, so it replaces by id.
    case "message.updated":
      return {
        ...next,
        projection: { ...projection, messages: upsert(projection.messages, payload as RawMessage) },
      };
    case "turn-item.updated":
      return {
        ...next,
        projection: {
          ...projection,
          turnItems: upsert(projection.turnItems, payload as RawTurnItem),
        },
      };
    case "runtime-request.updated":
      return {
        ...next,
        projection: {
          ...projection,
          runtimeRequests: upsert(projection.runtimeRequests, payload as RawRuntimeRequest),
        },
      };
    case "run.created":
    case "run.updated":
      return {
        ...next,
        projection: {
          ...projection,
          runs: upsert(projection.runs ?? [], payload as { id: string; status: string }),
        },
      };
    default:
      return next;
  }
}

/** Approval and question turn items whose runtime request is still pending. */
export function pendingRequests(projection: ThreadProjection) {
  const pending = new Set(
    projection.runtimeRequests
      .filter((request) => request.status === "pending")
      .map((request) => request.id),
  );
  return projection.turnItems.filter(
    (item) =>
      (item.type === "approval_request" || item.type === "user_input_request") &&
      item.requestId !== undefined &&
      pending.has(item.requestId),
  );
}
