# Specification: Fix Frontend Bugs

## Overview

Fix critical bugs and issues in the frontend codebase that affect functionality, error handling, and user experience. These bugs were identified through code analysis and include state management issues, missing error handling, and incomplete implementations.

## Functional Requirements

### Bug Fixes (Critical)

1. **Fix `mountedRef` cleanup bug in `useGitStatus.ts` and `useFleetData.ts`**
   - Reset `mountedRef.current = true` at the start of the effect
   - Ensures state updates work correctly after project slug changes

2. **Fix duplicate query name in `useConvexData.ts`**
   - Remove dead code path where both ternary branches resolve to the same query
   - Simplify to direct query call

3. **Fix missing error handling in `Reconcile.tsx`**
   - Add `response.ok` checks in `handleApply` and `handleReject`
   - Add try/catch blocks for network errors
   - Show user feedback on failure

4. **Fix silent error swallowing in components**
   - Add error state and user feedback in `SprintPanel.tsx`, `OverviewStats.tsx`, `VelocityChart.tsx`, `AgentUtilization.tsx`, `IssueResolution.tsx`
   - Replace `.catch(() => {})` with proper error handling

5. **Fix duplicate error display in `DashboardPage.tsx`**
   - Remove one of the two `fleet.error` ResultPanel renderings

### Incomplete Implementations

6. **Implement `parseCoverageThresholds` in `coverage.ts`**
   - Parse YAML input and return parsed thresholds
   - Remove eslint-disable comment

### Performance Improvements

7. **Wrap `clearLines` in `useCallback` in `useWebSocket.ts`**
   - Match pattern used in `useLogStream.ts`

### Type Safety

8. **Remove duplicate `ReconciliationProposalEntry` type**
   - Import from `useConvexData.ts` in `Reconcile.tsx`

## Non-Functional Requirements

- All existing tests must continue to pass
- No breaking changes to component APIs
- Maintain backward compatibility

## Acceptance Criteria

- [ ] `mountedRef` is properly reset in `useGitStatus.ts` and `useFleetData.ts`
- [ ] Duplicate query name removed from `useConvexData.ts`
- [ ] `Reconcile.tsx` handles API errors gracefully
- [ ] All components with silent `.catch(() => {})` show error feedback
- [ ] `DashboardPage.tsx` shows error only once
- [ ] `parseCoverageThresholds` parses YAML input
- [ ] `clearLines` is wrapped in `useCallback`
- [ ] `Reconcile.tsx` imports type from `useConvexData.ts`
- [ ] All unit tests pass
- [ ] All e2e tests pass

## Out of Scope

- Type safety improvements for `as any` casts (lower priority)
- `useRunContract.ts` silent no-op behavior (UX improvement, not a bug)
