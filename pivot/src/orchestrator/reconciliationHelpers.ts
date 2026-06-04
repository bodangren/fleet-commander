export interface TaskRecord {
  _id: string;
  status: string;
  updatedAt: number;
  sprintId?: string;
  dependencies?: string[];
  blockerReason?: string;
}

export interface PipelineRunRecord {
  taskId: string;
  status: 'running' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
}

export interface SprintRecord {
  _id: string;
  status: string;
  projectId: string;
}

/**
 * Detect tasks stuck in `in_progress` for longer than the given threshold
 * without a running pipelineRun.
 * @param tasks - All task records
 * @param pipelineRuns - All pipeline run records
 * @param thresholdMs - Threshold in milliseconds (default 30 minutes)
 * @param now - Current timestamp (injectable for testing)
 * @returns Array of task IDs that are stuck
 */
export function detectStuckTasks(
  tasks: TaskRecord[],
  pipelineRuns: PipelineRunRecord[],
  thresholdMs: number = 30 * 60 * 1000,
  now: number = Date.now(),
): string[] {
  const stuckIds: string[] = [];

  for (const task of tasks) {
    if (task.status !== 'in_progress') continue;

    const elapsed = now - task.updatedAt;
    if (elapsed < thresholdMs) continue;

    const hasRunningRun = pipelineRuns.some(
      (r) => r.taskId === task._id && r.status === 'running',
    );
    if (!hasRunningRun) {
      stuckIds.push(task._id);
    }
  }

  return stuckIds;
}

/**
 * Detect sprints that are marked `active` but have no `in_progress` or `ready`
 * tasks and at least one completed task — candidates for auto-close.
 * @param sprints - All sprint records
 * @param tasks - All task records
 * @returns Array of sprint IDs that are orphan sprints
 */
export function detectOrphanSprints(
  sprints: SprintRecord[],
  tasks: TaskRecord[],
): string[] {
  const orphanIds: string[] = [];

  for (const sprint of sprints) {
    if (sprint.status !== 'active') continue;

    const sprintTasks = tasks.filter((t) => t.sprintId === sprint._id);
    const hasInProgressOrReady = sprintTasks.some(
      (t) => t.status === 'in_progress' || t.status === 'ready',
    );
    const hasCompleted = sprintTasks.some((t) => t.status === 'done');

    if (!hasInProgressOrReady && hasCompleted) {
      orphanIds.push(sprint._id);
    }
  }

  return orphanIds;
}

/**
 * Reconcile a single task's state against its dependencies and pipeline runs.
 * Returns a recommended status transition, or null if no change is needed.
 *
 * Rules:
 * - Task in `ready` with incomplete dependencies → `blocked`
 * - Task in `blocked` with all dependencies complete → `ready`
 * - Task in `in_progress` that is stuck (threshold exceeded, no running run) → `ready`
 *
 * @param task - The task to reconcile
 * @param allTasks - All tasks (for dependency lookup)
 * @param pipelineRuns - All pipeline run records
 * @param thresholdMs - Stuck threshold in milliseconds
 * @param now - Current timestamp
 * @returns Recommended new status or null
 */
export function reconcileTaskState(
  task: TaskRecord,
  allTasks: TaskRecord[],
  pipelineRuns: PipelineRunRecord[],
  thresholdMs: number = 30 * 60 * 1000,
  now: number = Date.now(),
): string | null {
  if (task.status === 'ready') {
    if (task.dependencies && task.dependencies.length > 0) {
      const allDepsComplete = task.dependencies.every((depId) => {
        const dep = allTasks.find((t) => t._id === depId);
        return dep && dep.status === 'done';
      });
      if (!allDepsComplete) {
        return 'blocked';
      }
    }
    return null;
  }

  if (task.status === 'blocked') {
    if (!task.dependencies || task.dependencies.length === 0) {
      return 'ready';
    }
    const allDepsComplete = task.dependencies.every((depId) => {
      const dep = allTasks.find((t) => t._id === depId);
      return dep && dep.status === 'done';
    });
    if (allDepsComplete) {
      return 'ready';
    }
    return null;
  }

  if (task.status === 'in_progress') {
    const elapsed = now - task.updatedAt;
    if (elapsed >= thresholdMs) {
      const hasRunningRun = pipelineRuns.some(
        (r) => r.taskId === task._id && r.status === 'running',
      );
      if (!hasRunningRun) {
        return 'ready';
      }
    }
    return null;
  }

  return null;
}
