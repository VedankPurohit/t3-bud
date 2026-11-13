/**
 * Pairing: T3 Code issues a one-time code (Settings → Sharing & access → Authorized clients →
 * Create link). It is exchanged once for a 30-day Bearer token. There is no refresh; when the token
 * expires the user pairs again.
 */

export const ORCHESTRATION_PROTOCOL = 2;
const REQUIRED_SCOPES = ["orchestration:read", "orchestration:operate"];

export interface PairingTarget {
  readonly httpBaseUrl: string;
  readonly code: string;
}

export interface Pairing {
  readonly httpBaseUrl: string;
  readonly environmentId: string;
  readonly environmentLabel: string;
  readonly token: string;
  readonly expiresAt: string;
}

export interface EnvironmentDescriptor {
  readonly environmentId: string;
  readonly label: string;
  readonly orchestrationProtocolVersion?: number;
  readonly capabilities?: Record<string, unknown>;
}

const CODE_PATTERN = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{12}$/i;

/**
 * Reads what the user pasted: a pairing link (`http(s)://host/pair#token=CODE`, `?token=`, the
 * hosted `app.t3.codes/pair?host=` form, or `t3code://pair?pairingUrl=`), or a bare code paired
 * with a separately entered address.
 */
export function parsePairingInput(input: string, fallbackHost: string | null): PairingTarget | null {
  const value = input.trim();
  if (CODE_PATTERN.test(value)) {
    return fallbackHost ? { httpBaseUrl: new URL(fallbackHost).origin, code: value.toUpperCase() } : null;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol.startsWith("t3code")) {
    const inner = url.searchParams.get("pairingUrl");
    return inner ? parsePairingInput(inner, fallbackHost) : null;
  }
  const code = new URLSearchParams(url.hash.slice(1)).get("token") ?? url.searchParams.get("token");
  if (!code) return null;
  const host = url.searchParams.get("host");
  const base = host ? new URL(host.includes("://") ? host : `https://${host}`).origin : url.origin;
  return { httpBaseUrl: base, code: code.trim().toUpperCase() };
}

async function json<T>(response: Response, what: string): Promise<T> {
  const text = await response.text();
  if (!response.ok) {
    let reason = text.slice(0, 200);
    try {
      const body = JSON.parse(text) as { reason?: string; message?: string };
      reason = body.reason === "invalid_credential" ? "That code was already used or has expired." : (body.message ?? reason);
    } catch {}
    throw new Error(`${what} failed (${response.status})${reason ? `: ${reason}` : ""}`);
  }
  return JSON.parse(text) as T;
}

export async function describeEnvironment(httpBaseUrl: string): Promise<EnvironmentDescriptor> {
  const response = await fetch(`${httpBaseUrl}/.well-known/t3/environment`, { signal: AbortSignal.timeout(4_000) });
  return json<EnvironmentDescriptor>(response, "Reaching T3 Code");
}

/** Refuses an incompatible server before the one-time code is spent. */
export function checkProtocol(descriptor: EnvironmentDescriptor) {
  const version = descriptor.orchestrationProtocolVersion ?? 1;
  if (version > ORCHESTRATION_PROTOCOL) throw new Error("This T3 Code is newer than the companion understands. Update T3 Companion.");
  if (version < ORCHESTRATION_PROTOCOL) throw new Error("This T3 Code is too old for the companion. Update T3 Code.");
}

export async function pair(target: PairingTarget): Promise<Pairing> {
  const descriptor = await describeEnvironment(target.httpBaseUrl);
  checkProtocol(descriptor);
  const response = await fetch(`${target.httpBaseUrl}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      subject_token: target.code,
      subject_token_type: "urn:t3:params:oauth:token-type:environment-bootstrap",
      requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
      scope: REQUIRED_SCOPES.join(" "),
      client_label: "T3 Companion",
      client_device_type: "desktop",
      client_os: process.platform === "darwin" ? "macOS" : process.platform,
    }),
  });
  const token = await json<{ access_token: string; expires_in: number; scope: string }>(response, "Pairing");
  // Links made with fewer permissions are narrowed without an error.
  const granted = new Set(token.scope.split(" "));
  const missing = REQUIRED_SCOPES.filter((scope) => !granted.has(scope));
  if (missing.length > 0) {
    throw new Error(`That link doesn't allow ${missing.join(" and ")}. Create a link with the default permissions.`);
  }
  return {
    httpBaseUrl: target.httpBaseUrl,
    environmentId: descriptor.environmentId,
    environmentLabel: descriptor.label,
    token: token.access_token,
    expiresAt: new Date(Date.now() + token.expires_in * 1000).toISOString(),
  };
}

export class SessionEndedError extends Error {}

/** A short-lived ticket that opens the RPC socket, so the long-lived token stays out of URLs. */
export async function socketUrl(httpBaseUrl: string, token: string): Promise<string> {
  const headers = { authorization: `Bearer ${token}` };
  let response = await fetch(`${httpBaseUrl}/api/auth/websocket-ticket/rpc`, { method: "POST", headers });
  // Servers that predate per-use tickets only know the bare path.
  if (response.status === 404) response = await fetch(`${httpBaseUrl}/api/auth/websocket-ticket`, { method: "POST", headers });
  if (response.status === 401 || response.status === 403) {
    throw new SessionEndedError("T3 Code no longer accepts this companion. Pair it again.");
  }
  const { ticket } = await json<{ ticket: string }>(response, "Opening a connection");
  const url = new URL(`${httpBaseUrl.replace(/^http/, "ws")}/ws`);
  url.searchParams.set("wsTicket", ticket);
  url.searchParams.set("orchestrationProtocol", String(ORCHESTRATION_PROTOCOL));
  url.searchParams.set("clientDeviceType", "desktop");
  url.searchParams.set("connectionMethod", "direct");
  return url.href;
}

export async function sessionIsValid(httpBaseUrl: string, token: string): Promise<boolean> {
  try {
    const response = await fetch(`${httpBaseUrl}/api/auth/session`, { headers: { authorization: `Bearer ${token}` } });
    if (!response.ok) return response.status >= 500;
    return ((await response.json()) as { authenticated?: boolean }).authenticated === true;
  } catch {
    // Unreachable is not the same as revoked; keep the token and retry later.
    return true;
  }
}
