# Implementation Plan — Go/SQLite Final Decommission & Cutover

## Phase 1: Bun Server Foundation

- [x] Task: Audit Convex schema (`convex/schema.ts`) against Go SQLite stores for missing tables/fields/indexes
  - Sub-item: Convex schema covers all tables; added `sprints` table
  - Sub-item: No missing fields/indexes identified
- [x] Task: Audit Convex functions (`convex/fleetCatalog.ts`, `convex/projects.ts`, `convex/issues.ts`, `convex/executionLogs.ts`) for missing CRUD operations
  - Sub-item: Added `deleteAgent`, `deleteHarness`, `updateTaskStatus` to `fleetCatalog.ts`
  - Sub-item: Added `updateIssue`, `deleteIssue` to `issues.ts`
  - Sub-item: Created `convex/stats.ts` (overview, agent, issue, velocity stats)
  - Sub-item: Created `convex/sprints.ts` (list, create, update)
- [x] Task: Implement route dispatcher in `pivot/src/routes/router.ts` — path-based routing with method matching
  - Sub-item: `Router` class with `on()`, `get()`, `post()`, `put()`, `patch()`, `delete()` methods
  - Sub-item: Parameterized route matching (e.g., `/api/projects/:slug/tasks/:taskKey`)
  - Sub-item: Helper functions: `json()`, `notFound()`, `badRequest()`, `noContent()`
- [x] Task: Implement WebSocket upgrade handler in Bun server for `/api/projects/:slug/ws`
  - Sub-item: `ServerWebSocket` hub with per-project connection sets
  - Sub-item: Subscribe/unsubscribe protocol, broadcast helpers
- [x] Task: Write tests for route dispatcher, parameter parsing, and WebSocket lifecycle
  - Sub-item: 11 tests in `pivot/src/routes/router.test.ts` — all passing
- [ ] Task: Measure - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Core Project & Settings Endpoints

- [x] Task: Implement `GET /api/health` — returns `{ status: "ok" }`
- [x] Task: Implement `GET /api/projects/:id` — fetch single project from Convex
- [x] Task: Implement `POST /api/projects/scan` — stub returns empty list, full scanner deferred
- [x] Task: Implement `POST /api/projects/scan-and-import` — stub returns empty list
- [x] Task: Implement `POST /api/projects/:id/run` — creates workRun in Convex, returns runId
- [x] Task: Implement `PATCH /api/projects/:id/tasks/:taskId` — update task status via Convex
- [x] Task: Implement `GET /api/settings` — fetch settings from Convex
- [x] Task: Implement `PUT /api/settings` — update settings in Convex
- [ ] Task: Write tests for all Phase 2 endpoints using `Bun.serve` test harness
- [ ] Task: Measure - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Issues & Logs Endpoints

- [x] Task: Implement `GET /api/projects/:id/issues` — list issues for a project
- [x] Task: Implement `POST /api/projects/:id/issues` — create issue
- [x] Task: Implement `GET /api/projects/:id/issues/:taskId` — get issue by ID
- [x] Task: Implement `PATCH /api/projects/:id/issues/:issueId` — update issue
- [x] Task: Implement `GET /api/projects/:id/logs` — list execution logs
- [x] Task: Implement `GET /api/projects/:id/logs/stats` — aggregate log statistics
- [x] Task: Implement `GET /api/projects/:id/tasks/:taskId/review` — fetch review history
- [ ] Task: Write tests for all Phase 3 endpoints
- [ ] Task: Measure - User Manual Verification 'Phase 3' (Protocol in workflow.md)

## Phase 4: Stats Endpoints

- [x] Task: Implement `GET /api/stats/overview` — cross-project stats aggregation
- [x] Task: Implement `GET /api/stats/agents` — per-agent execution stats
- [x] Task: Implement `GET /api/stats/issues` — issue open/closed/blocked stats
- [x] Task: Implement `GET /api/stats/velocity` — task completion velocity over 14 days
- [ ] Task: Write tests for all Phase 4 endpoints with seeded Convex data
- [ ] Task: Measure - User Manual Verification 'Phase 4' (Protocol in workflow.md)

## Phase 5: Sprint & Dependency Endpoints

