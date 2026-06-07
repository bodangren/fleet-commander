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
  - [ ] Apply explicit targets per workspace; do not rely on root-only
        `bun update --recursive`.
  - [ ] Run pivot tests/typecheck and frontend tests/check/build.
  - [ ] Compare failures to the Phase 1 baseline and reject unexplained
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
| `pivot/src/routes/router.test.ts` | 8 | `Router` URL-matching edge cases the `zod` upgrade could affect: trailing-slash rejection, case sensitivity, adjacent-slash rejection, query-string rejection, percent-decoded params, extra-segment rejection, single-segment param resolution |
| `frontend/src/App.test.tsx` | 5 | React Router 6.x security-update contract: wildcard `<Route path="*">` catch-all redirect to `/`, plus 4 parameterized routes (`/agents/leaderboard`, `/agents/:name/edit`, `/agent-templates/:id/edit`, `/tasks/:taskId/timeline`) — all resolved via the AppLayout topbar title (a pure function of `useLocation().pathname`), which is data-hook-independent |
| `pivot/src/upgrade-baseline/upgrade-artifacts.test.ts` (new) | 12 | Vite PWA build artifacts (`manifest.webmanifest`, `sw.js`, `registerSW.js`, workbox bundle) and Convex `codegen` artifacts (`api.d.ts` exports, registered module set, `api.js` runtime, `server.d.ts` / `dataModel.d.ts` presence) |

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
  59 pass
   0 fail
  117 expect() calls
  Ran 59 tests across 3 files. [578.00ms]

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
