# T3 Companion

> [!WARNING]
> T3 Bud is at the very start of development, currently version **0.0.1**, and is
> intended for testers and developers only. There are no published releases yet,
> so you or your agent will need to build it from source. Expect bugs and missing
> features. Fixes and more features are planned over the coming days.
>
> Follow [@ThisIsVedank on X](https://x.com/ThisIsVedank) for updates and to request features.

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
threads. The companion folds into the **Command bar** direction's mascot with a count badge.
Hover to reveal thread activity below the mascot, including the latest completion and active work,
with project and provider icons. Click a thread to open it. The new-thread button opens a compact composer
with project and model selection. Click the mascot to open the inbox, or drag it to move the companion.
Keyboard focus also reveals the pill.

Unsent messages save locally as you type and return when you reopen a thread, reload, or restart
the companion. Drafts clear after a successful send. Escape leaves the composer open for dictation;
use the minimize button or mascot to fold it.

Paste an image with Cmd+V in a new thread or follow-up, or use **Attach images**. Images show a removable
preview and stay in the draft when you close or restart the companion. PNG, JPEG, GIF, and WebP images
use T3 Code's upload flow, with a 10 MB limit per image. An image can be sent without text.

Search in the inbox finds threads across shelves, including message matches. Use the project filter
to narrow the list, or Shift-click projects to select several. Cmd+F focuses search.

Finished runs, failures, and requests needing your attention appear in dark thought bubbles beside the mascot. Reply continues in the companion; Open takes you to T3 Code.
Bubbles wait while a chat or composer is open.
Use **Preview notification** in the inbox footer to check their appearance without running an agent.

[`docs/design/design.html`](docs/design/design.html) is a self-contained gallery of the current companion and the six earlier
directions (Sidebar twin, Split view, Edge drawer, Island, Command bar,
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
