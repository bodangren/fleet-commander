# Specification — Quality Remediation 2026-05-04 Review

## Background
A 24-hour code review of all commits between `9a28dee` and `064d393` compared against track phase claims. Found systematic issues: fabricated metrics, incomplete implementations marked as done, missing test coverage, security vulnerabilities, and commit-to-track mismatches.

## Objectives
1. Fix all Critical and High severity findings
2. Reconcile plan.md task markers with actual committed state
3. Add missing test coverage for untested logic paths
4. Remove fabricated metric proxies that mislead consumers

## Acceptance Criteria
- AC1: No `as any` casts on Convex ID lookups in retrospectives.ts
- AC2: `retrospective.md` agent prompt includes "Priority Accuracy" section
- AC3: `medianLatencyMs` and `averageTokens` in `computeHarnessReliabilityStats` use real data or are renamed/removed
- AC4: MarkdownViewer sanitizes `javascript:` URLs
- AC5: `meanDurationMs`, `blockerCreationRate`, `coverageRegressionRate` stubs are removed or replaced with real computation
- AC6: Combined stdout+stderr token limit has test coverage
- AC7: Session clearing on replan/split has test coverage and doesn't mutate shared state on failure
- AC8: `isSourceFile` includes `measure/` or is documented as excluded
- AC9: PhaseTrends renders all 7 phases including hookBefore/hookAfter
- AC10: ConvexClient WebSocket connections are closed on cleanup in useRunContract
