# Implementation Plan — Local Convex Postgres Startup Debugging

## Phase 1: Reproduce and Capture Failure

- [x] Task 1.1: Register Measure track and baseline repo state
- [x] Task 1.2: Run the narrow Convex/Postgres startup command and capture the failure
- [x] Task 1.3: Inspect repo scripts, environment files, and local service assumptions

## Phase 2: Fix or Remediate

- [x] Task 2.1: Apply the smallest repo-level configuration fix if needed
- [x] Task 2.2: If local service state is the root cause, document exact remediation commands

## Phase 3: Validate and Close

- [x] Task 3.1: Re-run the startup path and record the result
- [x] Task 3.2: Update this plan and the track registry with final status

## Evidence Log

- 2026-05-17: `git status -sb` showed unrelated dirty Convex skill/generated files before this track began; those files are out of scope unless proven relevant.
- 2026-05-17: `docker compose up -d postgres` failed with `rootlessport listen tcp 0.0.0.0:5432: bind: address already in use`.
- 2026-05-17: `docker inspect kanban-conductor-postgres-1` showed the older `/home/daniel-bo/Desktop/kanban-conductor` Compose project owns a healthy Postgres container with `POSTGRES_USER=convex`, `POSTGRES_PASSWORD=convex_local`, and `POSTGRES_DB=convex_local`.
- 2026-05-17: `CONVEX_AGENT_MODE=anonymous CONVEX_POSTGRES_URL=postgresql://convex:convex_local@localhost:5432/convex_local npx convex dev --once` reached Convex preparation but failed schema validation against old `kanban-conductor` data, proving `localhost:5432` points at the wrong database for this repo.
- 2026-05-17: The installed Convex CLI starts local deployments with `.convex/local/default/convex_local_backend.sqlite3`; `CONVEX_POSTGRES_URL` did not change local deployment storage.
- 2026-05-17: Backed up stale local state from `.convex/local/default` to `.convex/local/default.kanban-conductor-backup-20260517`.
- 2026-05-17: `CONVEX_AGENT_MODE=anonymous npx convex dev --once --configure existing --team bodangren --project fleet-commander --dev-deployment local` recreated local state and completed with `Convex functions ready`.
- 2026-05-17: `python3 -m json.tool package.json` passed after script edits.
