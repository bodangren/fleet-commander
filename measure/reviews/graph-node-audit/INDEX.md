# Graph Node Audit — Index

**Date:** 2026-06-02
**Methodology:** [`METHODOLOGY.md`](./METHODOLOGY.md)
**Source-of-truth slice reports:** [`slices/`](./slices/)

## Output Files

| File | Purpose |
|------|---------|
| [`MASTER-REPORT.md`](./MASTER-REPORT.md) | Aggregated findings across all 6 slices; cross-slice patterns; track quality rollup; Top-25 master improvement queue; recommended next tracks |
| [`PROPOSED-lessons-learned-additions.md`](./PROPOSED-lessons-learned-additions.md) | 7 single-line entries proposed for review before being merged into `measure/lessons-learned.md` |
| [`PROPOSED-tech-debt-additions.md`](././PROPOSED-tech-debt-additions.md) | 46 entries (IDs TD-200..TD-245) proposed for review before being merged into `measure/tech-debt.md` |

## Slice Reports

| # | Slice | Files | Nodes | Critical | High | Medium | Low | Report |
|---|-------|-------|-------|----------|------|--------|-----|--------|
| 1 | pivot/orchestrator | 56 | 142 | 4 | 9 | 14 | 4 | [slice-1-pivot-orchestrator.md](./slices/slice-1-pivot-orchestrator.md) |
| 2 | pivot/policy+pipeline | 44 | 198 | 4 | 7 | 6 | 3 | [slice-2-pivot-policy-pipeline.md](./slices/slice-2-pivot-policy-pipeline.md) |
| 3 | pivot/rest | 130 | 457 | 5 | 8 | 7 | 4 | [slice-3-pivot-rest.md](./slices/slice-3-pivot-rest.md) |
| 4 | frontend/pages+components | 132 | 372 | 1 | 6 | 9 | 7 | [slice-4-frontend-pages-components.md](./slices/slice-4-frontend-pages-components.md) |
| 5 | frontend/lib+hooks | 50 | 360 | 2 | 9 | 11 | 5 | [slice-5-frontend-lib-hooks.md](./slices/slice-5-frontend-lib-hooks.md) |
| 6 | convex | 81 | 122 | 1 | 8 | 10 | 4 | [slice-6-convex.md](./slices/slice-6-convex.md) |
| | **Total** | **493** | **1651** | **17** | **47** | **57** | **27** | |

## Inventories

- [`inventories/summary.json`](./inventories/summary.json) — slice-level file/node counts and node-type breakdown
- `inventories/slice-*.json` — per-file inventory (one per slice; produced by the `measure` script that generated the audit)

## Helpers

- `helpers/` — scratchpad scripts used by the slice auditors (build-graph query templates, archive-track lookup helpers, etc.)

## Key Takeaways (one-liner each)

- **Master report** is the synthesis; slice reports are the source of truth.
- **Cross-slice patterns** (§3 of master report) are the highest-leverage problems — they appear in 2+ slices and account for the majority of the Critical+High findings.
- **Track quality rollup** (§5 of master report) names the 10 tracks whose phase work most needs follow-up; `frontend_convex_migration_20260402` is the worst single track by Critical+High count.
- **Top-25 queue** (§6 of master report) is the prioritised action list with effort estimates; merge it with the proposed tech-debt additions when planning the next quarter.
- **Track-mapping is heuristic** (§10 of master report) — verify `best_track` assignments for tracks that ran in parallel weeks before citing them in retros.
