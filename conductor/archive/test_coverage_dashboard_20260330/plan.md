# Implementation Plan - Test Coverage Dashboard

## Phase 1: Coverage Parser (Multi-Format)

- [x] Task: Define `CoverageResult` struct in `internal/coverage/parser.go` with `Tool`, `Percentage`, `Raw` fields
- [x] Task: Implement Go coverage parser that extracts percentage from `-cover` output via regex
- [x] Task: Implement Jest coverage parser that reads `coverage-summary.json` or parses text total line
- [x] Task: Implement pytest-cov parser that extracts `TOTAL` row percentage from terminal output
- [x] Task: Implement `Parse(tool, output)` dispatcher that routes to correct parser
- [x] Task: Write tests for each parser with real sample outputs (pass, missing, malformed)

## Phase 2: Coverage Storage and History API

- [x] Task: Define `CoverageRecord` struct in `internal/coverage/store.go` with `ProjectID`, `Percentage`, `Date`, `ExecutionID`
- [x] Task: Implement file-based storage writing records to `conductor/data/coverage.jsonl`
- [x] Task: Implement `GetHistory(projectID, limit)` returning records sorted by date
- [x] Task: Add `GET /api/projects/:id/coverage` route in `main.go` returning history
- [x] Task: Write tests for store read/write and history retrieval

## Phase 3: Dashboard Coverage Charts and Threshold Alerts

- [x] Task: Add coverage history API call in `src/renderer/` service layer
- [x] Task: Build `CoverageChart` component using Recharts LineChart with date x-axis and percentage y-axis
- [x] Task: Build `CoverageDiff` component showing before/after/delta with color-coded indicator
- [x] Task: Integrate coverage chart into project dashboard view
- [x] Task: Integrate coverage diff into task detail view
- [x] Task: Parse `conductor/coverage.yml` for per-track-type thresholds

## Phase 4: Threshold Enforcement in Orchestrator

- [x] Task: After coverage parse, compare against threshold for track type in orchestrator flow
- [x] Task: Auto-create blocker issue when coverage drops below threshold
- [x] Task: Log threshold violation with before/after percentages
- [x] Task: Write integration test: task completes, coverage drops, blocker created

## Phase 5: Verification

- [x] Task: End-to-end test: project with Go tests, coverage parsed, stored, charted
- [x] Task: End-to-end test: threshold violation creates blocker
- [x] Task: Run `npm run check` and `npm run test` — all pass
- [x] Task: Update plan.md checkboxes, write deviation notes if any
