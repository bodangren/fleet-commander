# Specification - Test Coverage Dashboard

## Overview
Parse test coverage output from the automated review pipeline, store coverage metrics per project over time, and surface trends in the dashboard. Enforce per-track-type coverage thresholds so that task completion is blocked when coverage drops below the configured minimum.

## Functional Requirements

- **FR1:** Parse coverage output from review pipeline for Go (`-cover`), Jest (`--coverage`), and pytest (`pytest-cov`) formats.
- **FR2:** Store coverage percentage per project with timestamp to build a historical record.
- **FR3:** Render a coverage trends line chart in the dashboard showing percentage over time.
- **FR4:** Support configurable coverage thresholds per track type: feature 80%, bug 90%, chore 70%.
- **FR5:** Block task completion if post-execution coverage falls below the threshold for the track type.
- **FR6:** Show a coverage diff (before vs after task) in the task detail view with delta indicator.

## Acceptance Criteria

1. Coverage parser extracts percentage from Go `-cover` output (e.g., `coverage: 85.2% of statements`).
2. Coverage parser extracts summary percentage from Jest `--coverage` JSON/text output.
3. Coverage parser extracts `TOTAL` row percentage from pytest-cov terminal output.
4. Each coverage parse result is stored with `project_id`, `percentage`, `date`, and `execution_id`.
5. Dashboard renders a line chart (Recharts or similar) of coverage over time for the active project.
6. Track-type thresholds are defined in `conductor/coverage.yml` with defaults for feature/bug/chore.
7. Task detail view shows "Coverage" section with before percentage, after percentage, and delta (green/red).
8. Coverage drop below threshold creates a blocker issue with message indicating threshold violation.
9. Projects without coverage tooling skip coverage parsing without error.

## Out of Scope

- Automated review pipeline execution itself (Track 13).
- Multi-agent review coverage assessment (Track 14).
- Static analysis tool integration (Track 16).
- Branch-level or function-level coverage granularity.
