# Specification: Documentation Truth-Up

## Overview

Founding docs disagree with each other and with the running code. Three specific contradictions exist:

1. `measure/product.md` states a "Single-Execution Dispatch Policy" but `pivot/src/policy/allocator.ts` defaults `globalConcurrency: 5`.
2. `measure/product-guidelines.md` says "Markdown files remain the source of truth" while `measure/product.md` says markdown is "not the sole source of runtime truth."
3. Capability #6 in `product.md` claims "Reversible import/export" — this becomes false once the sync one-way track lands.

A doc-only pass eliminates the confusion before downstream tracks build on a contradictory foundation.

## Functional Requirements

### 1. Rewrite Core Docs in One Pass

- Rewrite `measure/product.md` to describe the system as it actually exists today.
- Rewrite `measure/product-guidelines.md` so it agrees with `product.md` on where truth lives.
- Rewrite `measure/tech-stack.md` to remove any stale or conflicting claims.
- One canonical statement per topic — no duplication between docs.

### 2. Add "Runtime Truth Boundaries" Section

- Add a new section to `measure/product.md` titled **"Runtime Truth Boundaries"**.
- The section must name exactly what lives where:
  - Markdown owns: tracks, plans, lessons learned.
  - Convex owns: stats, run history, coordination state.
  - Nothing is duplicated across the two stores.

### 3. Update Capability #6

- Change capability #6 in `product.md` from "Reversible import/export" to "Documentation import + derived state."
- This pre-aligns the doc with the outcome of the sync one-way track.

## Non-Functional Requirements

- Changes are documentation-only. No code changes.
- Each doc must be internally consistent after the edit.
- The three docs must agree with each other after the edit.

## Acceptance Criteria

- [ ] `measure/product.md` no longer mentions "Single-Execution Dispatch Policy" as an enforced constraint while the allocator defaults to concurrency 5.
- [ ] `measure/product-guidelines.md` and `measure/product.md` agree on where runtime truth lives.
- [ ] `measure/tech-stack.md` contains no claims that contradict `product.md`.
- [ ] "Runtime Truth Boundaries" section exists in `product.md` naming markdown and Convex ownership.
- [ ] Capability #6 reads "Documentation import + derived state."

## Out of Scope

- Editing any file outside `measure/`.
- Changing code behavior.
- Adding new product features or capabilities to the docs.
