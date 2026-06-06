# Typed Convex API Boundary — Inventory

## Pivot String-Based Convex Calls

| Call Site | Target | Args | Return |
|-----------|--------|------|--------|
| `retrospectives.ts:18` | `fleetCatalog:listAgents` | `{}` | `Array<Record<string, unknown>>` |
| `retrospectives.ts:93` | `sprints:getSprintById` | `{ id: string }` | `Record<string, unknown>` |
| `retrospectives.ts:106` | `retrospectives:getSprintAggregateData` | `{ sprintId: string }` | `Record<string, unknown>` |
| `retrospectives.ts:164` | `retrospectives:listRetrospectives` | `{ sprintId: string, limit?: number }` | `Array<Record<string, unknown>>` |
| `retrospectives.ts:173` | `retrospectives:getRetrospective` | `{ id: string }` | `Record<string, unknown>` |
| `retrospectives.ts:198` | `retrospectives:getRetrospective` | `{ id: string }` | `Record<string, unknown>` |
| `retrospectives.ts:97` | `retrospectives:createRetrospective` | `{ sprintId, projectSlug, ... }` | `Record<string, unknown>` |
| `retrospectives.ts:111` | `retrospectives:failRetrospective` | `{ id: string }` | `void` |
| `retrospectives.ts:121` | `retrospectives:failRetrospective` | `{ id: string }` | `void` |
| `retrospectives.ts:131` | `retrospectives:failRetrospective` | `{ id: string }` | `void` |
| `retrospectives.ts:138` | `retrospectives:completeRetrospective` | `{ id: string }` | `void` |
| `performance.ts:16` | `performance:getPhaseBreakdown` | `{ days: number, projectSlug?: string }` | `Record<string, unknown>` |
| `performance.ts:30` | `performance:getPhaseTrends` | `{ days: number, projectSlug?: string }` | `Record<string, unknown>` |
| `performance.ts:43` | `performance:getAgentLatencyStats` | `{ days: number, projectSlug?: string }` | `Record<string, unknown>` |
| `performance.ts:57` | `performance:getSlowAgents` | `{ days: number, projectSlug?: string }` | `Record<string, unknown>` |
| `performance.ts:72` | `performance:getRegressionAlerts` | `{ days: number, projectSlug?: string }` | `Record<string, unknown>` |
| `performance.ts:89` | `performance:getEmployeePerformance` | `{ days: number, projectSlug?: string }` | `Record<string, unknown>` |
| `costs.ts:15` | `costs:getCostByProject` | `{ days: number, projectSlug?: string }` | `Record<string, unknown>` |
| `costs.ts:24` | `costs:getCostByAgent` | `{ days: number, projectSlug?: string }` | `Record<string, unknown>` |
| `costs.ts:33` | `costs:getCostTrend` | `{ days: number, projectSlug?: string }` | `Record<string, unknown>` |
| `costs.ts:42` | `costs:getSessionSavings` | `{ days: number, projectSlug?: string }` | `Record<string, unknown>` |
| `costs.ts:51` | `costs:getCostPerTask` | `{ days: number, projectSlug?: string }` | `Record<string, unknown>` |
| `analytics.ts:17` | `analytics:getCompletionTrends` | `{ days: number, projectSlug?: string }` | `Record<string, unknown>` |
| `analytics.ts:32` | `analytics:getAgentUtilization` | `{ days: number, projectSlug?: string }` | `Record<string, unknown>` |
| `analytics.ts:47` | `analytics:getBottlenecks` | `{ days: number, projectSlug?: string }` | `Record<string, unknown>` |
| `analytics.ts:63` | `analytics:getQueueDepth` | `{ days: number, projectSlug?: string }` | `Record<string, unknown>` |
| `analytics.ts:77` | `analytics:getHookMetrics` | `{ days: number, projectSlug?: string }` | `Record<string, unknown>` |
| `analytics.ts:91` | `analytics:getSessionMetrics` | `{ days: number, projectSlug?: string }` | `Record<string, unknown>` |
| `scheduler.ts:54` | `projects:listProjects` | `{}` | `Array<Record<string, unknown>>` |
| `scheduler.ts:60` | `sprints:listSprints` | `{ projectSlug: string }` | `Array<Record<string, unknown>>` |
| `scheduler.ts:68` | `retrospectives:listRetrospectives` | `{ sprintId: string, limit: number }` | `Array<Record<string, unknown>>` |
| `pipelines.ts:15` | `pipelines:startPipeline` | `{ ... }` | `Record<string, unknown>` |
| `pipelines.ts:40` | `pipelines:updatePipelineStatus` | `{ ... }` | `void` |
| `pipelines.ts:131` | `pipelines:getPipelineLogs` | `{ ... }` | `Array<Record<string, unknown>>` |

## Frontend String-Based Convex Calls

| Call Site | Target | Args | Return |
|-----------|--------|------|--------|
| `ProjectViewPage.tsx:93` | `createProjectTemplate` | `payload` | `unknown` |
| `ProjectTemplatesPage.tsx:35` | `seedDefaultProjectTemplatesHandler` | `{}` | `void` |
| `ProjectTemplatesPage.tsx:43` | `instantiateProjectHandler` | `{ ... }` | `unknown` |

