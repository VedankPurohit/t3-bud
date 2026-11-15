# Setup instructions for agents

Use this procedure when the user gives you the repository URL and asks you to set up,
update, pair, diagnose, or remove T3 Bud. Work on the Mac where the app will be used,
in the user's logged-in desktop session.

## Set up the checkout

1. Check `uname -s`, `uname -m`, `node --version`, `pnpm --version`, and `git --version`.
   This release targets macOS 13+ on arm64 and x86_64. Use Node 22.16+ and the pnpm
   version in `package.json`. Use the user's package manager to install missing tools.
2. Clone the supplied repository into a permanent user-owned directory, or use an
   existing checkout. Read its README and `package.json`. Preserve local changes;
   report a dirty checkout before attempting to update it.
3. Run `pnpm install --frozen-lockfile`, then `pnpm build`. The first command installs
   dependencies; the second creates the application build in `out/`. Completion requires
   both commands to exit successfully. Keep the checkout and `node_modules` in place.
4. Run `pnpm companion launch --source` to launch the build in the background.
   A human can use `pnpm start` to run the same build in a terminal. `pnpm dev` is the
   development watcher. The default setup does not package or copy a `.app` bundle.
5. If startup was requested, run `pnpm companion startup enable --source`, then
   `pnpm --silent companion startup status --source`. Completion requires `enabled: true`
   and `targetMatches: true`. The per-user LaunchAgent uses absolute executable and
   checkout paths, with a working directory, so shell PATH settings are unnecessary.
   If startup is blocked, report the error and have the user check macOS Login Items.

Source commands use `--source`. Commands without that flag target an optional installed
bundle. Both modes share the original pairing/draft profile and one startup slot.
If the user explicitly wants to switch from an installed bundle to the checkout, quit
it with `pnpm companion quit` before launching the source build. Enabling source startup
replaces the installed bundle's startup target. Do not switch an existing setup merely
while editing documentation or testing helpers.

## Pair and verify

1. Run `pnpm --silent companion status --source` first. Reuse a working saved pairing.
   Confirm which server the user intends to use before replacing an existing pairing.
   The server must support orchestration protocol 2. Keep agent execution and credentials
   in T3 Code; do not read its database or copy another client's credentials.
2. If a new pairing is needed for the user's local default server, locate `t3` on PATH
   or at `~/.t3/bin/t3`. Pipe a freshly minted link directly to the companion:

   ```sh
   set -o pipefail
   t3 pair --label "T3 Bud" | pnpm --silent companion pair --source
   ```

   Keep pairing output out of tool transcripts and logs. Links and `t3 pair` output
   enter through stdin, with no credential in arguments. The app encrypts the saved
   token and reloads a running companion. For a remote server or missing CLI, have
   the user create a link in **Settings → Sharing & access → Authorized clients →
   Create link** and provide it securely or paste it in the app. Use HTTPS remotely.
3. Run `pnpm --silent companion status --source`. Completion requires exit 0,
   `paired: true`, and `connected: true`. This checks authenticated RPC access without
   sending a message or starting an agent run. Exit 2 means pairing is unavailable or
   expired; exit 1 means another failure. Read the error before retrying.
4. Report the checkout directory, launch result, startup state, and connection result.
   A successful dependency install alone does not establish that the app is running.

## Update

Quit the app with `pnpm companion quit --source`. In a clean checkout, run
`git pull --ff-only`, `pnpm install --frozen-lockfile`, and `pnpm build`.
Then run `pnpm companion launch --source` and verify status. If the checkout moved,
rerun `pnpm companion startup enable --source` from its new path. Keep its files and
Electron dependency in place between logins.

## Diagnose or remove

Start with `pnpm --silent companion status --source` and
`pnpm --silent companion startup status --source`. An unreachable server needs
connection repair. A revoked session needs a new link. Keychain errors require the
user to unlock or approve access in macOS; rerun status after that OS prompt.

To remove the source setup, run `pnpm companion startup disable --source`, then
`pnpm companion quit --source`, before deleting the checkout. This preserves
`~/Library/Application Support/T3 Companion/` and the server authorization. Revoke
that authorization in T3 Code when requested. Erase local pairing, preferences, and
unsent drafts only when the user explicitly requests it.

## Optional application bundle

Use this alternative when the user specifically wants a `.app` in `~/Applications`:
run `pnpm companion install`. It checks types, runs tests, builds, packages, and copies
`T3 Bud.app`. For this mode omit `--source` when launching, pairing, checking status,
or configuring startup. `--app-dir <directory>` selects another bundle location.
`pnpm companion uninstall` removes the bundle and startup registration while keeping
local data. This is separate from the normal dependency install with `pnpm install`.
