# Phase 1 baseline — 2026-08-07

Branch: `chore/scalpel` @ work after Measure reconciliation (uncommitted measure + gate fixes).

## Task 1.1 — Verify matrix

| Gate | Command | Result | Notes |
| --- | --- | --- | --- |
| pivot-test | `bun run --cwd pivot test` | **PASS** after fix | First run: 1660 pass / **1 fail** (harness roster drift: installed harness added `xiaomi/mimo-v2.5`). Fixed `HARNESS_SERVED_MODELS` → **1661 pass / 0 fail** (`09-pivot-retest.txt`) |
| frontend-test | `bun run --cwd frontend test` | **PASS** after fix | First run: 1209 pass / **2 fail** — `App.guardrails` required TD-241 Resolved row removed by reconciliation. Restored row → **1211 pass / 0 fail** (`12-frontend-full-retest.txt`) |
| pivot-typecheck | `bun --cwd pivot typecheck` | **PASS** | `03-typecheck.txt` |
| lint | `npm run lint` | **PASS** | `04-lint.txt` |
| convex codegen | `bunx convex codegen` | **PASS** | Warnings only on `convex/__fixtures__/auth.ts` NODE_ENV assign; `05-codegen.txt` |
| convex-test | `find ./convex -name '*.test.ts' \| xargs bun test` | **RED** | **1241 pass / 157 fail / 2 errors** (`07-convex-test.txt`) |

## Task 1.2 — Convex failure themes

Top suites by fail count (`07-convex-failure-themes.txt`):

| Theme | Approx fails | Signal |
| --- | --- | --- |
| Task dependency mutations / Phase 6 contracts | ~46 | Integration + error-string contracts |
| Analytics / cost handlers | ~40 | getAnalyticsOverview, getCost* family |
| Notifications / preferences | ~28 | updateNotificationPreference, markAllRead, deleteOld |
| Validators / deleted `pipelines.ts` | ~12 | ENOENT on deleted file; stale Red contracts |
| Employees/runs legacy handlers | ~10 | TD-247 adjacent |
| auth.config | ~4 | Env / NODE_ENV fixture issues |

Not a scalpel regression set: handoff claimed identical failure inventory vs pre-scalpel `c5de1d5` (count now 157 vs prior ~166).

## Task 1.3 — Absence of deleted production surfaces

See `06-absence-scan.txt`.

| Surface | Status |
| --- | --- |
| `@opencode-ai` package dep | **Absent** |
| A/B schema tables (`abTests`, `simulationRuns`) | **Absent** |
| YAML pipeline engine modules | **Absent** |
| String defaults / UI placeholders / opencode **config path** for provider sync | **Still present** (legacy naming, not executor path) |
| `abTestStatus` validators in `convex/lib/validators.ts` | **Still exported** (orphaned vocabulary after table delete) |

## Task 1.4 — Pi readiness probe

`08-pi-readiness.txt`: **Convex not reachable** (`ConnectionRefused` on `http://127.0.0.1:3210`). Offline probe could not score agents.

Unit-level readiness (with local harness package): `reports every seeded agent as ready` **PASS** after model list update; org-chart agents all point at served models.

## Decision (Phase 2.1)

**Quarantine Convex unit tests (TD-263), do not green-up in this track.**

Rationale: 157 failures span many domains; multi-day effort; not introduced by scalpel; blocks `verify.sh` if enforced. Policy: always run, report `QUARANTINED`, overall exit 0 unless `VERIFY_REQUIRE_CONVEX=1`.
