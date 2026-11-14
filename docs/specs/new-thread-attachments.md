# Attachments in a new thread

Tracking: [GitHub issue #8](https://github.com/VedankPurohit/t3-bud/issues/8).

Companion must send a client-generated thread UUID to `orchestration.launchThread`,
including when the first message contains uploaded images. T3 Code needs the
destination thread ID to claim pending uploads before creating the thread.

## Protocol

T3 Code's web client reserves a UUID in
`apps/web/src/hooks/useHandleNewThread.ts`. Its shared client runtime sends that
ID in `packages/client-runtime/src/operations/commands.ts` when launching the first
turn. The server's `apps/server/src/orchestration-v2/ThreadMessageIntake.ts`
rejects pending uploads when `threadId` is absent, then claims them for the supplied
thread before invoking the launch service.

Companion follows the same contract. Allocate a UUID before uploading, include it
in the launch request, and continue returning the server's resulting thread ID.
The paired server supplies both the RPC connection and HTTP upload address, so
the request works for local and remote environments without local filesystem access.

## Acceptance checks

- A new thread accepts an image with text or an image alone.
- Follow-up messages still deliver the original image bytes.
- The regression exercises Companion's launch path against the server's missing-ID
  rejection, reproducing `Uploaded attachments need a thread id at launch.` before
  the fix.
- Failed uploads still prevent dispatch and release pending uploads.

## Verification

`pnpm test src/main/attachments.test.ts` reproduced the exact launch rejection
before the fix and passed after adding the thread UUID. The staged change was
exported to a temporary copy without unrelated local work: all 36 tests,
`pnpm typecheck`, and `pnpm build` passed. The development checkout also passed
all 68 tests. No live provider turn was started during verification.
