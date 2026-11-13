# T3 Companion

A small floating companion for [T3 Code](https://github.com/pingdotgg/t3code). It sits on top
of every app, including full-screen ones, shows your inbox (Working, Snoozed, Settled), and lets
you read, reply to, and start threads without switching to T3 Code.

It is a separate Electron app. It talks to T3 Code only through T3 Code's MCP server (`/mcp`),
the interface T3 Code documents for outside agents, so it needs no changes to T3 Code.

## How it connects

- **Sign-in.** OAuth 2.1 with PKCE and dynamic client registration, the same flow `claude mcp login`
  uses. The companion opens T3 Code's own approval page; you paste a code from
  **⌘K → Use T3 Code in another app (MCP)**. Choose **Full access**: lower levels cannot act on
  threads that run in full access. Sessions last 30 days.
- **Live status.** MCP has no push updates, so the companion polls `t3_thread_list` every few
  seconds (working threads, plus the newest page of the inbox) and reads the open thread
  incrementally.
- **What it cannot do.** MCP cannot approve permission requests. Threads waiting on an approval
  show a banner that opens the thread in T3 Code.

## Design

The companion's look is the **Island** direction: a capsule you can drag anywhere, which opens
into a popover built from T3 Code's own sidebar, chat, and composer components.

[`docs/design/design.html`](docs/design/design.html) is a self-contained gallery of all six
directions that were explored (Sidebar twin, Split view, Edge drawer, Island, Command bar,
Notification stack), each screen at real size in light and dark. Open it from disk in any browser.
Its sources are in `src/renderer/src/design/`; `pnpm design:build` regenerates it.

T3 Code's stylesheet and UI primitives are copied into `src/renderer/src/t3/` (MIT); see
`THIRD_PARTY_NOTICES.md`.

## Develop

```sh
pnpm install
pnpm dev
```

`T3_COMPANION_USER_DATA=<dir>` isolates sign-in data, and `T3_COMPANION_DEBUG_PORT=<port>`
exposes DevTools for automation.
