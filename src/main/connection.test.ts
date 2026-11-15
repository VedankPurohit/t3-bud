import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { config } from "./config";
import { CompanionStore } from "./store";
import { describeEnvironment, sessionIsValid, socketUrl, SessionEndedError } from "./t3/auth";
import { RpcSocket } from "./t3/rpc";

vi.mock("./config", () => ({ config: { pairing: vi.fn(), serverUrl: vi.fn(() => null), clearPairing: vi.fn(), savePairing: vi.fn() } }));
vi.mock("./t3/auth", async (original) => ({ ...await original<typeof import("./t3/auth")>(),
  describeEnvironment: vi.fn(), socketUrl: vi.fn(), sessionIsValid: vi.fn() }));

const pairing = { httpBaseUrl: "http://localhost:3773", token: "secret", environmentId: "env", environmentLabel: "Local", expiresAt: "2099-01-01" };
const stores: CompanionStore[] = [];
const sockets: ReturnType<typeof fakeSocket>[] = [];
function fakeSocket() {
  const streams = new Map<string, { value: (value: unknown) => void; end: () => void }>();
  return {
    closed: false,
    call: vi.fn(async (): Promise<{ providers: never[]; shellThreadFamilies?: boolean; shellOlderSettled?: boolean; snapshotSequence?: number; threads?: unknown[] }> => ({ providers: [], shellThreadFamilies: true, shellOlderSettled: true })),
    close: vi.fn(),
    streams,
    stream: vi.fn((tag: string, _payload: unknown, onValue: (value: unknown) => void, end: () => void) => {
      streams.set(tag, { value: onValue, end });
      return () => streams.delete(tag);
    }),
  };
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(config.pairing).mockResolvedValue(pairing);
  vi.mocked(describeEnvironment).mockResolvedValue({ environmentId: "env", label: "Local", orchestrationProtocolVersion: 2 });
  vi.mocked(socketUrl).mockResolvedValue("ws://localhost/ws");
  vi.mocked(sessionIsValid).mockResolvedValue(true);
  vi.spyOn(RpcSocket, "open").mockImplementation(async () => {
    const socket = fakeSocket(); sockets.push(socket); return socket as unknown as RpcSocket;
  });
});
afterEach(() => {
  stores.splice(0).forEach((store) => store.dispose());
  sockets.splice(0);
  vi.restoreAllMocks(); vi.clearAllMocks(); vi.useRealTimers();
});
function start() {
  const store = new CompanionStore(() => {}, () => {});
  stores.push(store); store.start(null); return store;
}

