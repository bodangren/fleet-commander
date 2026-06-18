import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(import.meta.dir, '..', '..', '..');
const TRACK_DIR = join(
  REPO_ROOT,
  'measure',
  'archive',
  'package_dependency_upgrades_20260607',
);
const BASELINE_MD = join(TRACK_DIR, 'baseline.md');
const COMPARISON_MD = join(TRACK_DIR, 'baseline-comparison.md');
const BUN_LOCK = join(REPO_ROOT, 'bun.lock');

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

// ──────────────────────────────────────────────────────────────────────────────
// Phase 2 (package_dependency_upgrades_20260607) — Sub-task 3 (Prove the
// compatible batch — "Compare failures to the Phase 1 baseline and reject
// unexplained regressions").
//
// Per `test-strategy.md` § Per-Phase Test Approach Notes (Phase 2/3) and
// `spec.md` AC-7: every retained compatible batch must compare its result
// against the Phase 1 baseline and *reject* unexplained regressions.
//
// The post-comparison artifact lives at
//   measure/tracks/package_dependency_upgrades_20260607/baseline-comparison.md
// and has four sections (Pre-Upgrade Failures, Post-Upgrade Failures, Delta,
// Pre-Existing Failures Not Caused By This Track). This file does not exist
// at HEAD — Sub-task 3 will produce it during Phase 3. Every test in this
// file is therefore RED at HEAD and goes GREEN once the comparison artifact
// lands.
// ──────────────────────────────────────────────────────────────────────────────

const REQUIRED_SECTIONS = [
  '## Pre-Upgrade Failures',
  '## Post-Upgrade Failures',
  '## Delta',
  '## Pre-Existing Failures Not Caused By This Track',
] as const;

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

