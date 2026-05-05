import { describe, expect, it, mock } from 'bun:test';
import { executeCommand, executeTask } from './executor';

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

  it('enforces combined stdout+stderr token budget', async () => {
    const result = await executeCommand(
      'bash',
      ['-c', 'echo -n "hello hello hello"; echo -n "world world world" >&2'],
      5000,
      3,
    );
    expect(result.tokensExceeded).toBe(true);
  });
});

describe('executeTask', () => {
  const mockClient = {
    query: mock(async (): Promise<any[]> => []),
  };

  it('returns failure when agent cannot be resolved', async () => {
    mockClient.query.mockReset();
    mockClient.query.mockImplementation(async () => []);

    const { client } = createMockOpencodeClient();
    const result = await executeTask(
      mockClient as any,
      'unknown-agent',
      'test prompt',
      'task-1',
      1000,
      undefined,
      undefined,
      client,
    );

    expect(result.status).toBe('failed');
    expect(result.error).toContain('could not be resolved');
  });

  it('creates a new session when no sessionId is provided', async () => {
    mockClient.query.mockImplementation(async () => {
      return [
        { name: 'my-agent', model: 'test/gpt4' },
        { name: 'test', commandTemplate: 'test --model {model} --prompt "{prompt}"' },
      ];
    });

    const { client, mockSessionCreate, mockSessionPrompt } = createMockOpencodeClient();
    const result = await executeTask(
      mockClient as any,
      'my-agent',
      'hello',
      'task-2',
      5000,
      undefined,
      undefined,
      client,
    );

    expect(mockSessionCreate).toHaveBeenCalled();
    expect(mockSessionPrompt).toHaveBeenCalled();
    expect(result.status).toBe('succeeded');
    expect(result.output).toBe('Hello from SDK');
    expect(result.sessionId).toBe('sess-123');
  });

  it('reuses existing sessionId when provided in resolveOptions', async () => {
    mockClient.query.mockImplementation(async () => {
      return [
        { name: 'my-agent', model: 'test/gpt4' },
        { name: 'test', commandTemplate: 'test --model {model} --prompt "{prompt}"' },
      ];
    });

    const { client, mockSessionCreate } = createMockOpencodeClient();
    const result = await executeTask(
      mockClient as any,
      'my-agent',
      'hello',
      'task-3',
      5000,
      undefined,
      { sessionId: 'existing-sess' },
      client,
    );

    expect(mockSessionCreate).not.toHaveBeenCalled();
    expect(result.status).toBe('succeeded');
    expect(result.sessionId).toBe('existing-sess');
  });

  it('maps SDK timeout error to failureType timeout', async () => {
    mockClient.query.mockImplementation(async () => {
      return [
        { name: 'my-agent', model: 'test/gpt4' },
        { name: 'test', commandTemplate: 'test --model {model} --prompt "{prompt}"' },
      ];
    });

    const { client } = createMockOpencodeClient({
      sessionPrompt: async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return { data: { info: {}, parts: [] } };
      },
    });

    const result = await executeTask(
      mockClient as any,
      'my-agent',
      'hello',
      'task-4',
      100,
      undefined,
      undefined,
      client,
    );

    expect(result.status).toBe('failed');
    expect(result.failureType).toBe('timeout');
  });

  it('maps SDK MessageOutputLengthError to tokens_exceeded', async () => {
    mockClient.query.mockImplementation(async () => {
      return [
        { name: 'my-agent', model: 'test/gpt4' },
        { name: 'test', commandTemplate: 'test --model {model} --prompt "{prompt}"' },
      ];
    });

    const { client } = createMockOpencodeClient({
      sessionPrompt: async () => ({
        data: {
          info: {
            error: { name: 'MessageOutputLengthError', data: { message: 'too long' } },
            tokens: { input: 100, output: 200 },
          },
          parts: [{ type: 'text', text: 'truncated' }],
        },
      }),
    });

    const result = await executeTask(
      mockClient as any,
      'my-agent',
      'hello',
      'task-5',
      5000,
      undefined,
      undefined,
      client,
    );

    expect(result.status).toBe('failed');
    expect(result.failureType).toBe('tokens_exceeded');
  });

  it('enforces maxTokens post-hoc when response exceeds limit', async () => {
    mockClient.query.mockImplementation(async () => {
      return [
        { name: 'my-agent', model: 'test/gpt4' },
        { name: 'test', commandTemplate: 'test --model {model} --prompt "{prompt}"' },
      ];
    });

    const { client } = createMockOpencodeClient({
      sessionPrompt: async () => ({
        data: {
          info: {
            tokens: { input: 100, output: 200 },
          },
          parts: [{ type: 'text', text: 'long output' }],
        },
      }),
    });

    const result = await executeTask(
      mockClient as any,
      'my-agent',
      'hello',
      'task-6',
      5000,
      50,
      undefined,
      client,
    );

    expect(result.status).toBe('failed');
    expect(result.failureType).toBe('tokens_exceeded');
  });
});
