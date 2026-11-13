import { app, safeStorage } from "electron";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface StoredAuth {
  readonly serverUrl: string;
  readonly token: string;
  readonly expiresAt: string;
}

interface ConfigFile {
  serverUrl?: string;
  /** The MCP bearer token, encrypted with the OS keychain via safeStorage. */
  sealedToken?: string;
  tokenExpiresAt?: string;
  /** Threads that finished while the companion watched and were not opened yet. */
  fresh?: string[];
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
  serverUrl: () => read().serverUrl ?? null,
  auth(): StoredAuth | null {
    const file = read();
    if (!file.serverUrl || !file.sealedToken || !file.tokenExpiresAt) return null;
    if (Date.parse(file.tokenExpiresAt) <= Date.now()) return null;
    try {
      const token = safeStorage.decryptString(Buffer.from(file.sealedToken, "base64"));
      return { serverUrl: file.serverUrl, token, expiresAt: file.tokenExpiresAt };
    } catch {
      return null;
    }
  },
  saveAuth(auth: StoredAuth) {
    write((file) => ({
      ...file,
      serverUrl: auth.serverUrl,
      sealedToken: safeStorage.encryptString(auth.token).toString("base64"),
      tokenExpiresAt: auth.expiresAt,
    }));
  },
  clearAuth() {
    write(({ sealedToken: _token, tokenExpiresAt: _expires, ...file }) => file);
  },
  anchor: () => {
    const anchor = read().anchor;
    return anchor && Number.isFinite(anchor.x) && Number.isFinite(anchor.y) ? anchor : null;
  },
  saveAnchor(anchor: { x: number; y: number }) {
    write((file) => ({ ...file, anchor }));
  },
  fresh: () => new Set(read().fresh ?? []),
  saveFresh(fresh: ReadonlySet<string>) {
    write((file) => ({ ...file, fresh: [...fresh] }));
  },
};
