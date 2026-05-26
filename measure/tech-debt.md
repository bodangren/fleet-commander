# Tech Debt Registry

> Curated working memory. Keep at or below **50 lines**. Remove resolved items once they no longer influence near-term planning. See `archive/tech-debt-resolved.md` for historical resolved items.

## Open Tech Debt

| ID | Description | Severity |
| --- | --- | --- |
| TD-100 | Test strategy contradicts actual architecture (insights_20260517 assumes Convex queries; data flows through pivot API) | Medium |
| TD-108 | Test strategy instructs extending `convex-provider.tsx`, but TDD red-phase forbids modifying existing source code | Medium |
| TD-113 | Recharts-based chart tests fail in jsdom; `ResponsiveContainer` produces 0×0 SVG — excludes CostTrendChart (custom HTML/CSS, tests pass) | Critical |
| TD-118 | Error boundary tests fail across hooks: React error propagation doesn't surface thrown errors to `result.error` in vitest; orphan InsightsErrorBoundary.test.tsx exists (component missing) | High |
| TD-125 | ~~Kanban spec gaps deferred: duration display, cost/point comparison, blocker reason, unblock action, agent chain, timeline link~~ — **RESOLVED**: Scoped into settings_polish_20260517 track | Medium |


## Reproduction Detail

### TD-141: Dual project identifier schema
1. Create a project via `POST /api/projects` → receives `_id: "k56e8..."`
2. Import tracks via `importAllTracks.ts` → tracks stored with `projectSlug: "kanban-conductor"`
3. Try to query tracks for the project ID → no index matches `projectId` on `tracks` table
4. Sprint planning queries tasks by `projectId` and tracks by `projectSlug` — cannot join them

### TD-142: Hardcoded sync script paths
1. Open `pivot/src/sync/importAllTracks.ts` → line 8-9 hardcodes `TRACKS_DIR` and `PROJECT_SLUG = 'kanban-conductor'`
2. Open `pivot/src/sync/importTasksFromPlans.ts` → line 6-7 hardcodes different `PROJECT_SLUG = 'fleet-commander'`
3. Neither script accepts CLI arguments; both fail on any machine without `/home/daniel-bo/Desktop/fleet-commander/`

### TD-143: Project name used as git filesystem path
1. Create project named `"My Cool App"` via API
2. Call `GET /api/git/status?project=<id>`
3. `getProjectPath` returns `project.name` → `"My Cool App"`
4. `GitClient` runs `git status` with `cwd: "My Cool App"` → fails if directory has spaces or lives elsewhere

### TD-144: Sprint creation without project validation
1. Call `POST /api/planning/sprints` with `{ projectId: "nonexistent-id", name: "Sprint 1", budget: 100 }`
2. `createSprintHandler` inserts the row without checking `projects` table
3. Sprint exists but is orphaned from any real project

### TD-145: Type safety bypass in git routes
1. `pivot/src/routes/git.ts:10` calls `client.query(api.projects.getProjectHandler as any, { id: slug })`
2. The `as any` removes compile-time checking of the `id` argument type
3. If the generated Convex schema changes, this call will fail at runtime instead of build time

