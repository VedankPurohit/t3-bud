import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { app, safeStorage } from "electron";
import { config } from "./config";
import { readPairingStdin } from "./command-input";
import { runMaintenance } from "./commands";
import { describeEnvironment, pair, socketUrl } from "./t3/auth";
import { RpcSocket } from "./t3/rpc";

vi.mock("electron", () => ({ app: { requestSingleInstanceLock: vi.fn(() => true), releaseSingleInstanceLock: vi.fn(), getVersion: () => "0.1.0" },
  safeStorage: { isAsyncEncryptionAvailable: vi.fn(async () => true) } }));
vi.mock("./config", () => ({ config: { pairing: vi.fn(async () => null), serverUrl: vi.fn(() => null), savePairing: vi.fn() } }));
vi.mock("./command-input", () => ({ readPairingStdin: vi.fn() }));
vi.mock("./t3/auth", async (original) => ({ ...await original<typeof import("./t3/auth")>(),
  pair: vi.fn(), describeEnvironment: vi.fn(), socketUrl: vi.fn() }));
const pairing = { httpBaseUrl: "http://localhost:3773", token: "private-session", environmentId: "env", environmentLabel: "Local", expiresAt: "2099-01-01" };

beforeEach(() => {
  vi.mocked(config.pairing).mockResolvedValue(null);
  vi.mocked(app.requestSingleInstanceLock).mockReturnValue(true);
  vi.mocked(safeStorage.isAsyncEncryptionAvailable).mockResolvedValue(true);
});
afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); vi.useRealTimers(); });

describe("maintenance commands", () => {
  it("reports missing pairing with a distinct exit code", async () => {
    expect(await runMaintenance("status")).toMatchObject({ code: 2, body: { paired: false, connected: false } });
  });

  it("stores pairing and notifies a running app without putting credentials in the notification or result", async () => {
    vi.mocked(readPairingStdin).mockResolvedValue("http://localhost:3773/pair#token=23456789ABCD");
    vi.mocked(pair).mockResolvedValue(pairing);
    vi.mocked(app.requestSingleInstanceLock).mockReturnValue(false);
    const result = await runMaintenance("pair");
    expect(result).toMatchObject({ code: 0, body: { paired: true, environmentId: "env" } });
    expect(config.savePairing).toHaveBeenCalledWith(pairing);
    expect(app.requestSingleInstanceLock).toHaveBeenCalledWith({ companionAction: "reload" });
    expect(JSON.stringify(result)).not.toContain(pairing.token);
    expect(JSON.stringify(result)).not.toContain("23456789ABCD");
  });

  it("checks encryption availability before consuming a one-time pairing code", async () => {
    vi.mocked(safeStorage.isAsyncEncryptionAvailable).mockResolvedValue(false);
    await expect(runMaintenance("pair")).rejects.toThrow("Keychain");
    expect(pair).not.toHaveBeenCalled();
  });

  it("checks authenticated RPC access and closes its temporary socket", async () => {
    vi.mocked(config.pairing).mockResolvedValue(pairing);
    vi.mocked(describeEnvironment).mockResolvedValue({ environmentId: "env", label: "Local", orchestrationProtocolVersion: 2 });
    vi.mocked(socketUrl).mockResolvedValue("ws://localhost/ws");
    const socket = { call: vi.fn(async () => ({})), close: vi.fn() };
    vi.spyOn(RpcSocket, "open").mockResolvedValue(socket as unknown as RpcSocket);
    expect(await runMaintenance("status")).toMatchObject({ code: 0, body: { paired: true, connected: true } });
    expect(socket.call).toHaveBeenCalledWith("server.getConfig", {});
    expect(socket.close).toHaveBeenCalledTimes(1);
  });

  it("waits for the previous instance to release the lock before reporting quit", async () => {
    vi.useFakeTimers();
    vi.mocked(app.requestSingleInstanceLock).mockReturnValueOnce(false).mockReturnValueOnce(true);
    const pending = runMaintenance("quit");
    await vi.advanceTimersByTimeAsync(100);
    expect(await pending).toMatchObject({ code: 0, body: { quit: true } });
    expect(app.releaseSingleInstanceLock).toHaveBeenCalledTimes(1);
  });
});
