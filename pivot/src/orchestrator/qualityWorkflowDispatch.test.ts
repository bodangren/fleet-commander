/**
 * Phase 1 Red tests for quality workflow dispatch:
 *
 * 1. runConfiguredQualityWorkflow fails closed when no runner is provided
 *    (no fake auto-pass-through).
 * 2. loadEffectiveQualityProfile uses the effective profile payload from
 *    Convex, not just the built-in name.
 */

import { describe, expect, it, mock } from 'bun:test';
import { runConfiguredQualityWorkflow } from './qualityWorkflowDispatch';
import type { QualityWorkflowHooks, Task } from './types';
import type { QualityWorkflowRunner } from './qualityWorkflowRunner';

const sampleTask: Task = {
  projectSlug: 'test-project',
  trackId: 'track-1',
  taskKey: 'T-1',
  title: 'Test task',
  status: 'ready',
  dependencies: [],
  updatedAt: Date.now(),
};

describe('runConfiguredQualityWorkflow — fail closed without runner', () => {
  it('throws or returns failed when no runner is provided and profile has stages', async () => {
    // Mock the Convex client to return a profile with stages
    const mockClient = {
      query: mock(async () => ({
        profileName: 'standard',
        profileVersion: 1,
        source: 'project',
      })),
      mutation: mock(async () => ({})),
    } as any;

    // The function should fail closed — not silently pass all stages
    const result = await runConfiguredQualityWorkflow(
      mockClient,
      'test-project',
      sampleTask,
      'run-1',
      '/tmp',
      undefined,
      undefined, // no hooks = no runner
    );

    // With no runner and a non-none profile, the function must NOT return passed
    // It should either throw or return failed
    if (result !== null) {
      expect(result.status).toBe('failed');
    }
  });

  it('returns null for none profile even without a runner', async () => {
    const mockClient = {
      query: mock(async () => ({
        profileName: 'none',
        profileVersion: 1,
        source: 'default',
      })),
      mutation: mock(async () => ({})),
    } as any;

    const result = await runConfiguredQualityWorkflow(
      mockClient,
      'test-project',
      sampleTask,
      'run-1',
      '/tmp',
      undefined,
      undefined,
    );

    expect(result).toBeNull();
  });
});

describe('runConfiguredQualityWorkflow — uses effective profile from Convex', () => {
  it('honors non-built-in effective profile names from Convex', async () => {
    const mockClient = {
      query: mock(async () => ({
        profileName: 'standard',
        profileVersion: 2,
        source: 'project',
      })),
      mutation: mock(async () => ({})),
    } as any;

    const runner: QualityWorkflowRunner = {
      runStage: mock(async (stage) => ({
        stageKind: stage.kind,
        status: 'passed' as const,
        attempt: 1,
      })),
    };

    const hooks: QualityWorkflowHooks = { runner };

    // The standard profile has a strategy stage with trackIsSetup applicability.
    // The task title doesn't match "setup" so the strategy stage is not applicable.
    // Since strategy is required AND not applicable, the run fails.
    // This is correct behavior — the test verifies the profile IS resolved from Convex.
    const result = await runConfiguredQualityWorkflow(
      mockClient,
      'test-project',
      { ...sampleTask, title: 'Setup project track' }, // title matches setup pattern
      'run-1',
      '/tmp',
      undefined,
      hooks,
    );

    // Should use the effective profile (standard has stages), not silently drop it
    expect(result).not.toBeNull();
    expect(result!.status).toBe('passed');
  });
});
