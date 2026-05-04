import { ConvexHttpClient } from 'convex/browser';
import { createConvexClient } from '../convexClient';
import { resolveAgentCommand, type ResolveOptions } from './resolver';
import type { ExecutionResult } from './types';

/**
 * Parses a session_id from opencode output.
 * Opencode emits JSON lines; looks for {"session_id": "..."} pattern.
 */
export function parseSessionId(output: string): string | undefined {
  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    try {
      const obj = JSON.parse(trimmed);
      if (typeof obj.session_id === 'string' && obj.session_id.length > 0) {
        return obj.session_id;
      }
      if (typeof obj.sessionId === 'string' && obj.sessionId.length > 0) {
        return obj.sessionId;
      }
    } catch {
      // not JSON, skip
    }
  }
  return undefined;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Reads a ReadableStream into chunks and accumulates text.
 * Kills the process if estimated tokens exceed maxTokens.
 */
async function readStreamWithTokenLimit(
  stream: ReadableStream<Uint8Array>,
  proc: { kill: () => void },
  maxTokens: number | undefined,
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      accumulated += decoder.decode(value, { stream: true });
      if (maxTokens !== undefined && maxTokens > 0) {
        if (estimateTokens(accumulated) > maxTokens) {
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
 * Executes a command via Bun.spawn and returns the result.
 * Streams stdout/stderr, enforces timeout and optional maxTokens.
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

  const [stdout, stderr, exitCode] = await Promise.all([
    readStreamWithTokenLimit(proc.stdout, proc, maxTokens),
    readStreamWithTokenLimit(proc.stderr, proc, maxTokens),
    proc.exited,
  ]);

  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  // Determine if token limit was exceeded by checking output length
  if (maxTokens !== undefined && maxTokens > 0) {
    const totalOutput = stdout + stderr;
    if (estimateTokens(totalOutput) > maxTokens) {
      tokensExceeded = true;
    }
  }

  return { stdout, stderr, exitCode, timedOut, tokensExceeded };
}

/**
 * Resolves an agent tag, executes the resulting command, and returns a structured result.
 * Passes sessionId through to the resolver for session continuation.
 */
export async function executeTask(
  client: ConvexHttpClient,
  agentTag: string,
  prompt: string,
  taskKey: string,
  timeoutMs: number,
  maxTokens?: number,
  resolveOptions?: ResolveOptions,
): Promise<ExecutionResult> {
  const resolved = await resolveAgentCommand(client, agentTag, prompt, resolveOptions);

  if (resolved.command === 'echo') {
    return {
      taskKey,
      status: 'failed',
      durationMs: 0,
      error: `Agent "${agentTag}" could not be resolved to a valid harness`,
      failureType: 'unknown',
      output: '',
    };
  }

  const startMs = Date.now();
  const result = await executeCommand(
    resolved.command,
    resolved.args,
    timeoutMs,
    maxTokens,
  );
  const durationMs = Date.now() - startMs;

  const combinedOutput = [result.stdout, result.stderr].filter(Boolean).join('\n');
  const sessionId = parseSessionId(combinedOutput);

  if (result.timedOut) {
    return {
      taskKey,
      status: 'failed',
      durationMs,
      error: `Execution timed out after ${timeoutMs}ms`,
      failureType: 'timeout',
      output: combinedOutput,
      sessionId,
    };
  }

  if (result.tokensExceeded) {
    return {
      taskKey,
      status: 'failed',
      durationMs,
      error: `Execution exceeded maxTokens limit of ${maxTokens}`,
      failureType: 'timeout',
      output: combinedOutput,
      sessionId,
    };
  }

  if (result.exitCode !== 0) {
    return {
      taskKey,
      status: 'failed',
      durationMs,
      exitCode: result.exitCode,
      error: `Process exited with code ${result.exitCode}`,
      failureType: 'exit_code',
      output: combinedOutput,
      sessionId,
    };
  }

  return {
    taskKey,
    status: 'succeeded',
    durationMs,
    exitCode: 0,
    output: combinedOutput,
    sessionId,
  };
}
