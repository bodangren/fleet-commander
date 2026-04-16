import { describe, expect, it, mock } from 'bun:test';
import { runIntegrityCheck } from './integrity';
import type { ReconciliationRules } from './rules';
import type { Divergence } from './engine';

describe('runIntegrityCheck', () => {
  it('proposes missing-canonical artifacts on startup', async () => {
    const divergences: Divergence[] = [
      {
        projectSlug: 'test-project',
        artifactType: 'track',
        artifactId: 'Missing Track',
        divergenceType: 'added',
        conductorHash: 'c1',
        canonicalHash: '',
        description: 'New track added: Missing Track',
      },
    ];

    const mockSweep = mock(() => Promise.resolve(divergences));

    const rules: ReconciliationRules = {
      artifactClasses: {
        trackMetadata: {
          canonicalSource: 'convex',
          exportTarget: 'conductor/tracks.md',
          importAllowed: [],
          conflictStrategy: 'manual',
        },
      },
    };

    const proposals = await runIntegrityCheck('test-project', '/tmp/project', rules, mockSweep);

    expect(mockSweep).toHaveBeenCalledWith('test-project', '/tmp/project');
    expect(proposals.length).toBe(1);
    expect(proposals[0]!.artifactId).toBe('Missing Track');
    expect(proposals[0]!.autoApply).toBe(false);
  });

  it('returns empty array when no divergences', async () => {
    const mockSweep = mock(() => Promise.resolve([]));

    const rules: ReconciliationRules = {
      artifactClasses: {
        trackMetadata: {
          canonicalSource: 'convex',
          exportTarget: 'conductor/tracks.md',
          importAllowed: [],
          conflictStrategy: 'manual',
        },
      },
    };

    const proposals = await runIntegrityCheck('test-project', '/tmp/project', rules, mockSweep);

    expect(proposals.length).toBe(0);
  });

  it('filters out unknown artifact classes', async () => {
    const divergences: Divergence[] = [
      {
        projectSlug: 'test-project',
        artifactType: 'task',
        artifactId: 'task-1',
        divergenceType: 'added',
        conductorHash: 'c1',
        canonicalHash: '',
        description: 'New task added',
      },
    ];

    const mockSweep = mock(() => Promise.resolve(divergences));

    const rules: ReconciliationRules = {
      artifactClasses: {},
    };

    const proposals = await runIntegrityCheck('test-project', '/tmp/project', rules, mockSweep);

    expect(proposals.length).toBe(0);
  });
});
