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
  pairing(): Pairing | null {
    const file = read();
    if (!file.httpBaseUrl || !file.sealedToken || !file.tokenExpiresAt || !file.environmentId) return null;
    if (Date.parse(file.tokenExpiresAt) <= Date.now()) return null;
    try {
      return {
        httpBaseUrl: file.httpBaseUrl,
        environmentId: file.environmentId,
        environmentLabel: file.environmentLabel ?? "T3 Code",
        token: safeStorage.decryptString(Buffer.from(file.sealedToken, "base64")),
        expiresAt: file.tokenExpiresAt,
      };
    } catch {
      return null;
    }
  },
  savePairing(pairing: Pairing) {
    write((file) => ({
      ...file,
      httpBaseUrl: pairing.httpBaseUrl,
      environmentId: pairing.environmentId,
      environmentLabel: pairing.environmentLabel,
      sealedToken: safeStorage.encryptString(pairing.token).toString("base64"),
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
