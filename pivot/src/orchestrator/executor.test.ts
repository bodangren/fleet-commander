import { describe, expect, it, mock } from 'bun:test';
import { executeCommand } from './executor';

/**
 * Factory for mock Opencode SDK client objects used in tests.
 * Returns client with session.create and session.prompt mocks, plus individual mock references.
 */
function createMockOpencodeClient(overrides?: {
  sessionCreate?: () => Promise<any>;
  sessionPrompt?: () => Promise<any>;
}) {
  const mockSessionCreate = mock(
    overrides?.sessionCreate ??
      (async () => ({ data: { id: 'sess-123' } })),
  );
  const mockSessionPrompt = mock(
    overrides?.sessionPrompt ??
      (async () => ({
        data: {
          info: {
            tokens: { input: 10, output: 5 },
          },
          parts: [{ type: 'text', text: 'Hello from SDK' }],
        },
      })),
  );
  return {
    client: {
      session: {
        create: mockSessionCreate,
        prompt: mockSessionPrompt,
      },
    } as any,
    mockSessionCreate,
    mockSessionPrompt,
  };
}

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
    const result = await executeCommand('echo', ['hello world'], 5000, 1);
    expect(result.tokensExceeded).toBe(true);
  });

  it('does not flag tokensExceeded when within limit', async () => {
    const result = await executeCommand('echo', ['hi'], 5000, 10);
    expect(result.tokensExceeded).toBe(false);
  });

  it('forwards cwd to Bun.spawn', async () => {
    const result = await executeCommand('pwd', [], 5000, undefined, '/tmp');
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('/tmp');
  });
});
