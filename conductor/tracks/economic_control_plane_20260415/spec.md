# Specification — Economic Control Plane (B3)

## Overview

Cost is currently passive — measured, reported, never acted on. This track makes budget a first-class input to dispatch, retry, harness selection, and review depth.

## Functional Requirements

- **FR1:** `budgets` Convex table keyed by scope (`global`, `project:<id>`, `sprint:<id>`) with `periodStart`, `periodEnd`, `cap`, `spent`, `policy` (strict|soft|advisory).
- **FR2:** Dispatch modulator: when remaining budget < threshold, score penalty scales with task `expectedCost`; strict policy excludes high-cost tasks entirely.
- **FR3:** Retry modulator: after N retries, next retry must either escalate (different persona/harness) or drop to human_review. No infinite cheap retry loops.
- **FR4:** Harness downgrade rule: low-`budget_weight` tasks (per A2 policy) are routed to cheaper harnesses when available; high-risk tasks (per run contract `riskClass`) get pricier/stricter harness regardless.
- **FR5:** Review depth modulator: high-risk/high-cost tasks require deeper review (multi-agent, per existing multiagent_code_review track); low-risk/low-cost tasks get lightweight review.
- **FR6:** Budget breach events write to `governanceEvents` table and surface in B4 Ops Console.
- **FR7:** Budget overrun during a task-in-flight does not kill the task; it prevents *new* dispatches.

## Acceptance Criteria

1. `budgets` table + CRUD mutations/queries in Convex.
2. `pivot/src/policy/economic.ts` exports modulators: `applyBudgetPenalty`, `shouldEscalateRetry`, `selectHarnessByEconomics`, `requiredReviewDepth`.
3. Integration test: exhausting project budget prevents new dispatches but allows in-flight to complete.
4. Integration test: task exceeds retry budget → recovery returns `escalate`, not `retry`.
5. Integration test: low-risk task routes to cheap harness when available; high-risk task forced to configured strict harness.
6. Governance event emitted on each breach; persisted to Convex.
7. 80%+ coverage on `economic.ts`.

## Out of Scope

- Multi-user budget RBAC (deferred).
- External billing API integration.
- Predictive budget forecasting.

## Tech Stack

- **Storage:** Convex `budgets`, `governanceEvents`
- **Location:** `pivot/src/policy/economic.ts`
- **Hooks:** Modifies B2 scoring output + retry decision in orchestrator
