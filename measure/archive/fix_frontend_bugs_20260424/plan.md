# Implementation Plan: Fix Frontend Bugs

## Phase 1: Critical Bug Fixes

- [x] Task: Fix `mountedRef` cleanup bug
    - [x] Write tests for `useGitStatus` and `useFleetData` state updates after project change
    - [x] Fix `useGitStatus.ts`: reset `mountedRef.current = true` at effect start
    - [x] Fix `useFleetData.ts`: reset `mountedRef.current = true` at effect start
    - [x] Run tests and verify fix

- [x] Task: Fix duplicate query name
    - [x] Write test for `useReconciliationProposals` query selection
    - [x] Fix `useConvexData.ts`: remove dead ternary branch
    - [x] Run tests and verify fix

## Phase 2: Error Handling

- [x] Task: Fix missing error handling in `Reconcile.tsx`
    - [x] Write tests for `handleApply` and `handleReject` error cases
    - [x] Add `response.ok` checks and try/catch blocks
    - [x] Add error state and user feedback
    - [x] Run tests and verify fix

- [x] Task: Fix silent error swallowing in components
    - [x] Write tests for error states in `SprintPanel.tsx`
    - [x] Add error state and user feedback in `SprintPanel.tsx`
    - [x] Apply same pattern to `OverviewStats.tsx`, `VelocityChart.tsx`, `AgentUtilization.tsx`, `IssueResolution.tsx`
    - [x] Run tests and verify fix

## Phase 3: UI/UX Fixes

- [x] Task: Fix duplicate error display in `DashboardPage.tsx`
    - [x] Write test for error display
    - [x] Remove duplicate `fleet.error` ResultPanel
    - [x] Run tests and verify fix

## Phase 4: Incomplete Implementations

- [x] Task: Implement `parseCoverageThresholds`
    - [x] Write tests for YAML parsing
    - [x] Implement YAML parsing in `coverage.ts`
    - [x] Remove eslint-disable comment
    - [x] Run tests and verify fix

## Phase 5: Performance & Type Safety

- [x] Task: Wrap `clearLines` in `useCallback`
    - [x] Write test for `useWebSocket` stability
    - [x] Wrap `clearLines` in `useCallback` in `useWebSocket.ts`
    - [x] Run tests and verify fix

- [x] Task: Remove duplicate type definition
    - [x] Import `ReconciliationProposalEntry` from `useConvexData.ts` in `Reconcile.tsx`
    - [x] Remove local type definition
    - [x] Run tests and verify fix

## Phase 6: Verification

- [x] Task: Run full test suite
    - [x] Run frontend unit tests (all must pass)
    - [x] Run Playwright e2e tests (all must pass)
    - [x] Run lint and type checks
    - [x] Fix any regressions

- [x] Task: Update tracks.md
    - [x] Mark track as completed in tracks.md
    - [x] Update tech-debt.md if any items resolved
    - [x] Update lessons-learned.md with insights
