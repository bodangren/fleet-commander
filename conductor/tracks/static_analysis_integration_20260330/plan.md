# Implementation Plan - Static Analysis Integration

## Phase 1: Analysis Configuration Model and YAML Parser

- [ ] Task: Define `AnalysisConfig` struct in `internal/analysis/config.go` with `Tools []ToolConfig` where each has `Name`, `Command`, `OutputFormat`, `SeverityMap`, `Enabled`
- [ ] Task: Implement `conductor/analysis.yml` parser that returns `AnalysisConfig` or nil
- [ ] Task: Define default severity maps for golangci-lint, eslint, and ruff
- [ ] Task: Write tests for config parsing with valid, missing, and malformed YAML

## Phase 2: Tool Runner Integration

- [ ] Task: Implement `internal/analysis/runner.go` that executes each enabled tool via existing command runner pattern from `internal/runner/`
- [ ] Task: Capture tool stdout and stderr with timeout handling per tool
- [ ] Task: Route output to JSON or text parser based on `OutputFormat` field
- [ ] Task: Collect `[]AnalysisResult` per tool and aggregate into combined result set
- [ ] Task: Write tests for runner with mock tool commands (json output, text output, timeout)

## Phase 3: Result Parsers for Common Tools

- [ ] Task: Implement JSON parser in `internal/analysis/parser_json.go` that normalizes golangci-lint, eslint, and ruff JSON schemas into `AnalysisResult`
- [ ] Task: Implement text parser in `internal/analysis/parser_text.go` with regex patterns for `file:line:col: severity: message`
- [ ] Task: Map tool-specific severity strings to canonical `error`/`warning`/`info` via `SeverityMap`
- [ ] Task: Write tests with real sample outputs from each supported tool

## Phase 4: Dashboard Integration and Issue Auto-Creation

- [ ] Task: Wire analysis runner into review pipeline as a post-test stage
- [ ] Task: Auto-create issues for error-severity findings via existing issue store
- [ ] Task: Add `GET /api/executions/:id/analysis` route in `main.go`
- [ ] Task: Build `AnalysisResults` component with file-grouped findings and severity filter badges
- [ ] Task: Add "Analysis" tab to task detail view using Shadcn/ui Tabs
- [ ] Task: Store analysis results in execution log alongside review pipeline data

## Phase 5: Verification

- [ ] Task: End-to-end test: project with golangci-lint configured, findings parsed and displayed
- [ ] Task: End-to-end test: error finding creates blocker issue
- [ ] Task: End-to-end test: no config file skips analysis gracefully
- [ ] Task: Run `npm run check` and `npm run test` — all pass
- [ ] Task: Update plan.md checkboxes, write deviation notes if any
