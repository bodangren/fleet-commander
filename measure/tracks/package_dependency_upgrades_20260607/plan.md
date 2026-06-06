# Plan: Package Dependency Upgrades & Security Remediation

## Phase 1: Baseline Contract & Upgrade Matrix

- [x] Task: Capture the immutable pre-upgrade baseline.
  - [x] Record `bun --version`, root `packageManager`, and all three package
        manifests.
  - [x] Save summarized results for `bun outdated --recursive --no-cache` and
        `bun audit`, including severity counts and vulnerable dependency paths.
  - [x] Run `npm run verify` and record each pre-existing red gate separately
        from package-upgrade work.
- [x] Task: Define the compatible-upgrade matrix before editing manifests.
  - [x] List current, compatible target, and latest major for every outdated
        direct dependency.
  - [x] Group shared packages so `convex` and `js-yaml` remain aligned across
        workspaces.
  - [x] Mark each target as routine, security-motivated, or breaking.
- [x] Task: Define the breaking-upgrade decision matrix.
  - [x] Create isolated decisions for React Router 7, Vite 8, Tailwind CSS 4,
        TypeScript 6, ESLint 10, jsdom 29, Lucide React 1, and concurrently 10.
  - [x] For each major, record migration surface, peer constraints, expected
        validation commands, and rollback point.

## Phase 2: Compatible Upgrade Verification Tests

- [ ] Task: Add or identify characterization coverage for dependency-sensitive
      behavior before package changes.
  - [ ] Confirm frontend routing and redirects cover the React Router security
        update path.
  - [ ] Confirm Vite/PWA build output and service-worker registration have
        automated or repeatable verification.
  - [ ] Confirm Convex code generation and pivot/client integration have a
        repeatable smoke check.
- [ ] Task: Prove the compatible batch in an isolated worktree or temporary
      workspace before retaining it.
  - [ ] Apply explicit targets per workspace; do not rely on root-only
        `bun update --recursive`.
  - [ ] Run pivot tests/typecheck and frontend tests/check/build.
  - [ ] Compare failures to the Phase 1 baseline and reject unexplained
        regressions.

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
