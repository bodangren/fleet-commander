/**
 * Pipeline placeholder removal verification for `convex/pipelines.ts`.
 *
 * Track: operations_api_contract_closure_20260618
 * Phase 3: Pipeline Persistence — Green
 *
 * Run with:
 *   bun test ./convex/pipelines.test.ts
 */
import { describe, expect, it } from 'bun:test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ──────────────────────────────────────────────────────────────────────────────
// Phase 3 Red — inversion of the P1 placeholder regression net.
//
// Track: operations_api_contract_closure_20260618
// Strategy: measure/tracks/operations_api_contract_closure_20260618/test-strategy.md §5
//   ("invert the placeholder test from P1")
//   §3 ("Either path needs a regression test asserting 'stub-id' is no
//    longer returned by any production query.")
//   §6 ("Artifact / contract (no live process): … any grep-style 'no
//    'stub-id' in production' test.")
//
// P3 Green either deletes convex/pipelines.ts entirely (and removes these
// placeholder exports) or replaces every placeholder body with a real
// pipelineRuns write. The static-analysis assertions below catch both paths
// by failing as long as the file still contains the placeholder exports and
// the literal 'stub-id' / null-returning bodies. They are intentionally red
// at HEAD; the P3 Green commit makes them pass.
//
// Mirrors the static-analysis style of
// convex/pipelines.placeholder-regression.test.ts (which asserts cross-file
// invariants); this suite asserts the file-internal invariant that the
// placeholder API surface is gone.
// ──────────────────────────────────────────────────────────────────────────────

describe('Phase 3 Red: convex/pipelines.ts placeholder surface is removed (inversion of P1 regression net)', () => {
  const PIPELINES_FILE = join(import.meta.dir, 'pipelines.ts');

  it('convex/pipelines.ts no longer exports the placeholder startPipeline function', () => {
    // If the file was deleted entirely, skip (P3 may take the "delete" path).
    if (!existsSync(PIPELINES_FILE)) return;
    const src = readFileSync(PIPELINES_FILE, 'utf8');
    expect(src).not.toMatch(/export\s+const\s+startPipeline\b/);
  });

  it('convex/pipelines.ts no longer exports the placeholder updatePipelineStatus function', () => {
    if (!existsSync(PIPELINES_FILE)) return;
    const src = readFileSync(PIPELINES_FILE, 'utf8');
    expect(src).not.toMatch(/export\s+const\s+updatePipelineStatus\b/);
  });

  it('convex/pipelines.ts no longer exports the placeholder getPipelineLogs query', () => {
    if (!existsSync(PIPELINES_FILE)) return;
    const src = readFileSync(PIPELINES_FILE, 'utf8');
    expect(src).not.toMatch(/export\s+const\s+getPipelineLogs\b/);
  });

  it('convex/pipelines.ts no longer contains the literal "stub-id" return value', () => {
    if (!existsSync(PIPELINES_FILE)) return;
    const src = readFileSync(PIPELINES_FILE, 'utf8');
    expect(src).not.toMatch(/['"]stub-id['"]/);
  });
});
