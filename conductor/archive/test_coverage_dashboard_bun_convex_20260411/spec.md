# Specification - Test Coverage Dashboard (Bun + Convex)

## Overview

Parse test coverage output from Vitest/Jest, store coverage metrics per project over time in Convex, and surface trends in the React dashboard. Enforce per-track-type coverage thresholds so that task completion is blocked when coverage drops below the configured minimum.

## Functional Requirements

- **FR1:** Parse coverage output from Vitest (`coverageReporters: ["json", "text"]`) JSON format.
- **FR2:** Store coverage percentage per project with timestamp to build a historical record in Convex.
- **FR3:** Render a coverage trends line chart in the dashboard showing percentage over time.
- **FR4:** Support configurable coverage thresholds per track type: feature 80%, bug 90%, chore 70%.
- **FR5:** Block task completion if post-execution coverage falls below the threshold for the track type.
- **FR6:** Show a coverage diff (before vs after task) in the task detail view with delta indicator.

## Acceptance Criteria

1. Coverage parser extracts percentage from Vitest coverage JSON output (`coverage-summary.json`).
2. Each coverage parse result is stored with `projectId`, `percentage`, `date`, and `executionId` in Convex.
3. Dashboard renders a line chart of coverage over time for the active project.
4. Track-type thresholds are defined in `conductor/coverage.yml` with defaults for feature/bug/chore.
5. Task detail view shows "Coverage" section with before percentage, after percentage, and delta (green/red).
6. Coverage drop below threshold creates a blocker issue with message indicating threshold violation.
7. Projects without coverage tooling skip coverage parsing without error.

## Out of Scope

- Go coverage parsing (project pivoted to Bun + Convex)
- Multi-agent review coverage assessment
- Static analysis tool integration
- Branch-level or function-level coverage granularity

## Tech Stack

- **Coverage Format:** Vitest JSON coverage report (`coverage-summary.json`)
- **Storage:** Convex (`coverageRecords` table)
- **Frontend:** React + Recharts for line chart visualization
- **Thresholds:** YAML config in `conductor/coverage.yml`