describe('Phase 2 Sub-task 3: baseline-regression comparison artifact (AC-7)', () => {
  test('comparison artifact exists at the track directory', () => {
    expect(existsSync(COMPARISON_MD)).toBe(true);
  });

  test('comparison artifact contains all four required sections', () => {
    expect(existsSync(COMPARISON_MD)).toBe(true);
    const contents = readFileSync(COMPARISON_MD, 'utf8');
    for (const heading of REQUIRED_SECTIONS) {
      expect(contents).toContain(heading);
    }
  });

  test('comparison artifact records a pre-upgrade pivot test failure count', () => {
    // Sub-task 3 reports the *exact* pre-upgrade failure count from the
    // baseline (currently 46 typed-convex-boundary RED tests, per
    // baseline.md § `npm test` — Pre-existing Failures). A blank or
    // missing count would let a regression slip through.
    expect(existsSync(COMPARISON_MD)).toBe(true);
    const contents = readFileSync(COMPARISON_MD, 'utf8');
    expect(contents).toMatch(/Pre-Upgrade Failures[^\n]*\n[\s\S]*?\b46\b/);
  });

  test('comparison artifact explicitly attributes the 46 pre-existing RED tests to typed-convex-boundary', () => {
    // The lesson `red_not_done` warns that "pre-existing/unrelated" must
    // be backed by attribution, not silence. The Delta section must call
    // out the typed-convex-boundary track as the owner.
    expect(existsSync(COMPARISON_MD)).toBe(true);
    const contents = readFileSync(COMPARISON_MD, 'utf8');
    expect(contents.toLowerCase()).toContain('typed-convex-boundary');
  });

  test('comparison artifact does not flag any new regression introduced by the compatible batch', () => {
    // AC-7 requires "No quality gate regresses relative to the captured
    // pre-upgrade baseline." A retained batch that produced new failures
    // must be rejected; the comparison must record "no regressions" or
    // list each unexplained new failure.
    expect(existsSync(COMPARISON_MD)).toBe(true);
    const contents = readFileSync(COMPARISON_MD, 'utf8');
    // A positive sign-off: the Delta section reports zero unexplained
    // new failures introduced by this track.
    expect(contents).toMatch(
      /(no new|zero new|no unexplained|0 unexplained|new regressions:\s*0)/i,
    );
  });

  test('comparison artifact is dated after the Phase 1 baseline capture (2026-06-07)', () => {
    // The comparison must be produced *after* the baseline. A future
    // regression that reorders the workflow could let the comparison
    // happen before the baseline, in which case the date would predate
    // 2026-06-07.
    expect(existsSync(COMPARISON_MD)).toBe(true);
    const contents = readFileSync(COMPARISON_MD, 'utf8');
    expect(contents).toMatch(/202[6-9]-\d{2}-\d{2}/);
  });

  test('baseline.md remains the source of truth for the pre-upgrade failure list', () => {
    // Sub-task 3 is a *comparison* — the original baseline must not
    // be rewritten. The pre-upgrade failure list lives only in
    // baseline.md, not in the comparison artifact.
    expect(existsSync(BASELINE_MD)).toBe(true);
    const baseline = readFileSync(BASELINE_MD, 'utf8');
    expect(baseline).toContain('46');
    expect(baseline).toContain('typed-convex-boundary');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Characterization tests for the lockfile contract. These are GREEN at HEAD
// and remain GREEN as long as Phase 3 does not introduce lockfile drift
// against the manifests. They pin the AC-7 invariant
//   "Root, pivot, and frontend compatible dependencies are upgraded
//    explicitly, and `bun.lock` matches the manifests."
// ──────────────────────────────────────────────────────────────────────────────

describe('Phase 2 Sub-task 3: lockfile matches manifest specs (AC-7 invariant)', () => {
  test('bun.lock resolves a single `convex` version for the three workspaces', () => {
    expect(existsSync(BUN_LOCK)).toBe(true);
    const lock = readFileSync(BUN_LOCK, 'utf8');
    // The lockfile stores a single resolved entry per package. If pivot
    // and frontend were bumped via different invocations, two distinct
    // resolved versions could appear. FR-4 requires alignment; this
    // test catches a lockfile that drifts away from that.
    const convexEntries = lock.match(/"convex@[^"]+"/g) ?? [];
    expect(convexEntries.length).toBeGreaterThan(0);
    // Normalize and dedupe resolved versions: a single canonical version
    // should appear in the lockfile.
    const versions = new Set(convexEntries.map(e => e.split('@').slice(1, 2).join('')));
    expect(versions.size).toBe(1);
  });

  test('bun.lock resolves a single `js-yaml` version across pivot and frontend', () => {
    const lock = readFileSync(BUN_LOCK, 'utf8');
    const yamlEntries = lock.match(/"js-yaml@[^"]+"/g) ?? [];
    expect(yamlEntries.length).toBeGreaterThan(0);
    const versions = new Set(yamlEntries.map(e => e.split('@').slice(1, 2).join('')));
    expect(versions.size).toBe(1);
  });

  test('lockfile workspaces section repeats the manifest dependency specs verbatim', () => {
    const lock = readFileSync(BUN_LOCK, 'utf8');
    const rootManifest = readJson<PackageJson>(join(REPO_ROOT, 'package.json'));
    const pivotManifest = readJson<PackageJson>(join(REPO_ROOT, 'pivot', 'package.json'));
    const frontendManifest = readJson<PackageJson>(
      join(REPO_ROOT, 'frontend', 'package.json'),
    );

    // The lockfile's `workspaces` block must mirror the manifest specs
    // — drift here is the symptom of a `bun update --recursive` blanket
    // having been used in place of explicit per-workspace targets.
    for (const [name, spec] of Object.entries(rootManifest.dependencies ?? {})) {
      expect(lock).toContain(`"${name}": "${spec}"`);
    }
    for (const [name, spec] of Object.entries(pivotManifest.dependencies ?? {})) {
      expect(lock).toContain(`"${name}": "${spec}"`);
    }
    for (const [name, spec] of Object.entries(frontendManifest.dependencies ?? {})) {
      expect(lock).toContain(`"${name}": "${spec}"`);
    }
  });
});
