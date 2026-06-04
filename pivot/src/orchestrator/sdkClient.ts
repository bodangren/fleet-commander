import type { OpencodeClient } from '@opencode-ai/sdk';

/**
 * Runtime-validated prompt response from the OpenCode SDK.
 */
interface ValidatedPromptData {
  info: {
    error?: { name: string; data?: { message?: string } };
    tokens?: { input: number; output?: number };
  };
  parts: Array<{ type: string; text?: string }>;
}

interface SendPromptOptions {
  client: OpencodeClient;
  sessionId: string;
  promptText: string;
  providerId: string;
  modelId: string;
  agent?: string;
  timeoutMs?: number;
  maxTokens?: number;
}

interface PromptResult {
  output: string;
  sessionId: string;
  tokensUsed?: number;
  error?: { type: string; message: string };
}

/**
 * Creates a new OpenCode session and returns its ID.
 * Validates the response shape at runtime.
 */
export async function createSession(
  client: OpencodeClient,
  taskKey: string,
): Promise<string> {
  const response = await client.session.create({
    body: { title: taskKey },
  });

  if (!response.data || typeof response.data !== 'object') {
    throw new Error('Failed to create OpenCode session: no data returned');
  }

  const data = response.data as Record<string, unknown>;
  if (typeof data.id !== 'string' || data.id.length === 0) {
    throw new Error('Failed to create OpenCode session: no valid id returned');
  }

  return data.id;
}

/**
 * Validates the SDK prompt response shape at runtime.
 */
function validatePromptData(raw: unknown): ValidatedPromptData {
  if (!raw || typeof raw !== 'object') {
    throw new Error('OpenCode SDK returned non-object prompt data');
  }

  const data = raw as Record<string, unknown>;

  const info = data.info && typeof data.info === 'object'
    ? data.info as Record<string, unknown>
    : {};

  const parts = Array.isArray(data.parts)
    ? data.parts as Array<{ type: string; text?: string }>
    : [];

  return {
    info: {
      error: info.error as { name: string; data?: { message?: string } } | undefined,
      tokens: info.tokens as { input: number; output?: number } | undefined,
    },
    parts,
  };
}

/**
 * Extracts plain-text output from an SDK prompt response parts array.
 */
export function extractOutput(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text)
    .join('\n');
}

/**
 * Sends a prompt to an OpenCode session via the SDK.
 * Enforces timeout via AbortController with deterministic cleanup.
 * Returns structured result with error details on failure.
 */
export async function sendPromptToSession(opts: SendPromptOptions): Promise<PromptResult> {
  const { client, sessionId, promptText, providerId, modelId, agent, timeoutMs, maxTokens } = opts;

  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  if (timeoutMs && timeoutMs > 0) {
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  }

  try {
    const promptPromise = client.session.prompt({
      path: { id: sessionId },
      body: {
        model: { providerID: providerId, modelID: modelId },
        agent,
        parts: [{ type: 'text', text: promptText }],
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      controller.signal.addEventListener('abort', () => {
        reject(new Error('Prompt aborted due to timeout'));
      });
    });

    const response = await Promise.race([promptPromise, timeoutPromise]);

    if (timeoutId) clearTimeout(timeoutId);

    let data: ValidatedPromptData;
    try {
      data = validatePromptData(response.data);
    } catch {
      return {
        output: '',
        sessionId,
        error: { type: 'unknown', message: 'Invalid response from OpenCode SDK' },
      };
    }

    const output = extractOutput(data.parts);
    const tokensUsed =
      (data.info.tokens?.input ?? 0) + (data.info.tokens?.output ?? 0);

    if (data.info.error) {
      return {
        output,
        sessionId,
        tokensUsed,
        error: {
          type: data.info.error.name,
          message: data.info.error.data?.message ?? 'Unknown SDK error',
        },
      };
    }

    if (maxTokens && maxTokens > 0 && tokensUsed > maxTokens) {
      return {
        output,
        sessionId,
        tokensUsed,
        error: {
          type: 'MessageOutputLengthError',
          message: `Output exceeded maxTokens limit of ${maxTokens}`,
        },
      };
    }

    return { output, sessionId, tokensUsed };
  } catch (err: unknown) {
    if (timeoutId) clearTimeout(timeoutId);

    const message = err instanceof Error ? err.message : String(err);
    const isAbort = controller.signal.aborted;

    return {
      output: '',
      sessionId,
      error: {
        type: isAbort ? 'timeout' : 'unknown',
        message,
      },
    };
  }
}
