# Tech Debt Registry

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove resolved items once they no longer influence near-term planning.

## Open Tech Debt

| ID | Description | Severity | Status | Track |
|----|-------------|----------|--------|-------|
| TD-003 | Production orchestrator is constructed without `WithIssueStore(...)`, so auto-created blocker/delegation issues no-op outside tests | High | Open | Multi-Agent Code Review / Issue Tracking |
| TD-004 | Dependency evaluator clears any `blocked` task back to `todo` when dependencies are satisfied, losing manual/review/issue-based blocking state | High | Open | Dependency Graph & Critical Path |
| TD-005 | Issue descriptions are serialized into frontmatter, so multiline bodies are truncated when markdown issues are read back | Medium | Open | Issue Tracking & Communication |
| TD-006 | Settings merge treats zero values as unspecified, so users cannot persist valid `0` updates for interval, retention, or cache TTL fields | Medium | Open | Settings & Configuration Page |
| TD-007 | Review lookup returns the oldest matching review for rerun tasks because reverse log scan never stops after the first match | Medium | Open | Multi-Agent Code Review |
| TD-008 | Reviewer-agent execution is not wired into runtime review hooks, so `agent-reviewed` results expected by the Review tab are never produced | Medium | Open | Multi-Agent Code Review |

## Resolved

| ID | Description | Resolved In |
|----|-------------|-------------|
| TD-001 | TypeError on project click (null 'length' in stats/dashboard) | Guard added in stats calculation |
| TD-002 | Scanner `return` instead of `continue` skipped sibling dirs; refresh didn't scan | scanner.go:38 fix + scan-and-import endpoint |
| TD-002 | Scanner `return` instead of `continue` skipped sibling dirs; refresh didn't scan | scanner.go:38 fix + scan-and-import endpoint |
| TD-009 | Go orchestrator/dispatcher/executor/dependency modules are superseded by Bun equivalents but retained because Go server is still the active runtime | Go decommissioned 2026-04-02; Bun server on :8081 replaces all Go endpoints |
