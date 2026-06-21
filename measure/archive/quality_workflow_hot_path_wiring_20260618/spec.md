# Spec: Quality Workflow Hot-Path Wiring

## Goal

Configured quality profiles must execute inside the canonical Bun orchestrator in production, using real stage execution and persisted evidence, not injected test hooks.

## User Impact

When a user selects `standard` or `strict` for a project, the next executor dispatch should run the nested quality stages and either pass with evidence or fail with the real stage error. It must not fail solely because the server omitted hooks.

## Acceptance Criteria

1. Production `server.ts` supplies `qualityWorkflowHooks` to `AutoRunner`.
2. `runAutoRunner()` supplies the same production hooks for the CLI path.
3. A production `QualityWorkflowRunner` executes stages through the existing harness/orchestrator execution boundary and captures command output, status, duration, and error text.
4. Profile snapshot, stage attempts, retry behavior, and closeout eligibility remain persisted through existing Convex quality-run functions.
5. No code path imports or spawns `measure/automation-supervisor.py`.
6. Tests exercise the real production imports, not only `deps.runAll` injection.
7. A non-none profile fixture proves executor -> quality workflow -> reviewer/merger continuation.
8. A missing or misconfigured runner fails closed with a clear operational error.

## Non-Goals

- Rewriting the quality-profile schema.
- Introducing a second scheduler.
- Replacing the existing git lifecycle or budget reservation flow.

## Verification

- `bun --cwd pivot test src/orchestrator/autoRunner.qualityWiring.test.ts src/orchestrator/parity/qualityProfileParity.test.ts`
- Add a server/CLI wiring test that imports the production hook factory.
- `bun --cwd pivot typecheck`
- `build-graph update ./graph.db <changed production/test files>`
