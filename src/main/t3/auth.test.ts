import { afterEach, describe, expect, it, vi } from "vitest";
import { pair, parsePairingInput, sessionIsValid, socketUrl, SessionEndedError } from "./auth";

afterEach(() => vi.unstubAllGlobals());
const code = "23456789ABCD";
const descriptor = { environmentId: "env", label: "Local", orchestrationProtocolVersion: 2 };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("pairing input", () => {
  it("accepts direct, hosted, deep links, and bare codes", () => {
    const direct = `http://127.0.0.1:3773/pair#token=${code}`;
    for (const input of [direct, `t3code://pair?pairingUrl=${encodeURIComponent(direct)}`,
      `https://app.t3.codes/pair?host=127.0.0.1:3773&token=${code}`]) {
      const target = parsePairingInput(input, null);
      expect(target?.code).toBe(code);
      expect(target?.httpBaseUrl).toMatch(/127\.0\.0\.1:3773$/);
    }
    expect(parsePairingInput(code.toLowerCase(), "localhost:3773")).toEqual({
      code, httpBaseUrl: "http://localhost:3773",
    });
  });

  it("returns null for malformed hosts, unsupported schemes, and invalid codes", () => {
    for (const input of ["garbage", `https://app.t3.codes/pair?host=http://&token=${code}`,
      `file:///pair#token=${code}`, "https://example.test/pair#token=invalid"]) {
      expect(parsePairingInput(input, null)).toBeNull();
    }
    expect(parsePairingInput(code, "http://")).toBeNull();
  });
});

describe("authentication", () => {
  it("refuses incompatible servers before consuming a code", async () => {
    const fetcher = vi.fn().mockResolvedValue(response({ ...descriptor, orchestrationProtocolVersion: 3 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(pair({ httpBaseUrl: "http://localhost:3773", code })).rejects.toThrow("newer");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("requests only read and operate scopes and gives every request a deadline", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response(descriptor)).mockResolvedValueOnce(response({
      access_token: "secret", expires_in: 3600, scope: "orchestration:read orchestration:operate",
    }));
    vi.stubGlobal("fetch", fetcher);
    expect(await pair({ httpBaseUrl: "http://localhost:3773", code })).toMatchObject({ token: "secret", environmentId: "env" });
    for (const call of fetcher.mock.calls) expect(call[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(String(fetcher.mock.calls[1]?.[1]?.body)).toContain("orchestration%3Aread+orchestration%3Aoperate");
  });

  it("recognizes revoked credentials and keeps offline sessions", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({}, 401)));
    await expect(socketUrl("http://localhost:3773", "secret")).rejects.toBeInstanceOf(SessionEndedError);
    expect(await sessionIsValid("http://localhost:3773", "secret")).toBe(false);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await sessionIsValid("http://localhost:3773", "secret")).toBe(true);
  });

  it("falls back to older ticket endpoints without exposing the session in the URL", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response({}, 404)).mockResolvedValueOnce(response({ ticket: "short-ticket" }));
    vi.stubGlobal("fetch", fetcher);
    const url = await socketUrl("https://environment.test", "secret");
    expect(url).toContain("wss://environment.test/ws?");
    expect(url).toContain("wsTicket=short-ticket");
    expect(url).not.toContain("secret");
    expect(fetcher.mock.calls[1]?.[0]).toBe("https://environment.test/api/auth/websocket-ticket");
  });
});
