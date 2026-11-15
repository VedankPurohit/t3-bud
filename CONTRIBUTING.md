# Contributing to T3 Bud

Small fixes, usability improvements, documentation, and reproducible bug reports are welcome.
You can also help by testing a Mac configuration you already use.

## Pick something to work on

Browse [good first issues](https://github.com/VedankPurohit/t3-bud/issues?q=is%3Aopen+label%3A%22good+first+issue%22)
and [help wanted](https://github.com/VedankPurohit/t3-bud/issues?q=is%3Aopen+label%3A%22help+wanted%22).
The [contributor backlog](docs/specs/contributor-backlog.md) records the scope and
completion checks for the initial tasks. Comment on an issue if you plan to work
on it so others can coordinate.

Small bug fixes and documentation corrections can go straight to a pull request.
For a new feature, platform, or change to pairing and permissions, open an issue
with the use case and proposed behavior before investing in the implementation.
T3 Code owns agent execution; T3 Bud presents its state and sends the user's actions.

## Run the project

Fork the repository, clone your fork, and create a branch for your change.
Use macOS 13 or later, Node.js 22.16 or later, and the pnpm version pinned in
`package.json`. A running T3 Code server with orchestration protocol 2 is needed
to test real conversations. The design gallery runs with sample data.

```sh
pnpm install --frozen-lockfile
T3_COMPANION_USER_DATA="$HOME/Library/Application Support/T3 Bud Development" pnpm dev
```

The environment variable keeps development pairing files and drafts separate from
the installed app's profile. Keep pairing links, tokens, and local profile files
out of commits, screenshots, and logs. Pair using the [setup guide](docs/agent-setup.md).

For the design gallery, run `pnpm design:dev`. `pnpm design:build` regenerates the
self-contained `docs/design/design.html`, which also opens directly from disk.
The gallery uses mock threads; check behavior in the running app too.

## Find the relevant code

| Location | Responsibility |
| --- | --- |
| `src/main/index.ts`, `src/main/island.ts` | Native window, dragging, display geometry, and IPC handlers |
| `src/main/store.ts` | Connection lifecycle, live state, and thread actions |
| `src/main/t3/` | Pairing, RPC transport, protocol reducers, and search |
| `src/preload/`, `src/shared/` | Typed bridge between Electron and the renderer |
| `src/renderer/src/island/` | Inbox, chat, composer, and notification UI |
| `src/renderer/src/lib/` | Draft persistence, notification decisions, and other UI logic |
| `src/renderer/src/design/` | Mock design gallery |
| `scripts/` | Installation, startup, packaging checks, and design screenshots |

Use the existing TypeScript and React conventions. Keep privileged operations in
the Electron main process and expose specific, typed preload methods when needed.
Preserve renderer isolation. Keep the original profile directory, Keychain service,
bundle identifier, and executable name stable unless a change includes a migration.
Preserve the license notices on copied or adapted code.

## Check your change

For code changes, run:

```sh
pnpm typecheck
pnpm test
pnpm build
```

Test the behavior your change affects. A bug fix should include a regression test
when the behavior can be exercised reliably. For UI changes, check keyboard access,
focus, reduced motion, and placement near screen edges. Include a screenshot or
short recording with sample data when the appearance changes.

For installer, startup, main-process command, or packaging changes, also run these
checks in your logged-in Mac desktop session:

```sh
install_root="$(mktemp -d "${TMPDIR:-/tmp}/t3-bud-check.XXXXXX")"
node scripts/smoke-install.mjs --source
pnpm companion install --no-launch --app-dir "$install_root/apps"
node scripts/smoke-install.mjs "$install_root/apps"
node scripts/smoke-startup.mjs
rm -rf "$install_root"
```

The packaged test uses a disposable server, profile, and Chromium test Keychain.
The startup test registers a disposable background app and removes its LaunchAgent.
Neither pairs your real server nor changes your installed T3 Bud startup registration.
CI runs these checks on Apple Silicon and Intel runners.

For documentation-only changes, check commands, file paths, and links. Report only
the checks you actually ran, including failures or hardware you could not test.

## Send a pull request

Explain the problem, the resulting behavior, and how you checked it. Link the issue
when there is one. Keep unrelated refactoring separate so the change can be reviewed.
The PR template provides space for test results and screenshots.

AI-assisted contributions are welcome. Review generated code yourself and verify
the claimed behavior. If an agent posts a PR or review on your behalf, identify it.
The PR should explain the change without requiring readers to inspect a chat transcript.

Contributions use the repository's [MIT license](LICENSE).
