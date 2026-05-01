import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { resolveAgentCommand } from './resolver';

describe('resolveAgentCommand', () => {
  const mockClient = {
    query: mock(async () => []),
  };

  beforeEach(() => {
    mockClient.query.mockReset();
  });

  it('returns echo for empty agent tag', async () => {
    const result = await resolveAgentCommand(mockClient as any, '', 'test');
    expect(result.command).toBe('echo');
    expect(result.args).toEqual(['test']);
  });

  it('returns echo when agent not found', async () => {
    mockClient.query.mockImplementation(async () => []);
    const result = await resolveAgentCommand(mockClient as any, 'missing', 'test');
    expect(result.command).toBe('echo');
  });

  it('returns echo when agent model has no slash', async () => {
    mockClient.query.mockImplementation(async () => {
      return [
        { name: 'bad-agent', model: 'noharness' },
      ];
    });
    const result = await resolveAgentCommand(mockClient as any, 'bad-agent', 'test');
    expect(result.command).toBe('echo');
  });

  it('returns echo when harness not found', async () => {
    mockClient.query.mockImplementation(async () => {
      return [
        { name: 'my-agent', model: 'missing/model' },
        { name: 'other', commandTemplate: 'echo {prompt}' },
      ];
    });
    const result = await resolveAgentCommand(mockClient as any, 'my-agent', 'test');
    expect(result.command).toBe('echo');
  });

  it('resolves command correctly with valid agent/harness', async () => {
    // Both queries return same data, so we include both agents and harnesses
    mockClient.query.mockImplementation(async () => {
      return [
        { name: 'my-agent', model: 'test/gpt4' },
        { name: 'test', commandTemplate: 'test --model {model} --prompt "{prompt}"' },
      ];
    });
    const result = await resolveAgentCommand(mockClient as any, 'my-agent', 'hello world');
    expect(result.command).toBe('test');
    expect(result.args).toContain('--model');
    expect(result.args).toContain('gpt4');
  });

  it('strips binary from args when it matches harness name', async () => {
    mockClient.query.mockImplementation(async () => {
      return [
        { name: 'my-agent', model: 'opencode/claude' },
        { name: 'opencode', commandTemplate: 'opencode --model {model} "{prompt}"' },
      ];
    });
    const result = await resolveAgentCommand(mockClient as any, 'my-agent', 'test');
    expect(result.command).toBe('opencode');
    expect(result.args[0]).toBe('--model');
  });
});
