import { PassThrough, Readable } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import { extractPairingInput, maintenanceCommand, readPairingStdin } from "./command-input";

afterEach(() => vi.useRealTimers());
describe("agent command input", () => {
  it("distinguishes normal launches, maintenance commands, and unknown commands", () => {
    expect(maintenanceCommand(["app"])).toBeNull();
    expect(maintenanceCommand(["app", "--companion-command=pair"])).toBe("pair");
    expect(maintenanceCommand(["--companion-command=unknown"])).toBe("invalid");
  });

  it("extracts a raw link or t3 pair output without printing credentials", async () => {
    const url = "http://localhost:3773/pair#token=23456789ABCD";
    expect(extractPairingInput(`  ${url}\n`)).toBe(url);
    expect(await readPairingStdin(Readable.from([`QR CODE\nPairing URL: ${url}\nExpires soon\n`]))).toBe(url);
    expect(() => extractPairingInput("unrelated output\nmore output")).toThrow("Pipe");
  });

  it("bounds input size and waiting time", async () => {
    await expect(readPairingStdin(Readable.from(["x".repeat(16_385)]))).rejects.toThrow("too large");
    vi.useFakeTimers();
    const stream = new PassThrough();
    const pending = expect(readPairingStdin(stream, 100)).rejects.toThrow("Timed out");
    await vi.advanceTimersByTimeAsync(100);
    await pending;
    expect(stream.listenerCount("data")).toBe(0);
  });
});
