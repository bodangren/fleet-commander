import { describe, expect, it, mock } from 'bun:test';
import { sendPromptToSession, extractOutput, createSession } from './sdkClient';

describe('extractOutput', () => {
  it('extracts text from parts', () => {
    const parts = [
      { type: 'text', text: 'hello' },
      { type: 'text', text: 'world' },
    ];
    expect(extractOutput(parts)).toBe('hello\nworld');
  });

  it('filters non-text parts', () => {
    const parts = [
      { type: 'text', text: 'hello' },
      { type: 'image', text: 'ignored' },
      { type: 'text', text: 'world' },
    ];
    expect(extractOutput(parts)).toBe('hello\nworld');
  });

  it('returns empty string for no text parts', () => {
    expect(extractOutput([])).toBe('');
  });
});

describe('sendPromptToSession', () => {
  function createMockClient(promptResponse: any) {
    return {
      session: {
        prompt: mock(() => Promise.resolve(promptResponse)),
      },
    } as any;
  }

  it('returns output on successful prompt', async () => {
    const client = createMockClient({
      data: {
        info: { tokens: { input: 10, output: 20 } },
        parts: [{ type: 'text', text: 'response text' }],
      },
    });

    const result = await sendPromptToSession({
      client,
      sessionId: 'sess-1',
      promptText: 'test prompt',
      providerId: 'openai',
      modelId: 'gpt-4',
    });

    expect(result.output).toBe('response text');
    expect(result.sessionId).toBe('sess-1');
    expect(result.tokensUsed).toBe(30);
    expect(result.error).toBeUndefined();
  });

  it('returns error when SDK returns error info', async () => {
    const client = createMockClient({
      data: {
        info: { error: { name: 'RateLimitError', data: { message: 'Too many requests' } } },
        parts: [{ type: 'text', text: '' }],
      },
    });

    const result = await sendPromptToSession({
      client,
      sessionId: 'sess-1',
      promptText: 'test',
      providerId: 'openai',
      modelId: 'gpt-4',
    });

    expect(result.error).toBeDefined();
    expect(result.error!.type).toBe('RateLimitError');
    expect(result.error!.message).toBe('Too many requests');
  });

  it('returns timeout error when AbortController fires', async () => {
    const client = {
      session: {
        prompt: mock(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    data: {
                      info: {},
                      parts: [{ type: 'text', text: 'late response' }],
                    },
                  }),
                500,
              ),
            ),
        ),
      },
    } as any;

    const result = await sendPromptToSession({
      client,
      sessionId: 'sess-1',
      promptText: 'test',
      providerId: 'openai',
      modelId: 'gpt-4',
      timeoutMs: 50,
    });

    expect(result.error).toBeDefined();
    expect(result.error!.type).toBe('timeout');
  });

  it('returns error for invalid response data', async () => {
    const client = createMockClient({ data: null });

    const result = await sendPromptToSession({
      client,
      sessionId: 'sess-1',
      promptText: 'test',
      providerId: 'openai',
      modelId: 'gpt-4',
    });

    expect(result.error).toBeDefined();
    expect(result.error!.type).toBe('unknown');
    expect(result.error!.message).toBe('Invalid response from OpenCode SDK');
  });

  it('returns error when output exceeds maxTokens', async () => {
    const client = createMockClient({
      data: {
        info: { tokens: { input: 100, output: 200 } },
        parts: [{ type: 'text', text: 'long response' }],
      },
    });

    const result = await sendPromptToSession({
      client,
      sessionId: 'sess-1',
      promptText: 'test',
      providerId: 'openai',
      modelId: 'gpt-4',
      maxTokens: 100,
    });

    expect(result.error).toBeDefined();
    expect(result.error!.type).toBe('MessageOutputLengthError');
  });

  it('handles unexpected errors gracefully', async () => {
    const client = {
      session: {
        prompt: mock(() => Promise.reject(new Error('Network failure'))),
      },
    } as any;

    const result = await sendPromptToSession({
      client,
      sessionId: 'sess-1',
      promptText: 'test',
      providerId: 'openai',
      modelId: 'gpt-4',
    });

    expect(result.error).toBeDefined();
    expect(result.error!.type).toBe('unknown');
    expect(result.error!.message).toBe('Network failure');
  });
});
