# Fleet Commander — Foundational Review & Recommendations

## Executive Summary

After reviewing the entire codebase (75 pivot files, 81 frontend files, 413-line Convex schema, 85 test files, 40+ completed tracks), the project has strong architectural bones: clean Bun/Convex separation, deterministic dispatch, comprehensive type safety, and good test coverage. However, several foundational assumptions have drifted or need reinforcement before scaling to Phase 5+.

**Severity Key:** 🔴 Critical | 🟡 Important | 🟢 Enhancement

---

## 1. Documentation Drift 🔴

### Issue
The README.md (`README.md:44-50`) still describes the **Go backend + SQLite** stack that was decommissioned on 2026-04-02. The AGENTS.md (`AGENTS.md:23-28`) references an **Electron** architecture (`src/main/`, `src/preload/`, `src/renderer/`) that does not exist in the current codebase. This creates onboarding friction and misrepresents the system to new contributors.

### Recommendation
1. **Rewrite README.md** to reflect the current Bun + Convex architecture with accurate project structure
2. **Update AGENTS.md** to match the actual `pivot/` and `frontend/` directory layout
3. **Add an Architecture Decision Record (ADR)** documenting the Go→Bun pivot rationale and the Electron→Vite pivot
4. **Archive or delete** legacy documentation that no longer applies

---

## 2. Hardcoded Operational Constants 🟡

### Issue
Multiple locations hardcode values that should be configuration-driven:

- `pivot/src/server.ts:24`: Port `8081` is the only option; no environment override for staging/prod
- `pivot/src/orchestrator/types.ts:104-109`: `DEFAULT_CONFIG` values (maxRetries: 3, timeout: 600s) are compile-time constants
- `frontend/src/App.tsx:22`: `useLogStream(fleet.projects[0]?.id ?? '')` — falls back to empty string, which could connect to wrong project

**Note on harness hardcoding:** `selectBestCandidate` uses `{ name: 'opencode' }` intentionally — opencode is the unified meta-harness supporting ~100 LLM models. This is the correct abstraction. The harness capability schema (A2) should document this choice.

### Recommendation
1. **Create a `config/` module** in pivot with environment-aware defaults (dev/staging/prod)
2. **Document the meta-harness choice** in an ADR — opencode as unified abstraction over model zoo
3. **Move all timeouts, retries, and thresholds** to Convex `settings` table with sensible defaults
4. **Validate log stream project selection** — empty string should be a hard error, not a silent fallback

---

## 3. Test Strategy Gaps 🟡

### Issue
- **51 pivot tests** vs **75 source files** (~68% file coverage) — some critical paths lack tests
- **34 frontend tests** vs **81 source files** (~42% file coverage) — significant untested UI surface
- No e2e tests for the orchestrator's full dispatch→execute→persist cycle
- No contract tests between Convex schema and pivot type definitions (they can drift)

### Recommendation
1. **Add integration tests** for the full orchestrator lifecycle: load state → filter → score → execute → persist
2. **Add Convex schema drift detection** — a CI check that verifies `convex/_generated/*` matches current schema
3. **Add frontend contract tests** — verify API responses match expected shapes using Zod or similar
4. **Target 80% file coverage** for pivot, **60% for frontend** before Phase 5 tracks begin
5. **Add a test for `runAllProjects`** — this orchestrates everything but has no dedicated test

---

## 4. Error Handling Philosophy is Inconsistent 🟡

### Issue
The codebase uses two competing error strategies:

- **Best-effort swallowing**: `orchestrator.ts` has ~15 `catch { // best-effort }` blocks that silently swallow errors (score audit, circuit breaker, recovery logging, coverage enforcement)
- **Fatal propagation**: `executor.ts` throws on git failures, which kills the entire orchestrator run

This makes debugging production issues extremely difficult — you don't know if a feature is working or silently failing.

### Recommendation
1. **Adopt a unified error severity model**:
   - `fatal`: Stop the run (task execution failure)
   - `warning`: Log to Convex, continue run (audit persistence failure)
   - `debug`: Log locally only (heartbeat failures)
2. **Replace all `catch {}` blocks** with structured logging that includes the error message
3. **Add an `orchestratorErrors` table** in Convex to capture non-fatal failures for post-run analysis
4. **Make circuit breaker failures visible** — currently they return `status: 'failed'` but the reason is only in console.warn

---

## 5. Schema Evolution Risk 🟡

