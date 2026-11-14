/**
 * T3 Code's client protocol: Effect RPC with JSON serialization over one WebSocket, one message
 * per text frame. We send Request, Ack, Interrupt and Ping; the server sends Chunk, Exit, Pong
 * and rarely Defect. Every Chunk must be acked or the stream stalls after eight.
 */

type Cause = ReadonlyArray<{ _tag: string; error?: { _tag?: string; message?: string }; defect?: unknown }>;
type Exit = { _tag: "Success"; value?: unknown } | { _tag: "Failure"; cause: Cause };

interface Pending {
  onChunk?: (values: unknown[]) => void;
  onExit: (exit: Exit) => void;
  timer?: ReturnType<typeof setTimeout>;
}

export class RpcError extends Error {
  constructor(
    readonly tag: string,
    readonly cause: Cause,
  ) {
    super(describeCause(cause) ?? `${tag} failed`);
  }
}

export function describeCause(cause: Cause): string | null {
  for (const part of cause) {
    if (part._tag === "Fail" && part.error?.message) return part.error.message;
    if (part._tag === "Die") return typeof part.defect === "string" ? part.defect : JSON.stringify(part.defect);
    if (part._tag === "Interrupt") return "Interrupted.";
  }
  return null;
}

const PING_EVERY_MS = 5_000;
/** The official client treats 15 seconds without any frame as a dead socket. */
const SILENCE_LIMIT_MS = 15_000;

export class RpcSocket {
  private nextId = 1;
  private readonly pending = new Map<string, Pending>();
  private lastFrameAt = Date.now();
  private readonly heartbeat: ReturnType<typeof setInterval>;
  closed = false;

  private constructor(
    private readonly ws: WebSocket,
    private readonly onClose: (code: number, reason: string) => void,
  ) {
    ws.addEventListener("message", (event) => this.receive(String(event.data)));
    ws.addEventListener("close", (event) => this.shutdown(event.code, event.reason));
    this.heartbeat = setInterval(() => {
      if (Date.now() - this.lastFrameAt > SILENCE_LIMIT_MS) {
        this.ws.close(4000, "silent");
        this.shutdown(4000, "silent");
        return;
      }
      this.send({ _tag: "Ping" });
    }, PING_EVERY_MS);
  }

  static open(url: string, onClose: (code: number, reason: string) => void): Promise<RpcSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      const cleanup = () => {
        clearTimeout(timer);
        ws.removeEventListener("error", fail);
        ws.removeEventListener("close", fail);
        ws.removeEventListener("open", opened);
      };
      const fail = () => {
        cleanup();
        ws.close();
        reject(new Error("Could not open a connection to T3 Code."));
      };
      const opened = () => { cleanup(); resolve(new RpcSocket(ws, onClose)); };
      const timer = setTimeout(fail, 10_000);
      ws.addEventListener("error", fail, { once: true });
      ws.addEventListener("close", fail, { once: true });
      ws.addEventListener("open", opened, { once: true });
    });
  }

  private shutdown(code: number, reason: string) {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.heartbeat);
    const exit: Exit = { _tag: "Failure", cause: [{ _tag: "Die", defect: `Connection closed (${code}).` }] };
    const pending = [...this.pending.values()];
    this.pending.clear();
    for (const item of pending) { clearTimeout(item.timer); item.onExit(exit); }
    this.onClose(code, reason);
  }

  private send(message: object) {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(message));
  }

  private receive(text: string) {
    this.lastFrameAt = Date.now();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return;
    }
    // A frame may batch several messages in an array.
    for (const message of Array.isArray(parsed) ? parsed : [parsed]) this.handle(message as Record<string, unknown>);
  }

  private handle(message: Record<string, unknown>) {
    const requestId = String(message.requestId ?? "");
    if (message._tag === "Chunk") {
      this.send({ _tag: "Ack", requestId: message.requestId });
      this.pending.get(requestId)?.onChunk?.((message.values as unknown[]) ?? []);
    } else if (message._tag === "Exit") {
      const pending = this.pending.get(requestId);
      this.pending.delete(requestId);
      clearTimeout(pending?.timer);
      pending?.onExit(message.exit as Exit);
    }
  }

  call<T>(tag: string, payload: unknown, timeoutMs = 30_000): Promise<T> {
    const id = String(this.nextId++);
    return new Promise((resolve, reject) => {
      if (this.closed) {
        reject(new Error("Not connected to T3 Code."));
        return;
      }
      this.pending.set(id, {
        timer: setTimeout(() => {
          if (!this.pending.delete(id)) return;
          this.send({ _tag: "Interrupt", requestId: id });
          reject(new Error(`${tag} timed out. Check T3 Code before retrying the action.`));
        }, timeoutMs),
        onExit: (exit) =>
          exit._tag === "Success" ? resolve(exit.value as T) : reject(new RpcError(tag, exit.cause)),
      });
      this.send({ _tag: "Request", id, tag, payload, headers: [] });
    });
  }

  /** Opens a stream; `onEnd` runs when it ends for any reason. Returns a cancel function. */
  stream(tag: string, payload: unknown, onValue: (value: unknown) => void, onEnd: (exit: Exit) => void) {
    const id = String(this.nextId++);
    this.pending.set(id, { onChunk: (values) => values.forEach((value) => onValue(value)), onExit: onEnd });
    this.send({ _tag: "Request", id, tag, payload, headers: [] });
    return () => {
      if (!this.pending.delete(id)) return;
      this.send({ _tag: "Interrupt", requestId: id });
    };
  }

  close() {
    if (this.closed) return;
    this.ws.close(1000, "client");
    this.shutdown(1000, "client");
  }
}
