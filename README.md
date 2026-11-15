# T3 Bud

A floating companion for [T3 Code](https://github.com/pingdotgg/t3code).
Follow your agents, answer approvals, and send a quick reply without switching apps.

T3 Bud is an independent Electron app. It connects to your existing T3 Code server
over its WebSocket client protocol. Your agents continue running in T3 Code.

> [!WARNING]
> T3 Bud is at the very start of development, currently version **0.1.0**, and is
> intended for testers and developers only. There are no published releases yet,
> so you or your agent will need to build it from source. Expect bugs and missing
> features. Fixes and more features are planned over the coming days.
>
> Follow [@ThisIsVedank on X](https://x.com/ThisIsVedank) for updates and to request features.

## What it does

- Keeps a draggable mascot above your apps, including full-screen apps.
- Shows working, unread, snoozed, and settled threads with live updates.
- Opens conversations, streams replies, and answers approvals and questions.
- Starts threads with project and model selection, image attachments, and saved drafts.
- Searches thread titles and messages, with project filters.
- Groups completion, failure, and attention notifications beside the mascot.

This is an early macOS project. Apple Silicon has been tested locally.
The build targets macOS 13 or later; Intel and minimum-version reports are welcome.
CI is configured for Apple Silicon and Intel. Windows and Linux installation are not supported yet.

## Set up with an agent

Give your agent this repository URL and this instruction:

> Read https://github.com/VedankPurohit/t3-bud and follow its agent setup guide.
> Clone the repo, run pnpm install, build and run T3 Bud from the checkout, add it
> to startup, pair it with my T3 Code server, and verify the connection.

The [agent setup guide](docs/agent-setup.md) covers dependency setup, building,
startup, pairing, verification, and updates. The normal setup runs from the checkout.
Keep that directory in a permanent location so startup can find it.

## Run from the checkout

You need Git, Node.js 22.16 or later, pnpm 10.28.2, and a running T3 Code server
with orchestration protocol 2. Run the app in your logged-in macOS desktop session.

```sh
git clone https://github.com/VedankPurohit/t3-bud.git
cd t3-bud
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

To start T3 Bud when you sign in:

```sh
pnpm companion startup enable --source
```

`pnpm install` installs the dependencies, `pnpm build` compiles the app, and `pnpm start`
runs that build. The npm package is private. There is no `npx` setup command or image to build.
For an agent to launch it in the background, use `pnpm companion launch --source`.
`pnpm dev` runs the development watcher.

## Pair with T3 Code

With T3 Code running and its `t3` CLI on PATH:

```sh
set -o pipefail
t3 pair --label "T3 Bud" | pnpm --silent companion pair --source
pnpm --silent companion status --source
```

The pairing link passes through stdin. Keep it out of logs and issue reports.
Status exits with code 0 and reports `paired: true` and `connected: true` when
the authenticated connection works.

You can also create a link in T3 Code under **Settings → Sharing & access →
Authorized clients → Create link** and paste it into T3 Bud. When the session
expires or is revoked, pair again.

T3 Bud uses T3 Code's internal client protocol. It checks compatibility on each
connection; a protocol change may require an update to one of the apps.

## Use, update, or remove it

Click the mascot to open your inbox, hover to see activity, or drag it to move.
The new-thread button opens a compact composer. The [usage guide](docs/usage.md)
covers notifications, image attachments, search, and keyboard behavior.

To update, run these commands from a clean checkout:

```sh
pnpm companion quit --source
git pull --ff-only
pnpm install --frozen-lockfile
pnpm build
pnpm companion launch --source
```

If you moved the checkout, rerun `pnpm companion startup enable --source` from the new path.
`pnpm companion startup disable --source` removes startup registration. Do that before
deleting the checkout. Pairing and drafts are preserved. Use `pnpm companion --help`
for all commands.

An optional bundled `.app` setup is also available with `pnpm companion install`.
Commands without `--source` target that installed bundle. Both setups share the same
profile and startup slot; enabling startup for one replaces the other's startup target.

Pairing and drafts live in `~/Library/Application Support/T3 Companion/`.
That original name stays stable across the rename. The session token is encrypted
through the macOS keychain; draft text and images have no application-level encryption.
Uninstalling preserves this data and the server authorization. Revoke authorization
in T3 Code's **Authorized clients** settings when you want to end the session.

## Contribute

Start with [CONTRIBUTING.md](CONTRIBUTING.md). It covers development, the source
layout, testing, and what to include in a pull request.

Look through the [good first issues](https://github.com/VedankPurohit/t3-bud/issues?q=is%3Aopen+label%3A%22good+first+issue%22)
or the [contributor backlog](docs/specs/contributor-backlog.md). Each task has a
starting point and completion checks. Bug reproductions, accessibility feedback,
and macOS compatibility reports are useful contributions too.

Two starter tasks are [copying assistant replies](https://github.com/VedankPurohit/t3-bud/issues/3)
and [announcing connection changes to screen readers](https://github.com/VedankPurohit/t3-bud/issues/4).

To run the app for development:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

## Credits and license

The mascot design comes from [T3 Tots](https://github.com/Deepusleepy/t3-tots),
used under the MIT License and redrawn here as an SVG with blinking and reactions.
The UI adapts T3 Code's MIT-licensed styles and components.
T3 Bud is not affiliated with T3 Code or T3 Tots.

T3 Bud is [MIT licensed](LICENSE). See [third-party notices](THIRD_PARTY_NOTICES.md)
for upstream attribution and license texts.
