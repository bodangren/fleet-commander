# Build Graph And Context Reconciliation

## Status

New remediation track from the 2026-06-18 post-rewrite wiring review.

## Problem

The graph and context files are not reliable enough to serve as source-of-truth for wiring reviews without cleanup.

## Evidence

- `build-graph scan ./ ./graph.db` failed with `UNIQUE constraint failed: nodes.id` after modifying `graph.db`.
- `build-graph audit ./graph.db --json` reported missing files such as `frontend/src/AppRoutes.tsx`, deleted `.red.test.ts` files, and archived track script paths still under `measure/tracks/...`.
- `measure/index.md` linked `measure/generated/architecture.json` and `measure/generate.sh`, but neither exists.
- `measure/tracks.md` still listed completed tracks as planned.
- `measure/tech-stack.md` and `measure/workflow.md` still described retired scheduler/human-review flows.

## Scope

Repair docs and graph governance. Do not edit `measure/automation-supervisor.py`.
