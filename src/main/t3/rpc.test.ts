import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RpcSocket } from "./rpc";

class FakeWebSocket extends EventTarget {
  static OPEN = 1;
  static instances: FakeWebSocket[] = [];
  readyState = 0;
  sent: Record<string, unknown>[] = [];
  constructor(_url: string) { super(); FakeWebSocket.instances.push(this); }
  send(value: string) { this.sent.push(JSON.parse(value)); }
  open() { this.readyState = 1; this.dispatchEvent(new Event("open")); }
  frame(value: unknown) { this.dispatchEvent(Object.assign(new Event("message"), { data: JSON.stringify(value) })); }
  close(code = 1000, reason = "") {
    this.readyState = 3;
    this.dispatchEvent(Object.assign(new Event("close"), { code, reason }));
  }
}

beforeEach(() => { vi.useFakeTimers(); FakeWebSocket.instances = []; vi.stubGlobal("WebSocket", FakeWebSocket); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
async function connected() {
  const onClose = vi.fn();
  const pending = RpcSocket.open("ws://localhost/ws", onClose);
  const ws = FakeWebSocket.instances.at(-1)!;
  ws.open();
  return { socket: await pending, ws, onClose };
}

describe("RPC lifecycle", () => {
  it("rejects sockets that never open or close during the handshake", async () => {
    const timeout = expect(RpcSocket.open("ws://localhost/ws", () => {})).rejects.toThrow("Could not open");
    await vi.advanceTimersByTimeAsync(10_000);
    await timeout;
    const closed = expect(RpcSocket.open("ws://localhost/ws", () => {})).rejects.toThrow("Could not open");
    FakeWebSocket.instances.at(-1)!.close();
    await closed;
  });

  it("acknowledges streaming frames and resolves calls", async () => {
    const { socket, ws } = await connected();
    const value = vi.fn();
    const cancel = socket.stream("shell", {}, value, () => {});
    ws.frame({ _tag: "Chunk", requestId: "1", values: [{ id: "thread" }] });
    expect(value).toHaveBeenCalledWith({ id: "thread" });
    expect(ws.sent.at(-1)).toEqual({ _tag: "Ack", requestId: "1" });
    cancel();
    const result = socket.call("config", {});
    ws.frame({ _tag: "Exit", requestId: "2", exit: { _tag: "Success", value: { ready: true } } });
    expect(await result).toEqual({ ready: true });
    socket.close();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("interrupts timed out requests and rejects pending work on disconnect", async () => {
    const { socket, ws, onClose } = await connected();
    const timeout = expect(socket.call("send", {}, 1000)).rejects.toThrow("Check T3 Code before retrying");
    await vi.advanceTimersByTimeAsync(1000);
    await timeout;
    expect(ws.sent.at(-1)).toEqual({ _tag: "Interrupt", requestId: "1" });
    const pending = expect(socket.call("read", {})).rejects.toThrow("Connection closed");
    socket.close();
    await pending;
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
