# Implementation Plan - Test Coverage Dashboard (Bun + Convex)

## Phase 1: Coverage Parser (Vitest JSON)

- [x] Task: Define `CoverageResult` type in `src/shared/coverage.ts` with `percentage`, `tool`, `raw` fields
- [x] Task: Implement Vitest coverage parser that reads and parses `coverage-summary.json`
- [x] Task: Implement `parseCoverage(tool, output)` dispatcher that routes to correct parser
- [x] Task: Write tests for coverage parser with real sample outputs (pass, missing, malformed)

## Phase 2: Coverage Storage and History API (Convex)

- [ ] Task: Define `coverageRecords` Convex table schema with `projectId`, `percentage`, `date`, `executionId`
- [ ] Task: Implement Convex mutation to store a coverage record
- [ ] Task: Implement Convex query `getCoverageHistory(projectId, limit)` returning records sorted by date
- [ ] Task: Write tests for store read/write and history retrieval

## Phase 3: Dashboard Coverage Charts and Threshold Alerts

- [ ] Task: Add coverage history API call in frontend service layer
- [ ] Task: Build `CoverageChart` component using Recharts LineChart with date x-axis and percentage y-axis
- [ ] Task: Build `CoverageDiff` component showing before/after/delta with color-coded indicator
- [ ] Task: Integrate coverage chart into project dashboard view
- [ ] Task: Parse `conductor/coverage.yml` for per-track-type thresholds

## Phase 4: Threshold Enforcement in Orchestrator

- [ ] Task: After coverage parse, compare against threshold for track type in orchestrator flow
- [ ] Task: Auto-create blocker issue when coverage drops below threshold
- [ ] Task: Log threshold violation with before/after percentages
- [ ] Task: Write integration test: task completes, coverage drops, blocker created

## Phase 5: Verification

- [ ] Task: End-to-end test: project with Vitest coverage, parsed, stored, charted
- [ ] Task: End-to-end test: threshold violation creates blocker
- [ ] Task: Run `npm run check` and `npm run test` — all pass
- [ ] Task: Update plan.md checkboxes, write deviation notes if any
