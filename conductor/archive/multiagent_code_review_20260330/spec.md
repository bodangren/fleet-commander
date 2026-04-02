# Specification - Multi-Agent Code Review

## Overview
After the automated review pipeline (Track 13) confirms code passes linting, type-checking, and tests, dispatch the bundled `reviewer` agent for qualitative review. The reviewer evaluates correctness, style, test coverage, and security. Results are structured as pass/needs-changes with inline comments, and failures create sub-tasks or block the original task.

## Functional Requirements

- **FR1:** After automated pipeline passes, dispatch the reviewer agent for qualitative code review of the task's changed files.
- **FR2:** Review criteria must cover correctness, code style adherence, test coverage adequacy, and common security patterns.
- **FR3:** Reviewer output is structured as pass or needs-changes with an array of comment objects (file, line, severity, message).
- **FR4:** If reviewer requests changes, create sub-tasks linked to the original task and set the original to blocked status.
- **FR5:** Review history (pass/fail, comments, timestamps) is linked to the task and visible in the dashboard.
- **FR6:** Support configurable review depth: `quick` (single pass, shallow checks) vs `thorough` (multi-file, deep analysis).

## Acceptance Criteria

1. Successful automated pipeline completion triggers reviewer agent dispatch with a generated review prompt.
2. Review prompt includes task spec, diff of changed files, and review criteria checklist.
3. Reviewer response is parsed into `{ status: "pass"|"needs-changes", comments: ReviewComment[] }`.
4. Needs-changes status creates one sub-task per distinct issue and blocks the parent task.
5. Dashboard task detail shows a "Code Review" tab with reviewer comments, status badge, and timestamp.
6. Review depth is configurable in track metadata; default is `quick`.
7. Reviewer agent failures (timeout, crash) are logged and do not block task completion.

## Out of Scope

- Automated pipeline execution (Track 13).
- Test coverage threshold enforcement (Track 15).
- Static analysis tool integration (Track 16).
- Parallel multi-agent review (only one reviewer agent per task).
