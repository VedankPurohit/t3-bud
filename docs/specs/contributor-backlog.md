# Contributor backlog

These are scoped contribution tasks for the first source release. GitHub Issues tracks
discussion and ownership; this file records the intended behavior. A link to this spec
belongs in each issue. The app remains focused on following and responding to T3 Code.

## Copy assistant replies

Tracked in [issue #3](https://github.com/VedankPurohit/t3-bud/issues/3).

Add an accessible Copy button to completed assistant messages. The live chat renders
Markdown but has no message-copy action. Some historical gallery directions show copy
buttons; those are mock UI rather than the current implementation.

Start in `src/renderer/src/island/chat.tsx`, particularly `AssistantMessage` and `Timeline`.
Use the existing button components. If clipboard access needs a preload capability,
keep it specific and typed through `src/preload/` and `src/shared/`.

Completion checks:

- Copy writes exactly that message's raw Markdown, including code fences and line breaks.
- The control is available by keyboard, has an accessible name, and shows success only
  after a successful write. A rejected write gives useful feedback and permits retry.
- Completed assistant messages have the action; user messages and streaming partials
  keep their current behavior. Thread navigation continues to work.
- Verify multi-line text, code blocks, write failure, and keyboard operation. Include
  a screenshot with sample content and the checks you ran.

Keep whole-conversation export, per-code-block copy, and attachment download outside this task.

## Announce connection changes

Tracked in [issue #4](https://github.com/VedankPurohit/t3-bud/issues/4).

Make significant connection changes available to screen readers. The inbox currently
shows its connection status in a plain span. Existing search and notification status
regions serve different purposes.

Start in `src/renderer/src/island/screens.tsx`, `src/renderer/src/lib/state.ts`, and
the `Connection` type in `src/shared/types.ts`.

Completion checks:

- A polite, atomic status region announces connection, disconnection, and a need to pair.
- Streaming messages, sync timestamps, inbox counts, and repeated snapshots of the
  same connection state do not cause repeated announcements.
- Announcements leave keyboard focus in place and contain no pairing credentials.
- Exercise state transitions and use VoiceOver to verify the announcement and absence
  of repeated chatter. Record untested cases rather than claiming full accessibility.

Keep this limited to connection status; a full accessibility audit is a separate task.

## Handle monitor topology changes

Tracked in [issue #5](https://github.com/VedankPurohit/t3-bud/issues/5).

Keep the mascot reachable when monitors are added or removed. The main process handles
`display-metrics-changed`, but has no explicit `display-added` or `display-removed`
handlers. This is an enhancement request; a particular unplugging failure has not yet
been reproduced on every supported configuration.

Start in `src/main/index.ts`, `src/main/island.ts`, and `src/main/island.test.ts`.

Completion checks:

- Handle display addition and removal explicitly, and keep an existing on-screen
  anchor when its display remains available.
- When the anchor's display disappears, place the whole visible app in a remaining
  work area. Save a valid settled anchor so relaunch does not restore an off-screen one.
- Preserve notification side selection and the mascot's anchor across folded, expanded,
  and notification layouts. Cover displays with negative coordinates.
- Add deterministic geometry or event-handler tests and report a manual unplug/replug
  test if hardware is available. Include the display arrangement used.

Keep window resizing, Dock behavior, and cross-platform placement redesign outside this task.

## Validate Intel and macOS 13

Tracked in [issue #6](https://github.com/VedankPurohit/t3-bud/issues/6).

Help establish runtime compatibility beyond the Apple Silicon development machine.
The package declares macOS 13 as its minimum and CI targets both CPU architectures.
An automated build does not establish real desktop behavior on each OS version.

Use the README, `docs/agent-setup.md`, `scripts/smoke-install.mjs`, and
`scripts/smoke-startup.mjs`. This is suitable for someone contributing testing reports.

Completion checks:

- Record the T3 Bud commit, macOS version, CPU architecture, Node/pnpm versions, and
  T3 Code version. State whether the session is local or remote.
- Test fresh source installation, opening the app, pairing, and the JSON status check.
- Check native startup enable/status/disable, drag positioning, and a full-screen app.
  Report whether an actual sign-in cycle was tested.
- Run `node scripts/smoke-install.mjs --source` and `node scripts/smoke-startup.mjs`.
  Redact logs and use sample screenshots;
  share no pairing links, tokens, profile files, or private conversations.
- Mark every check pass, fail, or not tested. File a separate reproducible bug for a
  failure, and link it from the compatibility report. Update the supported-platform
  wording only to the extent supported by the evidence.

Reports from either Intel Macs or a Mac running macOS 13 are useful. The issue can close
once both cases have evidence; one contributor does not need access to both machines.