## Convex-Related `as any`

| File | Line | Pattern | Context |
|------|------|---------|---------|
| `retrospectives.ts` | 18 | `'fleetCatalog:listAgents' as any` | String-based query arg cast |
| `retrospectives.ts` | 93 | `'sprints:getSprintById' as any` | String-based query arg cast |
| `retrospectives.ts` | 106 | `'retrospectives:getSprintAggregateData' as any` | String-based query arg cast |
| `retrospectives.ts` | 164 | `'retrospectives:listRetrospectives' as any` | String-based query arg cast |
| `retrospectives.ts` | 173 | `'retrospectives:getRetrospective' as any` | String-based query arg cast |
| `retrospectives.ts` | 198 | `'retrospectives:getRetrospective' as any` | String-based query arg cast |
| `retrospectives.ts` | 97 | `'retrospectives:createRetrospective' as any` | String-based mutation arg cast |
| `retrospectives.ts` | 111 | `'retrospectives:failRetrospective' as any` | String-based mutation arg cast |
| `retrospectives.ts` | 121 | `'retrospectives:failRetrospective' as any` | String-based mutation arg cast |
| `retrospectives.ts` | 131 | `'retrospectives:failRetrospective' as any` | String-based mutation arg cast |
| `retrospectives.ts` | 138 | `'retrospectives:completeRetrospective' as any` | String-based mutation arg cast |
| `performance.ts` | 16 | `'performance:getPhaseBreakdown' as any` | String-based query arg cast |
| `performance.ts` | 30 | `'performance:getPhaseTrends' as any` | String-based query arg cast |
| `performance.ts` | 43 | `'performance:getAgentLatencyStats' as any` | String-based query arg cast |
| `performance.ts` | 57 | `'performance:getSlowAgents' as any` | String-based query arg cast |
| `performance.ts` | 72 | `'performance:getRegressionAlerts' as any` | String-based query arg cast |
| `performance.ts` | 89 | `'performance:getEmployeePerformance' as any` | String-based query arg cast |
| `costs.ts` | 15 | `'costs:getCostByProject' as any` | String-based query arg cast |
| `costs.ts` | 24 | `'costs:getCostByAgent' as any` | String-based query arg cast |
| `costs.ts` | 33 | `'costs:getCostTrend' as any` | String-based query arg cast |
| `costs.ts` | 42 | `'costs:getSessionSavings' as any` | String-based query arg cast |
| `costs.ts` | 51 | `'costs:getCostPerTask' as any` | String-based query arg cast |
| `analytics.ts` | 17 | `'analytics:getCompletionTrends' as any` | String-based query arg cast |
| `analytics.ts` | 32 | `'analytics:getAgentUtilization' as any` | String-based query arg cast |
| `analytics.ts` | 47 | `'analytics:getBottlenecks' as any` | String-based query arg cast |
| `analytics.ts` | 63 | `'analytics:getQueueDepth' as any` | String-based query arg cast |
| `analytics.ts` | 77 | `'analytics:getHookMetrics' as any` | String-based query arg cast |
| `analytics.ts` | 91 | `'analytics:getSessionMetrics' as any` | String-based query arg cast |
| `scheduler.ts` | 54 | `'projects:listProjects' as any` | String-based query arg cast |
| `scheduler.ts` | 60 | `'sprints:listSprints' as any` | String-based query arg cast |
| `scheduler.ts` | 68 | `'retrospectives:listRetrospectives' as any` | String-based query arg cast |
| `pipelines.ts` | 15 | `(convexClient.mutation as any)` | Method-level cast |
| `pipelines.ts` | 40 | `(convexClient.mutation as any)` | Method-level cast |
| `pipelines.ts` | 131 | `(convexClient.query as any)` | Method-level cast |
| `ProjectTemplatesPage.tsx` | 35 | `'seedDefaultProjectTemplatesHandler' as any` | String-based mutation arg cast |
| `ProjectTemplatesPage.tsx` | 43 | `'instantiateProjectHandler' as any` | String-based mutation arg cast |

## Wrapper Design

Most call sites use a static `api.*` reference and can migrate directly to `typedQuery`/`typedMutation` with no wrapper needed. However, `retrospective/scheduler.ts` selects Convex functions dynamically at runtime (iterating projects, then sprints, then retrospectives) and passes results between calls — a pattern where storing `api.*` references in variables is cleaner than duplicating the call chain. The `dynamicConvexCall` wrapper accepts a `FunctionReference` value (from `api.*`) and routes to `client.query` or `client.mutation` based on the reference's kind, preserving full type inference for args and return types without `as any`.

### Dynamic fn selection use cases
- `retrospective/scheduler.ts` — iterates projects/sprints/retrospectives in a loop, calling different Convex functions based on runtime data
- `pipelines.ts` — calls `client.query`/`client.mutation` with method-level `as any` casts to work around the string-based API
