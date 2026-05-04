import { describe, expect, it, mock } from 'bun:test';
import { executeCommand, executeTask, parseSessionId } from './executor';
import type { ExecutionResult } from './types';

describe('executeCommand', () => {
  it('executes echo command successfully', async () => {
    const result = await executeCommand('echo', ['hello'], 5000);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('hello');
    expect(result.timedOut).toBe(false);
  });

  it('handles command that does not exist', async () => {
    try {
      await executeCommand('nonexistent_command_xyz', [], 1000);
      expect(true).toBe(false); // Should not reach here
    } catch (err) {
      expect(err).toBeDefined();
    }
  });

  it('respects timeout', async () => {
    const result = await executeCommand('sleep', ['2'], 100);
    expect(result.timedOut).toBe(true);
  });

  it('returns tokensExceeded when output exceeds maxTokens', async () => {
    // Generate output that exceeds 1 token (~4 chars)
    const result = await executeCommand('echo', ['hello world'], 5000, 1);
    expect(result.tokensExceeded).toBe(true);
  });

  it('does not flag tokensExceeded when within limit', async () => {
    const result = await executeCommand('echo', ['hi'], 5000, 10);
    expect(result.tokensExceeded).toBe(false);
  });
});

describe('executeTask', () => {
  const mockClient = {
    query: mock(async () => []),
  };

  it('returns failure when agent cannot be resolved', async () => {
    mockClient.query.mockReset();
    mockClient.query.mockImplementation(async () => []);

    const result = await executeTask(mockClient as any, 'unknown-agent', 'test prompt', 'task-1', 1000);

    expect(result.status).toBe('failed');
    expect(result.error).toContain('could not be resolved');
  });
});

describe('parseSessionId', () => {
  it('parses session_id from JSON lines', () => {
    const output = 'Some text\n{"session_id": "sess-abc-123"}\nMore text';
    expect(parseSessionId(output)).toBe('sess-abc-123');
  });

  it('parses sessionId (camelCase) from JSON lines', () => {
    const output = '{"sessionId": "sess-xyz-789"}';
    expect(parseSessionId(output)).toBe('sess-xyz-789');
  });

  it('returns undefined when no session_id in output', () => {
    const output = 'Just plain text output\nNo JSON here';
    expect(parseSessionId(output)).toBeUndefined();
  });

  it('returns undefined for empty output', () => {
    expect(parseSessionId('')).toBeUndefined();
  });

  it('skips invalid JSON lines', () => {
    const output = '{invalid json}\n{"session_id": "valid-sess"}';
    expect(parseSessionId(output)).toBe('valid-sess');
  });

  it('ignores empty session_id values', () => {
    const output = '{"session_id": ""}';
    expect(parseSessionId(output)).toBeUndefined();
  });

  it('prefers first valid session_id found', () => {
    const output = '{"session_id": "first"}\n{"session_id": "second"}';
    expect(parseSessionId(output)).toBe('first');
  });
});
