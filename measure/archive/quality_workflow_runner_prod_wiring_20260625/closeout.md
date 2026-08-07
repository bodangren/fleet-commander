# Closeout: QualityWorkflowRunner production wiring

**Track ID:** `quality_workflow_runner_prod_wiring_20260625`  
**Closed:** 2026-08-07  
**Status:** completed (reconciliation — production wiring already present)  
**TD:** TD-252 → Resolved

## Outcome

This track duplicated work already completed by `quality_workflow_hot_path_wiring_20260618` (archived, claimed TD-252 closed). At closeout HEAD production paths supply real hooks:

- `pivot/src/server.ts` — `qualityWorkflowHooks: createProductionQualityWorkflowHooks()`
- `pivot/src/orchestrator/autoRunner.ts` `runAutoRunner()` — same factory
- Guard/regression tests: `noSecondScheduler.test.ts`, `autoRunner.qualityWiring.test.ts`, `productionQualityWorkflowHooks.regression.test.ts`

## Spec AC scorecard

| AC | Status |
| --- | --- |
| AutoRunner accepts quality hooks | Done |
| Server + CLI pass real runner | Done |
| Non-none profiles use runner path | Done (fail-closed without hooks still tested) |
| E2E quality-workflow suite green | **Out of scope residual** — E2E targets UI surface not yet fully productized |

## Residual (separate track)

UI configure → observe → diagnose flow remains incomplete. Tracked by new track:

`measure/tracks/quality_workflow_visibility_ui_20260807/`

Do **not** reopen TD-252 for UI work.

## Docs fixed at closeout

- `measure/tech-stack.md` — removed false “known wiring gap”
- `measure/product.md` Quality Workflow section — production wiring stated as done
