# Lessons Learned

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove or condense entries that are no longer relevant to near-term planning.

## Architecture & Design

- (2026-01-20, scaffold_project) Electron chosen for native file system access and folder selector capabilities
- (2026-01-21, terminal_stack) xterm.js in renderer with IPC bridge to node-pty sessions in main process
- (2026-03-13, llm_agent) Agent templates stored in settings; agent selection persisted via @tag in plan.md
- (2026-03-14, agent_scheduling) ScheduleApi exposed via preload for renderer-to-main IPC; ScheduleService tracks nextExecutionTime

## Recurring Gotchas

- (2026-01-20, kanban_board) DevTools not available in Electron app; manual verification must avoid DevTools usage
- (2026-03-13, llm_agent) Placeholder replacement must handle both single and double quote wrapping
- (2026-03-14, agent_scheduling) Window API types must be declared in vite-env.d.ts for TypeScript compilation

## Patterns That Worked Well

- (2026-01-19, scaffold_project) Vite + Electron integration using vite-plugin-electron for fast HMR
- (2026-03-13, llm_agent) IPC handlers for spawning PTY with pre-written commands enables agent execution flow
- (2026-03-14, agent_scheduling) Polling schedule status every 5s provides responsive UI without overwhelming IPC
- (2026-04-02, bun_orchestrator) Bun orchestrator mirrors Go module boundaries (evaluator, executor, resolver) for easier parity testing; Convex mutations replace Go in-memory state
- (2026-04-04, tech_debt_fixes) Review hooks wired as optional `runReview` in IssueHooks so orchestrator continues if review service unavailable
- (2026-04-05, typed_convex_api) Use Convex's generated `api` object from `_generated/api.ts` instead of string identifiers with `as never` casts — provides compile-time function name and argument validation; test mocks must handle proxy objects (use `String(fn)` or return default data for all queries)
- (2026-04-05, continuous_orchestration) Continuous mode state stored in Convex settings table as JSON blob (scope: orchestrator, key: continuousMode) — avoids schema changes while keeping state queryable; idle detection uses last-loaded task snapshot to avoid unnecessary Convex queries per cycle
- (2026-04-05, self_healing_workflows) Circuit breaker pattern with sliding window failure tracking prevents cascading failures; RecoveryDispatcher separates health check logic from orchestrator dispatch for clean separation of concerns; exponential backoff with jitter avoids thundering herd on retries
- (2026-04-08, e2e_testing) Playwright e2e tests require backend (port 8081) to be running; tests gracefully skip when backend unavailable; always check for element visibility before asserting to handle loading states
- (2026-04-08, e2e_testing) Playwright 1.59.1 uses headless shell (chromium_headless_shell-1217) rather than full Chrome; `npx playwright install chromium` downloads both

## Planning Improvements

- (2026-03-24, daily_refactor) After moving frontend to subdirectory, postcss.config.js needed ES module export syntax
- (2026-03-24, daily_refactor) index.html script path needed updating from /src/renderer/main.tsx to /src/main.tsx
- (2026-03-26, conductor_bootstrap) Keep `conductor/current_directive.md` present when `autonomous_prompt.md` expects it, or autonomous runs will start from stale bootstrap references
- (2026-03-27, agent_harness_management_ui) Frontend validation commands live under `frontend/`; use `npm test` and `npm run build` there
- (2026-04-02, go_sqlite_decommission) Decommission tracks must scope-check import graphs before archiving; Go modules can be superseded by Bun equivalents but still be actively imported by the Go server runtime
- (2026-04-04, tech_debt_fixes) Bun/Convex pivot already resolved TD-005 (multiline issues via body field) and TD-006 (zero settings via direct key storage) — verify before implementing
- (2026-04-05, daily_cleanup) ESLint config file pattern was `src/renderer/**/*` but source lives in `src/` — changing the pattern exposes pre-existing lint errors; keep pattern stable for focused cleanup tracks
- (2026-04-05, daily_cleanup) Zod v4 `z.record()` requires both key and value type arguments, unlike v3 which accepted single argument

## Go Architecture

- (2026-03-24, go_file_watcher_parser) fsnotify provides efficient file watching across platforms
- (2026-03-24, go_file_watcher_parser) Regex-based markdown parsing is sufficient for tracks.md and plan.md formats
- (2026-03-27, agent_harness_management_ui) Normalize agent and harness names when resolving API routes so URL-safe slugs and display names both work
- (2026-03-27, agent_harness_management_ui) Discovery commands need a short TTL cache because the editor can query the same harness repeatedly during selection
- (2026-03-28, go_file_watcher_parser) Resolve track plan paths consistently before parsing so watcher updates follow the same file layout as orchestrator writes
- (2026-03-28, frontend_project_kanban_board) Blocked-task issue previews need a backend lookup endpoint because broker/open markdown files are not directly inferable from the board alone
- (2026-03-29, orchestrator_harness_integration) AgentHarnessResolver bridges agent definitions to harness CLI invocations; fallback to `echo` keeps things working without config
- (2026-03-29, orchestrator_harness_integration) Use functional options (`WithExecutor`) for optional orchestrator dependencies to keep the constructor clean

## CLI Process Manager

- (2026-03-25, cli_process_manager) gorilla/websocket enables real-time output streaming from subprocess to web UI
- (2026-03-25, cli_process_manager) os/exec.CommandContext supports context cancellation for graceful process termination
- (2026-03-25, cli_process_manager) Buffered channels (100-line cap) prevent memory issues with long-running agent output
