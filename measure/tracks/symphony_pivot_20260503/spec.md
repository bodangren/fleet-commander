# Symphony Pivot

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