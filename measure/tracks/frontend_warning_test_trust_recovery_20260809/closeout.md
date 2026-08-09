# Closeout: frontend warning/test trust recovery

**Closed:** 2026-08-09  
**Status:** completed  
**TD-268:** Resolved  
**Implementation:** `4fed5cb7`

## Delivery

TD-268 repaired the async test contracts and warning-specific contracts across
the 12 named frontend areas. The opening record remains **59 React `act(...)`
warnings**, plus one App bare `vi.fn`, one Kanban duplicate key, and one
expected `InsightsErrorBoundary` error log. A fresh git-archive reproduction of
opening commit `c5c2fa2b` targeted 20 files and emitted **60** `act` warnings:
Sprint: **8**, Project View **15**, agent config **28**, and secondary **9**,
plus one duplicate key. That timing/setup discrepancy is preserved in the
[warning ledger](./warning-ledger.md); it does not replace the recorded 59
baseline or claim a deterministic per-area replay count.

The repairs also proved four production boundaries that weak tests had exposed:
actual ProjectDetail lacked description/assigned agents; a legacy imported path
leaked description data; canonical `assigneeId` was not resolved; and an
optional agent failure could 500. The implementation added a deduped ID→name
runtime join, safe project roster fields, resilient detail handling, and
sanitizer/new-import paths that blank descriptions. Focused regression
coverage preserves these contracts.

## Verification

- Focused aggregate: **23 files / 154 passed**, warning-free. The expected
  Insights error was locally captured, asserted, and restored; no unexpected
  `act`, bare `vi.fn`, duplicate-key, or console warning output remained.
- Full frontend: **176 files / 1,285 passed in 157.87s**, with zero warning
  output. Two earlier clean full runs were **1,284 passed** before the added
  regression; the extra passing test is retained in the final count.
- Pivot: **148 files / 1,710 passed**. Convex runtime: **21 files / 106
  passed**. Remaining Convex Bun/pure: **31 files / 914 passed**. Focused
  route coverage: **42 passed**.
- From `frontend/`, `npm run check`; repository lint, frontend/Pivot/Convex
  typechecks, the 2,800-module production build, and `git diff --check`
  passed. The build retains the known **1,354.26kB / 382.84kB gzip** chunk
  advisory over 500k.

## Browser and safety evidence

Real system Chrome passed **4/4 specs in 26.9s** against the local Vite → Pivot
→ Convex stack. `live-core` opened and cancelled Save as Template against the
actual GET, scrubbed the path, asserted exact task/agent counts, and observed
zero POST/PUT/PATCH/DELETE for the whole journey. Services on **5173, 8081,
and 3210** all returned 200. No credentials, seed/import, factory action,
external harness write, or browser/API mutation ran.

## Doctor and graph evidence

`bash measure/doctor.sh all` exited 1 only on known debt: the 516-line
`pivot/src/orchestrator/qualityWorkflowRunner.ts`, 65 orphan exports, and
stale allowlist/graph noise. The other Doctor checks passed; these findings are
not TD-268 warning failures.

The required graph synchronization covered 31 files (**94→254 nodes** and
**190→358 edges**). Current stats are **5,949 nodes / 8,307 edges / 733
files**. Graph audit was silent for more than 90 seconds and was stopped; the
known parser/audit limitation remains tracked in issue #2. No graph allowlist
churn was made for this documentation closeout.

## Follow-up

P1 is frontend bundle splitting for the >500k advisory. Next are bounded
Doctor god-file/orphan-debt tracks. Bounded Factory activation remains
approval-gated. The prior core-workflow audit history is preserved; its durable
report receives only an additive TD-268 closeout addendum.
