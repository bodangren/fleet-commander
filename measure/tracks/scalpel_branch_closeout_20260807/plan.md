# Plan: Scalpel branch closeout

## Phase 1: Baseline evidence

- [x] Task 1.1: Re-run handoff verify matrix; record pass/fail counts
- [x] Task 1.2: Capture Convex unit-test failure inventory (count + top failure themes)
- [x] Task 1.3: Confirm OpenCode/A/B/simulation symbols absent from production paths
- [x] Task 1.4: Run Pi readiness probe (requires Convex up); note auth blockers
      - Live Convex down; unit harness readiness PASS after model-list fix

## Phase 2: Gate repair / quarantine

- [x] Task 2.1: Decide Convex tests: green-up vs explicit quarantine TD
      - **Decision: quarantine** (TD-263); document in verify.sh
- [x] Task 2.2: If green-up is chosen, fix highest-leverage failure clusters
      - N/A — quarantine chosen; themes recorded in evidence/BASELINE.md
- [x] Task 2.3: Align `measure/verify.sh` with real commands; re-verify
      - frontend-test already `bun run`; frontend-check → `bun run`; convex quarantine policy
- [x] Task 2.4: Fix any scalpel regressions found in pivot/frontend gates
      - Harness model list + TD-241 tech-debt row

## Phase 3: Merge readiness

- [x] Task 3.1: Write merge criteria + residual risk list in `closeout.md`
- [x] Task 3.2: Update `current_directive.md` after merge decision
- [x] Task 3.3: Mark track completed; link handoff + closeout (remain under tracks/ until branch merges; not moved to archive until PR lands)
