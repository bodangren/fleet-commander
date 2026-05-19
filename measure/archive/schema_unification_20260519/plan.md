# Implementation Plan: Schema Unification

## Phase 1: Remove Duplicate Schema Definitions
- [x] Task: Remove first definitions of `projects`, `sprints`, `tasks`, `agents` from `convex/schema.ts`
- [x] Task: Verify schema compiles and types are consistent

## Phase 2: Clean Up Broken Backend Handlers
- [x] Task: Remove old-schema handlers from `convex/projects.ts` (`listProjects`, `getProjectBySlug`, `getProjectDetail`, `deleteProject`, `upsertProject`)
- [x] Task: Remove old-schema handlers from `convex/sprints.ts` (`listSprints`, `getSprintById`, `createSprint`, `updateSprint`)
- [x] Task: Fix `convex/schema.test.ts` — update `agents` undefined assertion

## Phase 3: Update Pivot API Routes
- [x] Task: Update `pivot/src/routes/projects.ts` to use foundation handlers (`listProjectsHandler`, `getProjectHandler`, `createProjectHandler`, `updateProjectHandler`, `deleteProject`)
- [x] Task: Remove or stub old-schema routes (`/api/projects/:slug/run`, `/api/projects/:slug/tasks/:taskKey`, `/api/projects/:slug/next-task`) that call `fleetCatalog`

## Phase 4: Clean Up Frontend Dead Hooks
- [x] Task: Remove old-schema Convex hooks from `frontend/src/lib/useConvexData.ts` (`useConvexProjectsTransformed`, `useConvexAgentsTransformed`, `useConvexHarnessesTransformed`, `useConvexTasks`, `useConvexIssues`, `useConvexLogs`)
- [x] Task: Update `useFleetData.ts` and `ProjectCard.tsx` to remove dead hook imports

## Phase 5: Verification
- [x] Task: Run `bun --cwd pivot typecheck` — ensure no NEW errors introduced
- [x] Task: Run `bun --cwd frontend check` — ensure no NEW errors introduced
- [x] Task: Run `bun --cwd pivot test` — ensure tests pass
- [x] Task: Update `measure/tech-debt.md` — mark TD-078 and TD-079 resolved
- [x] Task: Update `measure/tracks.md` — mark this track complete
- [x] Task: Commit with `chore(schema): Unify projects/sprints/tasks/agents to foundation schema`
