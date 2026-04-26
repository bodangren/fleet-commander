# Implementation Plan - Error Recovery & Resilience

## Phase 1: Error Taxonomy and Health Status Model

- [x] Task: Define error types in `internal/errors/` package
  - `ParseError` (corrupt file, missing file, malformed content)
  - `ExecutionError` (timeout, binary missing, process crash)
  - `RecoverableError` vs `FatalError` classification
  - Write test: each error type implements `error` interface and carries metadata (project, file, cause)
- [x] Task: Define project health status model
  - Enum: `healthy`, `degraded`, `error`
  - Store current health in memory on the project state struct
  - Add health field to project API response JSON
  - Write test: new project starts as `healthy`, parse error transitions to `degraded`
- [x] Task: Add health status to CLI `measure status` output
  - Show health emoji or indicator per project in table output

## Phase 2: Parser Resilience

- [x] Task: Wrap `parser.ParsePlan` and `parser.ParseTracks` with error recovery
  - Catch panics from malformed markdown, return `ParseError` instead
  - On `ParseError`, log warning and return empty plan/tracks (not crash)
  - Write test: parsing a file with invalid YAML frontmatter returns error, not panic
- [x] Task: Implement retry logic for transient file errors
  - On file-lock or read error, retry up to 3 times with exponential backoff
  - After retries exhausted, mark project as `degraded`
  - Write test: retry logic works correctly
- [x] Task: Handle missing `plan.md` gracefully
  - If file does not exist, return empty phases, not crash
- [x] Task: Update file watcher to handle errors without crashing
  - Catch errors from parser callbacks
  - Continue watching other projects if one project fails

## Phase 3: Execution Resilience

- [x] Task: Add configurable timeout to harness execution
  - Read `execution.timeout` from config (default "30m")
  - Wrap `exec.Command` with `context.WithTimeout`; kill process on timeout
  - Log timeout event and mark execution as `status: timeout`
- [x] Task: Detect harness binary disappearance mid-run
  - Monitor process exit code; if exit code indicates missing binary, log specific error
- [x] Task: Implement auto-recovery for recoverable errors
  - Track retry count per project in memory
  - On `RecoverableError`, re-attempt operation up to configurable limit

## Phase 4: Dashboard Health Indicators

- [x] Task: Create `ProjectHealthBadge` React component
  - Renders green/yellow/red indicator based on health status
  - Shows tooltip with error message when `degraded` or `error`
- [x] Task: Add health field to project list API response
  - Update project model to include `health` and `lastError` fields
- [x] Task: Integrate health badges into project list and detail views

## Phase 5: Verification

- [x] Task: Run `npm run lint` and `npm run test` across all new code
- [ ] Task: Manual verification: corrupt a plan.md, verify dashboard shows degraded; fix it, verify recovery
- [ ] Task: Manual verification: kill a harness binary during execution, verify graceful failure log
- [x] Task: Update `measure/tracks/error_recovery_resilience_20260330/plan.md` to mark phases complete
