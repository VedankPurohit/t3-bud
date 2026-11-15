# Consolidate tested local changes

Tracked in [issue #12](https://github.com/VedankPurohit/t3-bud/issues/12).

Integrate the remaining source work into `main`, preserving the sync and separate
mascot-window fixes already merged there. Existing PRs #10 and #11 are merged.
The installer work is also tracked in issue #1.

## Included work

- Source checkout launch, pairing, status, quit, startup, and optional bundle installation.
- Async encrypted pairing storage, input validation, startup discovery, and connection errors.
- Grouped notifications with batch review, individual dismissal, and clear all.
- Contributor documentation, license texts, issue templates, and macOS CI.

## Exclusions

Keep image assets, generated design output, icon and screenshot generation changes,
and the launch-video directory local. Preserve the original dirty worktrees in an
external backup and Git stash. Build the integration from remote `main` so the
hover worktree's snapshot commit and its media files do not enter published history.
The optional app bundle uses Electron's default icon.

## Validation

- Type checking, production build, and 82 tests across 20 files pass.
- A clean source copy installs with the frozen lockfile and packages without local images.
- Source and packaged command smoke checks use a disposable server, profile, and mock Keychain.
- Disposable native startup checks cover both bundle and source launch registration.
- Native center-top and center-bottom checks pass for the full panel, composer,
  model picker, notification, and fixed mascot viewport throughout transitions.

Tracked separately in [issue #13](https://github.com/VedankPurohit/t3-bud/issues/13),
the full native placement check fails at the left edge on both the integration and
existing main code. A requested mascot center at x=46 settles at x=215 on this Mac.
The native position is initially correct and changes afterward without another
application move request. This remains a pre-existing placement limitation; no
window-position change is included in this integration.

A clean-install check also exposed a missing Electron runtime. Electron 45 installs
its binary lazily, while the source command helper reads its installed path directly.
The project postinstall now runs `install-electron` so a dependency installation
prepares the binary before source commands or smoke checks use it.

Native grouped-notification checks pass for summary, review, individual dismissal,
and clear all. Source smoke checks pass after the Electron install hook prepares
the runtime in a fresh source copy.
