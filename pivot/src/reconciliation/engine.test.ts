import { describe, expect, it } from 'bun:test';
import { proposePatches, filterRejectedProposals, shouldAutoApply, type ReconciliationProposal, type Divergence } from './engine';
import type { ReconciliationRules } from './rules';

describe('proposePatches', () => {
  const rules: ReconciliationRules = {
    artifactClasses: {
      task: {
        canonicalSource: 'convex',
        exportTarget: 'conductor/tracks/*/plan.md',
        importAllowed: ['status', 'priority', 'assignee'],
        conflictStrategy: 'prefer_canonical',
      },
      trackMetadata: {
        canonicalSource: 'convex',
        exportTarget: 'conductor/tracks.md',
        importAllowed: [],
        conflictStrategy: 'manual',
      },
      issue: {
        canonicalSource: 'markdown',
        exportTarget: null,
        importAllowed: ['title', 'description', 'labels'],
        conflictStrategy: 'prefer_export',
      },
      plan: {
        canonicalSource: 'markdown',
        exportTarget: 'conductor/tracks/*/plan.md',
        importAllowed: [],
        conflictStrategy: 'reject',
      },
    },
  };

  it('prefers canonical for task modification', () => {
    const events: Divergence[] = [{
      projectSlug: 'p1',
      artifactType: 'task',
      artifactId: 'task-1',
      divergenceType: 'modified',
      conductorHash: 'c1',
      canonicalHash: 'k1',
      description: 'Task modified',
    }];

    const proposals = proposePatches(events, rules);

    expect(proposals.length).toBe(1);
    expect(proposals[0]!.autoApply).toBe(true);
    expect(proposals[0]!.sourceSide).toBe('convex');
    expect(proposals[0]!.reason).toContain('prefer_canonical');
    const patch = JSON.parse(proposals[0]!.patchJson);
    expect(patch.action).toBe('keep_canonical');
  });

  it('prefers export for issue modification', () => {
    const events: Divergence[] = [{
      projectSlug: 'p1',
      artifactType: 'issue',
      artifactId: 'issue-1',
      divergenceType: 'modified',
      conductorHash: 'c1',
      canonicalHash: 'k1',
      description: 'Issue modified',
    }];

    const proposals = proposePatches(events, rules);

    expect(proposals.length).toBe(1);
    expect(proposals[0]!.autoApply).toBe(true);
    expect(proposals[0]!.sourceSide).toBe('convex');
    expect(proposals[0]!.reason).toContain('prefer_export');
    const patch = JSON.parse(proposals[0]!.patchJson);
    expect(patch.action).toBe('keep_conductor');
  });

  it('queues manual strategy for review', () => {
    const events: Divergence[] = [{
      projectSlug: 'p1',
      artifactType: 'track',
      artifactId: 'track-1',
      divergenceType: 'modified',
      conductorHash: 'c1',
      canonicalHash: 'k1',
      description: 'Track modified',
    }];

    const proposals = proposePatches(events, rules);

    expect(proposals.length).toBe(1);
    expect(proposals[0]!.autoApply).toBe(false);
    expect(proposals[0]!.sourceSide).toBe('convex');
    expect(proposals[0]!.reason).toContain('manual');
    const patch = JSON.parse(proposals[0]!.patchJson);
    expect(patch.action).toBe('manual_review');
  });

  it('rejects reject strategy with no proposal', () => {
    const events: Divergence[] = [{
      projectSlug: 'p1',
      artifactType: 'task',
      artifactId: 'task-1',
      divergenceType: 'added',
      conductorHash: 'c1',
      canonicalHash: '',
      description: 'Plan added',
    }];

    const proposals = proposePatches(events, rules);

    // The event maps to 'plan' artifact class based on some heuristic, 
    // but for simplicity we use task here with reject strategy
    // Actually the artifactType in the event must match an artifact class.
    // 'plan' isn't an artifactType in Divergence (track/task/issue).
    // So we'll test with a custom rule.
    const rejectRules: ReconciliationRules = {
      artifactClasses: {
        task: {
          canonicalSource: 'convex',
          exportTarget: null,
          importAllowed: [],
          conflictStrategy: 'reject',
        },
      },
    };

    const rejectProposals = proposePatches(events, rejectRules);
    expect(rejectProposals.length).toBe(0);
  });

  it('handles added divergence with prefer_canonical', () => {
    const events: Divergence[] = [{
      projectSlug: 'p1',
      artifactType: 'task',
      artifactId: 'task-new',
      divergenceType: 'added',
      conductorHash: 'c1',
      canonicalHash: '',
      description: 'New task added',
    }];

    const proposals = proposePatches(events, rules);

    expect(proposals.length).toBe(1);
    expect(proposals[0]!.autoApply).toBe(true);
    const patch = JSON.parse(proposals[0]!.patchJson);
    expect(patch.action).toBe('keep_canonical');
    expect(patch.divergenceType).toBe('added');
  });

  it('handles deleted divergence with prefer_export', () => {
    const events: Divergence[] = [{
      projectSlug: 'p1',
      artifactType: 'issue',
      artifactId: 'issue-del',
      divergenceType: 'deleted',
      conductorHash: '',
      canonicalHash: 'k1',
      description: 'Issue deleted from conductor',
    }];

    const proposals = proposePatches(events, rules);

    expect(proposals.length).toBe(1);
    expect(proposals[0]!.autoApply).toBe(true);
    const patch = JSON.parse(proposals[0]!.patchJson);
    expect(patch.action).toBe('keep_conductor');
    expect(patch.divergenceType).toBe('deleted');
  });

  it('skips unknown artifact classes', () => {
    const events: Divergence[] = [{
      projectSlug: 'p1',
      artifactType: 'task',
      artifactId: 'task-1',
      divergenceType: 'modified',
      conductorHash: 'c1',
      canonicalHash: 'k1',
      description: 'Task modified',
    }];

    const emptyRules: ReconciliationRules = { artifactClasses: {} };
    const proposals = proposePatches(events, emptyRules);
    expect(proposals.length).toBe(0);
  });
});