describe("startup pairing", () => {
  it("reads saved credentials once and skips discovery when paired", async () => {
    const store = new CompanionStore(() => {}, () => {});
    stores.push(store);
    const discover = vi.fn(async () => "http://localhost:3773");
    await store.start(discover);
    expect(config.pairing).toHaveBeenCalledTimes(1);
    expect(discover).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(0);
    expect(store.state().connection.state).toBe("connected");
  });

  it("ignores an older pairing read once a newer startup read begins", async () => {
    let finishFirst!: (value: typeof pairing) => void;
    let finishSecond!: (value: typeof pairing) => void;
    vi.mocked(config.pairing)
      .mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve; }))
      .mockImplementationOnce(() => new Promise(resolve => { finishSecond = resolve; }));
    const store = new CompanionStore(() => {}, () => {});
    stores.push(store);
    const first = store.start(null);
    const second = store.start(null);
    finishFirst(pairing);
    await first;
    await vi.advanceTimersByTimeAsync(0);
    expect(socketUrl).not.toHaveBeenCalled();
    const newer = { ...pairing, environmentId: "new-env", token: "new-session" };
    finishSecond(newer);
    await second;
    await vi.advanceTimersByTimeAsync(0);
    expect(socketUrl).toHaveBeenCalledExactlyOnceWith(newer.httpBaseUrl, newer.token);
    expect(store.state().environmentId).toBe("new-env");
  });

  it("ignores older discovery after another startup read begins", async () => {
    let finishRead!: (value: null) => void;
    let finishDiscovery!: (value: string) => void;
    vi.mocked(config.pairing).mockResolvedValueOnce(null)
      .mockImplementationOnce(() => new Promise(resolve => { finishRead = resolve; }));
    const store = new CompanionStore(() => {}, () => {});
    stores.push(store);
    const first = store.start(() => new Promise(resolve => { finishDiscovery = resolve; }));
    await vi.advanceTimersByTimeAsync(0);
    const second = store.start("http://new-server:3773");
    finishDiscovery("http://old-server:3773");
    await first;
    expect(store.state().connection).toEqual({ state: "unconfigured", suggestedUrl: null });
    finishRead(null);
    await second;
    expect(store.state().connection).toEqual({ state: "unconfigured", suggestedUrl: "http://new-server:3773" });
  });

  it("discovers a server after one unsuccessful credential read", async () => {
    vi.mocked(config.pairing).mockResolvedValue(null);
    const store = new CompanionStore(() => {}, () => {});
    stores.push(store);
    const discover = vi.fn(async () => "http://localhost:3773");
    await store.start(discover);
    expect(config.pairing).toHaveBeenCalledTimes(1);
    expect(discover).toHaveBeenCalledTimes(1);
    expect(store.state().connection).toEqual({ state: "unconfigured", suggestedUrl: "http://localhost:3773" });
  });

  it("does not overwrite a newer state when discovery finishes late", async () => {
    vi.mocked(config.pairing).mockResolvedValue(null);
    const store = new CompanionStore(() => {}, () => {});
    stores.push(store);
    let finish!: (url: string) => void;
    const discover = vi.fn(() => new Promise<string>(resolve => { finish = resolve; }));
    const starting = store.start(discover);
    await vi.advanceTimersByTimeAsync(0);
    expect(discover).toHaveBeenCalledTimes(1);
    store.signOut(null);
    finish("http://localhost:3773");
    await starting;
    expect(store.state().connection).toEqual({ state: "unconfigured", suggestedUrl: null });
  });
});

