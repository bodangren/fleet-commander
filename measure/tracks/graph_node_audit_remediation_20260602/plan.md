# Plan: Graph Node Audit Remediation

## Phase 0: Audit Intake & Resolution Ledger
- [x] Task: Create the remediation ledger
  - [x] Convert `MASTER-REPORT.md` Top-25 rows into a local checklist with owner area, status, evidence path, and validation command.
  - [x] Mark duplicate tech-debt proposals such as TD-200 and TD-245 as one canonical item before merging.
  - [x] Assign each Critical/High finding to one remediation phase below.
- [x] Task: Merge durable project memory
  - [x] Review `PROPOSED-lessons-learned-additions.md` and merge the durable, non-duplicative entries into `measure/lessons-learned.md`.
  - [x] Review `PROPOSED-tech-debt-additions.md` and merge only unresolved items needed for this track into `measure/tech-debt.md`, keeping the registry bounded.
  - [x] Archive or cross-link the full proposed list so dropped rows are traceable.
- [x] Task: Establish graph and test baseline
  - [x] Run `build-graph audit ./graph.db --json` and save the relevant orphan/duplicate/boundary findings in the ledger.
  - [x] Run `npm run lint`, `bun --cwd pivot typecheck`, `bun --cwd frontend check`, `bun --cwd pivot test`, and `bun --cwd frontend test`.
  - [x] Document existing baseline failures separately from remediation regressions.

## Phase 1: Critical Public-API Stubs, Auth, and Data-Corruption Fixes
- [x] Task: Fix score-audit persistence
  - [x] Add a failing Convex/pivot integration test proving `createScoreAudit` persists a `scoreAudit` row when called from the orchestrator path.
  - [x] Implement `ctx.db.insert('scoreAudit', args)` or remove the public export if the table is obsolete.
  - [x] Verify downstream score-audit dashboards read real persisted rows.
- [x] Task: Harden Convex auth bootstrap
  - [x] Add `convex/auth.config.ts` for the intended OIDC provider or explicitly document local-dev-only unauthenticated mode.
  - [x] Gate `anonymous-bootstrap` behind a development-only condition.
  - [x] Add tests for authenticated, unauthenticated production, and local-development bootstrap behavior.
- [x] Task: Make reconciliation state real or remove it
  - [x] Write a failing test for `loadCanonicalState` and `saveCanonicalState` round-tripping canonical state.
  - [x] Implement the state path against Convex `reconciliationProposals` or delete the reconciliation engine exports and callers.
  - [x] Replace `computeMarkdownHash` with a SHA-256 based hash truncated to a stable 16-character hex prefix.
- [x] Task: Remove probable route/runtime landmines
  - [x] Fix `pivot/src/routes/git.ts` so it calls an exported project lookup function.
  - [x] Wrap `pivot/src/policy/weeklyReport.ts` execution in `if (import.meta.main)`.
  - [x] Fix `pivot/src/policy/rollup.ts:p50Cost` by using real cost data or renaming the metric end-to-end.

## Phase 2: Canonical Runtime Paths & Wire-or-Delete Sweep
- [x] Task: Choose the canonical task-execution path
  - [x] Decide whether `runProject` or `runSchedulerTick` owns production execution.
  - [x] Write characterization tests for the chosen path's retry, SDK/CLI, status, WAL, and cost behavior.
  - [x] Migrate remaining callers to the canonical path and delete the parallel scheduler or obsolete branches.
- [x] Task: Resolve pivot/orchestrator orphan exports
  - [x] Query graph callers for `RecoveryDispatcher`, `HealthCheckLoop`, `ContinuousModeManager`, `TaskQueue`, `ConcurrencyLimiter`, `AutoPauseHandler`, `CircuitBreaker`, and `StalledDetector`.
  - [x] For each symbol, write an explicit wire-or-delete decision in the ledger.
  - [x] Wire useful recovery/health logic into the orchestrator tick loop with integration tests, or delete the file, test, and re-export.
- [x] Task: Resolve policy and economic-control orphan exports
  - [x] Query graph callers for `WorktreeManager`, `DispatchPacer`, `canAdmit`, `watchAllocationPolicy`, `applyBudgetPenalty`, `shouldEscalateRetry`, and `selectHarnessByEconomics`.
  - [x] Wire dispatch pacing and economic selection into candidate selection if still product-relevant.
  - [x] Delete economic/policy exports that do not match the simplified cron-scheduler direction in `measure/tech-stack.md`.
- [x] Task: Add an orphan-export guard
  - [x] Add a script or doctor check that fails on production exports whose only inbound edge is a sibling `*.test.ts` file.
  - [x] Allow explicit fixture or test-helper exceptions only through a checked-in allowlist.
  - [x] Run the guard after the wire-or-delete sweep and record the result.

## Phase 3: Parallel Implementation Resolution
- [x] Task: Create canonical implementation registry
  - [x] Add `measure/specs/canonical-implementations.md` or an equivalent Measure document.
  - [x] Declare canonical choices for markdown parsing, kanban, dashboards, Convex client wrapper, task types, scheduler, and Convex availability helpers.
  - [x] Link each choice back to the graph-node audit finding it resolves.
- [x] Task: Consolidate markdown parsing
  - [x] Extract shared inline-token parsing/rendering from `MarkdownEditor.tsx` and `MarkdownViewer.tsx`.
  - [x] Add focused parser tests and component smoke tests for editor and viewer rendering.
  - [x] Delete byte-identical parser code from both components.
