# Tech Debt Registry

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove resolved items once they no longer influence near-term planning.

## Open Tech Debt

_(All resolved)_

## Resolved

| ID | Description | Resolved In |
|----|-------------|-------------|
| TD-001 | TypeError on project click (null 'length' in stats/dashboard) | Guard added in stats calculation |
| TD-002 | Scanner `return` instead of `continue` skipped sibling dirs; refresh didn't scan | scanner.go:38 fix + scan-and-import endpoint |
| TD-003 | Production orchestrator is constructed without `WithIssueStore(...)`, so auto-created blocker/delegation issues no-op outside tests | Issue hooks wired into `runProject` 2026-04-04 |
| TD-004 | Dependency evaluator clears any `blocked` task back to `todo` when dependencies are satisfied, losing manual/review/issue-based blocking state | Evaluator preserves manual-blocked tasks (no-dep check) 2026-04-04 |
| TD-005 | Issue descriptions are serialized into frontmatter, so multiline bodies are truncated when markdown issues are read back | Resolved in fix_open_tech_debt_20260404; Bun pivot uses body field directly, no frontmatter |
| TD-006 | Settings merge treats zero values as unspecified, so users cannot persist valid `0` updates for interval, retention, or cache TTL fields | Resolved in fix_open_tech_debt_20260404; Bun pivot stores valueJson directly per key |
| TD-007 | Review lookup returns the oldest matching review for rerun tasks because reverse log scan never stops after the first match | Resolved in fix_open_tech_debt_20260404; endpoint returns latest review as TaskReviewResponse |
| TD-008 | Reviewer-agent execution is not wired into runtime review hooks, so `agent-reviewed` results expected by the Review tab are never produced | Resolved in fix_open_tech_debt_20260404; runReview hook added to IssueHooks, invoked in orchestrator success path |
| TD-009 | Go orchestrator/dispatcher/executor/dependency modules are superseded by Bun equivalents but retained because Go server is still the active runtime | Go decommissioned 2026-04-02; Bun server on :8081 replaces all Go endpoints |
| TD-010 | 102 instances of `as never` casts across pivot route handlers bypass Convex type checking | Replaced with generated `api` references in fix_remaining_tech_debt_20260405 |
| TD-011 | `frontend/src/lib/useLogStream.ts` has conditional hook calls violating React rules of hooks | Refactored to single hook with conditional logic in fix_remaining_tech_debt_20260405 |
| TD-012 | Multiple useEffect hooks missing dependencies in useAgentForm.ts, useHarnessForm.ts, useConvexData.ts | Fixed missing deps in useModelDiscovery in fix_remaining_tech_debt_20260405 |
