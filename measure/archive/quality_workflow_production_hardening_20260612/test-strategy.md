# Test Strategy: Quality Workflow Production Hardening

## Scope

This strategy covers the remediation track `quality_workflow_production_hardening_20260612`. The track fixes production gaps, stubs, security holes, and weak tests left by the recent quality-workflow integration and RR7 migration.

## Core Principles

- **Contract-First / TDD:** Every fix is preceded by a Red test that fails on the current buggy/stub behavior.
- **Production-import proofs:** Changes to the orchestrator hot path are validated through real imports of `runProject`, `AutoRunner`, and `PipelineRunLifecycle`, not only unit tests of helpers.
- **No fake harnesses in production:** The fake default runner is removed; any test doubles are dependency-injected only.
- **Full-suite gate:** Phase closeout runs the unfiltered `bun --cwd pivot test` and `bun --cwd frontend test` suites.

## Testing Pyramid

### Unit / Contract Tests
- `pivot/src/orchestrator/qualityWorkflowRunner.test.ts` — sequencing, applicability, gate evaluation.
- `pivot/src/orchestrator/qualityCostRollup.test.ts` — cost rollup and recovery decision edge cases.
- `pivot/src/shared/qualityProfile.test.ts` — validator and snapshot contracts (reuse; add regression tests if needed).
- `convex/qualityProfiles.test.ts` / `convex/qualityRuns.test.ts` — Convex handler contracts.

### Integration / Characterization Tests
- `pivot/src/orchestrator/orchestrator.characterization.test.ts` — extend to assert quality-stage costs reach budget reconciliation and no-profile path is unchanged.
- `pivot/src/orchestrator/qualityResume.integration.test.ts` — resume through real `PipelineRunLifecycle`.
- `pivot/src/failover/wal.qualityRuns.test.ts` — WAL replay for quality-run mutations.

### REST / Route Tests
- `pivot/src/routes/quality.red.test.ts` — Red-phase tests for hardcoded project slug and missing auth.
- `pivot/src/routes/quality.test.ts` — Green-phase tests for valid authorized requests.

### Frontend Tests
- `frontend/src/components/timeline/QualityStageRow.test.tsx` — extend to assert valid ARIA/data attributes.
- `frontend/src/pages/settings/QualityProfileSection.test.tsx` — extend to assert no "unknown" option.
- `frontend/src/pages/operations/QualityOperationsPanel.test.tsx` — extend to assert `projectSlug` is sent.
- `frontend/src/hooks/useQualityProfile.test.tsx` — extend to assert error state on non-OK responses.

### E2E
- No new E2E specs. The existing `@quality-workflow` Playwright spec remains the S4 E2E gate.

### Guard Tests
- `pivot/src/orchestrator/guards/noSecondScheduler.test.ts` — extend to assert no production file contains an inline fake runner that auto-passes stages (grep for `status: 'passed'` in production dispatch code).

## Red-Phase File Suffixes

Intentionally failing tests for this track use the `*.red.test.ts` suffix and are owned by still-`[~]` tasks until their Green sibling lands:

- `pivot/src/orchestrator/autoRunner.qualityWiring.red.test.ts`
- `pivot/src/orchestrator/qualityWorkflowDispatch.red.test.ts`
- `convex/qualityProfiles.snapshot.red.test.ts`
- `convex/qualityProfiles.audit.red.test.ts`
- `convex/qualityProfiles.override.red.test.ts`
- `pivot/src/orchestrator/qualityWorkflowRunner.red.test.ts`
- `pivot/src/orchestrator/qualityCostRollup.red.test.ts`
- `pivot/src/failover/wal.qualityRuns.red.test.ts`
- `pivot/src/orchestrator/qualityResume.integration.red.test.ts`
- `convex/qualityRuns.red.test.ts`
- `pivot/src/routes/quality.red.test.ts`
- `frontend/src/components/timeline/QualityStageRow.red.test.tsx`
- `frontend/src/pages/settings/QualityProfileSection.red.test.tsx`

## Per-Phase Gate Commands

### Phase 1
```bash
bun --cwd pivot test \
  src/orchestrator/autoRunner.qualityWiring.red.test.ts \
  src/orchestrator/qualityWorkflowDispatch.red.test.ts
```

### Phase 2
```bash
bun test ./convex/qualityProfiles.test.ts \
  ./convex/qualityProfiles.snapshot.red.test.ts \
  ./convex/qualityProfiles.audit.red.test.ts \
  ./convex/qualityProfiles.override.red.test.ts
```

### Phase 3
```bash
bun --cwd pivot test \
  src/orchestrator/qualityWorkflowRunner.test.ts \
  src/orchestrator/qualityCostRollup.test.ts \
  src/orchestrator/orchestrator.characterization.test.ts
```

### Phase 4
```bash
bun --cwd pivot test \
  src/failover/wal.qualityRuns.test.ts \
  src/orchestrator/qualityResume.integration.test.ts
bun test ./convex/qualityRuns.test.ts ./convex/qualityRuns.red.test.ts
```

### Phase 5
```bash
bun --cwd frontend check
bun --cwd frontend test --run \
  src/components/timeline/QualityStageRow.test.tsx \
  src/pages/operations/QualityOperationsPanel.test.tsx \
  src/pages/settings/QualityProfileSection.test.tsx \
  src/hooks/useQualityProfile.test.tsx
bun --cwd pivot test src/routes/quality.red.test.ts
```

### Phase 6 (Closeout)
```bash
bun --cwd pivot test
bun --cwd pivot typecheck
bun --cwd frontend test
bun --cwd frontend check
bash measure/doctor.sh all
build-graph audit ./graph.db
npm run verify   # real mode, VERIFY_FAKE_GATE_DIR unset
```

## Shared Fixtures and Mocks

- Reuse `convex/__fixtures__/foundation.ts` for quality-profile and quality-run schema fixtures.
- Reuse `pivot/src/orchestrator/orchestrator.characterization.test.ts#installLoaders` for `runProject` sequencing tests.
- Reuse the existing `walAdapter` from `pivot/src/orchestrator/orchestrator.ts` for WAL tests.
- Frontend tests reuse existing `vi.mock('@/lib/useFleetData')` and fetch-stub patterns from RR7 tests.

## Architecture Guardrails

- No new `setInterval`/`setTimeout` outside `autoRunner.ts`.
- No new caller of `api.tasks.claimTaskForExecution` outside `claimForExecution.ts`.
- No production spawn of `measure/automation-supervisor.py`.
- No production import of `*.fake.ts` / `*.stub.ts` modules.
- Doctor allowlists are not expanded without a TD ID.

## Known Risks

- `bun --cwd pivot typecheck` and `build-graph audit` have been observed to time out. Plan for longer timeouts and consider splitting very large typecheck runs if needed.
- Graph caller discovery returns false negatives for orchestrator hot-path symbols; pair every change with a production-import test.
