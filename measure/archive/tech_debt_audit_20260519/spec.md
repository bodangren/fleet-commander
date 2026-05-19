# Specification: Tech Debt Audit & Memory Compaction

## Overview

The Tech Debt Registry has grown to 16 open items with significant overlap and stale entries. Several items describe test failures in components or pages that have since been architecturally replaced (static demo pages, removed drill-down features). The Lessons Learned file is at 49/50 lines and needs compaction to stay useful.

This track audits every open tech debt item, removes obsolete entries, merges duplicates, and compacts lessons-learned.md to broad strokes.

## Functional Requirements

1. **Audit each open tech debt item** against current codebase architecture
2. **Remove obsolete items** whose root cause no longer exists
3. **Merge duplicate items** that share the same root cause
4. **Refine descriptions** of still-valid items to match current code
5. **Compact lessons-learned.md** to ≤35 lines, keeping only broadly applicable patterns

## Acceptance Criteria

- [ ] `measure/tech-debt.md` ≤25 lines of open items
- [ ] All obsolete/deduplicated items moved to Resolved table with resolution notes
- [ ] `measure/lessons-learned.md` ≤35 lines
- [ ] No loss of genuinely still-valid debt items
- [ ] Tracks Registry updated to mark this track complete

## Out of Scope

- Fixing the underlying code issues (this is an audit/cleanup track, not remediation)
- Adding new test coverage
- Schema migration or refactoring
