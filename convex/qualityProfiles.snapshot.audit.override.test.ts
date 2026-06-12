/**
 * Phase 2 Red tests for snapshot immutability, audit append, and override validation.
 *
 * 1. Snapshot must store the full serialized stage configuration, not just
 *    profileName/profileVersion.
 * 2. Two project selections must create two audit rows, not one patched row.
 * 3. setTaskOverride must reject a missing or empty reason.
 */

import { describe, expect, it } from 'bun:test';
import { createMockCtx } from './__fixtures__/foundation';
import {
  publishProfileVersionHandler,
  selectProjectProfileHandler,
  setTaskOverrideHandler,
  recordClaimedRunProfileHandler,
  getRunProfileSnapshotHandler,
  listProjectSelectionsHandler,
} from './qualityProfiles';

const NOW = 1_700_000_000_000;

const sampleProfileV1 = {
  name: 'strict',
  version: 1,
  kind: 'strict' as const,
  description: 'full strict profile v1',
  stages: [
    {
      kind: 'strategy' as const,
      policy: {
        required: true,
        applicability: { trackIsSetup: true },
        role: 'architect' as const,
        attempts: 1,
        timeoutMs: 300_000,
      },
    },
    {
      kind: 'red' as const,
      policy: {
        required: true,
        applicability: { always: true },
        role: 'executor' as const,
        attempts: 1,
        timeoutMs: 600_000,
        gate: {
          testCommand: 'bun --cwd pivot test src/foo.red.test.ts',
          maxTokens: 16_000,
          maxMs: 600_000,
          expectedFailingTests: 1,
          requireFailingTestCommitted: true,
          rejectNonTestSourceChanges: true,
        },
      },
    },
  ],
};

const sampleProjectSelection = {
  projectSlug: 'demo',
  profileName: 'strict',
  profileVersion: 1,
  actor: 'user:abc',
};

const sampleTaskOverride = {
  projectSlug: 'demo',
  taskKey: 'task-7',
  profileName: 'strict',
  profileVersion: 1,
  reason: 'pre-release freeze',
  actor: 'user:abc',
};

describe('recordClaimedRunProfileHandler — full snapshot storage', () => {
  it('stores the full serialized stage configuration in the snapshot', async () => {
    const ctx = createMockCtx();
    await publishProfileVersionHandler(ctx, { profile: sampleProfileV1, actor: 'user:a', now: NOW });
    await selectProjectProfileHandler(ctx, {
      selection: sampleProjectSelection,
      now: NOW + 5,
    });

    const result = await recordClaimedRunProfileHandler(ctx, {
      projectSlug: 'demo',
      taskKey: 'task-9',
      runId: 'run-1',
      now: NOW + 10,
    });

    // The snapshot must include the full stage configuration, not just name/version
    expect(result.profileSnapshot).toBeDefined();
    expect(result.profileSnapshot).not.toBeNull();
    const snapshot = result.profileSnapshot as Record<string, unknown>;
    expect(snapshot.stages).toBeDefined();
    expect(Array.isArray(snapshot.stages)).toBe(true);
    expect((snapshot.stages as unknown[]).length).toBe(sampleProfileV1.stages.length);
  });
});

describe('selectProjectProfileHandler — append-only audit', () => {
  it('creates two audit rows when selection changes, not one patched row', async () => {
    const ctx = createMockCtx();
    await publishProfileVersionHandler(ctx, { profile: sampleProfileV1, actor: 'user:a', now: NOW });
    const sampleProfileV2 = { ...sampleProfileV1, version: 2, description: 'v2' };
    await publishProfileVersionHandler(ctx, { profile: sampleProfileV2, actor: 'user:a', now: NOW + 1 });

    await selectProjectProfileHandler(ctx, {
      selection: sampleProjectSelection,
      now: NOW + 5,
    });
    await selectProjectProfileHandler(ctx, {
      selection: { ...sampleProjectSelection, profileVersion: 2 },
      now: NOW + 10,
    });

    const list = await listProjectSelectionsHandler(ctx, { projectSlug: 'demo' });
    // Append-only: two rows, not one patched row
    expect(list.length).toBe(2);
    expect(list[0].profileVersion).toBe(1);
    expect(list[1].profileVersion).toBe(2);
  });
});

describe('setTaskOverrideHandler — reason validation', () => {
  it('rejects a missing reason (empty string)', async () => {
    const ctx = createMockCtx();
    await publishProfileVersionHandler(ctx, { profile: sampleProfileV1, actor: 'user:a', now: NOW });
    await expect(
      setTaskOverrideHandler(ctx, {
        override: { ...sampleTaskOverride, reason: '' },
        now: NOW,
      }),
    ).rejects.toThrow();
  });

  it('rejects a whitespace-only reason', async () => {
    const ctx = createMockCtx();
    await publishProfileVersionHandler(ctx, { profile: sampleProfileV1, actor: 'user:a', now: NOW });
    await expect(
      setTaskOverrideHandler(ctx, {
        override: { ...sampleTaskOverride, reason: '   ' },
        now: NOW,
      }),
    ).rejects.toThrow();
  });

  it('accepts a valid reason and actor', async () => {
    const ctx = createMockCtx();
    await publishProfileVersionHandler(ctx, { profile: sampleProfileV1, actor: 'user:a', now: NOW });
    const result = await setTaskOverrideHandler(ctx, {
      override: sampleTaskOverride,
      now: NOW,
    });
    expect(result.reason).toBe('pre-release freeze');
    expect(result.actor).toBe('user:abc');
  });
});
