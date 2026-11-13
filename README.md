# T3 Companion

A small floating companion for [T3 Code](https://github.com/pingdotgg/t3code). It sits on top
of every app, including full-screen ones, shows your inbox (Working, Snoozed, Settled), and lets
you read, reply to, and start threads without switching to T3 Code.

It is a separate Electron app. It connects the same way T3 Code's own web and mobile clients do,
over the server's WebSocket API, so it needs no changes to T3 Code.

## How it connects

- **Pairing.** In T3 Code, open **Settings → Sharing & access → Authorized clients → Create link**
  (or run `t3 pair`) and paste the link into the companion. It trades the one-time code for a
  30-day session token, stored encrypted in the OS keychain. When the token expires, pair again.
- **Live updates.** The companion subscribes to the server's shell and thread streams, so the inbox,
  unread state, and streaming replies update the moment they change. No polling.
- **Approvals and questions.** Permission requests and agent questions show up as cards in the
  island and can be answered there.
- **Protocol.** This is T3 Code's internal client protocol (orchestration protocol 2), not a
  published API. The companion checks the version on connect and says so if the server changed.

## Design

The mascot is the T3 Tots orb (MIT), redrawn as an SVG with blinks and hops that react to your
threads. The companion's layout is the **Island** direction: a capsule you can drag anywhere, which opens
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
