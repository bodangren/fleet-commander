import { ConvexHttpClient } from 'convex/browser';
import { resolveHarnessHooks } from '../resolver';
import { runHooks, type HarnessHooks } from '../hookRunner';
import { logAndCaptureError } from '../logger';
import type { Task, GitHooks } from '../types';

/**
 * Result of the pre-execution preparation stage.
 */
export interface PreparedExecution {
  harnessHooks: HarnessHooks;
}

/**
 * Resolves harness hooks, creates a git branch (if gitHooks provided),
 * and runs the beforeRun hook. Returns the resolved harness hooks so
 * the success path can run afterRun.
 *
 * @param client - Convex HTTP client
 * @param projectSlug - project identifier
 * @param task - the selected task
 * @param rootPath - project root path (from project config)
 * @param gitHooks - optional git lifecycle hooks
 * @param skipGitStart - whether the caller already prepared the task branch
 * @returns The resolved hooks needed by the remaining execution stages
 */
export async function prepareExecution(
  client: ConvexHttpClient,
  projectSlug: string,
  task: Task,
  rootPath: string | undefined,
  gitHooks?: GitHooks,
  skipGitStart = false,
): Promise<PreparedExecution> {
  let harnessHooks: HarnessHooks;
  try {
    harnessHooks = await resolveHarnessHooks(client, task.assignee ?? '');
  } catch {
    harnessHooks = {};
  }

  if (!skipGitStart && gitHooks?.onTaskStart && rootPath) {
    try {
      const { branchName, branchCreated } = await gitHooks.onTaskStart(
        projectSlug,
        rootPath,
        task.taskKey,
        task.title,
      );
      console.log(`Git: branch ${branchName} created for task ${task.taskKey}`);
      if (branchCreated && harnessHooks.afterCreate) {
        const hookErr = await runHooks(harnessHooks, 'afterCreate', rootPath);
        if (hookErr) {
          console.warn(
            `afterCreate hook failed for task ${task.taskKey}: exit ${hookErr.exitCode}, stderr: ${hookErr.stderr}`,
          );
          await logAndCaptureError(
            client,
            'warning',
            `afterCreate hook failed: ${hookErr.stderr || hookErr.command}`,
            { projectSlug, taskKey: task.taskKey, operation: 'afterCreateHook' },
            new Error(hookErr.stderr || `exit ${hookErr.exitCode}`),
          );
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await logAndCaptureError(
        client,
        'warning',
        `Git onTaskStart failed: ${msg}`,
        { projectSlug, taskKey: task.taskKey, operation: 'gitOnTaskStart' },
        err,
      );
    }
  }

  return { harnessHooks };
}

/**
 * Runs the beforeRun hook and returns timing markers.
 * Returns { startMs, endMs } for hook timing.
 */
export async function runBeforeHook(
  client: ConvexHttpClient,
  projectSlug: string,
  taskKey: string,
  harnessHooks: HarnessHooks,
  rootPath: string | undefined,
): Promise<{ startMs: number; endMs: number; failed: boolean }> {
  const startMs = Date.now();
  if (harnessHooks.beforeRun && rootPath) {
    const hookErr = await runHooks(harnessHooks, 'beforeRun', rootPath);
    const endMs = Date.now();
    if (hookErr) {
      console.warn(
        `beforeRun hook failed for task ${taskKey}: exit ${hookErr.exitCode}, stderr: ${hookErr.stderr}`,
      );
      await logAndCaptureError(
        client,
        'warning',
        `beforeRun hook failed: ${hookErr.stderr || hookErr.command}`,
        { projectSlug, taskKey, operation: 'beforeRunHook' },
        new Error(hookErr.stderr || `exit ${hookErr.exitCode}`),
      );
      return { startMs, endMs, failed: true };
    }
    return { startMs, endMs, failed: false };
  }
  return { startMs, endMs: Date.now(), failed: false };
}