describe('shouldAutoApply', () => {
  it('returns true for prefer_canonical', () => {
    const proposal: ReconciliationProposal = {
      projectSlug: 'p1',
      artifactType: 'task',
      artifactId: 'task-1',
      divergenceType: 'modified',
      conductorHash: 'c1',
      canonicalHash: 'k1',
      patchJson: '{}',
      sourceSide: 'convex',
      reason: '',
      autoApply: false,
    };
    expect(shouldAutoApply(proposal, 'prefer_canonical')).toBe(true);
  });

  it('returns true for prefer_export', () => {
    const proposal: ReconciliationProposal = {
      projectSlug: 'p1',
      artifactType: 'issue',
      artifactId: 'issue-1',
      divergenceType: 'modified',
      conductorHash: 'c1',
      canonicalHash: 'k1',
      patchJson: '{}',
      sourceSide: 'markdown',
      reason: '',
      autoApply: false,
    };
    expect(shouldAutoApply(proposal, 'prefer_export')).toBe(true);
  });

  it('returns false for manual', () => {
    const proposal: ReconciliationProposal = {
      projectSlug: 'p1',
      artifactType: 'track',
      artifactId: 'track-1',
      divergenceType: 'modified',
      conductorHash: 'c1',
      canonicalHash: 'k1',
      patchJson: '{}',
      sourceSide: 'convex',
      reason: '',
      autoApply: false,
    };
    expect(shouldAutoApply(proposal, 'manual')).toBe(false);
  });

  it('returns false for reject', () => {
    const proposal: ReconciliationProposal = {
      projectSlug: 'p1',
      artifactType: 'task',
      artifactId: 'task-1',
      divergenceType: 'modified',
      conductorHash: 'c1',
      canonicalHash: 'k1',
      patchJson: '{}',
      sourceSide: 'convex',
      reason: '',
      autoApply: false,
    };
    expect(shouldAutoApply(proposal, 'reject')).toBe(false);
  });
});

describe('filterRejectedProposals', () => {
  it('removes proposals with matching rejected hash pair', () => {
    const proposals: ReconciliationProposal[] = [{
      projectSlug: 'p1',
      artifactType: 'task',
      artifactId: 'task-1',
      divergenceType: 'modified',
      conductorHash: 'c1',
      canonicalHash: 'k1',
      patchJson: '{}',
      sourceSide: 'convex',
      reason: '',
      autoApply: true,
    }];

    const decisions = [{ conductorHash: 'c1', canonicalHash: 'k1' }];
    const filtered = filterRejectedProposals(proposals, decisions);
    expect(filtered.length).toBe(0);
  });

  it('keeps proposals with different hash pairs', () => {
    const proposals: ReconciliationProposal[] = [{
      projectSlug: 'p1',
      artifactType: 'task',
      artifactId: 'task-1',
      divergenceType: 'modified',
      conductorHash: 'c1',
      canonicalHash: 'k1',
      patchJson: '{}',
      sourceSide: 'convex',
      reason: '',
      autoApply: true,
    }];

    const decisions = [{ conductorHash: 'c2', canonicalHash: 'k2' }];
    const filtered = filterRejectedProposals(proposals, decisions);
    expect(filtered.length).toBe(1);
  });

  it('keeps proposals when decision was apply', () => {
    const proposals: ReconciliationProposal[] = [{
      projectSlug: 'p1',
      artifactType: 'task',
      artifactId: 'task-1',
      divergenceType: 'modified',
      conductorHash: 'c1',
      canonicalHash: 'k1',
      patchJson: '{}',
      sourceSide: 'convex',
      reason: '',
      autoApply: true,
    }];

    const decisions = [
      { conductorHash: 'c1', canonicalHash: 'k1', decision: 'apply' as const },
    ];
    const filtered = filterRejectedProposals(proposals, decisions);
    expect(filtered.length).toBe(1);
  });

  it('removes proposals when decision was reject', () => {
    const proposals: ReconciliationProposal[] = [{
      projectSlug: 'p1',
      artifactType: 'task',
      artifactId: 'task-1',
      divergenceType: 'modified',
      conductorHash: 'c1',
      canonicalHash: 'k1',
      patchJson: '{}',
      sourceSide: 'convex',
      reason: '',
      autoApply: true,
    }];

    const decisions = [
      { conductorHash: 'c1', canonicalHash: 'k1', decision: 'reject' as const },
    ];
    const filtered = filterRejectedProposals(proposals, decisions);
    expect(filtered.length).toBe(0);
  });
});
