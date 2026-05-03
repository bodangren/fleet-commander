import { executeCommand } from './executor';

export interface HookResult {
  hookName: string;
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface HarnessHooks {
  beforeRun?: string;
  afterRun?: string;
  afterCreate?: string;
}

/**
 * Executes a single lifecycle hook command in the given working directory.
 * Returns the result without throwing on non-zero exit codes.
 */
export async function runHook(
  hookName: string,
  command: string,
  cwd: string,
  timeoutMs: number = 60_000,
): Promise<HookResult> {
  const startMs = Date.now();

  const proc = Bun.spawn({
    cmd: ['sh', '-c', command],
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  let timedOut = false;
  const timeoutId =
    timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true;
          proc.kill('SIGKILL');
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

  return {
    hookName,
    command,
    exitCode: timedOut ? -1 : exitCode,
    stdout,
    stderr,
    durationMs: Date.now() - startMs,
  };
}

/**
 * Runs all applicable hooks for a lifecycle phase in order.
 * Stops on first failure (non-zero exit) and returns the failed result.
 * Returns null if all hooks succeeded.
 */
export async function runHooks(
  hooks: HarnessHooks,
  phase: 'beforeRun' | 'afterRun' | 'afterCreate',
  cwd: string,
  timeoutMs?: number,
): Promise<HookResult | null> {
  const command =
    phase === 'beforeRun'
      ? hooks.beforeRun
      : phase === 'afterRun'
        ? hooks.afterRun
        : hooks.afterCreate;

  if (!command) return null;

  const result = await runHook(phase, command, cwd, timeoutMs);
  if (result.exitCode !== 0) {
    return result;
  }
  return null;
}
