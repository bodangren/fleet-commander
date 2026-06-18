# Spec: Build Graph And Context Reconciliation

## Goal

Future agents must be able to read Measure context and query `graph.db` without stale routing, missing-file false positives, or obsolete scheduler/product guidance.

## Acceptance Criteria

1. `measure/index.md` links only existing context files or explicitly marks generated artifacts as unavailable.
2. `measure/product.md`, `measure/workflow.md`, `measure/tech-stack.md`, `measure/current_directive.md`, `measure/lessons-learned.md`, and `measure/tech-debt.md` match the current Bun/Convex/React Router architecture.
3. Completed active track directories are archived or explicitly marked complete in metadata and registry.
4. `measure/lessons-learned.md` and `measure/tech-debt.md` stay at or below their 50-line limits.
5. A safe graph rebuild procedure exists that does not mutate the canonical `graph.db` unless the fresh scan succeeds.
6. `build-graph scan` is run against a temporary database first; only a successful result replaces `graph.db`.
7. The canonical `graph.db` has no missing-file entries for deleted or archived paths after rebuild.
8. `doctor.sh` behavior is documented for graph-dependent checks and does not rely on stale nodes.

## Verification

- `build-graph scan ./ /tmp/fleet-commander.graph.db`
- Replace `graph.db` only after a successful temp scan.
- `build-graph audit ./graph.db --json`
- `bash measure/doctor.sh all`
- `wc -l measure/lessons-learned.md measure/tech-debt.md`
