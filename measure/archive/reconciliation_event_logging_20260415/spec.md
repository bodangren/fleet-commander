# Specification — Reconciliation Event Logging (A4)

## Overview

Since the Bun+Convex pivot, Convex is canonical and `measure/` is an export target. Drift is inevitable without instrumentation. This track adds an observability layer: compute normalized-AST hashes of canonical artifacts vs exported markdown and emit `reconciliationEvents` when they diverge. No enforcement, no UI prompt — just data. C1 builds ownership rules on top.

## Functional Requirements

- **FR1:** Add `reconciliationEvents` Convex table with `artifactClass`, `artifactId`, `canonicalHash`, `exportHash`, `divergenceKind`, `detectedAt`, `details` (JSON).
- **FR2:** Implement `pivot/src/reconciliation/hash.ts` with `normalizeMarkdown(source)` → AST-level canonical string, ignoring whitespace, trailing newlines, list marker styles.
- **FR3:** Implement differs for three artifact classes (MVP):
  - `task` (Convex task ↔ `measure/tracks/*/plan.md` task line)
  - `trackMetadata` (Convex track ↔ `tracks.md` entry + `spec.md` header)
  - `issue` (Convex issue record ↔ broker markdown file)
- **FR4:** Reconciliation sweep runs periodically (default: every 5 min) and on explicit trigger (`POST /reconcile/scan`).
- **FR5:** Events are deduped — repeated identical divergence does not create new rows; updates `detectedAt` and `occurrences` counter.
- **FR6:** No automatic writes to either side. This track only observes.

## Acceptance Criteria

1. `reconciliationEvents` schema + indexes (`by_artifact`, `by_detected_at`) in Convex.
2. `normalizeMarkdown` handles the 10 common divergence patterns (whitespace, list markers, trailing newlines, bullet vs dash, heading vs setext, inline code vs fence, task checkbox variants, frontmatter key order, blockquote indent, link reference style); unit-tested.
3. Task/track/issue differs each produce events when canonical and export diverge.
4. Sweep + on-demand trigger both supported; route wired in `pivot/src/routes/reconcile.ts`.
5. Dedup: identical hash divergence re-detected bumps counter, doesn't insert.
6. 80%+ coverage on hash + differ modules.
7. Sweep completes in <500ms for a project with 100 tracks and 500 tasks (perf test).

## Out of Scope

- Conflict resolution UI (C1).
- Automatic merging (C1).
- Bidirectional write enforcement (C1).
- Non-markdown artifact types.

## Tech Stack

- **Markdown AST:** `remark-parse` + `mdast-util-to-string` (add if not present)
- **Storage:** Convex `reconciliationEvents`
- **Scheduling:** existing Bun interval infra
