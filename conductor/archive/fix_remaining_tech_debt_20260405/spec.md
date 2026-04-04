# Spec: Fix Remaining Tech Debt (TD-010, TD-011, TD-012)

## Problem Statement

Three open tech debt items remain in the Bun/Convex pivot codebase that affect type safety, React correctness, and maintainability:

- **TD-010**: 102 instances of `as never` casts across pivot route handlers bypass Convex type checking
- **TD-011**: `frontend/src/lib/useLogStream.ts` has conditional hook calls violating React rules of hooks
- **TD-012**: Multiple useEffect hooks missing dependencies in useAgentForm.ts, useHarnessForm.ts, useConvexData.ts

## Success Criteria

1. All `as never` casts replaced with properly typed function references or generic type parameters
2. `useLogStream.ts` refactored to follow React rules of hooks (no conditional hook calls)
3. All useEffect hooks include correct dependency arrays
4. Zero new TypeScript errors introduced
5. All existing tests pass (82 pivot + 29 frontend = 111 tests)
6. Production build succeeds without errors

## Scope

- `frontend/src/routes/` — route handler type fixes
- `frontend/src/lib/useLogStream.ts` — hook refactoring
- `frontend/src/lib/useAgentForm.ts` — dependency fixes
- `frontend/src/lib/useHarnessForm.ts` — dependency fixes
- `frontend/src/lib/useConvexData.ts` — dependency fixes

## Out of Scope

- New feature development
- Go codebase changes
- Schema changes to Convex tables
