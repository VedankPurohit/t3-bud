import { app, safeStorage } from "electron";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { Pairing } from "./t3/auth";

interface ConfigFile {
  httpBaseUrl?: string;
  environmentId?: string;
  environmentLabel?: string;
  /** The Bearer token from pairing, encrypted with the OS keychain via safeStorage. */
  sealedToken?: string;
  tokenExpiresAt?: string;
  /** Where the user dragged the island: the capsule's top-center, in screen points. */
  anchor?: { x: number; y: number };
}

const configPath = () => join(app.getPath("userData"), "config.json");

function read(): ConfigFile {
  try {
    return JSON.parse(readFileSync(configPath(), "utf8")) as ConfigFile;
  } catch {
    return {};
  }
}

function write(update: (config: ConfigFile) => ConfigFile) {
  const next = update(read());
  const path = configPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(`${path}.tmp`, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  renameSync(`${path}.tmp`, path);
}

export const config = {
  /** The server paired last, even after its token expired, to suggest pairing again. */
  serverUrl: () => read().httpBaseUrl ?? null,
  async pairing(): Promise<Pairing | null> {
    const file = read();
    if (!file.httpBaseUrl || !file.sealedToken || !file.tokenExpiresAt || !file.environmentId) return null;
    if (!Number.isFinite(Date.parse(file.tokenExpiresAt)) || Date.parse(file.tokenExpiresAt) <= Date.now()) return null;
    try {
      const decrypted = await safeStorage.decryptStringAsync(Buffer.from(file.sealedToken, "base64"));
      return {
        httpBaseUrl: file.httpBaseUrl,
        environmentId: file.environmentId,
        environmentLabel: file.environmentLabel ?? "T3 Code",
        token: decrypted.result,
        expiresAt: file.tokenExpiresAt,
      };
    } catch {
      return null;
    }
  },
  async savePairing(pairing: Pairing) {
    if (!(await safeStorage.isAsyncEncryptionAvailable())) throw new Error("Keychain encryption is unavailable. Unlock the macOS keychain and allow this app to access it.");
    const sealedToken = (await safeStorage.encryptStringAsync(pairing.token)).toString("base64");
    write((file) => ({
      ...file,
      httpBaseUrl: pairing.httpBaseUrl,
      environmentId: pairing.environmentId,
      environmentLabel: pairing.environmentLabel,
      sealedToken,
      tokenExpiresAt: pairing.expiresAt,
    }));
  },
  clearPairing() {
    write(({ sealedToken: _token, tokenExpiresAt: _expires, ...file }) => file);
  },
  anchor: () => {
    const anchor = read().anchor;
    return anchor && Number.isFinite(anchor.x) && Number.isFinite(anchor.y) ? anchor : null;
  },
  saveAnchor(anchor: { x: number; y: number }) {
    write((file) => ({ ...file, anchor }));
  },
};
