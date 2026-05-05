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

  it('returns empty config when harness not found', async () => {
    mockClient.query.mockImplementation(async () => {
      return [
        { name: 'my-agent', model: 'missing/model' },
        { name: 'other', commandTemplate: 'echo {prompt}' },
      ];
    });
    const result = await resolveAgentCommand(mockClient as any, 'my-agent');
    expect(result.providerId).toBe('');
  });

  it('resolves config correctly with valid agent/harness', async () => {
    mockClient.query.mockImplementation(async () => {
      return [
        { name: 'my-agent', model: 'test/gpt4' },
        { name: 'test', commandTemplate: 'test --model {model} --prompt "{prompt}"' },
      ];
    });
    const result = await resolveAgentCommand(mockClient as any, 'my-agent');
    expect(result.providerId).toBe('test');
    expect(result.modelId).toBe('gpt4');
    expect(result.agent).toBe('my-agent');
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
