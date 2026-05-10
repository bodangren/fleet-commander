# Plan: Fix Combined Token Limit in Executor

## Phase 1: Implement Shared Counter

- [x] Add shared token counter to `executeCommand`
- [x] Refactor `readStreamWithTokenLimit` to accept shared counter + update it
- [x] Ensure process kill happens immediately on combined breach

## Phase 2: Tests & Verification

- [x] Add executor tests for combined token limit scenarios
- [x] Run `bun --cwd pivot test --run` and confirm baseline failures unchanged

> All tasks were already implemented in remediation_20260504_review (commit `2a986a3`). Plan markers were never checked.