describe("connection recovery", () => {
  it("surfaces subscription failures, closes the old socket, and reconnects", async () => {
    const store = start();
    await vi.advanceTimersByTimeAsync(0);
    expect(store.state().connection.state).toBe("connected");
    sockets[0]!.streams.get("orchestration.subscribeShell")!.end();
    expect(store.state().connection).toMatchObject({ state: "offline", error: expect.stringContaining("stopped updating") });
    expect(sockets[0]!.close).toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(300);
    expect(store.state().connection.state).toBe("connected");
    expect(describeEnvironment).toHaveBeenCalledTimes(2);
  });

  it("opts into smaller snapshots when the server supports omitting idle subagents", async () => {
    const store = start();
    await vi.advanceTimersByTimeAsync(0);
    expect(store.state().connection.state).toBe("connected");
    expect(sockets[0]!.stream).toHaveBeenCalledWith(
      "orchestration.subscribeShell",
      { requestCompletionMarker: true, omitIdleSubagents: true, omitOlderSettled: true },
      expect.any(Function),
      expect.any(Function),
    );
  });

  it("keeps only inbox, working, and snoozed threads from snapshots and live updates", async () => {
    const store = start();
    await vi.advanceTimersByTimeAsync(0);
    const shell = sockets[0]!.streams.get("orchestration.subscribeShell")!;
    const row = { projectId: "p", createdAt: "2026-11-15T00:00:00Z", updatedAt: "2026-11-15T00:00:00Z" };
    shell.value({ kind: "snapshot", snapshot: {
      snapshotSequence: 100,
      projects: [{ id: "p", title: "Project", workspaceRoot: "/project" }],
      threads: [
        { ...row, id: "parent", title: "Working thread", status: "running" },
        { ...row, id: "child", title: "Approval", status: "waiting",
          lineage: { parentThreadId: "parent", relationshipToParent: "subagent" },
          pendingRuntimeRequest: { id: "request", kind: "command" } },
        { ...row, id: "inbox", title: "Inbox thread", status: "completed" },
        { ...row, id: "settled", title: "Settled thread", status: "completed", settledOverride: "settled" },
        { ...row, id: "snoozed", title: "Snoozed thread", status: "completed", settledOverride: "settled", snoozedUntil: "2099-01-01T00:00:00Z" },
      ],
    } });
    shell.value({ kind: "synchronized" });
    expect(store.state()).toMatchObject({
      synchronized: true,
      syncedAt: expect.any(String),
      working: [{ threadId: "parent", pendingRequestCount: 0 }],
      inbox: [{ threadId: "inbox" }],
      settled: [],
      snoozed: [{ threadId: "snoozed" }],
    });
    expect(sockets[0]!.call).not.toHaveBeenCalledWith("orchestration.getOlderSettledThreads", expect.anything());
    shell.value({ kind: "thread.updated", sequence: 101, location: "active",
      thread: { ...row, id: "child", status: "running", lineage: { parentThreadId: "parent", relationshipToParent: "subagent" } } });
    shell.value({ kind: "thread.updated", sequence: 102, location: "active",
      thread: { ...row, id: "inbox", status: "completed", settledOverride: "settled" } });
    expect(store.state().inbox).toEqual([]);
    expect(store.state().settled).toEqual([]);
    expect(store.state().working).toHaveLength(1);
    shell.end();
    await vi.advanceTimersByTimeAsync(300);
    expect(sockets[1]!.stream).toHaveBeenCalledWith(
      "orchestration.subscribeShell",
      { afterSequence: 102, requestCompletionMarker: true, omitIdleSubagents: true, omitOlderSettled: true },
      expect.any(Function),
      expect.any(Function),
    );
  });

  it("waits for the live snapshot before loading settled history", async () => {
    const store = start();
    await vi.advanceTimersByTimeAsync(0);
    sockets[0]!.call.mockResolvedValueOnce({ providers: [], snapshotSequence: 100, threads: [] });
    const loading = store.searchThreads({ query: "", projectIds: [], includeSettled: true });
    await vi.advanceTimersByTimeAsync(0);
    expect(sockets[0]!.call).not.toHaveBeenCalledWith("orchestration.getOlderSettledThreads", expect.anything());
    sockets[0]!.streams.get("orchestration.subscribeShell")!.value({
      kind: "snapshot", snapshot: { snapshotSequence: 99, threads: [], projects: [] },
    });
    expect((await loading).error).toBeNull();
    expect(sockets[0]!.call).toHaveBeenLastCalledWith("orchestration.getOlderSettledThreads", expect.anything());
  });

  it("keeps expired snoozes out of unloaded settled history", async () => {
    const store = start();
    await vi.advanceTimersByTimeAsync(0);
    const now = Date.now();
    sockets[0]!.streams.get("orchestration.subscribeShell")!.value({
      kind: "snapshot", snapshot: { snapshotSequence: 100, projects: [], threads: [{
        id: "snoozed", projectId: "p", title: "Snoozed", status: "completed", settledOverride: "settled",
        snoozedUntil: new Date(now + 1000).toISOString(), createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString(),
      }] },
    });
    expect(store.state().snoozed).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1001);
    expect(store.state().snoozed).toEqual([]);
    expect(store.state().settled).toEqual([]);
    sockets[0]!.call.mockResolvedValueOnce({ providers: [], snapshotSequence: 100, threads: [] });
    await store.searchThreads({ query: "", projectIds: [], includeSettled: true });
    expect(store.state().settled.map(thread => thread.threadId)).toEqual(["snoozed"]);
  });

  it("loads settled history on demand and keeps it live after loading", async () => {
    const store = start();
    await vi.advanceTimersByTimeAsync(0);
    sockets[0]!.streams.get("orchestration.subscribeShell")!.value({ kind: "synchronized" });
    const row = { id: "settled", projectId: "p", title: "Settled thread", status: "completed",
      settledOverride: "settled", createdAt: "2026-11-15T00:00:00Z", updatedAt: "2026-11-15T00:00:00Z" };
    sockets[0]!.call.mockResolvedValueOnce({ providers: [], snapshotSequence: 100, threads: [row] });
    const result = await store.searchThreads({ query: "", projectIds: [], includeSettled: true });
    expect(sockets[0]!.call).toHaveBeenLastCalledWith("orchestration.getOlderSettledThreads", {
      before: { settledAt: expect.any(String) }, limit: 50,
    });
    expect(result.threads.map(thread => thread.threadId)).toEqual(["settled"]);
    expect(store.state().settled.map(thread => thread.threadId)).toEqual(["settled"]);
    sockets[0]!.streams.get("orchestration.subscribeShell")!.value({
      kind: "thread.updated", sequence: 101, location: "active", thread: { ...row, settledOverride: "active" },
    });
    expect(store.state().settled).toEqual([]);
    expect(store.state().inbox.map(thread => thread.threadId)).toEqual(["settled"]);
  });

  it("does not resurrect settled rows changed while the history page loads", async () => {
    const store = start();
    await vi.advanceTimersByTimeAsync(0);
    sockets[0]!.streams.get("orchestration.subscribeShell")!.value({ kind: "synchronized" });
    const row = { id: "settled", projectId: "p", title: "Settled thread", status: "completed",
      settledOverride: "settled", createdAt: "2026-11-15T00:00:00Z", updatedAt: "2026-11-15T00:00:00Z" };
    let reply!: (page: { providers: never[]; snapshotSequence: number; threads: typeof row[] }) => void;
    sockets[0]!.call.mockImplementationOnce(() => new Promise(resolve => { reply = resolve; }));
    const loading = store.searchThreads({ query: "", projectIds: ["p"], includeSettled: true });
    await vi.advanceTimersByTimeAsync(0);
    expect(sockets[0]!.call).toHaveBeenLastCalledWith("orchestration.getOlderSettledThreads", {
      before: { settledAt: expect.any(String) }, limit: 50, projectIds: ["p"],
    });
    sockets[0]!.streams.get("orchestration.subscribeShell")!.value({
      kind: "thread.removed", sequence: 101, threadId: "settled",
    });
    reply({ providers: [], snapshotSequence: 100, threads: [row] });
    expect((await loading).threads).toEqual([]);
    expect(store.state().settled).toEqual([]);
  });

  it("does not send the older-settled option without the capability", async () => {
    vi.mocked(RpcSocket.open).mockImplementationOnce(async () => {
      const socket = fakeSocket();
      socket.call.mockResolvedValue({ providers: [], shellThreadFamilies: true });
      sockets.push(socket);
      return socket as unknown as RpcSocket;
    });
    start();
    await vi.advanceTimersByTimeAsync(0);
    expect(sockets[0]!.stream).toHaveBeenCalledWith(
      "orchestration.subscribeShell",
      { requestCompletionMarker: true, omitIdleSubagents: true },
      expect.any(Function), expect.any(Function),
    );
  });

  it("keeps the full snapshot request for servers without thread family support", async () => {
    vi.mocked(RpcSocket.open).mockImplementationOnce(async () => {
      const socket = fakeSocket();
      socket.call.mockResolvedValue({ providers: [] });
      sockets.push(socket);
      return socket as unknown as RpcSocket;
    });
    start();
    await vi.advanceTimersByTimeAsync(0);
    expect(sockets[0]!.stream).toHaveBeenCalledWith(
      "orchestration.subscribeShell",
      { requestCompletionMarker: true },
      expect.any(Function),
      expect.any(Function),
    );
  });

  it("checks protocol compatibility on reconnect without discarding pairing", async () => {
    vi.mocked(describeEnvironment).mockResolvedValue({ environmentId: "env", label: "Local", orchestrationProtocolVersion: 3 });
    const store = start();
    await vi.advanceTimersByTimeAsync(0);
    expect(store.state().connection).toMatchObject({ state: "offline", error: expect.stringContaining("newer") });
    expect(RpcSocket.open).not.toHaveBeenCalled();
    expect(config.clearPairing).not.toHaveBeenCalled();
  });

  it("asks for pairing when the server rejects a saved session", async () => {
    vi.mocked(socketUrl).mockRejectedValue(new SessionEndedError("Pair it again."));
    const store = start();
    await vi.advanceTimersByTimeAsync(0);
    expect(store.state().connection).toMatchObject({ state: "needs-auth" });
    expect(config.clearPairing).toHaveBeenCalledTimes(1);
  });


  it("returns a normal action error for malformed pairing links", async () => {
    const store = start();
    expect(await store.pairWith("https://app.t3.codes/pair?host=http://&token=23456789ABCD", null)).toMatchObject({ ok: false });
  });
});
