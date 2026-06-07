import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(import.meta.dir, '..', '..', '..');

const DIST_DIR = join(REPO_ROOT, 'frontend', 'dist');
const MANIFEST_PATH = join(DIST_DIR, 'manifest.webmanifest');
const SW_PATH = join(DIST_DIR, 'sw.js');
const REGISTER_SW_PATH = join(DIST_DIR, 'registerSW.js');
const WORKBOX_GLOB = /^workbox-[a-f0-9]+\.js$/;

const CONVEX_GENERATED_DIR = join(REPO_ROOT, 'convex', '_generated');
const CONVEX_API_DTS = join(CONVEX_GENERATED_DIR, 'api.d.ts');
const CONVEX_API_JS = join(CONVEX_GENERATED_DIR, 'api.js');
const CONVEX_SERVER_DTS = join(CONVEX_GENERATED_DIR, 'server.d.ts');
const CONVEX_DATA_MODEL_DTS = join(CONVEX_GENERATED_DIR, 'dataModel.d.ts');

// ──────────────────────────────────────────────────────────────────────────────
// Phase 2 (package_dependency_upgrades_20260607) — Vite PWA build artifact
// characterization.
//
// Per test-strategy.md: "Vite 7 → 8 / PWA: no `registerSW` symbol exists in
// the graph, so PWA verification must come from the build artifact
// (`frontend/dist/` manifest + service-worker file presence), not a unit
// test." This file is *that* verification: it asserts the post-build
// artifacts exist and carry the fields the PWA config promises.
//
// These tests are characterization of the current `frontend/dist/` snapshot.
// They are not speculative — the artifacts are produced by `vite build` and
// must be present at HEAD. A Vite 7→8 (or vite-plugin-pwa) regression that
// stops emitting the manifest, the service worker, or the registration
// script would surface here.
// ──────────────────────────────────────────────────────────────────────────────

