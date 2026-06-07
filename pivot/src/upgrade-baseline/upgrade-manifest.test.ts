import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(import.meta.dir, '..', '..', '..');

const ROOT_MANIFEST = join(REPO_ROOT, 'package.json');
const PIVOT_MANIFEST = join(REPO_ROOT, 'pivot', 'package.json');
const FRONTEND_MANIFEST = join(REPO_ROOT, 'frontend', 'package.json');
const BUNFIG_PATH = join(REPO_ROOT, 'bunfig.toml');

interface PackageJson {
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function parseBunXyz(spec: string): string {
  // "bun@1.3.10" -> "1.3.10"  (root packageManager format)
  const m = spec.match(/^bun@(\d+\.\d+\.\d+)/);
  if (m) return m[1]!;
  // "^1.3.10" -> "1.3.10"  (devDep caret form)
  const c = spec.match(/^[\^~]?(\d+\.\d+\.\d+)/);
  if (c) return c[1]!;
  throw new Error(`cannot parse bun version from spec: ${spec}`);
}

function splitSemver(version: string): [number, number, number] {
  const [maj, min, pat] = version.split('.').map(n => Number(n));
  if (
    maj === undefined ||
    min === undefined ||
    pat === undefined ||
    Number.isNaN(maj) ||
    Number.isNaN(min) ||
    Number.isNaN(pat)
  ) {
    throw new Error(`cannot parse semver: ${version}`);
  }
  return [maj, min, pat];
}

function gte(a: string, b: string): boolean {
  const [aMaj, aMin, aPat] = splitSemver(a);
  const [bMaj, bMin, bPat] = splitSemver(b);
  if (aMaj !== bMaj) return aMaj > bMaj;
  if (aMin !== bMin) return aMin > bMin;
  return aPat >= bPat;
}

// ──────────────────────────────────────────────────────────────────────────────
// Phase 2 (package_dependency_upgrades_20260607) — Sub-task 1 (Prove the
// compatible batch — "Apply explicit targets per workspace; do not rely on
// root-only `bun update --recursive`").
//
// Per `test-strategy.md` and `spec.md`:
//   FR-2: Update compatible versions explicitly per workspace.
//   FR-3: Align root `packageManager` and pivot `bun-types` with the approved
//         Bun runtime version.
//   FR-4: Keep shared dependencies (especially `convex`, `js-yaml`) aligned
//         across workspaces.
//   FR-9: No blanket `bun audit --ignore` suppression.
//
// These tests pin the post-upgrade manifest contract. Two assertions are RED
// at HEAD (Bun version drift, FR-3); the rest are characterization tests that
// pin contracts the upgrade must preserve. After Phase 3 (Implement Compatible
// Upgrades) lands, all eight tests must be GREEN at the upgraded HEAD.
// ──────────────────────────────────────────────────────────────────────────────

describe('Phase 2 Sub-task 1: per-workspace explicit manifest targets (FR-2/3/4/9)', () => {
  test('FR-3: root packageManager matches the runtime Bun version (Red at HEAD)', () => {
    const root = readJson<PackageJson>(ROOT_MANIFEST);
    expect(root.packageManager).toBeDefined();
    const runtime = process.versions.bun;
    if (!runtime) throw new Error('test must be executed under the Bun runtime');
    const declared = parseBunXyz(root.packageManager!);

    // The declared version must be at or above the runtime version. The spec
    // also requires the workspace to declare a specific major.minor.patch, not
    // a range — `bun@1.3.10` is the canonical form.
    expect(gte(declared, runtime)).toBe(true);
    // Pin the exact form so a future drift to `bun@>=1.3` or `bun@latest`
    // is caught: this format is what `bun --version` reproduces.
    expect(root.packageManager).toBe(`bun@${runtime}`);
  });

  test('FR-3: pivot bun-types matches the runtime Bun version (Red at HEAD)', () => {
    const pivot = readJson<PackageJson>(PIVOT_MANIFEST);
    const bunTypes = pivot.devDependencies?.['bun-types'];
    expect(bunTypes).toBeDefined();
    const runtime = process.versions.bun;
    if (!runtime) throw new Error('test must be executed under the Bun runtime');
    const declared = parseBunXyz(bunTypes!);

    expect(gte(declared, runtime)).toBe(true);
    // Pivot's existing convention is `^X.Y.Z`. Preserve that form so we
    // don't accidentally drop the caret (which would pin to a single
    // patch level and break cross-version reproducibility).
    expect(bunTypes).toBe(`^${runtime}`);
  });

  test('FR-4: convex is aligned across root, pivot, and frontend', () => {
    const root = readJson<PackageJson>(ROOT_MANIFEST);
    const pivot = readJson<PackageJson>(PIVOT_MANIFEST);
    const frontend = readJson<PackageJson>(FRONTEND_MANIFEST);

    const rootConvex = root.dependencies?.['convex'];
    const pivotConvex = pivot.dependencies?.['convex'];
    const frontendConvex = frontend.dependencies?.['convex'];

    expect(rootConvex).toBeDefined();
    expect(pivotConvex).toBeDefined();
    expect(frontendConvex).toBeDefined();
    // FR-4: the three workspaces MUST declare the same specifier for the
    // shared `convex` package. Drift across workspaces is the classic
    // symptom of `bun update --recursive` having been used as a blanket.
    expect(pivotConvex).toBe(rootConvex);
    expect(frontendConvex).toBe(rootConvex);
  });

  test('FR-4: js-yaml is aligned across pivot and frontend', () => {
    const pivot = readJson<PackageJson>(PIVOT_MANIFEST);
    const frontend = readJson<PackageJson>(FRONTEND_MANIFEST);

    const pivotYaml = pivot.dependencies?.['js-yaml'];
    const frontendYaml = frontend.dependencies?.['js-yaml'];

    expect(pivotYaml).toBeDefined();
    expect(frontendYaml).toBeDefined();
    expect(pivotYaml).toBe(frontendYaml);
  });

  test('FR-2: every manifest dependency uses a pinned ^/~ semver range, not `latest`/`*`', () => {
    for (const manifestPath of [ROOT_MANIFEST, PIVOT_MANIFEST, FRONTEND_MANIFEST]) {
      const manifest = readJson<PackageJson>(manifestPath);
      const allDeps: Record<string, string> = {
        ...(manifest.dependencies ?? {}),
        ...(manifest.devDependencies ?? {}),
      };
      for (const [name, spec] of Object.entries(allDeps)) {
        // `latest` and `*` are blanket specifiers that the spec explicitly
        // forbids (FR-2 requires explicit per-workspace targets).
        expect(spec).not.toBe('latest');
        expect(spec).not.toBe('*');
        // A pinned range must start with ^, ~, or an exact X.Y.Z.
        expect(spec).toMatch(/^[\^~]?\d+\.\d+\.\d+([+-].+)?$/);
        // Sanity: package name should not be empty / contain a wildcard.
        expect(name.length).toBeGreaterThan(0);
        expect(name).not.toMatch(/[*?]/);
      }
    }
  });

  test('FR-9: bunfig.toml has no blanket `audit.ignore` suppression', () => {
    expect(existsSync(BUNFIG_PATH)).toBe(true);
    const contents = readFileSync(BUNFIG_PATH, 'utf8');
    // FR-9 forbids blanket audit suppression. Per-residual-finding handling
    // is documented in plan.md, not silenced in config.
    expect(contents).not.toMatch(/audit\s*=\s*\{[^}]*ignore/);
    expect(contents).not.toMatch(/ignore\s*=/);
  });

  test('Sub-task 2 prep: pivot package.json has a `typecheck` script using `tsc --noEmit`', () => {
    const pivot = readJson<PackageJson>(PIVOT_MANIFEST);
    const typecheck = pivot.scripts?.['typecheck'];
    expect(typecheck).toBeDefined();
    // The exact script entry drives Sub-task 2 ("Run pivot tests/typecheck
    // and frontend tests/check/build"); pinning the form ensures a typo
    // in `npm run typecheck` is caught before the verify gate runs.
    expect(typecheck).toMatch(/tsc/);
    expect(typecheck).toMatch(/--noEmit/);
  });

  test('Sub-task 2 prep: frontend package.json has a `check` script running format:check, lint, and tsc', () => {
    const frontend = readJson<PackageJson>(FRONTEND_MANIFEST);
    const check = frontend.scripts?.['check'];
    expect(check).toBeDefined();
    // The `check` script is the surface Sub-task 2 invokes. It must
    // chain format:check, lint, and tsc so a single `bun --cwd frontend
    // check` reproduces AC-7's frontend gate.
    expect(check).toContain('format:check');
    expect(check).toContain('lint');
    expect(check).toContain('tsc');
    expect(check).toContain('--noEmit');
  });
});
