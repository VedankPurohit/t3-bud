import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { config } from "./config";

const runtime = vi.hoisted(() => ({ directory: "", available: true }));
vi.mock("electron", () => ({
  app: { getPath: () => runtime.directory },
  safeStorage: {
    isAsyncEncryptionAvailable: async () => runtime.available,
    encryptStringAsync: async (input: string) => Buffer.from(`encrypted:${Buffer.from(input).toString("base64")}`),
    decryptStringAsync: async (input: Buffer) => {
      if (!input.toString().startsWith("encrypted:")) throw new Error("keychain unavailable");
      return { result: Buffer.from(input.toString().slice(10), "base64").toString() };
    },
  },
}));
const pairing = { httpBaseUrl: "http://localhost:3773", token: "sensitive-session", environmentId: "env", environmentLabel: "Local", expiresAt: "2099-01-01T00:00:00Z" };
beforeEach(() => { runtime.directory = mkdtempSync(join(tmpdir(), "companion-config-")); runtime.available = true; });
afterEach(() => rmSync(runtime.directory, { recursive: true, force: true }));

describe("saved pairing", () => {
  it("encrypts sessions, restores them, and preserves preferences on sign out", async () => {
    config.saveAnchor({ x: 300, y: 50 });
    await config.savePairing(pairing);
    expect(readFileSync(join(runtime.directory, "config.json"), "utf8")).not.toContain(pairing.token);
    expect(await config.pairing()).toEqual(pairing);
    config.clearPairing();
    expect(await config.pairing()).toBeNull();
    expect(config.anchor()).toEqual({ x: 300, y: 50 });
  });

  it("rejects expired or malformed expiry dates and unavailable encryption", async () => {
    await config.savePairing({ ...pairing, expiresAt: "2000-01-01T00:00:00Z" });
    expect(await config.pairing()).toBeNull();
    await config.savePairing({ ...pairing, expiresAt: "not-a-date" });
    expect(await config.pairing()).toBeNull();
    runtime.available = false;
    await expect(config.savePairing(pairing)).rejects.toThrow("keychain");
  });

  it("handles corrupt config and an unreadable encrypted token", async () => {
    writeFileSync(join(runtime.directory, "config.json"), "invalid JSON");
    expect(await config.pairing()).toBeNull();
    await config.savePairing(pairing);
    const file = JSON.parse(readFileSync(join(runtime.directory, "config.json"), "utf8"));
    writeFileSync(join(runtime.directory, "config.json"), JSON.stringify({ ...file, sealedToken: Buffer.from("unreadable").toString("base64") }));
    expect(await config.pairing()).toBeNull();
  });
});
