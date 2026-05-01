# Specification: Foundational Fixes

## Overview

Fix critical foundational errors identified during the 2026-05-01 architecture review. These 14 issues span documentation accuracy, error handling discipline, input validation, operational configuration, testing gaps, schema design, resilience, frontend architecture, security, observability, and development workflow. Addressing them is prerequisite to safe Phase 5 (CI/CD) work.

## Functional Requirements

### 1. Documentation Drift

**README.md still describes the decommissioned Go backend + SQLite stack (archived 2026-04-02). AGENTS.md references Electron architecture (`src/main/`, `src/preload/`, `src/renderer/`) that does not exist in the current Bun + Convex codebase.**

- Rewrite README.md to reflect current Bun + Convex architecture
- Update AGENTS.md to match actual `pivot/` and `frontend/` directory layout
- Add Architecture Decision Record (ADR) documenting Go→Bun and Electron→Vite pivots
- Remove or archive legacy documentation

### 2. Error Handling Philosophy Inconsistency

**The codebase uses two competing error strategies: ~15 `catch { // best-effort }` blocks silently swallow errors (score audit, circuit breaker, recovery logging, coverage enforcement), while `executor.ts` throws fatally on git failures.**

- Add structured error logging to all orchestrator catch blocks
- Distinguish between fatal, warning, and debug severity levels
- Ensure error messages include context (taskKey, agentId, operation)
- Add tests verifying errors are logged, not swallowed

### 3. Git Route Input Sanitization

**Git routes pass user-provided branch names directly to `Bun.spawn(['git', ...])` without validation, creating command injection risk.**

- Validate branch names match `[a-zA-Z0-9._/-]+` before passing to git commands
- Reject requests with invalid branch names with 400 Bad Request
- Add tests for command injection attempts
- Sanitize all user inputs passed to shell commands

### 4. Hardcoded Operational Constants

**Multiple compile-time constants should be configuration-driven:**

- Port `8081` in `server.ts` — no environment override for staging/prod
- `DEFAULT_CONFIG` values (maxRetries: 3, timeout: 600s) in `types.ts`
- `useLogStream` falls back to empty string for project ID

- Create `config/` module with environment-aware defaults
- Move timeouts, retries, thresholds to Convex `settings` table
- Validate log stream project selection — empty string should error

### 5. Missing Error Logging Infrastructure

**No centralized error capture for non-fatal failures:**

- Create `orchestratorErrors` Convex table for non-fatal failure capture
- Log score audit failures, circuit breaker failures, recovery logging failures
- Add query endpoint to retrieve orchestrator errors by time range
- Add tests for error persistence

### 6. Meta-Harness Documentation

**Opencode is the unified meta-harness across ~100 LLM models, but this architectural choice is not documented.**

- Document meta-harness choice in ADR
- Explain why single harness simplifies syntax and model switching
- Update harness capability schema docs to reflect this

### 7. Test Strategy Gaps

**68% file coverage in pivot, 42% in frontend. No integration test for full dispatch→execute→persist cycle. No schema drift detection.**

- Add integration test for full orchestrator lifecycle
- Add Convex schema drift detection (CI check for `convex/_generated/*`)
- Add frontend contract tests (API response shape validation)
- Add test for `runAllProjects` orchestration
- Target 80% file coverage for pivot, 60% for frontend

### 8. Schema Evolution Risk

**`runContracts` table has 25+ optional fields (wide table anti-pattern). JSON string columns (`stagesJson`, `payloadJson`) lose type safety and queryability.**

- Document schema migration strategy in ADR
- Add schema version field to `systemMetadata` table
- Evaluate normalizing `runContracts` into sub-tables
- Replace JSON strings with proper sub-tables where queryability is needed

### 9. Single Point of Failure: Convex Connection

**Entire system fails if Convex is unreachable. No retry logic, no local fallback, no health checks.**

- Add exponential backoff retry for Convex mutations in orchestrator
- Implement health check endpoint (`/health`) verifying Convex connectivity
- Add local SQLite fallback for read-only operations when Convex unavailable
- Document degraded mode behavior

### 10. Git Integration Half-Implemented

**Git orchestrator creates branches and commits, but: no branch cleanup, no dirty worktree checks, no PR creation, rigid commit messages.**

- Add pre-flight checks before `git branch`: verify clean worktree
- Implement automatic branch cleanup on task success (with opt-out config)
- Add PR draft generation using `gh pr create --draft`
- Improve commit messages with context from actual changes

