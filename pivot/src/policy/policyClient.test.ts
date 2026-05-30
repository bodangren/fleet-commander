import { describe, expect, it, mock, beforeEach } from 'bun:test';
import type { ConvexHttpClient } from 'convex/browser';
import {
  getPolicyWeights,
  listPolicyWeights,
  upsertPolicyWeights,
  createScoreAudit,
  listScoreAuditByTask,
  listRecentScoreAudit,
} from './policyClient';

/**
 * Creates mock ConvexHttpClient for testing policy client functions.
 * @returns Mocked ConvexHttpClient with query and mutation
 */
function createMockClient() {
  return {
    query: mock(),
    mutation: mock(),
  } as unknown as ConvexHttpClient;
}

describe('policyWeights client', () => {
  let client: ConvexHttpClient;

  beforeEach(() => {
    client = createMockClient();
  });

  it('gets policy weights by name', async () => {
    (client.query as ReturnType<typeof mock>).mockResolvedValue({
      name: 'default',
      weightsJson: '{}',
      version: 1,
      createdAt: Date.now(),
    });

    const result = await getPolicyWeights(client, 'default');

    expect(result).not.toBeNull();
    expect((result as any).version).toBe(1);
    const calls = (client.query as ReturnType<typeof mock>).mock.calls;
    expect(calls[0][1]).toEqual({ name: 'default' });
  });

  it('lists policy weights', async () => {
    (client.query as ReturnType<typeof mock>).mockResolvedValue([
      { name: 'default', weightsJson: '{}', version: 2, createdAt: Date.now() },
    ]);

    const result = await listPolicyWeights(client, 10);

    expect(result.length).toBe(1);
    const calls = (client.query as ReturnType<typeof mock>).mock.calls;
    expect(calls[0][1]).toEqual({ limit: 10 });
  });

  it('upserts policy weights and bumps version', async () => {
    (client.mutation as ReturnType<typeof mock>).mockResolvedValue({
      name: 'default',
      weightsJson: '{"priorityWeight":2}',
      version: 3,
      createdAt: Date.now(),
    });

    const result = await upsertPolicyWeights(client, {
      name: 'default',
      weightsJson: '{"priorityWeight":2}',
    });

    expect((result as any).version).toBe(3);
    const calls = (client.mutation as ReturnType<typeof mock>).mock.calls;
    expect(calls[0][1]).toMatchObject({
      name: 'default',
      weightsJson: '{"priorityWeight":2}',
    });
  });
});

describe('scoreAudit client', () => {
  let client: ConvexHttpClient;

  beforeEach(() => {
    client = createMockClient();
  });

  it('creates a score audit row', async () => {
    (client.mutation as ReturnType<typeof mock>).mockResolvedValue({
      chosenTaskId: 'task-1',
      candidatesJson: '[]',
      breakdownJson: '{}',
      justification: 'best score',
      weightsVersion: 1,
      llmTieBreak: false,
      dispatchedAt: Date.now(),
    });

    const result = await createScoreAudit(client, {
      chosenTaskId: 'task-1',
      candidatesJson: '[]',
      breakdownJson: '{}',
      justification: 'best score',
      weightsVersion: 1,
      llmTieBreak: false,
    });

    expect((result as any).chosenTaskId).toBe('task-1');
    const calls = (client.mutation as ReturnType<typeof mock>).mock.calls;
    expect(calls[0][1]).toMatchObject({ chosenTaskId: 'task-1' });
  });

  it('lists score audits by task', async () => {
    (client.query as ReturnType<typeof mock>).mockResolvedValue([
      { chosenTaskId: 'task-1', justification: 'best score' },
    ]);

    const result = await listScoreAuditByTask(client, 'task-1', 10);

    expect(result.length).toBe(1);
    const calls = (client.query as ReturnType<typeof mock>).mock.calls;
    expect(calls[0][1]).toEqual({ chosenTaskId: 'task-1', limit: 10 });
  });

  it('lists recent score audits', async () => {
    (client.query as ReturnType<typeof mock>).mockResolvedValue([
      { chosenTaskId: 'task-1', justification: 'best score' },
    ]);

    const result = await listRecentScoreAudit(client, 20);

    expect(result.length).toBe(1);
    const calls = (client.query as ReturnType<typeof mock>).mock.calls;
    expect(calls[0][1]).toEqual({ limit: 20 });
  });
});
