# Symphony Pivot

Status: **Complete** (2026-05-03)

## Background
OpenAI recently released the Symphony open spec for orchestrating autonomous agents. While Fleet Commander already achieves many of these goals locally (using Git worktrees for concurrency), there are specific architectural concepts from Symphony we need to adopt to stabilize our orchestration loop and improve agent continuity.

## Requirements

1. **Local Postgres for Convex:**
   - Migrate the local development environment from SQLite to Postgres.
   - Long-running orchestrators require a more robust local database to handle continuous polling and state mutation without locking issues.
   - Update `pivot/README.md` and dev scripts to spin up Convex with Postgres.

2. **Opencode Session Persistence:**
   - `opencode` is our exclusive agent harness. It supports resuming sessions.
   - The orchestrator must capture the `session_id` after an agent executes a turn.
   - If a task is incomplete (e.g., requires continuation or stalled), the orchestrator must resume the exact same `opencode` session, preventing token loss.

3. **Lifecycle Hooks:**
   - Implement `before_run`, `after_run`, and `after_create` hooks within the Harness Profiles.
   - Allows execution of arbitrary shell commands (e.g., `npm install`) inside the Git worktree prior to passing it to the agent.

4. **Exponential Backoff Retry Engine:**
   - Update `pivot/src/orchestrator/retryManager.ts`.
   - Implement the Symphony backoff formula: `delay = min(10000 * 2^(attempt - 1), max_backoff)`.

5. **Measure Task Metadata Tags:**
   - Enhance the Measure `plan.md` parser to support structured tags on task items.
   - E.g., `- [ ] @frontend Build component #priority:high #blocked_by:task-42`.
   - This provides the orchestrator with parseable Symphony-like dependencies.

## Implementation Summary

### Phase 1 — Local Postgres
- `docker-compose.yml`: Postgres 16 Alpine, port 5432, `convex:convex_local` creds.
- Root `package.json` dev script passes `CONVEX_POSTGRES_URL` to convex process.
- `pivot/README.md`: documented `docker compose up -d postgres` + env var setup.

### Phase 2 — Hooks & Backoff
- `convex/schema.ts`: added `beforeRunHook`, `afterRunHook`, `afterCreateHook` to `harnessProfiles`.
- `convex/harnessProfiles.ts`: `upsertProfile` accepts hook args.
- `pivot/src/orchestrator/hookRunner.ts`: `runHook()` and `runHooks()` — executes shell in cwd, captures stdout/stderr, respects timeout.
- `pivot/src/orchestrator/orchestrator.ts`: calls `beforeRun` before retry loop, `afterRun` on success; failures logged as warnings.
- `pivot/src/orchestrator/retryManager.ts`: added `calculateSymphonyBackoff(attempt)` — `min(baseDelayMs * 2^(attempt-1), maxDelayMs)`, no jitter.
- `pivot/src/orchestrator/types.ts`: added `SYMPHONY_RETRY_CONFIG` (10s base, 60s max, 3 retries).

### Phase 3 — Session Persistence
- `pivot/src/orchestrator/executor.ts`: `parseSessionId(output)` — extracts `session_id`/`sessionId` from opencode JSON output lines.
- `pivot/src/orchestrator/types.ts`: `ExecutionResult.sessionId`, `Task.sessionId`.
- `convex/schema.ts`: `sessionId` on `tasks` and `runContracts`.
- `convex/fleetCatalog.ts`: `upsertTask` accepts optional `sessionId`.
- `pivot/src/orchestrator/resolver.ts`: `{session_id}` template variable in harness command.
- Orchestrator passes `task.sessionId` to executor, stores `result.sessionId` on success.

### Phase 4 — Metadata Tags
- `pivot/src/orchestrator/tagParser.ts`: `parseTaskLine()` and `parsePlanTags()` — extracts status, assignee, title, `#key:value` tags from plan.md lines.
- `pivot/src/orchestrator/constraints.ts`: `tagBlockedBy()` — filters tasks where `#blocked_by` ref is not done.
- `pivot/src/policy/scoring.ts`: `priorityWeight()` reads `#priority` tag (critical=3, high=2, low=0.5).
- `Task.tags?: Record<string, string>` added to type.

### Test Coverage
- hookRunner: 9 tests
- tagParser: 12 tests
- executor (including parseSessionId): 11 tests
- retryManager (including Symphony backoff): 14 tests
- constraints (including tagBlockedBy): 41 tests
- orchestrator: 45 tests
- scoring: 32 tests
- **Total key files: 153 passing, typecheck clean**