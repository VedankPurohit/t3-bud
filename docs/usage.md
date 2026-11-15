# Using T3 Bud

## Mascot and inbox

Click the mascot to open the inbox. Hover or focus it to reveal recent activity,
including the latest unread completion and active work, with project and provider icons.
Click a thread to open it. Drag the mascot to move the app; its position is saved.
The app stays above other apps, including full-screen apps.

The inbox follows T3 Code's Working, Snoozed, and Settled shelves. Finished threads
remain unread until you visit them. Approvals and questions can be answered inside
the conversation. Open in T3 Code takes you back to the main app.

With a current T3 Code server, normal sync keeps only top-level inbox, working,
and snoozed threads. Subagents are ignored. Settled history loads when you open
the Settled tab, and search can retrieve history when you ask for it.

## Compose and search

Use the new-thread button to choose a project and model and send a message.
Drafts save locally while you type and return after reopening or restarting the app.
They clear after a successful send. Escape leaves the composer open for dictation;
use the minimize button or mascot to fold it. Cmd+W also folds the app.

Paste images with Cmd+V or use Attach images. PNG, JPEG, GIF, and WebP images have
a 10 MB per-image limit. Images have removable previews and persist with drafts.
You can send an image without text.

Inbox search matches thread titles and messages across shelves. Cmd+F focuses search.
Use the project filter to narrow results; Shift-click projects to select several.

## Notifications

Finished runs, failures, and requests needing attention appear beside the mascot.
Reply opens the conversation in T3 Bud; Open takes you to T3 Code.
Bubbles wait while a chat or composer is open.

Several notifications form one summary. Its X dismisses the batch; Review updates
expands the individual threads. Updates from one thread share a row. Hover or keyboard
focus pauses automatic dismissal. Expanded details stay open until you close them.
Use Preview notification in the inbox footer to try this without running an agent.

## Manage the source setup

Run commands from your checkout:

```sh
pnpm --silent companion status --source
pnpm --silent companion startup status --source
pnpm companion launch --source
pnpm companion quit --source
pnpm companion startup disable --source
```

`status` checks an authenticated connection to the saved server. Exit 0 means
connected, exit 2 means pairing is missing or unavailable, and exit 1 means another
failure. This check does not send a message or start an agent run.

Keep the checkout and its dependencies in place. Startup uses an absolute Electron
executable path and the checkout's working directory, so it does not depend on the
shell's pnpm or Node configuration at login. Startup registration is a per-user LaunchAgent at
`~/Library/LaunchAgents/com.vedank.t3companion.startup.plist`.

To remove this setup, disable startup, quit the app, then delete the checkout.
This preserves the profile at `~/Library/Application Support/T3 Companion/`.
That includes encrypted pairing data, preferences, and unencrypted text and image drafts.
The directory and Keychain service keep their old names across the T3 Bud rename.
Revoke the session in T3 Code's Authorized clients settings when you want to end access.

## Connection trouble

Read the error from `pnpm --silent companion status --source`. Check that the intended T3 Code
server is running and reachable. Pair again when the session expires or is revoked.
A protocol incompatibility requires compatible versions of the two apps.
macOS can ask for Keychain approval after a local rebuild; approve that OS prompt and
rerun status. The [agent setup guide](agent-setup.md) has the full recovery procedure.

The [design gallery](design/design.html) contains the current mock companion and earlier
directions in light and dark themes. It is a visual reference with sample data.

## Optional bundled app

`pnpm companion install` builds and copies a `.app` into `~/Applications`.
For that setup, omit `--source` from the commands above. `--app-dir <directory>`
selects a different bundle location. `pnpm companion uninstall` removes the bundle
and startup registration while preserving the profile. Source and bundle startup
share one slot, so enabling one replaces the startup target of the other. Disabling
startup or uninstalling a bundle preserves registration belonging to the other setup.
