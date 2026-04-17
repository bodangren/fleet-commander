# Implementation Plan - Deduplicate Budget Utilities (TD-025)

## Phase 1: Extract Shared Budget Utilities

- [x] Task: Create `convex/lib/budget.ts` with `BudgetPolicy`, `BudgetEntry`, and pure utility functions (`isBudgetBreached`, `computeRemainingBudget`, `computeSpendRate`, `isWithinPeriod`, `validateBudgetScope`)
- [x] Task: Update `convex/budgets.ts` to import shared types/utilities from `./lib/budget`
- [x] Task: Update `pivot/src/policy/economic.ts` to import shared types/utilities from `../../../convex/lib/budget`
- [x] Task: Run pivot tests — all pass
- [x] Task: Run frontend and pivot typecheck — clean
- [x] Task: Update tech-debt.md to mark TD-025 resolved
- [x] Task: Commit checkpoint
