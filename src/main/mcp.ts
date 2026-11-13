import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { mcpUrl } from "./oauth";

export class McpAuthError extends Error {}

/** A T3 tool's refusal, such as a runtime-mode ceiling; the call reached the server. */
export class McpToolError extends Error {}

const isUnauthorized = (error: unknown) =>
  error instanceof Error && /\b401\b|unauthori[sz]ed|invalid_token/i.test(error.message);

/** One MCP session to a T3 Code server, reopened when the server drops it. */
export class T3McpClient {
  private client: Client | null = null;
  private connecting: Promise<Client> | null = null;

  constructor(
    private readonly serverUrl: string,
    private readonly token: string,
  ) {}

  private async open(): Promise<Client> {
    const client = new Client({ name: "t3-companion", version: "0.1.0" });
    const transport = new StreamableHTTPClientTransport(new URL(mcpUrl(this.serverUrl)), {
      requestInit: { headers: { authorization: `Bearer ${this.token}` } },
    });
    try {
      await client.connect(transport);
    } catch (error) {
      if (isUnauthorized(error)) throw new McpAuthError("T3 Code no longer accepts this sign-in.");
      throw error;
    }
    client.onclose = () => {
      if (this.client === client) this.client = null;
    };
    return client;
  }

  private async session(): Promise<Client> {
    if (this.client) return this.client;
    this.connecting ??= this.open().finally(() => {
      this.connecting = null;
    });
    this.client = await this.connecting;
    return this.client;
  }

  async call<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
      const client = await this.session();
      try {
        const result = await client.callTool({ name, arguments: args });
        return parseToolResult<T>(result);
      } catch (error) {
        if (error instanceof McpToolError) throw error;
        if (isUnauthorized(error)) throw new McpAuthError("T3 Code no longer accepts this sign-in.");
        // A restarted server forgets MCP sessions; reconnect once.
        this.client = null;
        await client.close().catch(() => undefined);
        if (attempt > 0) throw error;
      }
    }
  }

  async close() {
    const client = this.client;
    this.client = null;
    await client?.close().catch(() => undefined);
  }
}

function parseToolResult<T>(result: Awaited<ReturnType<Client["callTool"]>>): T {
  const text = Array.isArray(result.content)
    ? result.content.find((part): part is { type: "text"; text: string } => part.type === "text")
        ?.text
    : undefined;
  const value =
    result.structuredContent ??
    (text === undefined
      ? undefined
      : (() => {
          try {
            return JSON.parse(text) as unknown;
          } catch {
            return text;
          }
        })());
  const failure =
    typeof value === "object" &&
    value !== null &&
    /(?:Failure|Error)$/.test(String((value as { _tag?: unknown })._tag ?? "")) &&
    "message" in value
      ? String((value as { message: unknown }).message)
      : null;
  if (result.isError || failure !== null) {
    throw new McpToolError(failure ?? (typeof value === "string" ? value : "T3 Code refused that."));
  }
  return value as T;
}
