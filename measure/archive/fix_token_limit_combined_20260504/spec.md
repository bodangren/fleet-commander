# Spec: Fix Combined Token Limit in Executor

## Problem

`pivot/src/orchestrator/executor.ts:readStreamWithTokenLimit` enforces `maxTokens` independently on stdout and stderr streams. If each stream stays under the limit but their combined output exceeds it, the process is not killed early. The combined check only happens after both streams have closed, by which time the executor may have consumed excessive tokens.

## Impact

- SLA token limits are ineffective when output is split across streams
- Cost overruns on tasks with verbose stderr + stdout
- Dashboard `tokensExceeded` flag is unreliable for split-stream tasks

## Solution

Maintain a shared `AtomicTokenCounter` (or simple shared mutable counter in the closure) across both `readStreamWithTokenLimit` calls inside `executeCommand`. When the combined count exceeds `maxTokens`, kill the process immediately from whichever reader detects the breach.

## Acceptance Criteria

- [ ] `executeCommand` passes a shared counter to both stream readers
- [ ] Process is killed immediately when combined tokens exceed `maxTokens`
- [ ] `tokensExceeded` is set correctly in the return value
- [ ] Tests cover: stdout-only breach, stderr-only breach, combined breach, no breach

## Scope

- `pivot/src/orchestrator/executor.ts`
- `pivot/src/orchestrator/executor.test.ts` (add tests)