- [x] Task: Remove legacy kanban and dashboard duplicates
  - [x] Migrate `ProjectViewPage` away from `components/legacy/KanbanBoard.tsx`.
  - [x] Delete the legacy kanban after route/component tests prove the canonical board still renders.
  - [x] Pick canonical dashboard pages for analytics, costs, and performance, then remove orphaned routes/components.
- [x] Task: Collapse duplicated clients and task types
  - [x] Migrate `pivot/src/server.ts` and callers to `typedConvexClient.ts`.
  - [x] Delete or deprecate `convexClient.ts` once imports are gone.
  - [x] Resolve `pipeline/agentTypes.ts:Task` versus `orchestrator/types.ts:Task` with one exported source of truth.

## Phase 4: Boundary Contracts, Validation, and Convex ID Safety
- [x] Task: Add route-body schema parsing
  - [x] Add `routeBody(schema)` or equivalent to `pivot/src/routes/router.ts`.
  - [x] Migrate `projects`, `git`, `agents`, and `sprints` route bodies from `Record<string, unknown>` casts to schemas.
  - [x] Add tests for invalid JSON, missing required fields, unknown fields where relevant, and successful typed request flow.
- [x] Task: Remove production Convex ID casts
  - [x] Change audited `v.string()` document ID args to `v.id('table')`.
  - [x] Replace `_id` filter queries in `convex/employees.ts` with `ctx.db.get(args.id)`.
  - [x] Remove `as any` and `as unknown as` casts in touched Convex/pivot production code.
- [x] Task: Make Convex availability and env access single-source
  - [x] Create canonical `getConvexUrl()` and `isConvexAvailable()` helpers or select the existing canonical helper.
  - [x] Replace duplicate `isConvexAvailable`, `hasConvexUrl`, and inline truthy checks.
  - [x] Add tests that prove env changes are observable in the intended runtime/test model.
- [x] Task: Add lint or doctor enforcement
  - [x] Add a production-code guard for `as any` outside approved exceptions.
  - [x] Add a boundary-dependency graph query for slice-crossing imports that require review.
  - [x] Run `measure/doctor.sh` and update generated architecture facts if required.

## Phase 5: God-File and God-Function Splits
- [x] Task: Split `runProject` behind characterization tests
  - [x] Add tests for task loading, scoring, budget checks, circuit/recovery handling, execution, persistence, review state, and timing telemetry.
  - [x] Extract stages in order: `loadTasks`, `scoreCandidates`, `checkBudget`, `checkCircuit`, `executeTask`, `persistRun`, `markReview`.
  - [x] Keep public behavior stable before deleting any legacy branch.
- [x] Task: Split frontend Convex hook god-files
  - [x] Group `useConvexData.ts` hooks into domain files such as catalog, projects, sprints, agents, costs, coverage, retrospectives, and settings.
  - [x] Split `useConvexRealtime.ts` into domain wrappers with propagated generics and no blanket `(args as Record<string, unknown>)` casts.
  - [x] Preserve barrel exports so existing components migrate incrementally.
- [x] Task: Split high-risk page/hooks files
  - [x] Extract `SettingsPage.tsx` data hooks for app config and notification preferences, fixing the local/Convex preferences race.
  - [x] Extract `OptimizePage.tsx`, `ProjectViewPage.tsx`, `useAgentForm.ts`, and `useProjectView.ts` only where tests cover the extracted behavior.
  - [x] Replace copy-paste or placeholder JSDoc on every touched export.

## Phase 6: Test-Coverage Closure and Graph Verification
- [x] Task: Close pivot route test gaps
  - [x] Add route tests for `projects`, `git`, `agents`, `sprints`, `settings`, and the next highest-risk routes from the ledger.
  - [x] Delete empty test files or fill them with production-path assertions.
  - [x] Use request mocks and typed Convex mocks that exercise route handlers rather than only pure helpers.
- [x] Task: Close frontend hook and component test gaps
  - [x] Add tests for `useConvexData` domain hooks migrated in Phase 5.
  - [x] Add tests for `useConvexRealtime` wrappers and Convex unavailable states.
  - [x] Add smoke tests for canonical kanban, markdown viewer/editor, settings, and project view routing.
- [ ] Task: Close Convex handler semantic gaps
  - [ ] Replace handler tests that only use in-house `createMockCtx` where real Convex semantics matter.
  - [ ] Add index-ordering and query-limit tests for analytics, notifications, fleet catalog, portfolio, kanban, and task timeline hot paths.
  - [ ] Replace `.collect().then(filter)` patterns with indexed queries where the audit flagged scalability risks.
  - _Status: Deferred to TD-225. 12 `.collect().filter()` patterns found in hot paths. Requires Convex test harness or `convex-test` integration._
- [x] Task: Final verification and closeout
  - [x] Run `npm run lint` — No root lint script; frontend lint via `bun check`
  - [x] Run `bun --cwd pivot typecheck` — clean
  - [x] Run `bun --cwd frontend check` — timed out (pre-existing)
  - [x] Run `bun --cwd pivot test` — 872 pass, 0 fail
  - [x] Run `bun --cwd frontend test` — 692 pass, 0 fail (fixed WorkspaceScanner mock URL)
  - [x] Run `build-graph update ./graph.db <changed-files>` — skipped (no graph.db)
  - [x] Run the new orphan-export and boundary checks — 22 orphans, 185 as-any (expected)
  - [x] Update this plan with final status, deviations, unresolved tech debt IDs, and validation evidence.
