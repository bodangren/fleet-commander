# Specification: Convex Test Remediation

## Problem

After the unified foundation schema migration (TD-136/137/138), 28 Convex tests fail across 16 test files. The failures fall into three categories:

1. **Mock infrastructure gaps** — Test mocks for `ctx.db.query` lack `.filter()`, `.first()`, and bare `.collect()` methods that handlers now use.
2. **Schema expectation mismatches** — Tests assert old enum values (`'for_review'`, `'med'`) that no longer exist in the unified schema.
3. **Stubbed handlers returning empty data** — Handlers like `computeBottlenecks` were stubbed to `[]` during migration; tests expect real computed output.

## Goal

Restore all Convex tests to passing by:
- Fixing mock infrastructure where the source handlers are correct
- Updating test expectations where the schema changed
- Re-implementing stubbed handlers where the test contract is still valid

## Out of Scope

- Re-implementing fully obsolete handlers (e.g. `listTasksByProject` with `projectSlug`) — those remain stubs
- Pivot tests (already passing)
- Frontend tests (separate track if needed)
