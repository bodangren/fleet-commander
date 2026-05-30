import { createConvexClient } from '../convexClient';
import { api } from '../../../convex/_generated/api';

type RunLifecycleStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export type LocalRunRequest = {
  projectSlug: string;
  trackId: string;
  command: string[];
  runId: string;
};

/**
 * command: to string.
 * @param command - The command array to convert
 * @returns The command joined as a string
 */
function commandToString(command: string[]): string {
  if (command.length === 0) {
    throw new Error('command must include at least one token');
  }
  return command.join(' ');
}

/**
 * Append an execution log entry to Convex.
 * @param input - The log entry data
 */
async function appendExecutionLog(input: {
  projectSlug: string;
  runId: string;
  trackId: string;
  status: RunLifecycleStatus;
  summary: string;
  rawOutput?: string;
}) {
  const client = createConvexClient();
  await client.mutation(api.executionLogs.appendLog, input);
}

/**
 * Async function that runs a local command and persists execution logs to Convex.
 * @param request - The run request with projectSlug, trackId, command, and runId
 * @returns Promise that resolves when the command completes
 */
export async function runLocalCommandAndPersist(
  request: LocalRunRequest,
): Promise<void> {
  await appendExecutionLog({
    projectSlug: request.projectSlug,
    runId: request.runId,
    trackId: request.trackId,
    status: 'running',
    summary: `Starting ${commandToString(request.command)}`,
  });

  const proc = Bun.spawn({
    cmd: request.command,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  const combinedOutput = [stdout, stderr].filter(Boolean).join('\n');
  await appendExecutionLog({
    projectSlug: request.projectSlug,
    runId: request.runId,
    trackId: request.trackId,
    status: code === 0 ? 'succeeded' : 'failed',
    summary:
      code === 0
        ? `Command succeeded: ${commandToString(request.command)}`
        : `Command failed (${code}): ${commandToString(request.command)}`,
    rawOutput: combinedOutput,
  });
}