### Issue
The Convex schema (`convex/schema.ts`) is 413 lines with 25 tables. Several patterns create migration risk:

- `runContracts` table has 25+ optional fields added incrementally — this is a wide table anti-pattern
- `stagesJson`, `envOverrideJson`, `payloadJson` store structured data as strings — lose type safety and queryability
- No schema versioning or migration strategy documented

### Recommendation
1. **Normalize `runContracts`** into separate tables: `runContractStages`, `runContractReviews`, `runContractRecoveries`
2. **Replace JSON string columns** with proper sub-tables or Convex's `v.object()` where possible
3. **Document the migration strategy** — Convex requires `npx convex dev` for schema changes; how do we handle breaking changes?
4. **Add a schema version field** to a `systemMetadata` table for runtime compatibility checks

---

## 6. Single Point of Failure: Convex Connection 🔴

### Issue
The entire system assumes Convex is always available:

- `createConvexClient()` throws if `CONVEX_URL` is missing — no offline/degraded mode
- `runProject()` fails entirely if Convex queries fail — no local fallback
- The Bun server WebSocket hub exists but is unused (frontend uses Convex subscriptions)
- No retry logic for Convex network failures

### Recommendation
1. **Add a local SQLite fallback** for read-only operations when Convex is unavailable (leveraging the existing migration scripts)
2. **Add exponential backoff retry** for Convex mutations in the orchestrator
3. **Implement a degraded mode** where the dispatcher can run from local `measure/` markdown if Convex is down
4. **Add health check endpoints** that verify Convex connectivity and report status

---

## 7. Git Integration is Half-Implemented 🟡

### Issue
The git orchestrator (`gitOrchestrator.ts`) creates branches and commits, but:

- No PR creation or merge logic exists (Phase 5 tracks are pending)
- Branch cleanup after task completion is manual — branches accumulate
- No handling for merge conflicts or dirty worktrees before branch creation
- `generateCommitMessage` uses a rigid template with no context from actual changes

### Recommendation
1. **Add pre-flight checks** before `git branch`: verify clean worktree, verify no uncommitted changes
2. **Implement automatic branch cleanup** on task success (with opt-out config)
3. **Add PR draft generation** using `gh pr create --draft` as a starting point
4. **Improve commit messages** with LLM-generated summaries of the actual diff

---

## 8. Dispatch Scoring Has Hidden Biases 🟡

### Issue
The scoring system (`policy/scoring.ts`) has several subtle issues:

- `personaFitness` and `expectedCost` use `p50Cost` but the name implies cost — actually stores a normalized score (1 - cost)
- `starvationBonus` uses `task.updatedAt` but this is updated on any change, not just dispatch attempts — a task that gets repeatedly rejected doesn't age properly
- `regressionRisk` uses `coverageRegressionRate` but no task has this data populated initially
- The `epsilon` tie-breaker (0.1) is arbitrary and not configurable

### Recommendation
1. **Add a `lastDispatchAttemptAt` field** to tasks for accurate starvation calculation
2. **Make `epsilon` and all weights** configurable per-project via Convex settings
3. **Add scoring telemetry** — log why each task was scored the way it was for post-hoc analysis
4. **Fix `expectedCost` naming** — rename to `costEfficiency` or change the calculation to be intuitive

---

## 9. Frontend Data Architecture is Fragile 🟡

### Issue
- `useFleetData.ts:67` hardcodes `/home/daniel-bo/Desktop` as scan root (TD-030)
- `useLogStream` connects to WebSocket but the server WebSocket hub is mostly unused
- `App.tsx:22` passes `fleet.projects[0]?.id` to `useLogStream` — arbitrary project selection
- No global error boundary for Convex subscription failures

### Recommendation
1. **Fix TD-030** — use server-side default or environment variable for scan root
2. **Remove unused WebSocket code** from `server.ts` or actually use it for log streaming
3. **Add project selection to log stream** — don't auto-pick the first project
4. **Add Convex subscription error handling** in `ConvexProvider` with retry and fallback UI

---

## 10. Security & Secrets Management 🔴

### Issue
- `.env.local` is read via `fs.readFileSync` with hardcoded paths — not portable across team members
- No encryption for agent API keys stored in Convex `agents` table
- `frontend/package.json` includes `@playwright/test` as a devDependency but also in root `dependencies` — bloats production installs
- Git routes execute arbitrary git commands with user-provided branch names — potential command injection

