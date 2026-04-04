# Specification - Fix Open Tech Debt (TD-005 to TD-008)

## Overview

Address the four remaining open tech debt items (TD-005, TD-006, TD-007, TD-008) that affect core functionality: issue serialization, settings persistence, review lookup accuracy, and reviewer-agent execution wiring. These bugs degrade user experience and block reliable autonomous operation.

## Functional Requirements

- **FR1 (TD-005):** Issue descriptions with multiline content must be preserved when reading markdown issue files back, not truncated by frontmatter serialization.
- **FR2 (TD-006):** Settings merge must allow users to persist valid `0` values for interval, retention, and cache TTL fields instead of treating them as unspecified.
- **FR3 (TD-007):** Review lookup must return the correct (most recent) review for rerun tasks by fixing the reverse log scan to stop after the first match.
- **FR4 (TD-008):** Reviewer-agent execution must be wired into runtime review hooks so that `agent-reviewed` results are produced and visible in the Review tab.

## Non-Functional Requirements

- Each fix must include tests that reproduce the bug and verify the fix.
- No regressions in existing functionality; all current tests must continue to pass.
- Changes should be minimal and focused on the specific bug.

## Acceptance Criteria

1. **TD-005:** Multiline issue descriptions round-trip correctly through serialization and deserialization. Test with descriptions containing newlines, frontmatter-like content, and markdown formatting.
2. **TD-006:** Settings with `0` values for numeric fields persist correctly. Test: set interval to `0`, save, reload — value remains `0`.
3. **TD-007:** Review lookup for rerun tasks returns the most recent review, not the oldest. Test: create multiple reviews for same task, verify correct one returned.
4. **TD-008:** Reviewer-agent execution produces `agent-reviewed` results visible in Review tab. Test: trigger review, verify results appear.
5. All existing tests pass.
6. `npm run check` passes (lint + format + type-check).

## Out of Scope

- New features or enhancements beyond the specific bug fixes.
- Refactoring unrelated code.
- Performance optimizations not directly related to the bugs.
