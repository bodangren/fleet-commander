# Specification: Collapse Sync to One-Way (Markdown → Convex)

## Overview

Bidirectional sync between markdown and Convex creates conflict-resolution work with no business value. Convex tables backing the dashboard, scoring stats, and run history are derivable from markdown plus run events. Removing the reverse path (Convex → disk) simplifies the system and makes the import pipeline the single authority for derived state.

## Functional Requirements

### 1. Audit Reverse-Sync Code Paths

- Read `convex/projects.ts`, `convex/tracks.ts`, `convex/sprints.ts`, and any other Convex files that touch sync.
- Identify every mutation or action that writes back to disk via the pivot sync layer.
- Record the inventory in this track's plan before any changes.

### 2. Remove or Quarantine the Reverse Path

- Delete or disable all code paths that write from Convex back to markdown on disk.
- For any UI flow that relies on round-trip writes (e.g., "edit track from dashboard"):
  - Option A: kill the flow if it has no active users.
  - Option B: route the write through a Bun endpoint that writes to markdown, then let the importer pick it up.
  - Decision is per-flow; document the choice in the plan.
- Add a code comment at each removal site: "Convex state is derived. To change a track, edit the markdown; the importer will pick it up."

### 3. Make the Importer Idempotent

- The markdown→Convex importer must be safe to re-run from cold state.
- Implement `bun --cwd pivot run sync:rebuild`: blows away all derived Convex tables and re-imports from markdown.
- Re-running the command twice must produce the same Convex state.

### 4. Update Product Doc

- Change capability #6 in `measure/product.md` from "Reversible import/export" to "Documentation import + derived state."
- (Coordinate with docs_truth_up track — if that track has already made this change, skip this step.)

## Non-Functional Requirements

- The one-way contract must be enforced by code structure, not just convention.
- `sync:rebuild` must complete without manual intervention.
- No data visible in the dashboard before this track should disappear from the dashboard after this track; derived state must be fully re-importable.

## Acceptance Criteria

- [ ] Reverse-sync code paths inventoried and documented in plan.md.
- [ ] No Convex mutation writes to disk via the pivot sync layer.
- [ ] Per-flow decisions documented (killed or rerouted through Bun endpoint).
- [ ] `bun --cwd pivot run sync:rebuild` exits 0 and re-populates derived tables.
- [ ] Running `sync:rebuild` twice produces identical Convex state.
- [ ] Capability #6 in `product.md` updated (or confirmed already updated by docs_truth_up).

## Out of Scope

- Building a full markdown editor in the dashboard UI.
- Changing the Convex schema structure.
- Migrating historical run data.
