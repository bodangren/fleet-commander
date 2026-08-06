import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { resolveAgentCommand } from './resolver';

describe('resolveAgentCommand', () => {
  const mockClient = {
    query: mock(async (): Promise<any[]> => []),
  };

  beforeEach(() => {
    mockClient.query.mockReset();
  });

  it('returns empty config for empty agent tag', async () => {
    const result = await resolveAgentCommand(mockClient as any, '');
    expect(result.providerId).toBe('');
    expect(result.modelId).toBe('');
  });

  it('returns empty config when agent not found', async () => {
    mockClient.query.mockImplementation(async () => []);
    const result = await resolveAgentCommand(mockClient as any, 'missing');
    expect(result.providerId).toBe('');
  });

  it('returns empty config when agent model has no slash', async () => {
    mockClient.query.mockImplementation(async () => {
      return [
        { name: 'bad-agent', model: 'noharness' },
      ];
    });
    const result = await resolveAgentCommand(mockClient as any, 'bad-agent');
    expect(result.providerId).toBe('');
  });

  it('resolves without any harness catalog row present', async () => {
    // The harnesses table is gone and listHarnesses returns []. Resolution
    // must come from agent.model alone, or nothing dispatches. See ADR-004.
    mockClient.query.mockImplementation(async () => {
      return [{ name: 'my-agent', model: 'missing/model' }];
    });
    const result = await resolveAgentCommand(mockClient as any, 'my-agent');
    expect(result.providerId).toBe('missing');
    expect(result.modelId).toBe('model');
  });

  it('resolves config correctly from the agent model reference', async () => {
    mockClient.query.mockImplementation(async () => {
      return [{ name: 'my-agent', model: 'test/gpt4' }];
    });
    const result = await resolveAgentCommand(mockClient as any, 'my-agent');
    expect(result.providerId).toBe('test');
    expect(result.modelId).toBe('gpt4');
    expect(result.agent).toBe('my-agent');
  });

  it('keeps only the first slash as the separator, so model ids may contain slashes', async () => {
    mockClient.query.mockImplementation(async () => {
      return [{ name: 'my-agent', model: 'openrouter/moonshotai/kimi-k2' }];
    });
    const result = await resolveAgentCommand(mockClient as any, 'my-agent');
    expect(result.providerId).toBe('openrouter');
    expect(result.modelId).toBe('moonshotai/kimi-k2');
  });

  it('returns empty config when the provider half is blank', async () => {
    mockClient.query.mockImplementation(async () => {
      return [{ name: 'my-agent', model: '/gpt4' }];
    });
    expect((await resolveAgentCommand(mockClient as any, 'my-agent')).providerId).toBe('');
  });

  it('returns empty config when the model half is blank', async () => {
    mockClient.query.mockImplementation(async () => {
      return [{ name: 'my-agent', model: 'test/' }];
    });
    expect((await resolveAgentCommand(mockClient as any, 'my-agent')).providerId).toBe('');
  });

  it('queries only the agent catalog', async () => {
    mockClient.query.mockImplementation(async () => {
      return [{ name: 'my-agent', model: 'test/gpt4' }];
    });
    await resolveAgentCommand(mockClient as any, 'my-agent');
    expect(mockClient.query).toHaveBeenCalledTimes(1);
  });

  it('passes through sessionId from options', async () => {
    mockClient.query.mockImplementation(async () => {
      return [
        { name: 'my-agent', model: 'opencode/claude' },
        { name: 'opencode', commandTemplate: 'opencode --model {model} "{prompt}"' },
      ];
    });
    const result = await resolveAgentCommand(
      mockClient as any,
      'my-agent',
      { sessionId: 'sess-abc' },
    );
    expect(result.providerId).toBe('opencode');
    expect(result.modelId).toBe('claude');
    expect(result.sessionId).toBe('sess-abc');
  });
});
