# Require pull requests on main

Tracked in [issue #7](https://github.com/VedankPurohit/t3-bud/issues/7).

## Current status

Protection is not active. The repository is now public. On 2026-11-15, the
repository rulesets endpoint and the effective rules for `main` both returned empty
lists. The payload below is prepared but has not been applied.

An earlier attempt returned HTTP 403 while the repository was private. Repository
visibility has since changed; activating protection remains tracked in issue #7.

## Intended rules

[The ruleset payload](../../.github/rulesets/main.json) targets `main` and:

- Requires every change to go through a pull request, including the owner's changes.
- Has no bypass actors.
- Blocks force pushes and branch deletion.
- Requires review conversations to be resolved before merging.
- Requires zero approving reviews so the sole maintainer can merge their own PRs.

Required CI checks should be added after the workflow has run on GitHub and its
actual check names are confirmed. The initial ruleset does not require CI checks.

## Activate

This file and the JSON payload do not configure GitHub by themselves. Once the
repository is eligible, an admin can import the JSON in the repository's
**Settings > Rules > Rulesets**, or use the GitHub CLI:

```sh
gh api repos/VedankPurohit/t3-bud/rulesets
```

If no ruleset named `Require pull requests on main` exists, create it:

```sh
gh api --method POST repos/VedankPurohit/t3-bud/rulesets \
  --input .github/rulesets/main.json
```

If that ruleset already exists, update it instead. Replace `RULESET_ID` with the
numeric ID from the list response:

```sh
gh api --method PUT repos/VedankPurohit/t3-bud/rulesets/RULESET_ID \
  --input .github/rulesets/main.json
```

## Completion checks

- GitHub shows the ruleset as active, targeting `refs/heads/main`, with no bypass actors.
- `gh api repos/VedankPurohit/t3-bud/rules/branches/main` reports the pull request,
  deletion, and non-fast-forward rules.
- A normal feature branch can be pushed and proposed through a PR.
- The next legitimate direct push to `main` is rejected; submit that change through
  a PR instead. Do not create a dummy commit on `main` just to test rejection.
- A PR can merge with zero approvals after review conversations are resolved.

GitHub documents [ruleset availability](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
and [the ruleset API](https://docs.github.com/en/rest/repos/rules).
