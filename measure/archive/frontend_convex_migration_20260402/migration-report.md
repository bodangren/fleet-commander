# Migration Report — Frontend Convex Migration (Pass 1)

## Summary
Date: 2026-04-02
Track: Frontend Migration to Convex-Backed Data Flows

## What Was Done

### Convex Backend
- Added missing Convex query functions: `listAgents`, `getAgentByName`, `listHarnesses`, `getHarnessByName`, `listTasksByProject`, `listTracksByProject`, `getSetting`, `listSettingsByScope`
- Created new `convex/issues.ts` with `listIssuesByProject` and `getIssueById`
- All new functions compile and pass `npx convex dev --once`

### Frontend Infrastructure
- Added `convex` npm dependency to `frontend/package.json`
- Created `frontend/src/lib/convex.ts` — Convex client factory
- Created `frontend/src/lib/dataAdapter.ts` — per-slice feature flags (`VITE_SOURCE_*`)
- Created `frontend/src/lib/ConvexProvider.tsx` — React provider wrapper
- Created `frontend/src/lib/useConvexData.ts` — imperative Convex subscriptions (no provider required)
- Created `frontend/src/lib/useLogStream.ts` — unified log stream hook (WebSocket or Convex)
- Updated `frontend/src/lib/useFleetData.ts` — merges Convex data overlay with Go fallback
- Updated `frontend/src/App.tsx` — uses `useLogStream` and wraps with `ConvexProvider`
- Added `@convex` path alias to `tsconfig.json` and `vite.config.ts`

### Tests Added
- `frontend/src/lib/dataAdapter.test.ts` — adapter config validation
- `frontend/src/lib/useConvexData.test.ts` — transformation function tests
- `frontend/src/lib/useLogStream.test.ts` — adapter boundary selection tests

### Audit Document
- Created `measure/tracks/frontend_convex_migration_20260402/audit.md` — full inventory of 45 fetch calls mapped to Convex functions

## Migration Status by Slice

| Slice | Status | Approach |
|-------|--------|----------|
| Projects list | ✅ Convex-ready | `useConvexProjectsTransformed` overlay |
| Agents list | ✅ Convex-ready | `useConvexAgentsTransformed` overlay |
| Harnesses list | ✅ Convex-ready | `useConvexHarnessesTransformed` overlay |
| Tasks | ✅ Convex-ready | `useConvexTasks` hook available |
| Issues | ✅ Convex-ready | `useConvexIssues` hook available |
| Execution logs | ✅ Convex-ready | `useConvexLogs` hook + `useLogStream` |
| Settings | ✅ Convex-ready | `getSetting`/`listSettingsByScope` available |
| Log stream realtime | ✅ Convex path | `useLogStream` selects Convex or WebSocket |
| Stats (overview/velocity/agents/issues) | ❌ Go-only | No Convex schema; keep Go |
| Sprints | ❌ Go-only | No Convex schema; keep Go |
| Dependencies/critical-path | ❌ Go-only | No Convex schema; keep Go |
| WebSocket execution statuses | ⚠️ Partial | Convex log stream available; status tracking needs work |
| Orchestrator runs | ❌ Go-only | Runtime subprocess; keep Go |
| Health check | ❌ Go-only | Runtime status; keep Go |

## Remaining Legacy Dependencies

Pages/hooks still fully on Go API:
1. **Stats pages** — OverviewStats, VelocityChart, AgentUtilization, IssueResolution
2. **Sprint panel** — SprintPanel (CRUD for sprints)
3. **Dependency graph** — DependencyGraph (dependency/critical-path data)
4. **Settings page** — SettingsPage (read/write; Convex functions exist but not wired)
5. **Agent/Harness detail pages** — AgentEditorPage, HarnessEditorPage (CRUD + test/discovery)
6. **Project detail page** — ProjectViewPage (next-task, task status, orchestrator run, issue preview)
7. **Task review** — useTaskReview

## How to Enable Convex

1. Start Convex dev server: `CONVEX_AGENT_MODE=anonymous npx convex dev`
2. Set `frontend/.env.local`:
   ```
   VITE_CONVEX_URL=http://127.0.0.1:3210
   ```
3. Per-slice overrides (optional):
   ```
   VITE_SOURCE_PROJECTS=convex
   VITE_SOURCE_AGENTS=convex
   VITE_SOURCE_LOGS=convex
   ```
4. When `VITE_CONVEX_URL` is unset, all slices use Go API (backward compatible).