### 11. Dispatch Scoring Hidden Biases

**`starvationBonus` uses `task.updatedAt` (any change) instead of `lastDispatchAttemptAt`. Tasks repeatedly rejected don't age properly. `epsilon` tie-breaker (0.1) is arbitrary.**

- Add `lastDispatchAttemptAt` field to tasks for accurate starvation calculation
- Make `epsilon` and all weights configurable per-project via Convex settings
- Add scoring telemetry logging why each task was scored the way it was
- Fix `expectedCost` naming (currently stores 1 - cost, which is counterintuitive)

### 12. Frontend Data Architecture Fragility

**`useFleetData.ts:67` hardcodes `/home/daniel-bo/Desktop` as scan root (TD-030). `useLogStream` connects to arbitrary first project. Unused WebSocket code in server.**

- Fix TD-030: use server-side default or env var for scan root
- Remove unused WebSocket code from `server.ts` or implement log streaming
- Add project selection to log stream — don't auto-pick first project
- Add Convex subscription error handling in `ConvexProvider`

### 13. Security & Secrets Management

**`.env.local` read via hardcoded paths. No encryption for agent API keys. Playwright in root dependencies. Potential command injection in git routes.**

- Use OS keychain or env vars for agent API keys (don't store in Convex plain text)
- Move Playwright to devDependencies only in root package.json
- Sanitize all user inputs passed to `Bun.spawn` or git commands
- Add branch name validation (see #3)

### 14. Operational Observability

**No structured logging — everything is console.log. No metrics export. No alerting. `executionLogs` captures output but not structured dispatcher decisions.**

- Replace console logging with structured logger (JSON output, log levels)
- Add OpenTelemetry or similar tracing for dispatch→execute→persist flow
- Create `alerts` table in Convex for actionable events (circuit open, stall, budget breach)
- Add `/health` endpoint returning system status

### 15. CI/CD for Itself

**A CI/CD orchestration tool with no CI/CD workflow for itself. No GitHub Actions, no automated testing, no deployment docs.**

- Add `.github/workflows/ci.yml` running tests, lint, typecheck
- Add schema validation step (`npx convex codegen --init` + drift check)
- Add pre-commit hook for formatting/linting
- Document Bun server deployment (PM2, systemd, or Docker)

### 16. Dependency Management

**Root package.json lists workspace-specific deps as runtime dependencies. React 19 compatibility unverified.**

- Clean up root package.json — move workspace deps to respective package.json
- Add dependency audit step to CI (`bun audit`)
- Document bun-only policy prominently
- Verify React 19 compatibility across frontend dependencies

## Non-Functional Requirements

- All existing tests must continue to pass
- No breaking changes to public APIs
- Maintain backward compatibility with existing Convex data
- Changes must be atomic and reversible per task
- All new code must have >80% test coverage

## Acceptance Criteria

- [ ] README.md accurately describes Bun + Convex architecture
- [ ] AGENTS.md matches actual directory structure
- [ ] ADRs document Go→Bun, Electron→Vite, and meta-harness pivots
- [ ] All orchestrator catch blocks log structured errors
- [ ] Git routes validate branch names before execution
- [ ] Invalid branch names return 400 Bad Request
- [ ] Config module exists with environment-aware defaults
- [ ] Timeouts/retries configurable via Convex settings
- [ ] `orchestratorErrors` table captures non-fatal failures
- [ ] Integration test covers full dispatch→execute→persist cycle
- [ ] Schema drift detection runs in CI
- [ ] `/health` endpoint verifies Convex connectivity
- [ ] Git pre-flight checks verify clean worktree
- [ ] Starvation scoring uses `lastDispatchAttemptAt`
- [ ] TD-030 fixed (hardcoded scan root)
- [ ] Playwright moved to devDependencies
- [ ] Structured logging replaces console.log
- [ ] CI workflow runs tests, lint, and typecheck on PR
- [ ] All unit tests pass
- [ ] All e2e tests pass
- [ ] Lint and type checks pass
- [ ] Coverage targets met (pivot 80%, frontend 60%)

## Out of Scope

- Schema normalization of `runContracts` (deferred to dedicated track)
- Full offline mode with local SQLite write-back (deferred to resilience track)
- Secrets encryption at rest (deferred to security hardening track)
- Prometheus/Grafana observability stack (Phase 10)
- Plugin system (Phase 9)