interface PwaManifest {
  name?: string;
  short_name?: string;
  start_url?: string;
  display?: string;
  scope?: string;
  theme_color?: string;
  background_color?: string;
  icons?: Array<{ src?: string; sizes?: string; type?: string }>;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

describe('Phase 2: Vite PWA build artifacts (frontend/dist)', () => {
  test('manifest.webmanifest exists and parses as JSON', () => {
    expect(existsSync(MANIFEST_PATH)).toBe(true);
    const parsed = readJson<PwaManifest>(MANIFEST_PATH);
    expect(typeof parsed).toBe('object');
  });

  test('manifest.webmanifest carries the fields the VitePWA config promises', () => {
    const manifest = readJson<PwaManifest>(MANIFEST_PATH);

    expect(manifest.name).toBe('Kanban Conductor');
    expect(manifest.short_name).toBe('Kanban');
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.scope).toBe('/');
    expect(manifest.theme_color).toBe('#1e293b');
    expect(manifest.background_color).toBe('#0f172a');
  });

  test('manifest.webmanifest declares at least one 192x192 icon and one 512x512 icon', () => {
    const manifest = readJson<PwaManifest>(MANIFEST_PATH);
    const sizes = (manifest.icons ?? []).map(icon => icon.sizes ?? '');
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
  });

  test('sw.js service-worker file exists at the dist root', () => {
    expect(existsSync(SW_PATH)).toBe(true);
    const contents = readFileSync(SW_PATH, 'utf8');
    // The service worker should be non-trivial: workbox injects a
    // self.__WB_MANIFEST array (or equivalent precache manifest) into sw.js.
    expect(contents.length).toBeGreaterThan(200);
  });

  test('registerSW.js exposes a navigator.serviceWorker.register call', () => {
    expect(existsSync(REGISTER_SW_PATH)).toBe(true);
    const contents = readFileSync(REGISTER_SW_PATH, 'utf8');
    expect(contents).toMatch(/serviceWorker/);
    expect(contents).toMatch(/register\(/);
  });

  test('a workbox runtime bundle is emitted alongside the service worker', () => {
    const entries = require('node:fs').readdirSync(DIST_DIR) as string[];
    const workboxFiles = entries.filter(name => WORKBOX_GLOB.test(name));
    expect(workboxFiles.length).toBeGreaterThanOrEqual(1);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Phase 2 (package_dependency_upgrades_20260607) — Convex `codegen` artifact
// characterization.
//
// Per test-strategy.md: "Convex code generation and pivot/client integration
// have a repeatable smoke check." The `convex/_generated/` directory is the
// repeatability surface: a successful `npx convex codegen` regenerates four
// files, and every typed `api.*` reference in pivot/frontend compiles
// against `api.d.ts`. These tests pin the post-codegen contract so that a
// `convex` library upgrade that breaks codegen output, drops the public
// `api`/`internal` exports, or removes the `dataModel` surface is caught
// before the dependent tests run.
// ──────────────────────────────────────────────────────────────────────────────

describe('Phase 2: Convex codegen artifacts (convex/_generated)', () => {
  test('api.d.ts exists and exports the public and internal API surfaces', () => {
    expect(existsSync(CONVEX_API_DTS)).toBe(true);
    const contents = readFileSync(CONVEX_API_DTS, 'utf8');
    expect(contents).toMatch(/export declare const api:/);
    expect(contents).toMatch(/export declare const internal:/);
    expect(contents).toMatch(/export declare const components:/);
  });

  test('api.d.ts registers the shared Convex modules the pivot typed-boundary tests depend on', () => {
    const contents = readFileSync(CONVEX_API_DTS, 'utf8');
    // These modules are referenced by typed-convex-boundary tests
    // (convexClient.test.ts uses api.fleetCatalog.listAgents / setSetting).
    for (const moduleName of [
      'fleetCatalog',
      'fleet',
      'projects',
      'tasks',
      'agents',
      'analytics',
      'costs',
      'performance',
      'retrospectives',
      'coverageRecords',
      'dispatchPolicyStats',
    ]) {
      expect(contents).toContain(`${moduleName}:`);
    }
  });

  test('api.d.ts ApiFromModules map has one entry per registered module declaration', () => {
    const contents = readFileSync(CONVEX_API_DTS, 'utf8');
    // Count the `ApiFromModules<{ ... }>` keys. Keys can be either quoted
    // ("history/agents": typeof history_agents;) or unquoted
    // (abTests: typeof abTests;). The codegen produces a stable,
    // deterministic count for a given set of convex/*.ts files; we assert
    // it's > 50 (sanity floor) to catch catastrophic codegen truncation.
    const moduleKeys =
      contents.match(/^\s+(?:"[^"]+"|[a-zA-Z_][a-zA-Z0-9_]*):\s+typeof\s+\w+;\s*$/gm) ?? [];
    expect(moduleKeys.length).toBeGreaterThan(50);
  });

  test('api.js runtime companion exists and re-exports the typed api', () => {
    expect(existsSync(CONVEX_API_JS)).toBe(true);
    const contents = readFileSync(CONVEX_API_JS, 'utf8');
    expect(contents).toMatch(/api/);
    expect(contents).toMatch(/internal/);
  });

  test('server.d.ts and dataModel.d.ts exist for the typed validator surface', () => {
    expect(existsSync(CONVEX_SERVER_DTS)).toBe(true);
    expect(existsSync(CONVEX_DATA_MODEL_DTS)).toBe(true);
  });

  test('dataModel.d.ts declares the Id<...> generic used by the typed boundary', () => {
    const contents = readFileSync(CONVEX_DATA_MODEL_DTS, 'utf8');
    // The Id<T> helper is referenced by `v.id(...)` validators and the
    // pivot/frontend typed Convex helpers. Its presence indicates a
    // non-stale codegen run.
    expect(contents).toMatch(/\bId\b/);
  });
});
