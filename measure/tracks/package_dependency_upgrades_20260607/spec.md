# Spec: Package Dependency Upgrades & Security Remediation

## Problem

The Bun workspace lockfile and package manifests have drifted behind currently
available releases. A package audit on 2026-06-07 reported **14 vulnerabilities
(7 high, 7 moderate)**. High-severity findings are present in the frontend build
and PWA toolchain, including Vite, Workbox transitive dependencies, Babel,
`serialize-javascript`, and `fast-uri`.

`bun outdated --recursive --no-cache` also found routine compatible upgrades
across all three workspaces and several available breaking major upgrades. The
root manifest declares Bun `1.3.10`, while the development environment is on
Bun `1.3.14`. A simulation showed that a targeted compatible upgrade batch
reduces the audit from 14 vulnerabilities to 6, but does not eliminate all
transitive findings.

Package updates are currently risky to perform as one undifferentiated command:

- `bun update --recursive` only updated the root `convex` dependency during the
  simulation instead of applying all workspace-compatible updates.
- The repository already has red quality gates owned by active tracks, so the
  package-upgrade delta must be separated from baseline failures.
- Major upgrades include React Router 7, Vite 8, Tailwind CSS 4, TypeScript 6,
  ESLint 10, jsdom 29, Lucide React 1, and concurrently 10. Each may require
  migration work and must be isolated.

## Solution

Upgrade dependencies in risk-ordered batches:

1. Capture the exact pre-upgrade dependency, audit, and quality-gate baseline.
2. Apply explicit compatible upgrades in each workspace, including Bun runtime
   metadata alignment.
3. Remediate remaining vulnerable transitive dependencies through safe direct
   upgrades, lockfile refreshes, supported overrides, or documented upstream
   blockers.
4. Evaluate each breaking major family independently. Land only majors whose
   migration work and verification are green; defer the rest with actionable
   follow-up records.
5. Run the full repository verification and update the knowledge graph.

## Functional Requirements

- **FR-1:** Record before-and-after output for `bun outdated --recursive
  --no-cache`, `bun audit`, and the repository `verify` command.
- **FR-2:** Update compatible dependency versions explicitly in the root,
  `pivot`, and `frontend` workspaces rather than relying on a root-only
  recursive update.
- **FR-3:** Align the root `packageManager` declaration and `bun-types` with the
  approved Bun runtime version.
- **FR-4:** Keep shared dependencies aligned across workspaces, especially
  `convex` and `js-yaml`.
- **FR-5:** Upgrade the compatible frontend build/test/security packages,
  including Vite 7, PostCSS 8, React Router 6, Vite PWA, Vitest, Playwright,
  React 19, and related type/tool packages.
- **FR-6:** Upgrade compatible pivot dependencies, including Convex,
  `@opencode-ai/sdk`, `js-yaml`, `zod`, and `bun-types`.
- **FR-7:** Investigate and remediate the residual audit paths through `jsdom`,
  Tailwind CSS 3, ESLint/TypeScript ESLint, and Vite PWA/Workbox.
- **FR-8:** Evaluate breaking major upgrades as isolated batches with migration
  notes and a green validation checkpoint before each batch is retained.
- **FR-9:** Do not hide vulnerabilities with blanket audit suppression.
  Any unavoidable residual finding must identify the dependency path, upstream
  blocker, exposure assessment, mitigation, and follow-up owner.
- **FR-10:** Preserve existing application behavior and generated Convex API
  compatibility.

## Non-Functional Requirements

- Package changes must use Bun; do not use `npm install` or `npm ci`.
- Keep commits/batches independently reviewable and reversible.
- Separate pre-existing quality-gate failures from regressions introduced by
  this track using before-and-after evidence.
- Do not edit generated build output.
- No package major upgrade may be grouped with an unrelated major upgrade.

## Acceptance Criteria

- [ ] Root, pivot, and frontend compatible dependencies are upgraded explicitly,
      and `bun.lock` matches the manifests.
- [ ] Root `packageManager` and pivot `bun-types` target the approved Bun
      version.
- [ ] Shared `convex` and `js-yaml` versions are aligned across workspaces.
- [ ] `bun audit` reports zero high-severity vulnerabilities.
- [ ] Every remaining moderate vulnerability, if any, has an actionable
      documented exception; the preferred closeout state is zero findings.
- [ ] Each evaluated major upgrade has a recorded landed/deferred decision,
      migration impact, and validation evidence.
- [ ] No quality gate regresses relative to the captured pre-upgrade baseline.
- [ ] `bun --cwd pivot test`, `bun --cwd pivot typecheck`,
      `bun --cwd frontend test`, `bun --cwd frontend check`, `npm run lint`,
      and `npm run verify` have recorded results.
- [ ] `build-graph update` is run for changed TypeScript files, or the closeout
      explicitly records that package-only changes required no graph update.

## Out of Scope

- Fixing unrelated quality-gate failures already owned by active Measure tracks.
- Rewriting application features solely to adopt a newly available package API.
- Adopting unsupported dependency overrides only to make `bun audit` green.
- Updating generated build output under `frontend/dist/` or `pivot/dist/`.

## Baseline Evidence

Captured on 2026-06-07 with Bun `1.3.14`:

- `bun outdated --recursive --no-cache`: 36 upgradeable workspace entries.
- `bun audit`: 14 vulnerabilities, comprising 7 high and 7 moderate.
- A targeted compatible-upgrade simulation reduced the result to 6
  vulnerabilities, comprising 3 high and 3 moderate.
- Residual simulated paths: `jsdom` to `ws`; Tailwind CSS 3 to nested PostCSS;
  ESLint/TypeScript ESLint to `brace-expansion`; Vite PWA/Workbox to
  `fast-uri` and Babel SystemJS transform.

## Cross-References

- `AGENTS.md`: Bun package-management and verification requirements.
- `measure/workflow.md`: quality gates and track closeout requirements.
- `measure/lessons-learned.md`: `red_not_done`, `fake_gate_mask`, and
  `track_closeout`.
- `quality_gate_enforcement_20260605`: owns the aggregate verification gate.
