import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import { resolveAgentCommand, type ResolveOptions } from './resolver';
import { getOpencodeClient } from './opencodeServer';
import { createSession, sendPromptToSession } from './sdkClient';
import type { OpencodeClient } from '@opencode-ai/sdk';
import type { ExecutionResult } from './types';
import { selectFallbackModel, type HealthMap } from '../policy/providerHealth';

/**
 * Event logged when a fallback occurs for audit trail.
 */
export interface FallbackEvent {
  taskKey: string;
  fallbackFrom: string;
  fallbackTo: string;
  fallbackReason: string;
  attemptNumber: number;
  timestamp: number;
}

/**
 * Estimates token count for text input (chars/4).
 */
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

/**
 * Check if an execution failure is a provider error that should trigger fallback.
 * Provider errors include: exit_code (auth/rate-limit), timeout, and unknown errors.
 * tokens_exceeded is NOT a provider error — it's a task-level issue.
 */
function isProviderError(result: ExecutionResult): boolean {
  if (result.status === 'succeeded') return false;
  if (result.failureType === 'tokens_exceeded') return false;
  return true;
}

/**
 * Execute a task with automatic fallback to alternative models on provider failure.
 * Retries up to `maxFallbacks` times with the next healthy model from the fallback chain.
 *
 * @param executeFn - The base execute function (injectable for testing)
 * @param client - Convex HTTP client
 * @param agentTag - Agent identifier
 * @param prompt - Task prompt
 * @param taskKey - Task key for logging
 * @param timeoutMs - Timeout per attempt
 * @param fallbackModels - Ordered list of fallback model IDs
 * @param healthMap - Current provider health states
 * @param maxFallbacks - Maximum fallback attempts (default: 2)
 * @param onFallbackEvent - Callback for logging fallback events
 * @param resolveOptions - Agent resolution options
 * @param injectedOpencodeClient - Optional injected SDK client
 * @returns ExecutionResult from the final attempt
 */
/**
 * Default fallback event handler that persists events to Convex.
 */
async function persistFallbackEvent(
  client: ConvexHttpClient,
  event: FallbackEvent,
): Promise<void> {
  try {
    await client.mutation(api.providers.createFallbackEvent, {
      taskKey: event.taskKey,
      fallbackFrom: event.fallbackFrom,
      fallbackTo: event.fallbackTo,
      fallbackReason: event.fallbackReason,
      attemptNumber: event.attemptNumber,
    });
  } catch (err) {
    console.error('[fallback] Failed to persist fallback event:', err);
  }
}

export async function executeTaskWithFallback(
  executeFn: typeof executeTask,
  client: ConvexHttpClient,
  agentTag: string,
  prompt: string,
  taskKey: string,
  timeoutMs: number,
  fallbackModels: string[],
  healthMap: HealthMap,
  maxFallbacks = 2,
  onFallbackEvent?: (event: FallbackEvent) => void,
  resolveOptions?: ResolveOptions,
  injectedOpencodeClient?: OpencodeClient,
): Promise<ExecutionResult & { fallbackEvents?: FallbackEvent[] }> {
  const fallbackEvents: FallbackEvent[] = [];
  const emitFallbackEvent = async (event: FallbackEvent) => {
    fallbackEvents.push(event);
    if (onFallbackEvent) {
      onFallbackEvent(event);
    } else {
      await persistFallbackEvent(client, event);
    }
  };
  let currentModel = fallbackModels[0] ?? agentTag;

  // First attempt (always runs)
  const firstResult = await executeFn(
    client,
    currentModel,
    prompt,
    taskKey,
    timeoutMs,
    undefined,
    resolveOptions,
    injectedOpencodeClient,
  );

  // Success or non-provider error — return immediately, no fallback
  if (firstResult.status === 'succeeded' || !isProviderError(firstResult)) {
    return { ...firstResult, fallbackEvents };
  }

  // maxFallbacks=0 — single attempt only, no fallback events
  if (maxFallbacks === 0) {
    return { ...firstResult, fallbackEvents };
  }

  // Retry loop: up to maxFallbacks retries
  let lastResult = firstResult;
  for (let retry = 1; retry <= maxFallbacks; retry++) {
    const nextModel = selectFallbackModel(currentModel, fallbackModels, healthMap);

    if (!nextModel) {
      // No more fallbacks available — record exhausted-fallback event
      const exhaustedEvent: FallbackEvent = {
        taskKey,
        fallbackFrom: currentModel,
        fallbackTo: null as unknown as string,
        fallbackReason: lastResult.error ?? 'Provider error',
        attemptNumber: retry,
        timestamp: Date.now(),
      };
      await emitFallbackEvent(exhaustedEvent);
      return { ...lastResult, fallbackEvents };
    }

    // Record the fallback transition
    const event: FallbackEvent = {
      taskKey,
      fallbackFrom: currentModel,
      fallbackTo: nextModel,
      fallbackReason: lastResult.error ?? 'Provider error',
      attemptNumber: retry,
      timestamp: Date.now(),
    };
    await emitFallbackEvent(event);

    console.warn(
      `[fallback] ${taskKey}: ${currentModel} -> ${nextModel} (attempt ${retry}/${maxFallbacks}): ${lastResult.error}`,
    );

    currentModel = nextModel;
    lastResult = await executeFn(
      client,
      currentModel,
      prompt,
      taskKey,
      timeoutMs,
      undefined,
      resolveOptions,
      injectedOpencodeClient,
    );

    // Success or non-provider error — return immediately
    if (lastResult.status === 'succeeded' || !isProviderError(lastResult)) {
      return { ...lastResult, fallbackEvents };
    }
  }

  // All retries exhausted — return the last failure result
  return { ...lastResult, fallbackEvents };
}
