# Plan: Package Dependency Upgrades & Security Remediation

## Phase 1: Baseline Contract & Upgrade Matrix

_Committed: `b2aa8f0` — 2026-06-07_

- [x] Task: Capture the immutable pre-upgrade baseline. (`b2aa8f0`)
  - [x] Record `bun --version`, root `packageManager`, and all three package
        manifests. (`b2aa8f0`)
  - [x] Save summarized results for `bun outdated --recursive --no-cache` and
        `bun audit`, including severity counts and vulnerable dependency paths. (`b2aa8f0`)
  - [x] Run `npm run verify` and record each pre-existing red gate separately
        from package-upgrade work. (`b2aa8f0`)
- [x] Task: Define the compatible-upgrade matrix before editing manifests. (`b2aa8f0`)
  - [x] List current, compatible target, and latest major for every outdated
        direct dependency. (`b2aa8f0`)
  - [x] Group shared packages so `convex` and `js-yaml` remain aligned across
        workspaces. (`b2aa8f0`)
  - [x] Mark each target as routine, security-motivated, or breaking. (`b2aa8f0`)
- [x] Task: Define the breaking-upgrade decision matrix. (`b2aa8f0`)
  - [x] Create isolated decisions for React Router 7, Vite 8, Tailwind CSS 4,
        TypeScript 6, ESLint 10, jsdom 29, Lucide React 1, and concurrently 10. (`b2aa8f0`)
  - [x] For each major, record migration surface, peer constraints, expected
        validation commands, and rollback point. (`b2aa8f0`)

_Note: `npm test` (`bun test`) fails due to pre-existing RED-phase tests from
other active tracks (typed-convex-boundary migration, analytics/performance
routes). These failures are recorded in `baseline.md` § Pre-existing Failures
and are NOT caused by this track's Phase 1 work._

## Phase 2: Compatible Upgrade Verification Tests

- [~] Task: Add or identify characterization coverage for dependency-sensitive
      behavior before package changes.
  - [~] Confirm frontend routing and redirects cover the React Router security
        update path.
  - [~] Confirm Vite/PWA build output and service-worker registration have
        automated or repeatable verification.
  - [~] Confirm Convex code generation and pivot/client integration have a
        repeatable smoke check.
- [~] Task: Prove the compatible batch in an isolated worktree or temporary
      workspace before retaining it.
  - [~] Apply explicit targets per workspace; do not rely on root-only
        `bun update --recursive`.
  - [~] Run pivot tests/typecheck and frontend tests/check/build.
  - [~] Compare failures to the Phase 1 baseline and reject unexplained
        regressions.

### Phase 2 — Red-Phase Coverage Assessment (2026-06-07)

Per the track's `test-strategy.md`: characterization, not speculation. Every
new test pins a contract that already exists at HEAD; a compatible upgrade
that breaks the contract will fail here. Per the `red_not_done` lesson, the
tasks above stay `[~]` until the Phase 3 batch is applied AND the gates are
green at the upgraded HEAD.

#### Existing coverage (pre-Phase 2)

| Surface | File | Tests | Status |
| --- | --- | --- | --- |
| Backend HTTP routing (zod, convex) | `pivot/src/routes/router.test.ts` | 17 (static, param, nested, URL-encoded, method) | Pass |
| Typed Convex client boundary | `pivot/src/convexClient.test.ts` | 22 (typedQuery / typedMutation / dynamicConvexCall + type inference) | Pass |
| Convex retry helper | `pivot/src/convexRetry.test.ts` | (existing) | Pass |
| Sync client (pivot → convex) | `pivot/src/sync/convexAgentSync.test.ts` | (existing) | Pass |
| Typed boundary integration | `pivot/src/routes/typed-convex-boundary.test.ts` | (existing — owned by typed-convex-boundary track, 46 pre-existing RED failures recorded in `baseline.md`) | Pass/Fail split |
| Frontend route rendering | `frontend/src/App.test.tsx` | 4 (Agents, Analytics, Performance, Costs) | Pass |
| Frontend ConvexProvider fixture | `frontend/src/__fixtures__/convex-provider.test.tsx` | 2 | Pass |
| Frontend PWA coverage | Playwright `frontend/e2e/coverage.spec.ts` | 2 (Coverage tab empty / with data) | Pass |
| 28 Playwright e2e specs (router-dependent) | `frontend/e2e/*.spec.ts` | (per test-strategy § Cross-Phase) | Pass/Fail split |

