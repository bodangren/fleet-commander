# Specification - e2e Coverage Tab

## Overview

Add Playwright e2e test coverage for the Coverage tab in the Project View page. The tab exists (line 58, 393 of ProjectViewPage.tsx) and the CoverageChart component has unit tests, but there is no e2e test covering: tab switching, empty state, or mock Convex coverage history data flow.

## Functional Requirements

- **FR1:** Clicking the "Coverage" tab in the project view switches to show the CoverageChart component.
- **FR2:** When no coverage history exists, CoverageChart shows "No coverage data" empty state.
- **FR3:** When mock coverage history is provided via Convex mock, CoverageChart renders the chart with data.
- **FR4:** The mock Convex coverageRecords:getCoverageHistory endpoint returns data in the correct format.

## Acceptance Criteria

1. New Playwright spec `coverage.spec.ts` has a test that navigates to the project page, clicks "Coverage" tab, and asserts the CoverageChart renders.
2. Mock handler for `coverageRecords:getCoverageHistory` is added to `helpers/mockApp.ts` returning array of mock records.
3. Test verifies "No coverage data" state is shown when Convex returns empty array.
4. Test verifies chart renders with mock data.
5. All existing 11 tests continue to pass.