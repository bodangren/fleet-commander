# Plan: Fix Combined Token Limit in Executor

## Phase 1: Implement Shared Counter

- [ ] Add shared token counter to `executeCommand`
- [ ] Refactor `readStreamWithTokenLimit` to accept shared counter + update it
- [ ] Ensure process kill happens immediately on combined breach

## Phase 2: Tests & Verification

- [ ] Add executor tests for combined token limit scenarios
- [ ] Run `bun --cwd pivot test --run` and confirm baseline failures unchanged