#### Characterization tests added in this phase

| Test file | New `it` count | Surface pinned |
| --- | --- | --- |
| `pivot/src/routes/router.test.ts` | 13 | `Router` URL-matching edge cases the `zod` upgrade could affect: trailing-slash rejection, case sensitivity, adjacent-slash rejection, query-string rejection, percent-decoded params, extra-segment rejection, single-segment param resolution. **Plus 5 response-helper/`routeBody` contract tests** the original suite did not cover: `notFound(message)` includes the message in the body; `noContent()` returns 204 with null body and no content-type; `methodNotAllowed()` returns 405 with `error: 'method_not_allowed'`; `json(null)` serializes as the literal `null` body; `routeBody` 400 message includes the failing field path. |
| `frontend/src/App.test.tsx` | 5 | React Router 6.x security-update contract: wildcard `<Route path="*">` catch-all redirect to `/`, plus 4 parameterized routes (`/agents/leaderboard`, `/agents/:name/edit`, `/agent-templates/:id/edit`, `/tasks/:taskId/timeline`) — all resolved via the AppLayout topbar title (a pure function of `useLocation().pathname`), which is data-hook-independent |
| `pivot/src/upgrade-baseline/upgrade-artifacts.test.ts` (new) | 12 | Vite PWA build artifacts (`manifest.webmanifest`, `sw.js`, `registerSW.js`, workbox bundle) and Convex `codegen` artifacts (`api.d.ts` exports, registered module set, `api.js` runtime, `server.d.ts` / `dataModel.d.ts` presence) |
| `pivot/src/upgrade-baseline/upgrade-manifest.test.ts` (new) | 8 | Sub-task 1 Red — per-workspace explicit manifest targets (FR-2, FR-3, FR-4, FR-9). **2 tests RED at HEAD** (root `packageManager` and pivot `bun-types` are still pinned to Bun 1.3.10 while the runtime is 1.3.14 — the spec's FR-3 drift). **6 characterization tests GREEN at HEAD**: shared `convex`/`js-yaml` alignment, pinned `^/~` semver ranges (no `latest`/`*`), no blanket `bun audit --ignore` in `bunfig.toml`, pivot `typecheck` script invokes `tsc --noEmit`, frontend `check` script chains `format:check && lint && tsc --noEmit`. |
| `pivot/src/upgrade-baseline/verify-runner.test.ts` (new) | 8 | Sub-task 2 characterization — `measure/verify.sh` runner contract for AC-7: root `verify` script dispatches through `measure/verify.sh`; the script registers the six AC-7 gates in order; each gate has a `get_gate_cmd` case arm; no `npm install` / `npm ci` (AGENTS.md: bun only); pivot/frontend commands dispatch through `bun`; `VERIFY_FAKE_GATE_DIR` fake-mode hook present; `set -e` deliberately omitted so a failing gate does not abort the loop; `OVERALL_EXIT` aggregation across all gates. All 8 tests GREEN at HEAD — the runner already meets AC-7; the tests pin the contract so a future regression (renamed script, dropped gate, restored `npm install`) is caught before Phase 3 lands. |
| `pivot/src/upgrade-baseline/baseline-regression.test.ts` (new) | 10 | Sub-task 3 Red — baseline-regression comparison artifact. **6 tests RED at HEAD** (the `measure/tracks/package_dependency_upgrades_20260607/baseline-comparison.md` artifact does not yet exist; Sub-task 3 will produce it during Phase 3): comparison artifact exists, contains the four required sections (`Pre-Upgrade Failures`, `Post-Upgrade Failures`, `Delta`, `Pre-Existing Failures Not Caused By This Track`), records the pre-upgrade pivot test failure count of 46, attributes those 46 RED tests to `typed-convex-boundary`, declares zero unexplained new regressions, and is dated after the 2026-06-07 baseline capture. **4 characterization tests GREEN at HEAD**: `baseline.md` remains the source of truth (46 typed-convex-boundary failures); `bun.lock` resolves a single `convex` and a single `js-yaml` version across all workspaces; the lockfile's `workspaces` section mirrors every manifest dependency spec verbatim (FR-2 + FR-4 alignment invariant). |

#### Coverage gaps to FLAG (per test-strategy.md: do not write speculative tests)

| Gap | Surface | Reason flagged, not tested |
| --- | --- | --- |
| Pivot `Router` does not support wildcard routes (`*` / `**`) | `pivot/src/routes/router.ts` | Speculative: a wildcard is not part of the existing pivot HTTP surface and the compatible upgrade batch does not require it. Flagged for any future `Router` refactor. |
| Pivot `Router` does not strip query strings before matching | `pivot/src/routes/router.ts` | Speculative: out of scope for the compatible batch. The HTTP entry point in `server.ts` is the right place to fix this. |
| Tailwind CSS 4 visual smoke | Visual regression | Test-strategy.md § Cross-Phase: covered by Playwright `responsive.spec.ts` and `frontend check`; no new unit test warranted. |
| PWA runtime cache behaviour (NetworkFirst) | `vite.config.ts` `VitePWA.workbox.runtimeCaching` | Per test-strategy: covered by artifact presence (now in `upgrade-artifacts.test.ts`), not by a runtime unit test in jsdom. |
| React Router 7 breaking migration | `frontend/src/App.tsx` future flags | Out of Phase 2 scope. The current `v7_startTransition` / `v7_relativeSplatPath` flags are already enabled, so a React Router 6.x → 6.x security patch should not touch the route contract. Phase 4 owns the 6→7 breaking migration. |

#### Targeted test commands and pass/fail result (current HEAD)

```
$ cd pivot && /home/daniel-bo/.bun/bin/bun test ./src/routes/router.test.ts \
                                            ./src/upgrade-baseline/upgrade-artifacts.test.ts \
                                            ./src/convexClient.test.ts
  64 pass
   0 fail
  130 expect() calls
  Ran 64 tests across 3 files. [2.25s]

$ cd frontend && ./node_modules/.bin/vitest run src/App.test.tsx
  Test Files  1 passed (1)
       Tests  9 passed (9)
```

Broader pivot-suite baseline (matches `baseline.md`):

```
$ cd pivot && bun test ./src/routes/ ./src/__fixtures__/ ./src/upgrade-baseline/
  229 pass
   46 fail  (all 46 = pre-existing typed-convex-boundary RED-phase, recorded in baseline.md)
  Ran 275 tests across 25 files.
```

No new failures introduced; no new passes regressed.

#### Sub-task Red tests — Targeted pass/fail (2026-06-07)

For the three `[~]` sub-tasks under "Prove the compatible batch" the
following targeted runs confirm the new Red tests fail for the expected
missing behavior at HEAD (upgrade not yet applied):

```
$ cd pivot && bun test src/upgrade-baseline/upgrade-manifest.test.ts
  6 pass
  2 fail   (FR-3: root packageManager drift; FR-3: pivot bun-types drift)
  Ran 8 tests across 1 file.

$ cd pivot && bun test src/upgrade-baseline/verify-runner.test.ts
  8 pass
  0 fail
  Ran 8 tests across 1 file.

$ cd pivot && bun test src/upgrade-baseline/baseline-regression.test.ts
  4 pass
  6 fail   (comparison artifact missing — 6 RED tests pinning the
            post-completion contract Sub-task 3 will produce)
  Ran 10 tests across 1 file.

$ cd pivot && bun test src/upgrade-baseline/
  30 pass
   8 fail   (all 8 = sub-task Red tests for prove-the-batch)
  Ran 38 tests across 4 files. [0.45s]
```

Pivot-suite delta vs. `baseline.md` (1219 pass / 46 fail):

```
$ cd pivot && bun test
  1262 pass    (+43 vs baseline, of which +18 = sub-task characterization
                and +25 = other tracks since 2026-06-07)
   4 skip
   54 fail     (+8 vs baseline, all 8 = sub-task Red tests)
  Ran 1320 tests across 120 files. [19.71s]
```

No previously-passing test regressed. The +8 delta is the exact count of
Red tests added by this phase.

## Phase 3: Implement Compatible Upgrades

- [ ] Task: Align Bun and shared workspace dependencies.
  - [ ] Update root `packageManager` from Bun `1.3.10` to the approved runtime
        version and align pivot `bun-types`.
  - [ ] Upgrade and align `convex` across root, pivot, and frontend.
  - [ ] Upgrade and align `js-yaml` across pivot and frontend.
- [ ] Task: Upgrade compatible pivot dependencies explicitly.
  - [ ] Upgrade `@opencode-ai/sdk`, `zod`, and other compatible pivot targets.
  - [ ] Run pivot tests and typecheck; fix only regressions caused by the
        dependency batch.
- [ ] Task: Upgrade compatible frontend runtime dependencies explicitly.
  - [ ] Upgrade React/React DOM, React Router 6, Radix Slot, XYFlow,
        `tailwind-merge`, and other compatible runtime targets.
  - [ ] Run focused routing, graph, and rendering tests.
- [ ] Task: Upgrade compatible frontend development/build dependencies
      explicitly.
  - [ ] Upgrade Vite 7, PostCSS 8, Vite PWA, Vitest packages, Playwright
        packages, TypeScript ESLint, Prettier, and compatible supporting tools.
  - [ ] Keep linked package families on matching versions.
  - [ ] Run frontend test, check, build, and Playwright smoke coverage.
- [ ] Task: Refresh and review `bun.lock`.
  - [ ] Confirm manifest changes and lockfile resolutions are intentional.
  - [ ] Verify no npm lockfile or unrelated generated artifact was introduced.
  - [ ] Run `bun audit` and record the compatible-batch security delta.

## Phase 4: Residual Security & Major Upgrade Batches

- [ ] Task: Remediate residual transitive security findings.
  - [ ] Trace each remaining finding with `bun pm why`.
  - [ ] Prefer supported parent-package upgrades and lockfile refreshes.
  - [ ] Use an override only when the overridden version satisfies the parent's
        declared compatibility and passes full validation.
  - [ ] Document any unavoidable residual finding per FR-9.
- [ ] Task: Evaluate low-coupling major upgrades independently.
  - [ ] Evaluate Lucide React 1 and concurrently 10 in separate checkpoints.
  - [ ] Retain each upgrade only if its focused and aggregate gates do not
        regress.
- [ ] Task: Evaluate frontend runtime/framework major upgrades independently.
  - [ ] Evaluate jsdom 29 with the frontend/Vitest suite.
  - [ ] Evaluate React Router 7 with routing migration and redirect tests.
  - [ ] Evaluate Tailwind CSS 4 with styling/build migration and visual smoke
        verification.
- [ ] Task: Evaluate build/lint/compiler major upgrades independently.
  - [ ] Evaluate Vite 8 and compatible React/Vitest/PWA plugin versions.
  - [ ] Evaluate ESLint 10 with the complete lint configuration and plugin set.
  - [ ] Evaluate TypeScript 6 with pivot typecheck, frontend check, and Convex
        generated types.
- [ ] Task: Record landed/deferred decisions.
  - [ ] Keep each retained major upgrade as an independently reviewable batch.
  - [ ] For each deferred major, record the blocker and create a follow-up
        Measure track or tech-debt entry when migration work is substantial.

## Phase 5: Generate Docs, Doctor & Closeout

- [ ] Task: Run final package and security checks.
  - [ ] Run `bun outdated --recursive --no-cache` and document intentionally
        deferred packages.
  - [ ] Run `bun audit`; require zero high findings and document any accepted
        moderate residuals.
  - [ ] Confirm root, pivot, and frontend manifests agree with `bun.lock`.
- [ ] Task: Run final repository verification.
  - [ ] Run `bun --cwd pivot test` and `bun --cwd pivot typecheck`.
  - [ ] Run `bun --cwd frontend test`, `bun --cwd frontend check`, and
        `bun --cwd frontend test:e2e` smoke coverage.
  - [ ] Run `npm run lint` and `npm run verify`.
  - [ ] Compare every result to the Phase 1 baseline; do not mark regressions as
        pre-existing.
- [ ] Task: Update Measure and generated facts.
  - [ ] Run `measure/generate.sh`.
  - [ ] Run `measure/doctor.sh all` and record results.
  - [ ] Run `build-graph update ./graph.db <changed-ts-files...>` when
        TypeScript files changed; otherwise record package-only graph status.
- [ ] Task: Close out the track.
  - [ ] Record final audit delta, landed upgrades, deferred majors, commands,
        and results in this plan.
  - [ ] Confirm the track satisfies the `measure/workflow.md` closeout rule
        before archiving.
