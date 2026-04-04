# Implementation Plan - Fix Open Tech Debt (TD-005 to TD-008)

## Phase 1: TD-007 — Review Lookup Returns Latest Review

- [x] Write test: review endpoint returns most recent review for a task with multiple reviews `c9ab68e`
- [x] Update `pivot/src/routes/logs.ts` review endpoint to return latest review as single object matching `TaskReviewResponse` shape `c9ab68e`
- [x] Write test: review endpoint returns `not_found` status when no reviews exist for task `c9ab68e`

## Phase 2: TD-008 — Reviewer-Agent Execution Hooks

- [x] Write test: orchestrator calls review hooks after task succeeds `d544196`
- [x] Add `runReview` hook to `IssueHooks` interface in `pivot/src/orchestrator/types.ts` `d544196`
- [x] Implement review hook invocation in `pivot/src/orchestrator/orchestrator.ts` success path `d544196`
- [x] Write test: review results logged with `agent-reviewed` status `d544196`

## Phase 3: TD-005 & TD-006 — Verify Multiline Issues and Zero Settings

- [x] Write test: issue body with multiline content round-trips through Convex storage `a6144f0`
- [x] Write test: settings with `0` value persist correctly through `setSetting` mutation `a6144f0`
- [x] Verify existing issue creation code handles multiline (already uses `body` field, not frontmatter) `a6144f0`
- [x] Verify existing settings route passes `0` through (already stores `valueJson` directly) `a6144f0`

## Phase 4: Integration & Verification

- [x] Wire review endpoint to return proper `TaskReviewResponse` with `agentReview` field `c9ab68e`
- [x] End-to-end test: complete task → review hook fires → review logged → frontend displays results `d544196`
- [x] Run `bun test` — 82 tests pass, 0 fail `a6144f0`
- [x] Update plan.md checkboxes, write deviation notes if any
