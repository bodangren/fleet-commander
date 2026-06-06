# Typed Convex API Boundary — Inventory

Generated 2026-06-07. Covers all string-based Convex calls and Convex-related `as any` casts in pivot and frontend.

---

## Pivot String-Based Convex Calls

| Call Site | Target | Args | Return |
|-----------|--------|------|--------|
| `routes/retrospectives.ts:18` | `fleetCatalog:listAgents` | `{}` | `Array<Record<string, unknown>>` |
| `routes/retrospectives.ts:93` | `sprints:getSprintById` | `{ id: sprintId } | `(sprint as any)?.name` |
| `routes/retrospectives.ts:97` | `retrospectives:createRetrospective` | `{ sprintId, projectSlug, name, triggeredBy }` | `string` |
| `routes/retrospectives.ts:106` | `retrospectives:getSprintAggregateData` | `{ sprintId }` | `unknown` |
| `routes/retrospectives.ts:111` | `retrospectives:failRetrospective` | `{ id, reportMarkdown }` | `void` |
| `routes/retrospectives.ts:121` | `retrospectives:failRetrospective` | `{ id, reportMarkdown }` | `void` |
| `routes/retrospectives.ts:131` | `retrospectives:failRetrospective` | `{ id, reportMarkdown }` | `void` |
| `routes/retrospectives.ts:138` | `retrospectives:completeRetrospective` | `{ id, reportMarkdown, aggregatedDataJson }` | `void` |
| `routes/retrospectives.ts:164` | `retrospectives:listRetrospectives` | `{ projectSlug, sprintId, limit }` | `unknown` |
| `routes/retrospectives.ts:173` | `retrospectives:getRetrospective` | `{ id }` | `unknown` |
| `routes/retrospectives.ts:198` | `retrospectives:getRetrospective` | `{ id }` | `unknown` |
| `routes/costs.ts:15` | `costs:getCostByProject` | `{ days, projectSlug }` | `unknown` |
| `routes/costs.ts:24` | `costs:getCostByAgent` | `{ days, projectSlug }` | `unknown` |
| `routes/costs.ts:33` | `costs:getCostTrend` | `{ days, projectSlug }` | `unknown` |
| `routes/costs.ts:42` | `costs:getSessionSavings` | `{ days, projectSlug }` | `unknown` |
| `routes/costs.ts:51` | `costs:getCostPerTask` | `{ days, projectSlug }` | `unknown` |
| `routes/analytics.ts:17` | `analytics:getCompletionTrends` | `{ days, projectSlug, agent, priority }` | `unknown` |
| `routes/analytics.ts:32` | `analytics:getAgentUtilization` | `{ days, projectSlug, agent }` | `unknown` |
| `routes/analytics.ts:47` | `analytics:getBottlenecks` | `{ days, projectSlug, agent, priority }` | `unknown` |
| `routes/analytics.ts:63` | `analytics:getQueueDepth` | `{ days, projectSlug, agent, priority }` | `unknown` |
| `routes/analytics.ts:77` | `analytics:getHookMetrics` | `{ days, projectSlug }` | `unknown` |
| `routes/analytics.ts:91` | `analytics:getSessionMetrics` | `{ days, projectSlug, agent, priority }` | `unknown` |
| `routes/performance.ts:16` | `performance:getPhaseBreakdown` | `{ days, projectSlug, agent }` | `unknown` |
| `routes/performance.ts:30` | `performance:getPhaseTrends` | `{ days, projectSlug, agent }` | `unknown` |
| `routes/performance.ts:43` | `performance:getAgentLatencyStats` | `{ days, projectSlug }` | `unknown` |
| `routes/performance.ts:57` | `performance:getSlowAgents` | `{ days, projectSlug, thresholdMultiplier, minConsecutiveBreaches }` | `unknown` |
| `routes/performance.ts:72` | `performance:getRegressionAlerts` | `{ days, projectSlug, degradationThreshold }` | `unknown` |
| `routes/performance.ts:89` | `performance:getEmployeePerformance` | `{ employeeId, projectId, windowDays }` | `unknown` |
| `retrospective/scheduler.ts:54` | `projects:listProjects` | `{}` | `Array<Record<string, unknown>>` |
| `retrospective/scheduler.ts:60` | `sprints:listSprints` | `{ projectSlug }` | `Array<Record<string, unknown>>` |
| `retrospective/scheduler.ts:68` | `retrospectives:listRetrospectives` | `{ sprintId, limit }` | `Array<Record<string, unknown>>` |
| `server.ts:128` | `projects:listProjects` (via `onUpdate`) | `{}` | N/A (realtime) |

**Total: 31 string-based calls in pivot** (24 queries, 4 mutations, 3 scheduler queries)

---

## Frontend String-Based Convex Calls

| Call Site | Target | Args | Return |
|-----------|--------|------|--------|
| `pages/ProjectTemplatesPage.tsx:35` | `seedDefaultProjectTemplatesHandler` | `{}` | `unknown` |
| `pages/ProjectTemplatesPage.tsx:43` | `instantiateProjectHandler` | `{ templateId, projectName }` | `unknown` |
| `pages/ProjectViewPage.tsx:91-93` | `createProjectTemplate` | `payload` | `unknown` |
| `lib/convex-data/core.ts:148` | dynamic `queryName` param | `args` | `unknown` |
| `lib/useLogStream.ts:76` | `executionLogs:listRecentLogs` | `{}` | `unknown` |

**Total: 5 string-based calls in frontend** (2 mutations, 2 onUpdate, 1 dynamic)

---

## Convex-Related `as any`

### Pivot — String-literal escape (function references)

All 29 string-based `.query()`/`.mutation()` calls in pivot use `'...' as any` on the function reference string to bypass TypeScript's `FunctionReference` requirement.

### Pivot — Property access on untyped results

| File | Line | Cast | Purpose |
|------|------|------|---------|
| `routes/retrospectives.ts` | 94-95 | `(sprint as any)?.name` | Access property on untyped query result |
| `orchestrator/autoRunner.ts` | 87-88 | `(setting as any).valueJson` | Access property on untyped query result |

### Pivot — Convex ID type coercion

| File | Line | Cast | Purpose |
|------|------|------|---------|
| `routes/providers.ts` | 49 | `providerId as any` | Cast string to Convex ID |
| `policy/providerHealthMonitor.ts` | 227 | `result.providerId as any` | Cast string to Convex ID |
| `routes/projects.ts` | 30, 46, 165 | `params.id as any` | Cast route param to Convex ID |
| `routes/sprintPlanning.ts` | 29, 63, 74-76, 93 | various `as any` | Cast strings/arrays to Convex IDs |

### Pivot — Other

| File | Line | Cast | Purpose |
|------|------|------|---------|
| `server.ts` | 128 | `realtimeClient as any` | Cast ConvexClient to any for `.onUpdate()` |
| `sync/syncProvidersFromConfig.ts` | 37 | `providerConfig as any` | Cast generic object entry |

### Frontend

| File | Line | Cast | Purpose |
|------|------|------|---------|
| `pages/ProjectTemplatesPage.tsx` | 35, 43 | `'...' as any` | String mutation name escape |
| `pages/ProjectViewPage.tsx` | 92 | `client as unknown as { mutation: ... }` | Double-cast for string-based mutation |
| `lib/convex-data/core.ts` | 140, 148 | `let client: any` / `(client as any).onUpdate(...)` | Dynamic import typed as any |
| `lib/useLogStream.ts` | 76 | `(client as any).onUpdate(...)` | Cast client to any for onUpdate |

---

## Wrapper Design

### Motivation

The existing `typedQuery`/`typedMutation` helpers in `pivot/src/convexClient.ts` require the caller to know the function kind (`'query'` or `'mutation'`) at the call site. This works for direct call sites but fails for **dynamic function selection** patterns like `RetrospectiveScheduler` (lines 54-68), where the function reference is chosen at runtime based on iteration over projects and sprints.

### Design: `dynamicConvexCall`

A single generic wrapper that accepts a `FunctionReference<'query'> | FunctionReference<'mutation'>` and routes to the correct client method automatically.

```ts
async function dynamicConvexCall<Fn extends FunctionReference<'query'> | FunctionReference<'mutation'>>(
  client: ConvexHttpClient,
  fn: Fn,
  args: FunctionArgs<Fn>,
): Promise<FunctionReturnType<Fn>>
```

**Type safety:**
- `Fn` is constrained to `FunctionReference<'query'> | FunctionReference<'mutation'>` — string literals are rejected at compile time.
- `args` is inferred from `FunctionArgs<Fn>` — no `unknown` fallback.
- Return type is inferred from `FunctionReturnType<Fn>` — no `as` cast needed.

**Runtime behavior:**
- Inspects `fn._type` (the internal `FunctionReference` discriminator) to route to `client.query()` or `client.mutation()`.
- Delegates directly — no wrapping, no extra overhead.

**Migration path for RetrospectiveScheduler:**
Replace `'projects:listProjects' as any` with `api.projects.listProjects`, and `client.query(...)` with `dynamicConvexCall(client, fn, args)`. The `as Array<Record<string, unknown>>` casts become unnecessary once the return type is inferred.
