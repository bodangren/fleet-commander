import { ConvexHttpClient } from 'convex/browser';
import { resolveAgentCommand, type ResolveOptions } from './resolver';
import { getOpencodeClient } from './opencodeServer';
import { createSession, sendPromptToSession } from './sdkClient';
import type { OpencodeClient } from '@opencode-ai/sdk';
import type { ExecutionResult } from './types';

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

interface TokenBudget {
  remaining: number;
}

/**
 * Reads a ReadableStream into chunks and accumulates text.
 * Kills the process if the shared token budget is exhausted.
 */
async function readStreamWithTokenLimit(
  stream: ReadableStream<Uint8Array>,
  proc: { kill: () => void },
  budget: TokenBudget | null,
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      accumulated += chunk;
      if (budget) {
        budget.remaining -= estimateTokens(chunk);
        if (budget.remaining < 0) {
          proc.kill();
          break;
        }
      }
    }
    accumulated += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  return accumulated;
}

/**
 * Executes a generic shell command via Bun.spawn.
 * Streams stdout/stderr, enforces timeout and optional maxTokens.
 *
 * NOTE: Opencode agent tasks should use `executeTask` which talks to the
 * persistent OpenCode server via the SDK. This utility is retained for
 * non-agent shell commands (e.g. lifecycle hooks).
 */
export async function executeCommand(
  command: string,
  args: string[],
  timeoutMs: number,
  maxTokens?: number,
): Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean; tokensExceeded: boolean }> {
  const proc = Bun.spawn({
    cmd: [command, ...args],
    stdout: 'pipe',
    stderr: 'pipe',
  });

  let timedOut = false;
  let tokensExceeded = false;

  const timeoutId =
    timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true;
          proc.kill();
        }, timeoutMs)
      : null;

  const budget =
    maxTokens !== undefined && maxTokens > 0
      ? { remaining: maxTokens }
      : null;

  const [stdout, stderr, exitCode] = await Promise.all([
    readStreamWithTokenLimit(proc.stdout, proc, budget),
    readStreamWithTokenLimit(proc.stderr, proc, budget),
    proc.exited,
  ]);

  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  if (budget && budget.remaining < 0) {
    tokensExceeded = true;
  }

  return { stdout, stderr, exitCode, timedOut, tokensExceeded };
}

/**
 * Resolves an agent tag, executes the task via the OpenCode SDK, and returns
 * a structured result. Maintains session continuity when sessionId is provided.
 */
export async function executeTask(
  client: ConvexHttpClient,
  agentTag: string,
  prompt: string,
  taskKey: string,
  timeoutMs: number,
  maxTokens?: number,
  resolveOptions?: ResolveOptions,
  injectedOpencodeClient?: OpencodeClient,
): Promise<ExecutionResult> {
  const resolved = await resolveAgentCommand(
    client,
    agentTag,
    resolveOptions,
  );

  if (!resolved.providerId || !resolved.modelId) {
    return {
      taskKey,
      status: 'failed',
      durationMs: 0,
      error: `Agent "${agentTag}" could not be resolved to a valid harness`,
      failureType: 'unknown',
      output: '',
    };
  }

  const sdkClient = injectedOpencodeClient ?? getOpencodeClient();

  let sessionId = resolved.sessionId;
  if (!sessionId) {
    try {
      sessionId = await createSession(sdkClient, taskKey);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        taskKey,
        status: 'failed',
        durationMs: 0,
        error: `Failed to create session: ${message}`,
        failureType: 'unknown',
        output: '',
      };
    }
  }

  const startMs = Date.now();
  const result = await sendPromptToSession({
    client: sdkClient,
    sessionId,
    promptText: prompt,
    providerId: resolved.providerId,
    modelId: resolved.modelId,
    agent: resolved.agent,
    timeoutMs,
    maxTokens,
  });
  const durationMs = Date.now() - startMs;

  if (result.error) {
    let failureType: ExecutionResult['failureType'] = 'unknown';
    if (result.error.type === 'timeout') {
      failureType = 'timeout';
    } else if (
      result.error.type === 'MessageOutputLengthError' ||
      result.error.type === 'tokens_exceeded'
    ) {
      failureType = 'tokens_exceeded';
    } else if (result.error.type === 'ProviderAuthError') {
      failureType = 'exit_code';
    } else if (result.error.type === 'MessageAbortedError') {
      failureType = 'timeout';
    }

    return {
      taskKey,
      status: 'failed',
      durationMs,
      error: result.error.message,
      failureType,
      output: result.output,
      sessionId: result.sessionId,
    };
  }

  return {
    taskKey,
    status: 'succeeded',
    durationMs,
    exitCode: 0,
    output: result.output,
    sessionId: result.sessionId,
  };
}
