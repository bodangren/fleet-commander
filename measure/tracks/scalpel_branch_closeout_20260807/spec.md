# Spec: Scalpel branch closeout

## Goal

Bring `chore/scalpel` to a merge-ready state: verify what the branch claims, fix or quarantine the Convex test gate, confirm Pi-only executor readiness, and record merge criteria. Primary focus after the 2026-08-07 Measure reconciliation.

## Context

Scalpel removed ~80k lines / ~1,100 files (dead YAML pipeline engine, A/B + simulation, OpenCode executor path, binaries/run logs). Executor is **pi-measure-harness** only. Handoff: `SCALPEL-HANDOFF.md`. Branch was unpushed at track creation.

## Acceptance Criteria

1. Documented verify matrix passes or each failure is classified with owner:
   - `bun run --cwd pivot test`
   - `bun run --cwd frontend test` (**must** use `bun run`, not bare `bun --cwd frontend test`)
   - `bun --cwd pivot typecheck`
   - lint / `bunx convex codegen` / `bunx convex dev --once` as applicable
2. Convex unit-test gate is either green or explicitly quarantined with a follow-up TD and a non-blocking policy for `verify.sh` (no silent skip without record).
3. Pi dispatch readiness documented (agents point at models the Pi harness serves; auth/credential blockers from handoff addressed or tracked).
4. Product/Measure docs no longer claim deleted surfaces as live (A/B, dual executor) — baseline fixed in 2026-08-07 reconciliation; re-check at closeout.
5. Merge criteria written in closeout: target branch, required gates, known residual risks.
6. Track archived with evidence links (command output summaries, not raw multi-MB logs).

## Non-Goals

- Re-adding OpenCode, A/B testing, or YAML pipeline engines.
- Full E2E suite green-up (tracked separately as TD-260 residual).
- Tailwind 4 or package major upgrades.
- Implementing quality UI surface (separate track).

## Verification

Commands in AC1 + Pi readiness probe from `SCALPEL-HANDOFF.md`.
