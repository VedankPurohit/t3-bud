import { app, safeStorage } from "electron";
import { setTimeout as delay } from "node:timers/promises";
import { config } from "./config";
import { readPairingStdin, type MaintenanceCommand } from "./command-input";
import { checkProtocol, describeEnvironment, pair, parsePairingInput, socketUrl } from "./t3/auth";
import { RpcSocket } from "./t3/rpc";

export interface CommandResult {
  code: number;
  body: Record<string, unknown>;
}

export async function runMaintenance(command: MaintenanceCommand): Promise<CommandResult> {
  if (command === "invalid") return { code: 1, body: { ok: false, error: "Unknown companion command." } };
  if (command === "quit") {
    // The existing instance receives the request. Wait until it has actually exited before
    // the installer replaces its bundle. An idle maintenance process holds no window open.
    const deadline = Date.now() + 10_000;
    while (!app.requestSingleInstanceLock({ companionAction: "quit" })) {
      if (Date.now() >= deadline) return { code: 1, body: { ok: false, error: "The running app did not quit." } };
      await delay(100);
    }
    app.releaseSingleInstanceLock();
    return { code: 0, body: { ok: true, quit: true } };
  }
  if (command === "pair") {
    if (!(await safeStorage.isAsyncEncryptionAvailable())) throw new Error("Keychain encryption is unavailable. Unlock the macOS keychain and allow this app to access it.");
    const input = await readPairingStdin(process.stdin);
    const target = parsePairingInput(input, config.serverUrl());
    if (!target) throw new Error("The pairing link is invalid. Create a new link in T3 Code.");
    const pairing = await pair(target);
    await config.savePairing(pairing);
    // A running app rereads the encrypted config without receiving credentials in argv.
    if (app.requestSingleInstanceLock({ companionAction: "reload" })) app.releaseSingleInstanceLock();
    return { code: 0, body: { ok: true, paired: true, environmentId: pairing.environmentId, expiresAt: pairing.expiresAt } };
  }
  const pairing = await config.pairing();
  if (!pairing) return { code: 2, body: { ok: false, paired: false, connected: false, error: "Pair the companion with T3 Code." } };
  let socket: RpcSocket | undefined;
  try {
    checkProtocol(await describeEnvironment(pairing.httpBaseUrl));
    socket = await RpcSocket.open(await socketUrl(pairing.httpBaseUrl, pairing.token), () => {});
    await socket.call("server.getConfig", {});
    return { code: 0, body: { ok: true, paired: true, connected: true, environmentId: pairing.environmentId,
      expiresAt: pairing.expiresAt, version: app.getVersion() } };
  } catch (error) {
    return { code: 1, body: { ok: false, paired: true, connected: false, error: error instanceof Error ? error.message : "Connection failed." } };
  } finally {
    socket?.close();
  }
}
