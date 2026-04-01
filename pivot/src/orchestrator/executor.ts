import { ConvexHttpClient } from 'convex/browser';
import { createConvexClient } from '../convexClient';
import { resolveAgentCommand } from './resolver';
import type { ExecutionResult } from './types';

/**
 * Executes a command via Bun.spawn and returns the result.
 * Streams stdout/stderr, enforces timeout.
 */
export async function executeCommand(
  command: string,
  args: string[],
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean }> {
  const proc = Bun.spawn({
    cmd: [command, ...args],
    stdout: 'pipe',
    stderr: 'pipe',
  });

  let timedOut = false;
  const timeoutId =
    timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true;
          proc.kill();
        }, timeoutMs)
      : null;

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  return { stdout, stderr, exitCode, timedOut };
}

/**
 * Resolves an agent tag, executes the resulting command, and returns a structured result.
 */
export async function executeTask(
  client: ConvexHttpClient,
  agentTag: string,
  prompt: string,
  taskKey: string,
  timeoutMs: number,
): Promise<ExecutionResult> {
  const resolved = await resolveAgentCommand(client, agentTag, prompt);

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
  );
  const durationMs = Date.now() - startMs;

  const combinedOutput = [result.stdout, result.stderr].filter(Boolean).join('\n');

  if (result.timedOut) {
    return {
      taskKey,
      status: 'failed',
      durationMs,
      error: `Execution timed out after ${timeoutMs}ms`,
      failureType: 'timeout',
      output: combinedOutput,
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
    };
  }

  return {
    taskKey,
    status: 'succeeded',
    durationMs,
    exitCode: 0,
    output: combinedOutput,
  };
}
