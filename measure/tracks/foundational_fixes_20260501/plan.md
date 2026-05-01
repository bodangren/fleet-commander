# Implementation Plan: Foundational Fixes

## Phase 1: Documentation Corrections

- [x] Task: Rewrite README.md for Bun + Convex architecture
    - [x] Update tech stack section (Bun, Convex, React/Vite)
    - [x] Update project structure (pivot/, frontend/, convex/)
    - [x] Update development commands (bun run dev, etc.)
    - [x] Remove Go/SQLite references
    - [x] Verify with `cat README.md`

- [x] Task: Update AGENTS.md to match current structure
    - [x] Replace Electron references with pivot/frontend layout
    - [x] Update build/test commands to match package.json scripts
    - [x] Update project structure section
    - [x] Verify accuracy

- [x] Task: Create Architecture Decision Records
    - [x] Write ADR-001: Go Backend Decommission (2026-04-02)
    - [x] Write ADR-002: Electron to Vite Pivot
    - [x] Write ADR-003: Meta-Harness Architecture (opencode)
    - [x] Place ADRs in `measure/adrs/` directory

## Phase 2: Error Handling — Orchestrator

- [x] Task: Add structured logging to orchestrator catch blocks
    - [x] Identify all `catch {}` blocks in `orchestrator.ts`
    - [x] Create `logOrchestratorError()` helper function
    - [x] Replace silent catches with structured logging
    - [x] Include context: taskKey, agentId, operation, error message
    - [~] Write tests verifying errors are logged

- [x] Task: Create orchestratorErrors table and queries
    - [x] Add `orchestratorErrors` table to Convex schema
    - [x] Create `logError` mutation
    - [x] Create `listErrors` query with time range filtering
    - [x] Create `getRecentErrors` query
    - [~] Write tests for error persistence

- [ ] Task: Update error handling in executor and constraints
    - [ ] Add structured logging to `executor.ts` catch blocks
    - [ ] Add structured logging to `constraints.ts`
    - [ ] Ensure all error paths are tested

## Phase 3: Git Route Security

- [x] Task: Implement branch name validation
    - [x] Create `validateBranchName()` utility function
    - [x] Pattern: `^[a-zA-Z0-9._/-]+$`
    - [x] Add checks for edge cases (double dots, leading hyphen, etc.)
    - [x] Create `sanitizeForShell()` utility
    - [~] Add unit tests for valid and invalid names

- [x] Task: Apply validation to all git routes
    - [x] Update `/api/git/branch` POST handler
    - [x] Update `/api/git/push` POST handler
    - [x] Update `/api/git/delete-branch` POST handler
    - [x] Update `/api/git/delete-remote-branch` POST handler
    - [x] Return 400 Bad Request for invalid branch names
    - [ ] Add integration tests for command injection attempts

- [ ] Task: General input sanitization audit
    - [ ] Audit all routes accepting user input
    - [ ] Add validation to `projectSlug` parameters
    - [ ] Add validation to `taskId` parameters
    - [ ] Document sanitization patterns in code style guide

## Phase 4: Configuration Management

- [x] Task: Create config module
    - [x] Create `pivot/src/config/index.ts`
    - [x] Define config interface: port, timeouts, retries, thresholds
    - [x] Implement env var loading with defaults
    - [ ] Add tests for config resolution

- [ ] Task: Move operational constants to Convex settings
    - [ ] Add settings keys: `orchestrator.maxRetries`, `orchestrator.timeoutMs`
    - [ ] Update `DEFAULT_CONFIG` to read from settings first
    - [ ] Create migration script for default values
    - [ ] Add tests for settings override

- [ ] Task: Fix log stream project selection
    - [ ] Update `App.tsx` to require valid project ID
    - [ ] Remove empty string fallback
    - [ ] Add error state when no project selected
    - [ ] Add tests for project selection validation

## Phase 5: Testing Infrastructure

- [ ] Task: Add integration test for full orchestrator lifecycle
    - [ ] Test: load state → filter → score → execute → persist
    - [ ] Mock Convex client and agent execution
    - [ ] Verify all state transitions
    - [ ] Verify error handling paths

- [x] Task: Add schema drift detection
    - [x] Add schema validation step to CI workflow
    - [ ] Create script to verify `convex/_generated/*` matches schema
    - [ ] Test with intentional drift to verify detection

- [ ] Task: Improve test coverage
    - [ ] Identify untested files in pivot (target 80%)
    - [ ] Identify untested files in frontend (target 60%)
    - [ ] Write tests for critical paths first
    - [ ] Run coverage reports and verify

## Phase 6: Schema & Resilience

- [ ] Task: Add schema version tracking
    - [ ] Create `systemMetadata` table
    - [ ] Add schema version field
    - [ ] Write migration to populate initial version
    - [ ] Add check on server startup

- [ ] Task: Add Convex retry logic
    - [ ] Implement exponential backoff for Convex mutations
    - [ ] Add retry to orchestrator client calls
    - [ ] Add tests for retry behavior
    - [ ] Document retry configuration

- [ ] Task: Add health check endpoint
    - [ ] Create `/health` endpoint in server
    - [ ] Verify Convex connectivity
    - [ ] Report last dispatch time, queue depth
    - [ ] Return 503 if Convex unavailable

## Phase 7: Git Integration Improvements

