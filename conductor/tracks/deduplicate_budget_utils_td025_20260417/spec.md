# Spec - Deduplicate Budget Utilities (TD-025)

## Problem
Budget utility functions (`isBudgetBreached`, `computeRemainingBudget`, `computeSpendRate`, `isWithinPeriod`, `validateBudgetScope`) are duplicated between `convex/budgets.ts` and `pivot/src/policy/economic.ts`.

## Goal
Extract shared logic into a single source of truth that both Convex and pivot can import.

## Approach
Create `convex/lib/budget.ts` containing only pure types and utility functions with no Convex-runtime dependencies. Both `convex/budgets.ts` and `pivot/src/policy/economic.ts` will import from this module. This keeps the shared code close to the Convex layer (where the canonical `BudgetEntry` type originates) while allowing pivot reuse.

## Acceptance Criteria
- No duplication of the five utility functions across the two files
- All existing pivot tests pass without modification
- Both workspaces typecheck cleanly
- TD-025 is removed from `tech-debt.md`
