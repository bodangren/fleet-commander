# Specification - Automated Code Review Pipeline

## Overview
Introduce an automated review step that runs after an agent completes a task execution. The pipeline detects the project tech stack, runs the configured linter, type-checker, and test suite, captures results as structured data, and blocks task completion when checks fail. This closes the gap between "agent finished writing code" and "code is verified."

## Functional Requirements

- **FR1:** After task execution completes in the orchestrator, automatically run linter, type-checker, and test suite commands based on the project tech stack detected from `measure/review.yml`.
- **FR2:** Capture review results as structured data including pass/fail status, error messages, and warning details per command.
- **FR3:** Persist review results in the execution log associated with the task and execution ID.
- **FR4:** If any review command fails, auto-create a blocker issue linked to the originating task so it cannot be marked done.
- **FR5:** Expose review results in the dashboard task detail view with expandable pass/fail sections per check category.
- **FR6:** Support configurable review commands per project stored in `measure/review.yml` with fields for linter, typecheck, and test commands plus optional timeout.

## Acceptance Criteria

1. Completing a task triggers review commands defined in `measure/review.yml` without manual intervention.
2. Review output is parsed into a structured JSON object with `category`, `status`, `errors[]`, `warnings[]` fields.
3. Structured review results are written to the execution log file alongside existing stdout/stderr capture.
4. A failed review automatically creates a blocker issue in the task's track with the error summary as the body.
5. The dashboard task detail page shows a "Review" section with per-category pass/fail indicators and expandable error output.
6. Projects without `measure/review.yml` skip the review step gracefully with a logged notice.
7. Review commands time out after the configured duration (default 120s) and mark the check as failed.

## Out of Scope

- Multi-agent qualitative review (Track 14).
- Test coverage parsing or threshold enforcement (Track 15).
- Static analysis result categorization beyond pass/fail (Track 16).
- User-initiated re-review or review retries.
