import { BrowserWindow, session } from "electron";
import { createHash, randomBytes } from "node:crypto";

import type { StoredAuth } from "./config";

/**
 * T3 Code signs outside apps in to `/mcp` with OAuth 2.1: dynamic client registration, PKCE,
 * and a loopback redirect. The redirect is never served; the sign-in window catches it.
 */
const REDIRECT_URI = "http://127.0.0.1:47321/t3-companion/callback";
const AUTH_PARTITION = "persist:t3-companion-auth";

interface ResourceMetadata {
  readonly resource: string;
  readonly authorization_servers: readonly string[];
}

interface ServerMetadata {
  readonly issuer: string;
  readonly authorization_endpoint: string;
  readonly token_endpoint: string;
  readonly registration_endpoint: string;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${new URL(url).pathname} answered ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
  }
  return (await response.json()) as T;
}

export function mcpUrl(serverUrl: string): string {
  return `${new URL(serverUrl).origin}/mcp`;
}

/** Whether a T3 Code server with an MCP endpoint answers at `serverUrl`. */
export async function probeServer(serverUrl: string): Promise<boolean> {
  try {
    const origin = new URL(serverUrl).origin;
    const response = await fetch(`${origin}/.well-known/oauth-protected-resource/mcp`, {
      signal: AbortSignal.timeout(1500),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Opens T3 Code's own approval page and returns the session it grants. */
export async function signIn(serverUrl: string, parent: BrowserWindow | null): Promise<StoredAuth> {
  const origin = new URL(serverUrl).origin;
  const resource = await getJson<ResourceMetadata>(
    `${origin}/.well-known/oauth-protected-resource/mcp`,
  );
  const issuer = resource.authorization_servers[0] ?? origin;
  const server = await getJson<ServerMetadata>(`${issuer}/.well-known/oauth-authorization-server`);
  const client = await getJson<{ client_id: string }>(server.registration_endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_name: "T3 Companion",
      redirect_uris: [REDIRECT_URI],
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    }),
  });

  const verifier = randomBytes(32).toString("base64url");
  const state = randomBytes(16).toString("base64url");
  const authorizeUrl = new URL(server.authorization_endpoint);
  authorizeUrl.search = new URLSearchParams({
    response_type: "code",
    client_id: client.client_id,
    redirect_uri: REDIRECT_URI,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
    state,
    resource: resource.resource,
  }).toString();

  const code = await approveInWindow(authorizeUrl.href, state, server.issuer, parent);
  const token = await getJson<{ access_token: string; expires_in: number }>(server.token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: client.client_id,
      code_verifier: verifier,
      resource: resource.resource,
    }),
  });
  return {
    serverUrl: origin,
    token: token.access_token,
    expiresAt: new Date(Date.now() + token.expires_in * 1000).toISOString(),
  };
}

function approveInWindow(
  url: string,
  state: string,
  issuer: string,
  parent: BrowserWindow | null,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const window = new BrowserWindow({
      width: 520,
      height: 760,
      title: "Connect T3 Companion",
      ...(parent ? { parent } : {}),
      alwaysOnTop: true,
      autoHideMenuBar: true,
      webPreferences: { partition: AUTH_PARTITION, sandbox: true, contextIsolation: true },
    });
    let settled = false;
    const finish = (outcome: { code: string } | { error: string }) => {
      if (settled) return;
      settled = true;
      session.fromPartition(AUTH_PARTITION).webRequest.onBeforeRequest(null);
      if (!window.isDestroyed()) window.close();
      if ("code" in outcome) resolve(outcome.code);
      else reject(new Error(outcome.error));
    };
    const catchRedirect = (target: string) => {
      if (!target.startsWith(REDIRECT_URI)) return false;
      const params = new URL(target).searchParams;
      const error = params.get("error");
      if (error) finish({ error: params.get("error_description") ?? `Sign-in failed: ${error}` });
      else if (params.get("state") !== state) finish({ error: "Sign-in state did not match." });
      else if (params.has("iss") && params.get("iss") !== issuer) {
        finish({ error: "Sign-in came back from a different server." });
      } else {
        const code = params.get("code");
        finish(code ? { code } : { error: "Sign-in returned no code." });
      }
      return true;
    };
    session
      .fromPartition(AUTH_PARTITION)
      .webRequest.onBeforeRequest({ urls: [`${REDIRECT_URI}*`] }, (details, callback) => {
        catchRedirect(details.url);
        callback({ cancel: true });
      });
    window.webContents.on("will-navigate", (event, target) => {
      if (catchRedirect(target)) event.preventDefault();
    });
    window.webContents.on("will-redirect", (event, target) => {
      if (catchRedirect(target)) event.preventDefault();
    });
    window.on("closed", () => finish({ error: "Sign-in window closed." }));
    void window.loadURL(url);
  });
}
