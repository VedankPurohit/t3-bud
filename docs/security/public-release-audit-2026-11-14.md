# Public release audit, 2026-11-14

## Recommendation

No confirmed credentials, private keys, or live pairing/session tokens were found.
The repository is not free of personal information: the GitHub history contains a
personal author email and a local home-directory path. Decide whether to publish
that information before changing the repository's visibility.

If keeping the email private is a requirement, remove it from history before public
release and use a GitHub no-reply identity for future commits. Changing the latest
files or future commit identity alone does not remove historical metadata. No history
was rewritten, no credentials were rotated, and no visibility change was made.

## Scope

The audit covers remote `main` at `7b9c462e16cb8cf460e9a63721956e76b3bf51d2` and
the pending working tree on this date. An independent reviewer audited history while
the main reviewer checked current files, generated assets, and repository surfaces.

- 19 commits across all local refs and reflogs: 9 reachable from GitHub `main`, plus
  10 local T3 checkpoint commits. The remote has one branch and no tags.
- 292 unique historical file blobs, deleted filenames, commit messages, and
  author/committer metadata. Reflogs added no other commits. The only unreachable
  object identified by `git fsck` was an empty blob.
- 161 tracked or non-ignored untracked files in the initial current-source snapshot,
  including the generated design gallery, templates, tests, and release documentation.
- The locally packaged application's resource archive, inspected and extracted for scanning.
- The three source image/icon assets, including their metadata, plus six GitHub issues.
  The repository had no PRs, releases, workflow runs, workflow artifacts, or issue comments.

[Gitleaks 8.30.1](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1) was obtained
from its official GitHub release, with its archive SHA-256
checked against the release asset digest. Scans used the default rules, full redaction,
decode depth 5, and archive depth 2. Targeted searches also checked provider token
formats, private keys, JWTs, credential-bearing URLs, private hosts, personal paths,
email addresses, and sensitive filenames. No candidate credential values were published.

## Findings

### Personal email in GitHub main history

All 9 commits on remote `main` contain the same personal Gmail address in author and
committer metadata, masked here as `V***@gmail.com`. It is present from
`c623c492a6eb` through `7b9c462e16cb`.

Making the repository public with this history also makes that address public.
This is a privacy finding, not an authentication credential leak.

### Historical absolute home path

`scripts/shoot-design.mjs` contains an absolute path of the form
`/Users/<user>/Github/t3code/node_modules/...` starting at commit `0771291ee925`,
including the current remote head. It reveals a local username and directory layout.

The pending working-tree version already removes the machine-specific path. Pushing
that fix preserves older versions in Git history unless the history is also rewritten.

### Synthetic pairing fixtures

The current-source Gitleaks scan reported three generic API-key candidates. They are
the same deterministic synthetic pairing code in:

- `src/main/command-input.test.ts:14`
- `src/main/commands.test.ts:30`
- `src/main/connection.test.ts:79`

The all-ref history scan reported 24 instances of these fixtures across eight local
checkpoint commits. Both reviewers verified the historical source lines. None of these
findings is reachable from the current remote `main`.

These are test data, with no evidence that they were issued by a real server. They
were triaged as false positives rather than hidden through broad scanner exclusions.

### Other reviewed matches and assets

Other targeted matches were a public dependency-vendor contact, icon `@2x` filenames,
loopback addresses, test domains, and UI placeholders. No private server hosts were found
in the current source. The generated gallery contained no absolute home paths, email
matches, private hosts, or source-map references under the targeted checks.

The PNG assets contained no metadata, EXIF, or GPS fields. The ICNS contained only size
metadata. The screenshot is a design preview using sample threads. The packaged
resource archive contained no credential/profile databases, private keys, or signing files;
its Gitleaks scan found no secrets. The remote-main Gitleaks scan also found no secrets.

## Local mitigation

Added `.gitignore` entries for `.env` variants, private keys, and signing material,
while allowing a future `.env.example`. Existing files, ignored runtime directories,
and history were not deleted. This reduces accidental additions; it does not remove
tracked historical content or replace review before pushing.

## Limits and follow-up

This is a repository disclosure audit, not a full application penetration test. No scan
can establish that every possible secret is absent. It does not inspect OS Keychain
entries, profiles outside the repository, inaccessible deleted server-side refs, forks,
or external caches. Normal branch pushes do not publish local checkpoint refs; avoid
publishing those refs unintentionally with a mirror push.

The source-release changes remain unpushed and remote CI has not run. Recheck the final
release commit after committing. A fresh dependency audit found no production
vulnerabilities and two moderate development-tool vulnerabilities, with no high or
critical findings. The build-tool advisories are tracked in
[issue #2](https://github.com/VedankPurohit/t3-bud/issues/2).