- [ ] Task: Add git pre-flight checks
    - [ ] Verify clean worktree before branch creation
    - [ ] Check for uncommitted changes
    - [ ] Return meaningful error if worktree dirty
    - [ ] Add tests for dirty worktree scenarios

- [ ] Task: Implement automatic branch cleanup
    - [ ] Delete local branch on task success
    - [ ] Add config flag to opt out
    - [ ] Log cleanup actions
    - [ ] Add tests for cleanup behavior

- [ ] Task: Improve commit message generation
    - [ ] Include task context in commit messages
    - [ ] Add option for LLM-generated summaries
    - [ ] Keep template as fallback
    - [ ] Add tests for message generation

## Phase 8: Dispatch Scoring Fixes

- [ ] Task: Fix starvation scoring
    - [ ] Add `lastDispatchAttemptAt` field to tasks
    - [ ] Update starvation bonus to use new field
    - [ ] Update task queries to set field on dispatch attempt
    - [ ] Add tests for starvation calculation

- [ ] Task: Make scoring configurable
    - [ ] Add `epsilon` to Convex settings
    - [ ] Add weight overrides per project
    - [ ] Update `selectBestCandidate` to use settings
    - [ ] Add tests for configuration

- [ ] Task: Add scoring telemetry
    - [ ] Log score breakdown for each candidate
    - [ ] Store in `scoreAudit` or new table
    - [ ] Add query to retrieve scoring history
    - [ ] Add tests for telemetry

## Phase 9: Frontend Fixes

- [ ] Task: Fix TD-030 (hardcoded scan root)
    - [ ] Replace hardcoded path with env var or API config
    - [ ] Update `useFleetData.ts`
    - [ ] Add tests for config-driven path
    - [ ] Verify with different scan roots

- [ ] Task: Fix log stream project selection
    - [ ] Add project selector to log stream UI
    - [ ] Remove auto-pick first project
    - [ ] Handle no project selected state
    - [ ] Add tests for project selection

- [ ] Task: Add Convex error handling
    - [ ] Add error boundary for subscription failures
    - [ ] Implement retry with exponential backoff
    - [ ] Show fallback UI on persistent failures
    - [ ] Add tests for error states

## Phase 10: Security & Dependencies

- [x] Task: Fix dependency management
    - [x] Move Playwright to devDependencies in root
    - [x] Audit root package.json for workspace-specific deps
    - [x] Verify build still works

- [ ] Task: Add secrets management documentation
    - [ ] Document API key storage best practices
    - [ ] Recommend OS keychain or env vars
    - [ ] Add to AGENTS.md security section
    - [ ] Note: full encryption deferred to security track

- [ ] Task: Verify React 19 compatibility
    - [ ] Check all frontend dependencies for React 19 support
    - [ ] Update incompatible packages
    - [ ] Run full test suite
    - [ ] Document any known issues

## Phase 11: Observability

- [x] Task: Add structured logging
    - [x] Create logger module with severity levels
    - [x] Add `logOrchestratorError()` helper
    - [x] Add `consoleLogError()` helper
    - [x] Replace silent catches in orchestrator with structured logging
    - [ ] Replace remaining console.log/warn/error calls across codebase
    - [ ] Add JSON output format for production
    - [ ] Add tests for logging behavior

- [ ] Task: Add alerts table
    - [ ] Create `alerts` table in Convex schema
    - [ ] Add mutations for creating alerts
    - [ ] Create alert types: circuit_open, stall, budget_breach
    - [ ] Add query to list active alerts
    - [ ] Add tests for alert creation

- [ ] Task: Enhance /health endpoint
    - [ ] Add circuit breaker status to health response
    - [ ] Add recent error count
    - [ ] Add queue depth metrics
    - [ ] Add last successful dispatch timestamp

## Phase 12: CI/CD & Workflow

- [x] Task: Add GitHub Actions CI workflow
    - [x] Create `.github/workflows/ci.yml`
    - [x] Run pivot tests
    - [x] Run frontend tests
    - [x] Run lint and typecheck
    - [x] Run schema drift detection
    - [x] Run on PR and push to main

- [ ] Task: Add pre-commit hooks
    - [ ] Choose tool (husky, lefthook, or simple scripts)
    - [ ] Add formatting check
    - [ ] Add lint check
    - [ ] Add typecheck
    - [ ] Document in AGENTS.md

- [ ] Task: Document deployment
    - [ ] Add deployment section to README
    - [ ] Document PM2/systemd/Docker options
    - [ ] Include environment variable requirements
    - [ ] Add troubleshooting guide

## Phase 13: Final Verification

- [x] Task: Run full test suite
    - [x] Run pivot unit tests (`bun --cwd pivot test`)
    - [x] Run frontend unit tests (`bun --cwd frontend test`)
    - [ ] Run Playwright e2e tests (`bun --cwd frontend test:e2e`)
    - [x] Run lint (`npm run lint`)
    - [x] Run type check (`bunx tsc --noEmit` in pivot and frontend)
    - [ ] Run coverage reports
    - [x] Fix any regressions

- [ ] Task: Update project records
    - [ ] Mark track as completed in `measure/tracks.md`
    - [ ] Update `measure/tech-debt.md` if items resolved
    - [ ] Update `measure/lessons-learned.md` with insights
    - [ ] Verify all acceptance criteria met
    - [ ] Archive or update legacy tracks
