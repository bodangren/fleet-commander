import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { checkCircuit, recordCircuitSuccess, recordCircuitFailure } from './checkCircuit';

describe('checkCircuit stage', () => {
  const mockClient = {
    mutation: mock(async () => ({})),
    query: mock(async () => undefined as unknown),
  };

  beforeEach(() => {
    mockClient.mutation.mockReset();
    mockClient.query.mockReset();
  });

  it('returns allowed when agentId is undefined', async () => {
    const result = await checkCircuit(mockClient as any, undefined, 'p1', 't1');
    expect(result.allowed).toBe(true);
    expect(mockClient.mutation).not.toHaveBeenCalled();
  });

  it('returns allowed when circuit is closed', async () => {
    let callCount = 0;
    (mockClient.mutation as any).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return {}; // initCircuitBreaker
      return 'closed';
    });
    const result = await checkCircuit(mockClient as any, 'agent-1', 'p1', 't1');
    expect(result.allowed).toBe(true);
  });

  it('returns blocked when circuit is open', async () => {
    let callCount = 0;
    (mockClient.mutation as any).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return {};
      return 'open';
    });
    const result = await checkCircuit(mockClient as any, 'agent-1', 'p1', 't1');
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toContain('Circuit breaker open');
      expect(result.reason).toContain('agent-1');
    }
  });

  it('fails open on mutation error', async () => {
    (mockClient.mutation as any).mockImplementation(async () => {
      throw new Error('mutation failed');
    });
    const result = await checkCircuit(mockClient as any, 'agent-1', 'p1', 't1');
    expect(result.allowed).toBe(true);
  });
});

describe('recordCircuitSuccess', () => {
  it('calls recordCircuitSuccess mutation', async () => {
    const mockClient = {
      mutation: mock(async () => ({})),
    };
    await recordCircuitSuccess(mockClient as any, 'agent-1', 'p1', 't1');
    expect(mockClient.mutation).toHaveBeenCalledTimes(1);
  });

  it('swallows errors without throwing', async () => {
    const mockClient = {
      mutation: mock(async () => {
        throw new Error('Convex down');
      }),
    };
    await expect(
      recordCircuitSuccess(mockClient as any, 'agent-1', 'p1', 't1'),
    ).resolves.toBeUndefined();
  });
});

describe('recordCircuitFailure', () => {
  it('calls recordCircuitFailure mutation with failureType', async () => {
    const mockClient = {
      mutation: mock(async () => ({})),
    };
    await recordCircuitFailure(mockClient as any, 'agent-1', 'exit_code', 'p1', 't1');
    expect(mockClient.mutation).toHaveBeenCalledTimes(1);
  });

  it('swallows errors without throwing', async () => {
    const mockClient = {
      mutation: mock(async () => {
        throw new Error('Convex down');
      }),
    };
    await expect(
      recordCircuitFailure(mockClient as any, 'agent-1', 'timeout', 'p1', 't1'),
    ).resolves.toBeUndefined();
  });
});
