# Tech Stack - Conductor Fleet Commander

Fleet Commander is now targeted at a **Bun runtime + Convex backend** architecture.

## 1. Application Runtime (Bun)

- **Runtime:** Bun 1.3+
- **Role:** Hosts local APIs/workers, executes local CLI harness commands, and manages filesystem synchronization with managed repositories.
- **Process execution:** `Bun.spawn` for local task execution and lifecycle capture.
- **Local migration/sync tooling:** Bun scripts handle SQLite import, markdown export/import, and local bootstrap checks.

## 2. Canonical Backend (Convex)

- **System of record:** Convex tables for projects, tracks, tasks, issues, execution logs, settings, agents, harnesses, and run state.
- **API boundary:** Convex queries/mutations/actions with explicit argument and return validators.
- **Realtime:** Convex subscriptions replace bespoke hub-based fanout for new UI surfaces.
- **Type generation:** `convex/_generated/*` is generated from schema/functions and checked into the repo.

## 3. Frontend Surfaces

- Existing React dashboard remains available during migration.
- New slices can be served directly by Bun while reading/writing Convex state.
- Realtime UI behavior for migrated slices should consume Convex subscription updates.

## 4. Outgoing Stack (Decommission Target)

The following remain in the codebase for compatibility/migration windows but are no longer the target architecture:

- Go HTTP daemon surfaces
- SQLite-backed runtime stores
- Go WebSocket hub fanout
- Filesystem-only operational state model

## 5. Developer Workflow

1. Bootstrap local anonymous or authenticated Convex deployment:
   - `CONVEX_AGENT_MODE=anonymous npx convex dev --once` (agent/headless baseline)
   - or `npx convex dev` (interactive user-authenticated baseline)
2. Generate and verify Convex types/functions:
   - `npx convex codegen --init`
3. Run Bun slice:
   - `bun --cwd pivot run dev`
4. Validate sync/migration scripts:
   - `bun --cwd pivot run test`
   - `bun --cwd pivot run migrate:sqlite -- <path/to/sqlite.db>`
