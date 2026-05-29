# Tech Debt Registry

> Curated working memory. Keep at or below **50 lines**. Remove resolved items once they no longer influence near-term planning. See `archive/tech-debt-resolved.md` for historical resolved items.

## Open Tech Debt

| ID | Description | Severity |
| --- | --- | --- |
| TD-100 | Test strategy contradicts actual architecture (insights assumes Convex queries; data flows through pivot API) | Medium |
| TD-113 | Recharts jsdom 0×0 SVG; custom HTML/CSS charts pass | Critical |
| TD-118 | Error boundary tests fail in vitest; orphan InsightsErrorBoundary.test.tsx | High |
| TD-141 | Dual project identifier: `_id` vs `slug` — can't join tasks and tracks | Medium |
| TD-142 | Hardcoded sync script paths; no CLI args | Medium |
| TD-143 | Project name used as git filesystem path; spaces break it | Medium |
| TD-144 | Sprint creation without project validation — orphaned sprints | Medium |
| TD-145 | `as any` bypasses type safety in git routes and agent template handlers (partially addressed — agentTemplates fixed, git routes remain) | High |
| TD-154 | A/B test `/run` returns synthetic random data by default (mock flag added, real execution not implemented) | Medium |
| TD-155 | Zero frontend tests for 4 recent tracks (~1200 lines) — ALL-1 deferred | High |
| TD-156 | `agentTemplates` has no `workspaceId`; names globally unique, not per-workspace | Medium |

## Resolved by Review Remediation Track

| ID | Description | Resolution |
| --- | --- | --- |
| TD-148 | Portfolio health dead-code statuses | Fixed: uses `'closed'`/`'active'`/`'planned'`; green for closed within budget |
| TD-149 | Agent template delete `as any` | Fixed: added `templateId` field + `by_templateId` index |
| TD-150 | Retrospective query divergence | Fixed: `getSprintAggregateData` now calls tested `aggregateSprintData` |
| TD-151 | Similarity denominator bug | Fixed: uses truncated lengths in both Convex and pivot implementations |
| TD-152 | Scheduler template params | Fixed: `runSchedulerTick` calls `executeTaskWithEmployee` |
| TD-153 | Rejection reasons from dispatch | Fixed: queries task `rejectionReason` field |
| TD-157 | Three `formatDuration` implementations | Fixed: extracted to shared `frontend/src/lib/formatDuration.ts` |
