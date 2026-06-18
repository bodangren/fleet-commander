# Typed Convex Boundary Inventory

## Pivot String-Based Convex Calls

String-based Convex call sites in the pivot workspace that bypass the typed API boundary:

| Call Site | Target | Args | Return |
| --- | --- | --- | --- |
| retrospectives.ts | `api.retrospectives.list` | `{ projectId }` | `Doc<"retrospectives">[]` |
| costs.ts | `api.costs.getSummary` | `{ sprintId }` | `CostSummary` |
| analytics.ts | `api.analytics.record` | `{ metric, value }` | `void` |
| performance.ts | `api.performance.query` | `{ filter }` | `PerformanceData` |

## Frontend String-Based Convex Calls

String-based Convex call sites in the frontend workspace:

| Call Site | Target | Args | Return |
| --- | --- | --- | --- |
| useConvexData.ts | `getDashboard` | `{ projectId }` | `DashboardData` |
| useConvexRealtime.ts | `subscribe` | `{ channel }` | `Subscription` |

## Convex-Related `as any`

Documented `as any` escapes used at the Convex boundary:

| Location | Reason | Allowlist |
| --- | --- | --- |
| convexClient.ts | Dynamic function reference routing | Tracked |
| typedConvexClient.ts | Generic wrapper type coercion | Tracked |

## Wrapper Design

The `dynamicConvexCall` wrapper solves dynamic function selection where the call target is not known at compile time. Use cases include:

- **RetrospectiveScheduler**: dynamically dispatches Convex queries/mutations based on runtime configuration via `retrospective/scheduler` routing
