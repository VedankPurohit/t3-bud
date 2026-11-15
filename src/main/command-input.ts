import type { Readable } from "node:stream";

export type MaintenanceCommand = "pair" | "status" | "quit" | "invalid";
export function maintenanceCommand(argv: readonly string[]): MaintenanceCommand | null {
  const argument = argv.find((value) => value.startsWith("--companion-command"));
  if (!argument) return null;
  const value = argument.slice("--companion-command=".length);
  return value === "pair" || value === "status" || value === "quit" ? value : "invalid";
}

export function extractPairingInput(input: string): string {
  // `t3 pair` prints a QR code and explanation along with this labeled URL.
  const line = input.match(/^\s*Pairing URL:\s*(\S+)\s*$/m)?.[1];
  const value = line ?? input.trim();
  if (!value || /\s/.test(value)) throw new Error("Pipe a pairing link or the output of t3 pair into this command.");
  return value;
}

export function readPairingStdin(stream: Readable, timeoutMs = 15_000): Promise<string> {
  return new Promise((resolve, reject) => {
    let input = "";
    const finish = (error?: Error) => {
      clearTimeout(timer);
      stream.removeListener("data", onData);
      stream.removeListener("end", onEnd);
      stream.removeListener("error", onError);
      stream.pause();
      if (error) reject(error);
      else {
        try { resolve(extractPairingInput(input)); }
        catch (cause) { reject(cause); }
      }
    };
    const onData = (chunk: Buffer | string) => {
      input += chunk.toString();
      if (Buffer.byteLength(input) > 16_384) finish(new Error("Pairing input is too large."));
    };
    const onEnd = () => finish();
    const onError = () => finish(new Error("Could not read pairing input."));
    const timer = setTimeout(() => finish(new Error("Timed out waiting for pairing input on stdin.")), timeoutMs);
    stream.on("data", onData).once("end", onEnd).once("error", onError);
  });
}