### Recommendation
1. **Use a secrets manager** (1Password CLI, doppler, or OS keychain) for agent API keys
2. **Encrypt sensitive fields** in Convex using field-level encryption before storage
3. **Move Playwright to devDependencies only** in root package.json
4. **Sanitize all user inputs** passed to `Bun.spawn` or `git` commands — validate branch names match `[a-zA-Z0-9._/-]+`

---

## 11. Operational Observability is Thin 🟡

### Issue
- No structured logging — everything is `console.log`/`console.warn`
- No metrics export (Prometheus/Datadog) despite Phase 10 roadmap
- `executionLogs` captures output but not structured dispatcher decisions
- No alerting when circuit breakers open or tasks stall

### Recommendation
1. **Replace console logging** with a structured logger (pino, winston, or Bun's built-in) that supports JSON output and log levels
2. **Add OpenTelemetry tracing** for the dispatch→execute→persist flow
3. **Create an `alerts` table** in Convex for actionable events (circuit open, stall detected, budget breach)
4. **Add a `/health` endpoint** that returns system status: Convex connectivity, last dispatch time, queue depth

---

## 12. Track/Plan Structure is Underutilized 🟢

### Issue
The upcoming Phase 5 tracks (`pipeline_runner_20260425`, `git_integration_enhance_20260425`, `pr_automation_v2_20260425`) have **placeholder plans** with generic phases:

```
## Phase 1: Foundation
- [ ] Set up core infrastructure
- [ ] Write failing tests
```

This is not actionable. The legacy tracks (`git_integration_20260330`, `pr_automation_20260330`) have detailed plans but are marked pending.

### Recommendation
1. **Merge legacy and v2 tracks** — the 2026-04-25 tracks should inherit specs from the 2026-03-30 tracks, not start blank
2. **Require spec.md for every active track** — currently only plan.md exists for pending tracks
3. **Add acceptance criteria** to each plan task — "Set up core infrastructure" is not verifiable
4. **Archive the 2026-03-30 tracks** if superseded, or mark them as dependencies

---

## 13. Dependency Management 🟢

### Issue
- Root `package.json` has `concurrently` as only devDependency but lists `convex`, `playwright` as runtime dependencies — these should be workspace-scoped
- Frontend uses React 19.2.3 but some dependencies may not be fully compatible
- No `package-lock.json` or `yarn.lock` — only `bun.lock`, which is correct but should be documented

### Recommendation
1. **Clean up root package.json** — move workspace-specific deps to their respective package.json files
2. **Add a dependency audit step** to CI — check for known vulnerabilities with `bun audit` or `npm audit`
3. **Document the bun-only policy** prominently in README and AGENTS.md
4. **Verify React 19 compatibility** across all frontend dependencies

---

## 14. Missing Foundation: CI/CD for Itself 🟡

### Issue
The system is designed to manage CI/CD for other projects, but has no CI/CD for itself:

- No GitHub Actions workflow for testing
- No automated deployment of the Bun server
- No automated Convex schema validation on PR
- No pre-commit hooks for linting/formatting

### Recommendation
1. **Add `.github/workflows/ci.yml`** that runs: `bun test`, `bun run typecheck`, `bun run lint`
2. **Add schema validation** step that runs `npx convex codegen --init` and verifies no drift
3. **Add a pre-commit hook** (husky or similar) for formatting and linting
4. **Document deployment procedure** for the Bun server (PM2, systemd, Docker)

---

## Priority Action Plan

### Week 1 (Critical)
1. Update README.md and AGENTS.md to reflect current architecture
2. Fix hardcoded `'opencode'` harness in orchestrator
3. Add structured error logging (replace `catch {}` blocks)
4. Add input sanitization to git routes

### Week 2 (Important)
5. Add integration test for full orchestrator lifecycle
6. Implement Convex retry logic with backoff
7. Add pre-flight git checks (clean worktree validation)
8. Move configuration to Convex settings table

### Week 3 (Foundation)
9. Normalize `runContracts` schema (or document why not)
10. Add CI/CD workflow for the project itself
11. Fix TD-030 (hardcoded scan root)
12. Merge legacy+v2 track plans with actual specs

### Week 4 (Enhancement)
13. Add OpenTelemetry or structured logging
14. Implement local fallback mode for Convex outages
15. Add dependency audit to CI
16. Create ADR documents for major architectural decisions

---

*Review conducted: 2026-05-01*
*Files examined: 200+ across pivot/, frontend/, convex/, measure/*
*Test files: 85 total (51 pivot, 34 frontend)*
