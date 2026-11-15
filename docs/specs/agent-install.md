# Installation by an agent

The first release supports macOS on Apple Silicon and Intel. Users give their agent the
repository URL. The agent reads the README, clones into a permanent directory, runs
`pnpm install --frozen-lockfile` and `pnpm build`, launches the checkout, registers
startup when requested, pairs with the user's running T3 Code server, and checks the
connection. The default workflow does not copy a bundle into `~/Applications`.

## Acceptance checks

- Dependency installation downloads the Electron runtime through the project postinstall
  hook. Source commands work in a fresh checkout before Electron has been launched.
- `pnpm start` runs the existing build; `pnpm dev` is the development watcher.
- `pnpm companion launch --source` launches the built checkout in the background.
  Source pairing, status, and quit commands also accept `--source`.
- `pnpm companion startup enable --source` registers an absolute Electron executable
  and checkout directory. It works without pnpm or Node on the login session's PATH.
  Source and installed-app modes share one startup slot. Status must distinguish targets.
  Disabling startup or uninstalling a bundle preserves a different registered target.
- The optional `pnpm companion install` checks types, runs tests, packages for the host architecture,
  and replaces only this application's bundle. Failed copies preserve the previous install.
- Commands support paths containing spaces and run without a shell. Repeated installation
  and startup registration are safe.
- `pnpm companion startup enable|disable|status` manages a per-user macOS LaunchAgent.
  Installation alone does not opt the user into startup. This supports local source builds
  without relying on signed, notarized login-item registration.
- `pnpm companion pair` accepts a pairing link or `t3 pair` output over stdin, stores the
  session through Electron safeStorage, and reloads an already running companion.
- `pnpm companion status` prints JSON, checks the actual authenticated connection, and
  exits unsuccessfully when pairing or connectivity is missing. Credentials stay out of
  command arguments, output, and logs.
- Update and uninstall instructions preserve pairing and drafts. Uninstall removes startup
  registration before removing the bundle.
- Invalid pairing links return an actionable error. Authentication, WebSocket opening,
  and RPC requests have deadlines. Failed subscriptions trigger visible recovery.
- Tests cover installation rollback, command execution, pairing input, expired/revoked
  sessions, protocol changes, and connection failures. CI runs checks and packages on macOS.
- The application package contains built output and notices, with a stable bundle ID.
  The README states protocol requirements, local data locations, and release limitations.

## Boundaries

Keep existing working-tree changes. Prepare the repository without publishing it or
changing its visibility. T3 Bud is the display name. Keep the original
`T3 Companion` Keychain service name and data directory so existing profiles survive the
rename. The bundle identifier and executable name stay stable. Local source
builds use ad-hoc signing; public downloadable binaries would need separate distribution
signing. Windows and Linux installation are outside this release.

## Validation

The combined implementation passes 86 tests and type checking. A fresh source copy was validated
with the frozen lockfile and the optional bundle in a directory containing spaces.
The source-checkout and packaged smoke checks exercise
pairing, encrypted persistence, authenticated RPC, protocol incompatibility, revoked
sessions, and quitting, using a disposable server and Chromium's mock Keychain. A separate
native macOS smoke check registers disposable LaunchAgents for a bundle and a source
runtime, confirms launch arguments and working directories, repeats enable, and verifies
removal. The installed user's bundle and startup registration remain unchanged while
testing the source workflow. Production dependencies have no known
audit findings. Two moderate minimatch findings remain in electron-builder's development
dependencies; electron-builder 26.18.0 is the latest available release at this check.

GitHub Actions is configured for Apple Silicon and Intel. Remote CI has not run before
the code is pushed. The native checks have run on Apple Silicon; Intel and the macOS 13
minimum still require validation on their respective systems. macOS may require user
approval for real Keychain access after rebuilding an ad-hoc-signed application.
