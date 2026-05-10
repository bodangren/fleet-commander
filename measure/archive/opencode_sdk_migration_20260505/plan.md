# Implementation Plan - @opencode-ai/sdk Migration

## Phase 1: SDK Integration and Setup
- [x] Add `@opencode-ai/sdk` to `pivot/package.json` via `bun add`.
- [x] Create a new `pivot/src/orchestrator/opencodeServer.ts` module to handle the lifecycle of the OpenCode server (`createOpencode` or supervised daemon).
- [x] Ensure graceful shutdown hooks (e.g. `process.on('SIGTERM')`) gracefully close the OpenCode server.

## Phase 2: Resolver Updates
- [x] Update `pivot/src/orchestrator/resolver.ts` (`resolveAgentCommand`) to return structured configuration (model ID, config) for the SDK instead of a command-line string array.
- [x] Ensure any `{session_id}` handling maps natively to the SDK's `client.sessions.prompt(sessionId, ...)` approach.
- [x] Update unit tests for `resolver.ts` to reflect structured returns.

## Phase 3: Executor Re-write
- [x] Refactor `pivot/src/orchestrator/executor.ts` `executeTask` to consume the `@opencode-ai/sdk` instead of `Bun.spawn`.
- [x] Remove `parseSessionId` and standard out log scraping logic; use typed session responses.
- [x] Re-implement `timeoutMs` using `AbortController`; enforce `maxTokens` post-hoc from response token counts.
- [x] Handle SDK exceptions and map them to our internal `failureType`s (`timeout`, `tokens_exceeded`, `exit_code`, etc.).
- [x] Update executor unit tests.

## Phase 4: Clean up & Validation
- [x] Validate no regressions: pivot typecheck passes; focused tests pass.
- [x] Confirm graceful shutdown wired in `server.ts`; `closeOpencodeServer()` called on SIGTERM/SIGINT.
- [ ] Update `AGENTS.md` or architecture ADRs if any fundamental design documentation is impacted by this SDK shift.
  > **Deferred:** No user-facing behavior changes; internal implementation detail.
