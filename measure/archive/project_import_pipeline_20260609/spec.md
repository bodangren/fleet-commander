# Project Import, Sprint Creation & AI Story Generation

Status: new

## Problem

Fleet Commander can list and open projects, but there is no working path to **get
work into it**:

1. **Import is hollow.** `POST /api/projects/scan-and-import` creates an empty
   named project row per discovered workspace (`pivot/src/routes/projects.ts`).
   It does not read the workspace's `measure/tracks/**`, so boards land empty.
   Working parsers already exist as CLI-only scripts
   (`importAllTracks.ts`, `importTasksFromPlans.ts`, `trackMarkdown.ts`) but are
   not wired to the route.
2. **Import UI is orphaned.** `WelcomeScreen`/`WorkspaceScanner` exist and POST to
   the route, but nothing renders `WelcomeScreen`, so users cannot reach import.
3. **No way to create a sprint/track** from the UI.
4. **No AI story generation**, despite an existing opencode harness.

## Goals

- Make import real: one action ingests a workspace's tracks **and** tasks,
  idempotently (re-import updates, never duplicates).
- Make import reachable from the Portfolio UI.
- Allow creating a new sprint/track from the UI.
- Generate stories/tasks for a track with the existing AI harness, with a
  preview-then-commit flow that degrades gracefully when the harness is down.

## Functional Requirements

### Phase 1 — Real, reachable import

- **FR1.1** A shared, testable importer module exposes pure parsers:
  `parseTasksFromPlan(planMarkdown, trackId)` (extracted from the CLI script and
  exported) and `parseStoriesFromSpec(specMarkdown, trackId)` (new).
- **FR1.2** `parseStoriesFromSpec` parses a `## Stories` section: Connextra
  triplet for the title/description, `Estimate: S|M|L|XL` → story points
  (S=1, M=3, L=5, XL=8), `Priority: Must|Should|Could` → priority
  (Must=high, Should=medium, Could=low). When no `## Stories` section exists,
  callers fall back to `parseTasksFromPlan`.
- **FR1.3** `upsertTask` accepts an optional `storyPoints` number so estimates
  persist (the `tasks.storyPoints` field already exists; it is currently
  hardcoded to 0).
- **FR1.4** `POST /api/projects/scan-and-import` ingests each path: resolve or
  create the project by name (mirroring `importAllTracks`), read
  `measure/tracks/*/`, upsert a track snapshot per track via
  `upsertTrackSnapshot`, and upsert backlog tasks via `upsertTask`. It returns
  per-project `{ _id, name, tracks, tasks }` counts.
- **FR1.5** Import is idempotent: re-importing the same workspace updates tracks
  and tasks in place (project by name, track by `trackId`, task by `taskKey`).
- **FR1.6** The Portfolio empty state renders `WelcomeScreen` (which hosts
  `WorkspaceScanner`), and a persistent "Import project" affordance is reachable
  even when projects already exist. The ingest summary (tracks/tasks counts) is
  shown.

### Phase 2 — Create a new sprint (track)

- **FR2.1** A Convex `tracks.createTrack` mutation seeds a new track snapshot
  (title + goal-anchored spec scaffold + empty plan, status `new`).
- **FR2.2** `POST /api/projects/:id/tracks` creates the track for a project.
- **FR2.3** A "New Sprint" modal (title + goal) creates the track and navigates
  to it.

### Phase 3 — AI-generate stories & tasks

- **FR3.1** A `storyGenerator` builds a prompt from `{goal, spec, project
  context}`, calls the opencode client, and parses a zod-validated JSON array of
  stories `{title, asA, iWant, soThat, acceptanceCriteria[], estimate,
  priority}`.
- **FR3.2** `POST /api/projects/:id/tracks/:trackId/generate` returns a preview
  (not persisted). It returns a clear error when the harness is unavailable.
- **FR3.3** `POST .../generate/commit` writes stories into the track's
  `spec.md` `## Stories` (via `upsertTrackSnapshot`) and creates backlog tasks.
- **FR3.4** UI: generate → editable preview list → accept → commit.

## Non-Goals

- Writing `measure/**` files back to disk in the imported workspace (read-only
  import in Phase 1).
- Real-time multi-user editing of generated previews.

## Acceptance Criteria

- Importing a workspace with N tracks produces N track snapshots and the parsed
  tasks; re-import does not duplicate.
- Import is reachable from Portfolio with a visible summary.
- A sprint can be created from the UI and opened.
- Story generation shows a preview and, on commit, persists stories + tasks;
  with the harness down the generate endpoint returns a clear, non-500 error.
