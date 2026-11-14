# Limit startup sync to active companion threads

Tracked in [issue #9](https://github.com/VedankPurohit/t3-bud/issues/9).

The companion needs top-level inbox, working, and snoozed threads during normal
sync. Ignore subagents, including their approval rollups. Keep the Settled tab,
but load its history only when the user opens it.

## Server requests

Read `server.getConfig` before opening the shell subscription. Send
`omitIdleSubagents: true` when `shellThreadFamilies` is advertised, and also send
`omitOlderSettled: true` when `shellOlderSettled` is advertised. Apply the same
options to initial subscriptions and reconnect cursor resumes.

The current protocol cannot omit every subagent or every settled row. Its trimmed
snapshot retains live children, some ancestors, and the newest 25 settled threads.
Discard subagents and unsnoozed settled rows from the companion's live state.
Keep snoozed top-level threads even when their settled override is set. Always
advance the stream cursor for ignored rows so reconnect does not replay them.

Older servers without settled-history paging still deliver their full snapshot.
Keep their settled rows available through the existing tab, but discard subagents.
Exact server-side filtering requires an upstream protocol addition.

## Settled history

- Opening Settled requests up to 50 rows through `getOlderSettledThreads`, scoped
  to selected projects. Normal inbox updates never trigger history requests.
- Keep loaded history separate from live inbox/working/snoozed state. Apply live
  deltas to it, including unsetting settled status, snoozing, and removing a thread.
- Buffer deltas during a history request and replay those after the page cursor.
  A late page must not resurrect deleted or unsettled rows.
- Discard late history responses after a disconnect or a newer history request.
- Keep historical search available when the user explicitly searches. Search must
  continue to exclude delegated threads.
- Preserve pairing, drafts, projects, and top-level approvals and questions.

## Evidence and validation

The original full request loaded 3,941 shell records in 21.1 seconds on an already
running server. Omitting idle subagents loaded 1,062 records in 5.8 seconds; omitting
older settled threads as well loaded 95 records in 6.1 seconds. These are individual
measurements, not a fixed latency guarantee or a complete reproduction of the
reported one-to-two-minute restart delay.

Connection tests cover both capabilities, fallback, reconnect cursors, initial and
live filtering, snoozed settled threads, lazy history, live history updates, and
history-load races. Run typecheck, the full suite, a production build, and a live
CompanionStore check before updating the installed app.

Persistent snapshot caching and server-side query optimization are outside this fix.

## Validation

A live check in the development checkout retained only inbox, working, and snoozed
rows before Settled was opened. A native UI check then showed the loading message
and the 25-row history after opening Settled. The full T3 Code restart was not
repeated because it would interrupt active work.

The isolated merge branch passes 50 tests across 14 files, typecheck, production
build, and the diff whitespace check. Tests include initial/live filtering, ignored
row cursor advancement, capability fallback, bounded history loading, live changes,
removals during history loading, snapshot/history ordering, snooze expiry, and RPC
timeout/disconnect cleanup. Unrelated installer and release changes are outside
this branch.

History waits for the live stream's initial snapshot cursor before requesting a
page, so the initial stream cannot skip intervening history removals. Before history
has been opened, expired snoozes on settled threads stay out of the Settled display.
