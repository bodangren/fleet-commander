import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(import.meta.dir, '..', '..', '..');

const ROOT_MANIFEST = join(REPO_ROOT, 'package.json');
const PIVOT_MANIFEST = join(REPO_ROOT, 'pivot', 'package.json');
const FRONTEND_MANIFEST = join(REPO_ROOT, 'frontend', 'package.json');
const BUN_LOCK = join(REPO_ROOT, 'bun.lock');

interface PackageJson {
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
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

function parseCareted(spec: string): string {
  const m = spec.match(/^[\^~]?(\d+\.\d+\.\d+)/);
  if (m) return m[1]!;
  throw new Error(`cannot parse semver spec: ${spec}`);
}

function extractResolvedVersion(lockContents: string, pkg: string): string {
  // Bun's lockfile format:    "name": ["name@1.2.3", ...]
  // The first element is `"name@1.2.3"`.
  const re = new RegExp(`"${pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}":\\s*\\["${pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}@([^"]+)"`);
  const m = lockContents.match(re);
  if (!m) {
    throw new Error(`lockfile has no resolved entry for ${pkg}`);
  }
  return m[1]!;
}

// ──────────────────────────────────────────────────────────────────────────────
// Phase 3 (package_dependency_upgrades_20260607) — Red-phase post-upgrade
// contract tests for the compatible batch.
//
// Per `compatible-matrix.md` and `spec.md` (FR-2, FR-3, FR-4, FR-5, FR-6, FR-9,
// FR-10): Phase 3 must update manifest specifiers and lockfile resolutions to
// the latest compatible (semver-range) versions across three workspaces
// (root, pivot, frontend) and one lockfile (`bun.lock`). Breaking majors are
// out of scope here (Phase 4).
//
// These tests pin the post-upgrade contracts. They will be RED at HEAD (the
// upgrade has not been applied) and GREEN once Phase 3 lands. Per the
// `red_not_done` lesson, the tasks above stay `[~]` until the upgrade is
// applied AND these tests pass at the upgraded HEAD.
//
// Per `test-strategy.md`: characterization, not speculation. Each target
// version comes from `bun outdated --recursive --no-cache` (captured in
// `compatible-matrix.md`).
// ──────────────────────────────────────────────────────────────────────────────

// Sub-task 1: shared workspace dependencies (convex + js-yaml alignment).
// Bun alignment (root packageManager + pivot bun-types) was completed in
// Phase 2 Green (`96e0aae`) and is pinned by `upgrade-manifest.test.ts`.
// This file covers the remaining Sub-task 1 contracts: the **specific**
// post-upgrade version specifiers for `convex` and `js-yaml`, and the
// cross-workspace lockfile alignment that follows from the spec.
describe('Phase 3 Sub-task 1: shared workspace dependencies (FR-4)', () => {
  test('convex is declared at the compatible target ^1.40.0 in root, pivot, and frontend', () => {
    const root = readJson<PackageJson>(ROOT_MANIFEST);
    const pivot = readJson<PackageJson>(PIVOT_MANIFEST);
    const frontend = readJson<PackageJson>(FRONTEND_MANIFEST);

    const target = '^1.40.0';
    expect(root.dependencies?.['convex']).toBe(target);
    expect(pivot.dependencies?.['convex']).toBe(target);
    expect(frontend.dependencies?.['convex']).toBe(target);
  });

  test('js-yaml is declared at the compatible target ^4.2.0 in pivot and frontend', () => {
    const pivot = readJson<PackageJson>(PIVOT_MANIFEST);
    const frontend = readJson<PackageJson>(FRONTEND_MANIFEST);

    const target = '^4.2.0';
    expect(pivot.dependencies?.['js-yaml']).toBe(target);
    expect(frontend.dependencies?.['js-yaml']).toBe(target);
  });

  test('bun.lock resolves a single `convex` version at or above 1.40.0 (FR-4 alignment)', () => {
    const lock = readFileSync(BUN_LOCK, 'utf8');
    const resolved = extractResolvedVersion(lock, 'convex');
    expect(gte(resolved, '1.40.0')).toBe(true);
  });

  test('bun.lock resolves a single `js-yaml` version at or above 4.2.0 (FR-4 alignment)', () => {
    const lock = readFileSync(BUN_LOCK, 'utf8');
    const resolved = extractResolvedVersion(lock, 'js-yaml');
    expect(gte(resolved, '4.2.0')).toBe(true);
  });
});

// Sub-task 2: compatible pivot dependencies.
// Per `compatible-matrix.md` § Pivot Workspace — Runtime Dependencies:
//   @opencode-ai/sdk ^1.14.35 -> ^1.16.2
//   zod                    ^4.3.6  -> ^4.4.3
// Per `compatible-matrix.md` § Pivot Workspace — Dev Dependencies:
//   bun-types              ^1.3.10 -> ^1.3.14   (Green at HEAD, see Sub-task 1)
//   @types/js-yaml         ^4.0.9  -> ^4.0.9    (already latest in range; no change)
//   mdast-util-to-string   ^4.0.0  -> ^4.0.0    (already latest in range; no change)
//   remark-parse           ^11.0.0 -> ^11.0.0   (already latest in range; no change)
describe('Phase 3 Sub-task 2: compatible pivot dependencies (FR-6)', () => {
  test('@opencode-ai/sdk is declared at the compatible target ^1.16.2', () => {
    const pivot = readJson<PackageJson>(PIVOT_MANIFEST);
    expect(pivot.dependencies?.['@opencode-ai/sdk']).toBe('^1.16.2');
  });

  test('zod is declared at the compatible target ^4.4.3', () => {
    const pivot = readJson<PackageJson>(PIVOT_MANIFEST);
    expect(pivot.dependencies?.['zod']).toBe('^4.4.3');
  });

  test('bun.lock resolves @opencode-ai/sdk at or above 1.16.2', () => {
    const lock = readFileSync(BUN_LOCK, 'utf8');
    const resolved = extractResolvedVersion(lock, '@opencode-ai/sdk');
    expect(gte(resolved, '1.16.2')).toBe(true);
  });

  test('bun.lock resolves zod at or above 4.4.3', () => {
    const lock = readFileSync(BUN_LOCK, 'utf8');
    const resolved = extractResolvedVersion(lock, 'zod');
    expect(gte(resolved, '4.4.3')).toBe(true);
  });
});

// Sub-task 3: compatible frontend runtime dependencies.
// Per `compatible-matrix.md` § Frontend Workspace — Runtime Dependencies:
//   react                  ^19.2.3  -> ^19.2.7
//   react-dom              ^19.2.3  -> ^19.2.7
//   react-router-dom       ^6.30.1  -> ^6.30.4   (security-motivated; same-origin redirect)
//   @radix-ui/react-slot   ^1.2.4   -> ^1.2.5
//   @xyflow/react          ^12.10.2 -> ^12.11.0
//   tailwind-merge         ^3.4.0   -> ^3.6.0
//   clsx, class-variance-authority, tailwindcss-animate, recharts unchanged
describe('Phase 3 Sub-task 3: compatible frontend runtime dependencies (FR-5)', () => {
  test('react is declared at the compatible target ^19.2.7', () => {
    const frontend = readJson<PackageJson>(FRONTEND_MANIFEST);
    expect(frontend.dependencies?.['react']).toBe('^19.2.7');
  });

  test('react-dom is declared at the compatible target ^19.2.7', () => {
    const frontend = readJson<PackageJson>(FRONTEND_MANIFEST);
    expect(frontend.dependencies?.['react-dom']).toBe('^19.2.7');
  });

  test('react-router-dom is declared at the compatible target ^6.30.4 (security)', () => {
    const frontend = readJson<PackageJson>(FRONTEND_MANIFEST);
    expect(frontend.dependencies?.['react-router-dom']).toBe('^6.30.4');
  });

  test('@radix-ui/react-slot is declared at the compatible target ^1.2.5', () => {
    const frontend = readJson<PackageJson>(FRONTEND_MANIFEST);
    expect(frontend.dependencies?.['@radix-ui/react-slot']).toBe('^1.2.5');
  });

  test('@xyflow/react is declared at the compatible target ^12.11.0', () => {
    const frontend = readJson<PackageJson>(FRONTEND_MANIFEST);
    expect(frontend.dependencies?.['@xyflow/react']).toBe('^12.11.0');
  });

  test('tailwind-merge is declared at the compatible target ^3.6.0', () => {
    const frontend = readJson<PackageJson>(FRONTEND_MANIFEST);
    expect(frontend.dependencies?.['tailwind-merge']).toBe('^3.6.0');
  });

  test('bun.lock resolves react, react-dom, react-router, react-router-dom at compatible targets', () => {
    const lock = readFileSync(BUN_LOCK, 'utf8');
    expect(gte(extractResolvedVersion(lock, 'react'), '19.2.7')).toBe(true);
    expect(gte(extractResolvedVersion(lock, 'react-dom'), '19.2.7')).toBe(true);
    // react-router-dom pins its transitive `react-router` to the same
    // version range; the security update moves both forward together.
    expect(gte(extractResolvedVersion(lock, 'react-router'), '6.30.4')).toBe(true);
    expect(gte(extractResolvedVersion(lock, 'react-router-dom'), '6.30.4')).toBe(true);
  });

  test('bun.lock resolves @radix-ui/react-slot, @xyflow/react, tailwind-merge at compatible targets', () => {
    const lock = readFileSync(BUN_LOCK, 'utf8');
    expect(gte(extractResolvedVersion(lock, '@radix-ui/react-slot'), '1.2.5')).toBe(true);
    expect(gte(extractResolvedVersion(lock, '@xyflow/react'), '12.11.0')).toBe(true);
    expect(gte(extractResolvedVersion(lock, 'tailwind-merge'), '3.6.0')).toBe(true);
  });
});

// Sub-task 4: compatible frontend dev/build dependencies.
// Per `compatible-matrix.md` § Frontend Workspace — Dev Dependencies:
//   vite                   ^7.3.1   -> ^7.3.5   (security — path traversal / fs.deny / file read)
//   postcss                ^8.5.6   -> ^8.5.15  (security — XSS via unescaped </style>)
//   vite-plugin-pwa        ^1.2.0   -> ^1.3.0   (security — pulls in fixed lodash/fast-uri/serialize-javascript/babel)
//   vitest                 ^4.0.17  -> ^4.1.8
//   @vitest/coverage-v8    ^4.1.4   -> ^4.1.8
//   @vitest/ui             ^4.0.17  -> ^4.1.8
//   playwright             ^1.59.1  -> ^1.60.0
//   @playwright/test       ^1.59.1  -> ^1.60.0
//   typescript-eslint      ^8.53.0  -> ^8.60.1  (security — pulls in fixed brace-expansion)
//   prettier               ^3.8.0   -> ^3.8.3
//   autoprefixer           ^10.4.23 -> ^10.5.0
//   eslint-plugin-react-hooks ^7.0.1 -> ^7.1.1
//   @types/react           ^19.2.8  -> ^19.2.17
//   @vitejs/plugin-react   ^5.1.2   -> ^5.2.0
//   @eslint/js             ^9.39.2  -> ^9.39.4  (latest in 9.x; no breaking change)
describe('Phase 3 Sub-task 4: compatible frontend dev/build dependencies (FR-5)', () => {
  test('vite is declared at the compatible target ^7.3.5 (security)', () => {
    const frontend = readJson<PackageJson>(FRONTEND_MANIFEST);
    expect(frontend.devDependencies?.['vite']).toBe('^7.3.5');
  });

  test('postcss is declared at the compatible target ^8.5.15 (security)', () => {
    const frontend = readJson<PackageJson>(FRONTEND_MANIFEST);
    expect(frontend.devDependencies?.['postcss']).toBe('^8.5.15');
  });

  test('vite-plugin-pwa is declared at the compatible target ^1.3.0 (security)', () => {
    const frontend = readJson<PackageJson>(FRONTEND_MANIFEST);
    expect(frontend.devDependencies?.['vite-plugin-pwa']).toBe('^1.3.0');
  });

  test('vitest is declared at the compatible target ^4.1.8', () => {
    const frontend = readJson<PackageJson>(FRONTEND_MANIFEST);
    expect(frontend.devDependencies?.['vitest']).toBe('^4.1.8');
  });

  test('@vitest/coverage-v8 and @vitest/ui are aligned at ^4.1.8 (linked package family)', () => {
    const frontend = readJson<PackageJson>(FRONTEND_MANIFEST);
    expect(frontend.devDependencies?.['@vitest/coverage-v8']).toBe('^4.1.8');
    expect(frontend.devDependencies?.['@vitest/ui']).toBe('^4.1.8');
  });

  test('playwright and @playwright/test are aligned at ^1.60.0 (linked package family)', () => {
    const frontend = readJson<PackageJson>(FRONTEND_MANIFEST);
    expect(frontend.devDependencies?.['playwright']).toBe('^1.60.0');
    expect(frontend.devDependencies?.['@playwright/test']).toBe('^1.60.0');
  });

  test('typescript-eslint is declared at the compatible target ^8.60.1 (security)', () => {
    const frontend = readJson<PackageJson>(FRONTEND_MANIFEST);
    expect(frontend.devDependencies?.['typescript-eslint']).toBe('^8.60.1');
  });

  test('prettier is declared at the compatible target ^3.8.3', () => {
    const frontend = readJson<PackageJson>(FRONTEND_MANIFEST);
    expect(frontend.devDependencies?.['prettier']).toBe('^3.8.3');
  });

  test('autoprefixer is declared at the compatible target ^10.5.0', () => {
    const frontend = readJson<PackageJson>(FRONTEND_MANIFEST);
    expect(frontend.devDependencies?.['autoprefixer']).toBe('^10.5.0');
  });

  test('eslint-plugin-react-hooks is declared at the compatible target ^7.1.1', () => {
    const frontend = readJson<PackageJson>(FRONTEND_MANIFEST);
    expect(frontend.devDependencies?.['eslint-plugin-react-hooks']).toBe('^7.1.1');
  });

  test('@types/react is declared at the compatible target ^19.2.17', () => {
    const frontend = readJson<PackageJson>(FRONTEND_MANIFEST);
    expect(frontend.devDependencies?.['@types/react']).toBe('^19.2.17');
  });

  test('@vitejs/plugin-react is declared at the compatible target ^5.2.0', () => {
    const frontend = readJson<PackageJson>(FRONTEND_MANIFEST);
    expect(frontend.devDependencies?.['@vitejs/plugin-react']).toBe('^5.2.0');
  });

  test('@eslint/js is declared at the compatible target ^9.39.4 (latest 9.x)', () => {
    const frontend = readJson<PackageJson>(FRONTEND_MANIFEST);
    expect(frontend.devDependencies?.['@eslint/js']).toBe('^9.39.4');
  });

  test('bun.lock resolves the security-motivated dev/build packages above their vulnerable ranges', () => {
    const lock = readFileSync(BUN_LOCK, 'utf8');
    // Vite 7.3.5+ fixes the path-traversal / fs.deny / file-read CVEs.
    expect(gte(extractResolvedVersion(lock, 'vite'), '7.3.5')).toBe(true);
    // PostCSS 8.5.10+ fixes the </style> XSS CVE.
    expect(gte(extractResolvedVersion(lock, 'postcss'), '8.5.10')).toBe(true);
    // typescript-eslint 8.60.1+ pulls in a patched brace-expansion (>=5.0.6).
    expect(gte(extractResolvedVersion(lock, 'typescript-eslint'), '8.60.1')).toBe(true);
  });
});

// Sub-task 5: refresh and review bun.lock.
// AC-7 requires: "Root, pivot, and frontend compatible dependencies are
// upgraded explicitly, and `bun.lock` matches the manifests."
// The existing `baseline-regression.test.ts` already pins the lockfile
// `workspaces` alignment (Phase 2 § Sub-task 3 characterization). This file
// adds the post-upgrade resolved-version pins so the upgrade is verified
// end-to-end.
describe('Phase 3 Sub-task 5: bun.lock refresh (AC-7)', () => {
  test('bun.lock has no npm lockfile sibling (no `package-lock.json` was introduced)', () => {
    // The Phase 1 baseline promises a bun-only workspace. The compatible
    // batch must not introduce an npm lockfile (AGENTS.md: bun only).
    expect(existsSync(join(REPO_ROOT, 'package-lock.json'))).toBe(false);
  });

  test('bun.lock `workspaces` block carries the post-upgrade specifiers for every Phase-3 target', () => {
    const lock = readFileSync(BUN_LOCK, 'utf8');
    // Hard-coded post-upgrade specifiers (per `compatible-matrix.md`).
    // The Phase 3 upgrade must rewrite the manifest and `bun install`
    // must regenerate the lockfile; this test catches the half-applied
    // case where the manifest is bumped but `bun install` was skipped.
    const expectedSpecs: Array<readonly [string, string]> = [
      ['"convex": "^1.40.0"', '"convex": "^1.40.0"'],
      ['"js-yaml": "^4.2.0"', '"js-yaml": "^4.2.0"'],
      ['"zod": "^4.4.3"', '"zod": "^4.4.3"'],
      ['"@opencode-ai/sdk": "^1.16.2"', '"@opencode-ai/sdk": "^1.16.2"'],
      ['"react": "^19.2.7"', '"react": "^19.2.7"'],
      ['"react-dom": "^19.2.7"', '"react-dom": "^19.2.7"'],
      ['"react-router-dom": "^6.30.4"', '"react-router-dom": "^6.30.4"'],
      ['"vite": "^7.3.5"', '"vite": "^7.3.5"'],
      ['"postcss": "^8.5.15"', '"postcss": "^8.5.15"'],
      ['"vite-plugin-pwa": "^1.3.0"', '"vite-plugin-pwa": "^1.3.0"'],
      ['"vitest": "^4.1.8"', '"vitest": "^4.1.8"'],
    ];
    for (const [spec] of expectedSpecs) {
      expect(lock).toContain(spec);
    }
  });

  test('all Phase-3-targeted specifiers are pinned with a caret (no `latest`/`*` regression)', () => {
    for (const manifestPath of [PIVOT_MANIFEST, FRONTEND_MANIFEST]) {
      const manifest = readJson<PackageJson>(manifestPath);
      const allDeps: Record<string, string> = {
        ...(manifest.dependencies ?? {}),
        ...(manifest.devDependencies ?? {}),
      };
      for (const spec of Object.values(allDeps)) {
        // FR-2 + FR-9: no blanket specifiers, every dep must be a
        // pinned semver range after the compatible batch.
        expect(spec).not.toBe('latest');
        expect(spec).not.toBe('*');
        expect(spec).toMatch(/^[\^~]?\d+\.\d+\.\d+([+-].+)?$/);
      }
    }
  });
});
