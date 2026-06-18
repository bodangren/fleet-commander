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
