import { describe, expect, it, mock, beforeEach } from 'bun:test';
import type { ConvexHttpClient } from 'convex/browser';
import {
  createProposal,
  getProposal,
  listPendingProposals,
  listProposalsByArtifact,
  resolveProposal,
  recordDecision,
  getDecisionByProposal,
  getDecisionByHashes,
  listDecisions,
  batchApplyProposals,
} from './reconciliationClient';

function createMockClient() {
  return {
    query: mock(),
    mutation: mock(),
  } as unknown as ConvexHttpClient;
}

describe('reconciliationProposals client', () => {
  let client: ConvexHttpClient;

  beforeEach(() => {
    client = createMockClient();
  });

  it('creates a proposal', async () => {
    (client.mutation as ReturnType<typeof mock>).mockResolvedValue({
      projectSlug: 'test-project',
      artifactType: 'task',
      artifactId: 'task-1',
      patchJson: '{"status":"done"}',
      sourceSide: 'convex',
      reason: 'Drift detected',
      status: 'pending',
      createdAt: Date.now(),
    });

    const result = await createProposal(client, {
      projectSlug: 'test-project',
      artifactType: 'task',
      artifactId: 'task-1',
      patchJson: '{"status":"done"}',
      sourceSide: 'convex',
      reason: 'Drift detected',
    });

    expect((result as any).status).toBe('pending');
    const calls = (client.mutation as ReturnType<typeof mock>).mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][1]).toMatchObject({
      projectSlug: 'test-project',
      artifactId: 'task-1',
    });
  });

  it('gets a proposal by id', async () => {
    (client.query as ReturnType<typeof mock>).mockResolvedValue({
      _id: 'prop-1',
      artifactId: 'task-1',
      status: 'pending',
    });

    const result = await getProposal(client, 'prop-1');

    expect(result).not.toBeNull();
    expect((result as any).artifactId).toBe('task-1');
    const calls = (client.query as ReturnType<typeof mock>).mock.calls;
    expect(calls[0][1]).toEqual({ id: 'prop-1' });
  });

  it('lists pending proposals', async () => {
    (client.query as ReturnType<typeof mock>).mockResolvedValue([
      { artifactId: 'task-1', status: 'pending' },
    ]);

    const result = await listPendingProposals(client, 'test-project', 10);

    expect(result.length).toBe(1);
    const calls = (client.query as ReturnType<typeof mock>).mock.calls;
    expect(calls[0][1]).toEqual({ projectSlug: 'test-project', limit: 10 });
  });

  it('lists proposals by artifact', async () => {
    (client.query as ReturnType<typeof mock>).mockResolvedValue([
      { artifactId: 'task-1', status: 'pending' },
    ]);

    const result = await listProposalsByArtifact(client, 'task', 'task-1');

    expect(result.length).toBe(1);
    const calls = (client.query as ReturnType<typeof mock>).mock.calls;
    expect(calls[0][1]).toEqual({ artifactType: 'task', artifactId: 'task-1' });
  });

  it('resolves a proposal', async () => {
    (client.mutation as ReturnType<typeof mock>).mockResolvedValue({
      _id: 'prop-1',
      status: 'applied',
      resolvedAt: Date.now(),
    });

    const result = await resolveProposal(client, 'prop-1', 'applied');

    expect((result as any).status).toBe('applied');
    const calls = (client.mutation as ReturnType<typeof mock>).mock.calls;
    expect(calls[0][1]).toEqual({ id: 'prop-1', status: 'applied' });
  });
});

describe('reconciliationDecisions client', () => {
  let client: ConvexHttpClient;

  beforeEach(() => {
    client = createMockClient();
  });

  it('records a decision', async () => {
    (client.mutation as ReturnType<typeof mock>).mockResolvedValue({
      proposalId: 'prop-1',
      decision: 'reject',
      reason: 'Wont fix',
      conductorHash: 'hash-a',
      canonicalHash: 'hash-b',
      createdAt: Date.now(),
    });

    const result = await recordDecision(client, {
      proposalId: 'prop-1',
      decision: 'reject',
      reason: 'Wont fix',
      conductorHash: 'hash-a',
      canonicalHash: 'hash-b',
    });

    expect((result as any).decision).toBe('reject');
    const calls = (client.mutation as ReturnType<typeof mock>).mock.calls;
    expect(calls[0][1]).toMatchObject({
      proposalId: 'prop-1',
      decision: 'reject',
    });
  });

  it('gets decision by proposal', async () => {
    (client.query as ReturnType<typeof mock>).mockResolvedValue({
      proposalId: 'prop-1',
      decision: 'apply',
    });

    const result = await getDecisionByProposal(client, 'prop-1');

    expect(result).not.toBeNull();
    expect((result as any).decision).toBe('apply');
    const calls = (client.query as ReturnType<typeof mock>).mock.calls;
    expect(calls[0][1]).toEqual({ proposalId: 'prop-1' });
  });

  it('gets decision by hashes', async () => {
    (client.query as ReturnType<typeof mock>).mockResolvedValue({
      conductorHash: 'hash-a',
      canonicalHash: 'hash-b',
      decision: 'reject',
    });

    const result = await getDecisionByHashes(client, 'hash-a', 'hash-b');

    expect(result).not.toBeNull();
    expect((result as any).decision).toBe('reject');
    const calls = (client.query as ReturnType<typeof mock>).mock.calls;
    expect(calls[0][1]).toEqual({ conductorHash: 'hash-a', canonicalHash: 'hash-b' });
  });

  it('lists decisions', async () => {
    (client.query as ReturnType<typeof mock>).mockResolvedValue([
      { proposalId: 'prop-1', decision: 'apply' },
    ]);

    const result = await listDecisions(client, 20);

    expect(result.length).toBe(1);
    const calls = (client.query as ReturnType<typeof mock>).mock.calls;
    expect(calls[0][1]).toEqual({ limit: 20 });
  });
});

describe('batchApplyProposals', () => {
  let client: ConvexHttpClient;

  beforeEach(() => {
    client = createMockClient();
  });

  it('applies proposals in batch', async () => {
    (client.mutation as ReturnType<typeof mock>).mockResolvedValue({
      created: 2,
      applied: 1,
      rejected: 0,
    });

    const result = await batchApplyProposals(client, [
      {
        projectSlug: 'p1',
        artifactType: 'task',
        artifactId: 'task-1',
        patchJson: '{"action":"keep_canonical"}',
        sourceSide: 'convex',
        reason: 'Auto-apply prefer_canonical',
        autoApply: true,
        conductorHash: 'c1',
        canonicalHash: 'k1',
      },
      {
        projectSlug: 'p1',
        artifactType: 'track',
        artifactId: 'track-1',
        patchJson: '{"action":"manual_review"}',
        sourceSide: 'convex',
        reason: 'Manual review required',
        autoApply: false,
        conductorHash: 'c2',
        canonicalHash: 'k2',
      },
    ]);

    expect(result.created).toBe(2);
    expect(result.applied).toBe(1);
    const calls = (client.mutation as ReturnType<typeof mock>).mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][1]).toMatchObject({
      proposals: [
        expect.objectContaining({ autoApply: true }),
        expect.objectContaining({ autoApply: false }),
      ],
    });
  });
});
