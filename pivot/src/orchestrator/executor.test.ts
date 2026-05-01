import { describe, expect, it, mock } from 'bun:test';
import { executeCommand, executeTask } from './executor';
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
