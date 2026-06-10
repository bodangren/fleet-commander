# Implementation Plan — Project Import Pipeline

Status: complete

Methodology: Contract-First + TDD. Tests precede implementation; commit per task;
update `graph.db` after source changes.

## Phase 1 — Real, reachable import

Blast radius: `upsertTask` (convex) — additive optional arg, callers unaffected.
`scan-and-import` route — currently returns `{projects:[{_id,name,...}]}`; shape
extended additively with `tracks`/`tasks` counts. New importer module has no
existing callers.

- [x] **1.1 Contract** — Define importer module surface in
      `pivot/src/sync/measureImporter.ts`: `parseTasksFromPlan`,
      `parseStoriesFromSpec`, `tshirtToPoints`, `storyPriorityToPriority`,
      and `collectProjectImport(projectPath)` returning
      `{ slug, name, tracks: Array<{ trackId, snapshot, tasks }> }`.
- [x] **1.2 Red** — `measureImporter.test.ts`: plan-task parsing (top-level only),
      story parsing (Connextra, estimate→points, priority mapping), `## Stories`
      vs fallback, and a temp-dir `collectProjectImport` fixture.
- [x] **1.3 Green** — Implement the module; extract `parseTasksFromPlan` from
      `importTasksFromPlans.ts` and re-import it there (no duplicated logic).
- [x] **1.4 Convex** — Add optional `storyPoints` arg to `fleetCatalog.upsertTask`
      (persist instead of hardcoded 0).
- [x] **1.5 Red (route)** — Extend `projects.test.ts`: `scan-and-import` upserts a
      track snapshot + tasks per discovered track and returns counts (mocked client).
- [x] **1.6 Green (route)** — Rewrite the route to resolve/create project by name,
      `collectProjectImport`, `upsertTrackSnapshot` + `upsertTask`, return counts.
- [x] **1.7 Frontend** — Render `WelcomeScreen` in `PortfolioPage` empty state +
      persistent "Import project" entry; surface ingest summary. Tests added.
- [x] **1.8 Doctor + graph** — `measure/doctor.sh` as-any gate was already red on
      HEAD (typed-convex track in flight); no new violations added (verified via
      baseline diff). `build-graph update ./graph.db` ran (6 files). Committed as
      f1e0e02.

## Phase 2 — Create a new sprint (track)

- [x] **2.1** Contract + Red/Green: `tracks.createTrack` mutation (seed snapshot).
- [x] **2.2** `POST /api/projects/:id/tracks` route (Red/Green).
- [x] **2.3** "New Sprint" modal + navigation (frontend tests).
- [x] **2.4** Doctor + graph + commit.

## Phase 3 — AI-generate stories & tasks

- [x] **3.1** `storyGenerator` + zod schema; JSON-parse unit tests.
- [x] **3.2** `generate` route (preview) with graceful harness-down error.
- [x] **3.3** `generate/commit` route (persist stories + tasks).
- [x] **3.4** Frontend preview/accept/commit UI — `GenerateStoriesModal`
      (8 tests), `useStoryGeneration` hook (7 tests), `useSaveAsTemplate`
      extraction (5 tests) to keep `ProjectViewPage.tsx` < 500 lines. Header
      "Generate Stories" button enabled when `?track=` query param present
      (set by `useCreateSprint` after Phase 2 sprint creation). Hardened a
      pre-existing flaky `SprintPlanningPage` test (`createSprint` no-op when
      budget was empty at click time) by adding a `findByDisplayValue('20.00')`
      wait. Verified 5/5 stable across repeated runs.
- [x] **3.5** Doctor + graph + commit. Doctor checks 3/4/5/6 PASS; checks 1
      (as-any) and 2 (boundary) remain red on baseline (typed-convex track
      and TD pipeline) with **zero new violations** introduced — see TD-260
      in `measure/orphans-allowlist.txt` for the build-graph alias-resolution
      limitation noted with newly added hooks/components. Track verifiable
      via `git diff HEAD~3 measure/doctor.sh` output identical for those two
      checks.
