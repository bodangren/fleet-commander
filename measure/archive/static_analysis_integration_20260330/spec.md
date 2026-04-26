# Specification - Static Analysis Integration

## Overview
Integrate static analysis tools into the automated review pipeline by allowing per-project configuration of tools like golangci-lint, eslint, and ruff. Parse their structured output (JSON where available, text fallback), categorize findings by severity, auto-create issues for critical findings, and track analysis trends over time.

## Functional Requirements

- **FR1:** Support per-project static analysis tool configuration in `measure/analysis.yml` with tool name, command, output format, and enabled flag.
- **FR2:** Run configured analysis tools as a stage in the automated review pipeline alongside linter/typecheck/test.
- **FR3:** Parse structured JSON output from tools that support it (golangci-lint `--out-format json`, eslint `-f json`, ruff `--output-format json`); fall back to text parsing for others.
- **FR4:** Categorize each finding as error, warning, or info based on tool-specific severity mapping.
- **FR5:** Auto-create issues for error-level findings linked to the task and file location.
- **FR6:** Store analysis results per execution and expose history API for trend tracking.

## Acceptance Criteria

1. `measure/analysis.yml` defines tools with `name`, `command`, `output_format` (json/text), `severity_map`, and `enabled` fields.
2. Analysis tools execute in the review pipeline after tests and before final status determination.
3. JSON-output tools produce `AnalysisResult[]` with `tool`, `file`, `line`, `column`, `severity`, `message`, `rule` fields.
4. Text-output tools produce `AnalysisResult[]` via regex-based parser with at least `file`, `line`, `severity`, `message`.
5. Error-severity findings create issues in the task's track with file location and finding message.
6. `GET /api/executions/:id/analysis` returns analysis results for a given execution.
7. Dashboard task detail shows "Analysis" tab with findings grouped by file and filterable by severity.
8. Projects without `measure/analysis.yml` skip analysis without error.
9. Analysis history endpoint returns findings per execution for trend visualization.

## Out of Scope

- Automated review pipeline engine itself (Track 13).
- Multi-agent qualitative review (Track 14).
- Test coverage parsing (Track 15).
- Auto-fix or auto-remediation of findings.
