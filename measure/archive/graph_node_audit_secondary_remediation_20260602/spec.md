# Spec: Graph Node Audit Secondary Remediation

## Problem

The primary graph-node audit remediation track covers the master report's Top-25 queue. The remaining Critical/High/Medium/Low findings still contain high-leverage cleanup, but they should not compete with public stubs, auth, data-corruption, duplicate runtime paths, and god-file splits. The below-Top-25 issues are mostly repeated patterns: duplicate formatting and UI helpers, direct `fetch()` bypasses, fixture/type drift, silent error swallowing, Convex unbounded query patterns, script/module side effects, placeholder JSDoc, and empty or superficial tests.

If addressed as individual defects, the work would be noisy and expensive. If grouped by pattern, it can remove whole classes of follow-up bugs with fewer changes.

## Solution

Run a second, pattern-oriented remediation pass after the Top-25 track has established canonical runtime paths and stronger guardrails. Prioritize fixes that touch many files at once, reduce repeated code, make tests more trustworthy, and prevent recurring Measure closeout failures. The work should be grouped by bang-for-buck: shared utilities first, then frontend fetch/type drift, then pivot reliability/script hygiene, then Convex bounded-query and batching improvements, then targeted test and documentation closure.

## Functional Requirements

- FR-1: Explicitly exclude issues already owned by `graph_node_audit_remediation_20260602`, unless a task here depends on its canonical decision.
- FR-2: Build a below-Top-25 resolution ledger from slice reports and proposed tech-debt IDs TD-225 and above, grouped by repeated pattern rather than by file.
- FR-3: Consolidate duplicated frontend formatting, chart, URL, timestamp, and small UI primitives where at least three callers benefit.
- FR-4: Move direct frontend `fetch()` workflows toward canonical hooks or shared API hooks, prioritizing Agent Templates, Providers, Settings, and notification/history surfaces.
- FR-5: Fix fixture and presentation-type drift that makes tests pass against shapes production does not use.
- FR-6: Improve pivot reliability by surfacing swallowed errors, eliminating import-time script side effects, and collapsing duplicate command/PR execution helpers.
- FR-7: Improve Convex scalability for below-Top-25 findings by replacing unbounded `.collect()`, serial loops, and N+1 reads with indexed, bounded, denormalized, or batched patterns.
- FR-8: Close empty or low-value tests that were below the first track's priority threshold, especially performance, convex retry, direct-fetch pages, and fixture adapters.
- FR-9: Replace misleading JSDoc and graph summaries on touched exported functions and interfaces.
- FR-10: Add or update Measure/doctor/build-graph checks only when they prevent a recurring below-Top-25 pattern.

## Prioritization Rules

- Highest bang-for-buck: one helper or contract removes three or more duplicated implementations.
- Highest risk within this track: silent error swallowing, fake/random telemetry, unbounded Convex operations, and fixture drift that invalidates tests.
- Defer low-value cosmetic cleanup unless it is touched by a higher-value refactor.
- Keep this track behind the Top-25 remediation track when canonical ownership is unresolved.

## Acceptance Criteria

- [ ] Every below-Top-25 High finding has a ledger status: fixed, grouped into a pattern fix, deferred with a tech-debt ID, or reclassified with evidence.
- [ ] Duplicated frontend utility functions named in the audit have a canonical implementation or documented reason to remain local.
- [ ] Direct-fetch pages prioritized in this track use shared hooks or shared request helpers with tests for success and failure states.
- [ ] Fixture types used by dashboard/history/insights tests match production DTOs or use explicit adapter tests that prove the transform.
- [ ] Pivot scripts are import-safe, command execution helpers have one canonical path, and swallowed errors are observable to callers or logs.
- [ ] Convex below-Top-25 hot paths are bounded, indexed, batched, denormalized, or intentionally documented as small-table operations.
- [ ] Empty test files touched by this track are either deleted or filled with meaningful production-path tests.
- [ ] `build-graph update ./graph.db <changed-files>` is run for all source changes.

## Out of Scope

- Any Top-25 master-report row already owned by the primary remediation track.
- Full rewrite of page layouts or visual design systems.
- New product features unrelated to audit remediation.
- Medium/Low findings with single-file cosmetic payoff unless they are bundled into a larger pattern fix.
