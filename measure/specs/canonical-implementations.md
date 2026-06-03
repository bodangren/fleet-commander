# Canonical Implementations Registry

> Declares the single canonical implementation for each subsystem that has known duplicates.
> Derived from the graph-node audit (2026-06-02) and the audit remediation track.

## Markdown Parsing

**Canonical:** `frontend/src/components/MarkdownEditor.tsx` (inline parser)
**Duplicate:** `frontend/src/components/MarkdownViewer.tsx` (byte-identical `parseInlineTokens` + `renderPreviewBlock`)
**Action:** Extract shared parsing to `frontend/src/lib/markdown.ts`, import from both components.
**Resolves:** TD-215

## Kanban Board

**Canonical:** `frontend/src/components/kanban/KanbanBoard.tsx` (decomposed, sprint-based, Convex-backed)
**Legacy:** `frontend/src/components/legacy/KanbanBoard.tsx` (monolithic, project-track-phase hierarchy)
**Production callers:**
- Canonical: `KanbanBoardPage.tsx` (route `/board`)
- Legacy: `ProjectViewPage.tsx` (route `/project/:id`)
**Decision:** Legacy kanban is intentionally retained. It renders the daemon's `ProjectDetail` hierarchy (tracks → phases → tasks), which is a fundamentally different data model from the Convex-backed `KanbanTask[]` used by the canonical board. Replacing it would require either a data transformation layer or migrating ProjectViewPage's data source to Convex — both out of scope for this remediation track.
**Resolves:** TD-221 (partially — legacy kanban is documented as intentional, not deleted)

## Dashboard / Analytics Pages

**Canonical pages (routed in App.tsx):**
- `frontend/src/pages/AnalyticsDashboard.tsx` — decomposed chart components
- `frontend/src/pages/PerformanceDashboard.tsx` — decomposed components
- `frontend/src/pages/CostsPage.tsx` — monolith but active

**Deleted orphan pages (2026-06-03):**
- `frontend/src/pages/AnalyticsPage.tsx` — only imported by own test
- `frontend/src/pages/PerformancePage.tsx` — only imported by own test, cascaded to `usePerformanceData` hook deletion
- `frontend/src/pages/CostDashboard.tsx` — zero imports, cascaded to 5 `components/cost/` file deletions
**Resolves:** General parallel-implementation concern (TD-215 pattern)

## Convex Client Wrapper (Pivot)

**Canonical:** `pivot/src/convexClient.ts` (20 production importers, now includes `api`, `typedQuery`, `typedMutation`)
**Deleted:** `pivot/src/typedConvexClient.ts` (merged into convexClient.ts on 2026-06-03, had 0 importers)
**Resolves:** TD-204

## Task Types

**Canonical:** `pivot/src/orchestrator/types.ts:Task` (Convex-backed, sprint-based)
**Legacy:** `pivot/src/pipeline/agentTypes.ts:Task` (file-system/project-slug/track-based)
**Context:** These model fundamentally different data systems. The orchestrator `Task` aligns with the Convex schema (projectId, sprintId, storyPoints, costEstimate). The pipeline `Task` aligns with the legacy file-based pipeline (projectSlug, trackId, taskKey, dependencies, sessionId). The status enums also differ (`backlog`/`review` vs `todo`/no `review`).
**Decision:** Keep both as-is. The pipeline `Task` is used by `PipelineScheduler` which operates against a different data model. Collapsing them requires migrating the pipeline's data source to Convex — out of scope for this remediation track. Track as tech debt (TD-210).
**Resolves:** TD-206, TD-210 (partially — documented as intentional split)

## Scheduler / Execution Path

**Canonical:** `pivot/src/orchestrator/orchestrator.ts:runProject()` (invoked by `autoRunner.ts` and `server.ts`)
**Duplicate:** `pivot/src/pipeline/scheduler.ts:PipelineScheduler` (live at `/api/pipeline-engine/` but uses different data model and extensive `as any` casts)
**Action:** Keep `runProject` as canonical. Evaluate whether `/api/pipeline-engine/` routes are needed; if so, rewrite to use `runProject` internals. Delete `PipelineScheduler` when no longer needed.
**Resolves:** TD-210

## Convex Availability Helpers

**Frontend canonical:** `frontend/src/lib/convex.ts:isConvexAvailable()`
**Frontend duplicate:** `frontend/src/lib/ConvexProvider.tsx:hasConvexUrl()` (creates a second `ConvexReactClient` instance)
**Pivot canonical:** `pivot/src/convexClient.ts:getConvexUrl()`
**Pivot duplicate:** `pivot/src/typedConvexClient.ts:getConvexUrl()` (identical implementation)
**Action:** Frontend: consolidate into single `ConvexReactClient` instance, remove `hasConvexUrl()`. Pivot: delete duplicate with `typedConvexClient.ts`.
**Resolves:** TD-204, TD-226 (proposed)