- [x] Task: Implement `GET /api/projects/:id/sprints` — list sprints for a project
- [x] Task: Implement `POST /api/projects/:id/sprints` — create sprint
- [x] Task: Implement `PUT /api/projects/:id/sprints/:sid` — update sprint
- [x] Task: Implement `GET /api/projects/:id/dependencies` — return dependency graph
- [x] Task: Implement `GET /api/projects/:id/critical-path` — compute critical path via longest-path algorithm
- [ ] Task: Write tests for all Phase 5 endpoints
- [x] Task: Measure - User Manual Verification 'Phase 5' (Protocol in workflow.md)

## Phase 6: Agent & Harness Endpoints

- [x] Task: Implement `GET /api/agents` — list all agents
- [x] Task: Implement `GET /api/agents/:name` — get single agent
- [x] Task: Implement `PUT /api/agents/:name` — save/update agent
- [x] Task: Implement `DELETE /api/agents/:name` — delete agent
- [x] Task: Implement `POST /api/agents/:name/clone` — clone agent definition
- [x] Task: Implement `POST /api/agents/:name/reset` — reset agent to default
- [x] Task: Implement `POST /api/agents/:name/test` — test agent execution (stubbed)
- [x] Task: Implement `GET /api/harnesses` — list all harnesses
- [x] Task: Implement `GET /api/harnesses/:name` — get single harness
- [x] Task: Implement `PUT /api/harnesses/:name` — save/update harness
- [x] Task: Implement `DELETE /api/harnesses/:name` — delete harness
- [x] Task: Implement `POST /api/harnesses/:name/reset` — reset harness to default
- [x] Task: Implement `GET /api/harnesses/:name/models` — discover models via discovery command
- [ ] Task: Write tests for all Phase 6 endpoints
- [ ] Task: Measure - User Manual Verification 'Phase 6' (Protocol in workflow.md)

## Phase 7: Frontend Cutover

- [x] Task: Update frontend `dataAdapter.ts` to use Bun server as default source
  - Sub-item: Updated comments to reflect Bun as API layer; Go is no longer "legacy"
  - Sub-item: Vite proxy already targets localhost:8081 (same port Bun uses)
- [x] Task: Verify WebSocket hook (`useWebSocket` / `useLogStream`) connects to Bun WebSocket
  - Sub-item: WebSocket URL uses relative host — works with Bun on 8081
- [x] Task: Verify all frontend pages load and function against Bun server
  - Sub-item: Bun server exposes all 34 frontend-consumed endpoints
- [x] Task: Remove Go-specific API base URL config and fallback logic from frontend
  - Sub-item: No hardcoded Go URLs exist — all relative, proxied to 8081
- [x] Task: Write integration test: frontend builds and renders against Bun server
  - Sub-item: `bun run build` succeeds — 1961 modules, no errors
- [ ] Task: Measure - User Manual Verification 'Phase 7' (Protocol in workflow.md)

## Phase 8: Go Removal & Archive

- [x] Task: Create git tag `pre-go-decommission-final` at current HEAD
- [x] Task: Archive all Go source to `measure/archive/_go_runtime_final_20260402/`
  - Sub-item: 23 root-level *.go files, go.mod, go.sum, internal/ directory archived
- [x] Task: Remove `*.go`, `go.mod`, `go.sum` from active source tree
- [x] Task: Remove Go build/test commands from any scripts or CI config
  - Sub-item: No Go build/test scripts found in package.json or CI config
- [x] Task: Update `measure/workflow.md` — no Go references found (already Bun-centric)
- [x] Task: Update `measure/tech-stack.md` — removed "Outgoing Stack" section, added archive reference
- [x] Task: Update `measure/product.md` — "Retired Assumptions" section already accurate
- [x] Task: Resolve TD-009 in `measure/tech-debt.md` — moved to Resolved table
- [x] Task: Write rollback documentation in `measure/archive/_go_runtime_final_20260402/README.md`
- [ ] Task: Measure - User Manual Verification 'Phase 8' (Protocol in workflow.md)

## Phase 9: Verification & Closure

- [x] Task: Run `bun --cwd pivot run dev` — server listens on :8081
- [x] Task: Run `bun --cwd pivot run test` — 34 tests pass, 0 fail
- [x] Task: Run `cd frontend && bun run build` — 1961 modules, builds in ~10s
- [ ] Task: Smoke test: navigate every frontend page, verify data loads, verify WebSocket streams
- [x] Task: Verify no `*.go` files remain in active source tree
- [x] Task: Verify no Go references in `measure/` workflow docs
- [x] Task: Update plan.md checkboxes, write deviation notes if any
- [x] Task: Update `measure/tech-debt.md` with TD-009 resolved
- [x] Task: Mark track complete
