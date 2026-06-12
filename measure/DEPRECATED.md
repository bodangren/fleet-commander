# Deprecated: measure/automation-supervisor.py

**Status:** Deprecated — behavioral reference only
**Deprecated date:** 2026-06-12
**Deprecated by:** measure_quality_workflow_integration_20260611 track closeout
**Removal decision:** Follow-up track to be created after production stability period (minimum 30 days with integrated quality workflow enabled for at least one project using the `strict` profile).
**Removal owner:** Track maintainer (see `measure/tracks.md` for current owner).

## Summary

`measure/automation-supervisor.py` was the original Python-based quality-workflow supervisor that implemented strategy generation, Red/Green separation, independent phase acceptance, adversarial testing, conditional UX review, final acceptance, and mechanical track closeout.

As of the `measure_quality_workflow_integration_20260611` track, all quality-workflow capabilities have been integrated into the canonical Bun orchestrator as configurable nested stages (`pivot/src/orchestrator/qualityWorkflowRunner.ts`). The Python supervisor is retained as a **behavioral reference and local/manual fallback** during migration.

## What replaces it

| Python supervisor capability | Integrated replacement |
|---|---|
| Strategy generation | `qualityWorkflowRunner.ts` — `strategy` stage kind |
| Red/Green separation | `qualityWorkflowRunner.ts` — `red` / `green` stage kinds + `evaluateRedStageGate` |
| Phase acceptance | `qualityWorkflowRunner.ts` — `phase_acceptance` stage kind |
| Adversarial audit | `qualityWorkflowRunner.ts` — `adversarial` stage kind |
| Conditional UX review | `qualityWorkflowRunner.ts` — `ux` stage kind (applicability: `hasFrontendChanges`) |
| Final acceptance | `qualityWorkflowRunner.ts` — `acceptance` stage kind (applicability: `isFinalAcceptance`) |
| Track closeout | `qualityWorkflowRunner.ts` — `closeout` stage kind (applicability: `isFinalCloseout`) |
| Profile configuration | `pivot/src/shared/qualityProfile.ts` — `BUILTIN_NONE_PROFILE` / `BUILTIN_STANDARD_PROFILE` / `BUILTIN_STRICT_PROFILE` |
| Kill switch / fail-closed | `pivot/src/orchestrator/qualityKillSwitch.ts` |
| Cost rollup / recovery | `pivot/src/orchestrator/qualityCostRollup.ts` |
| Persistence / resume | `convex/qualityRuns.ts` + `pivot/src/orchestrator/qualityRunResume.ts` |
| Operator visibility | `frontend/src/pages/settings/QualityProfileSection.tsx` + `frontend/src/pages/operations/QualityOperationsPanel.tsx` |

## Why it is not removed immediately

1. The integrated workflow is new; the Python supervisor serves as a fallback if the integrated path needs to be temporarily disabled.
2. Some developers may use the Python supervisor for local/manual runs outside the canonical orchestrator.
3. The behavioral reference helps auditors verify parity between the old and new paths.

## Constraints while deprecated

- No production code in `pivot/src/` or `convex/` may spawn or import `automation-supervisor.py`.
- The integrated quality workflow is the only production scheduler for quality stages.
- New quality-workflow capabilities must be added to the integrated path, not the Python supervisor.
