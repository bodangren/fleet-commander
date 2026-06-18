/**
 * Phase 1 (Red) placeholder regression contract for `convex/pipelines.ts`.
 *
 * Track: operations_api_contract_closure_20260618
 * Strategy: measure/tracks/operations_api_contract_closure_20260618/test-strategy.md §5
 *           "Add a convex-side unit test (`convex/pipelines.test.ts`) asserting
 *            current placeholder behavior — this test is the artifact that
 *            proves the regression and gets inverted in P3."
 *
 * These tests pin the CURRENT (broken) behavior of the placeholder
 * functions in `convex/pipelines.ts`. They are intentionally green at HEAD
 * so the red→green flip in P3 (when the placeholders are removed or
 * replaced with real persistence via `pipelineRuns`) is observable as a
 * failing test. Do NOT invert in this commit; inversion is owned by P3.
 *
 * Run with:
 *   bun test ./convex/pipelines.test.ts
 */
import { describe, expect, it } from 'bun:test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  getPipeline,
  getPipelineStatus,
  getPipelineLogs,
  listPipelines,
  startPipeline,
  updatePipelineStatus,
} from './pipelines';

describe('convex/pipelines.ts placeholder behavior (regression — P1)', () => {
  describe('read queries return placeholders instead of real rows', () => {
    it('getPipeline returns null (placeholder)', async () => {
      expect(getPipeline).toBeDefined();
      const result = await (getPipeline as any)({}, { executionId: 'exec-1' });
      expect(result).toBeNull();
    });

    it('getPipelineStatus returns null (placeholder)', async () => {
      expect(getPipelineStatus).toBeDefined();
      const result = await (getPipelineStatus as any)({}, { executionId: 'exec-1' });
      expect(result).toBeNull();
    });

    it('getPipelineLogs returns null (placeholder)', async () => {
      expect(getPipelineLogs).toBeDefined();
      const result = await (getPipelineLogs as any)({}, { executionId: 'exec-1' });
      expect(result).toBeNull();
    });

    it('listPipelines returns [] (placeholder)', async () => {
      expect(listPipelines).toBeDefined();
      const result = await (listPipelines as any)({}, {});
      expect(result).toEqual([]);
    });
  });

  describe('mutations are no-ops and return placeholder ids', () => {
    it('startPipeline returns "stub-id" and does not persist', async () => {
      expect(startPipeline).toBeDefined();
      const result = await (startPipeline as any)({}, {
        executionId: 'exec-1',
        pipelineName: 'demo',
        triggeredBy: 'manual',
        stagesJson: '[]',
      });
      expect(result).toBe('stub-id');
    });

    it('updatePipelineStatus returns null and does not patch', async () => {
      expect(updatePipelineStatus).toBeDefined();
      const result = await (updatePipelineStatus as any)({}, {
        executionId: 'exec-1',
        status: 'succeeded',
        stagesJson: '[]',
      });
      expect(result).toBeNull();
    });
  });
});

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
