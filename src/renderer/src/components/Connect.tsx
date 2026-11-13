import type { Connection } from "@shared/types";
import { useState } from "react";

/** First run, and after the 30-day sign-in expires. */
export function Connect(props: { connection: Connection }) {
  const { connection } = props;
  const initial =
    connection.state === "unconfigured"
      ? (connection.suggestedUrl ?? "http://127.0.0.1:3773")
      : connection.serverUrl;
  const [url, setUrl] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const busy = connection.state === "authorizing";

  const connect = async () => {
    setError(null);
    let parsed: URL;
    try {
      parsed = new URL(url.includes("://") ? url : `http://${url}`);
    } catch {
      setError("That is not a valid address.");
      return;
    }
    const result = await window.companion.connect(parsed.origin);
    if (!result.ok) setError(result.error);
  };

  return (
    <div className="selectable flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-background px-5 py-5 text-[13px]">
      <div>
        <h2 className="text-[15px] font-semibold">Connect to T3 Code</h2>
        <p className="mt-1 text-muted">
          {connection.state === "needs-auth"
            ? connection.reason
            : "The companion talks to T3 Code through its MCP server, the same way Claude Code or Codex can."}
        </p>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">T3 Code address</span>
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && void connect()}
          spellCheck={false}
          className="h-9 rounded-lg border border-border bg-input px-3 font-mono text-xs outline-none focus:border-primary/60"
        />
        <span className="text-2xs text-muted">
          {connection.state === "unconfigured" && connection.suggestedUrl
            ? "Found T3 Code running on this Mac."
            : "Use localhost, an https address (Tailscale HTTPS), or your T3 Connect address."}
        </span>
      </label>
      <ol className="flex list-decimal flex-col gap-1.5 pl-4 text-xs text-muted">
        <li>
          In T3 Code, press <kbd className="rounded bg-accent px-1 font-sans">⌘K</kbd> and choose{" "}
          <b className="font-medium text-foreground">Use T3 Code in another app (MCP)</b>.
        </li>
        <li>
          Pick <b className="font-medium text-foreground">Something else…</b>, set access to{" "}
          <b className="font-medium text-foreground">Full access</b>, and choose{" "}
          <b className="font-medium text-foreground">Get code</b>.
        </li>
        <li>Click Connect below and paste the code on the page that opens.</li>
      </ol>
      <p className="text-2xs text-muted">
        Full access lets the companion reply to and organize threads that run in full access. Sign-in lasts 30 days.
      </p>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void connect()}
        className="h-9 rounded-lg bg-primary font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Waiting for approval…" : "Connect"}
      </button>
    </div>
  );
}
