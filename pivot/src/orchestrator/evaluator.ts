import type { Task, TaskStatus, CandidateTask } from './types';

/**
 * Returns a priority score for a task.
 * Blocked tasks score 0, high-priority tasks score 2, normal tasks score 1.
 * Tasks that are not in "backlog" or "ready" status are ineligible (score -1).
 */
export function scoreTask(task: Task): number {
  if (task.status === 'blocked') {
    return 0;
  }
  if (task.status !== 'backlog' && task.status !== 'ready') {
    return -1;
  }
  if (
    task.title.includes('priority:high') ||
    (task.assignee?.includes('priority:high') ?? false)
  ) {
    return 2;
  }
  return 1;
}

/**
 * Checks if a task has any incomplete dependencies.
 */
export function isTaskBlockedByDependencies(
  task: Task,
  allTasks: Map<string, Task>,
): boolean {
  if (task.dependencies.length === 0) {
    return false;
  }
  for (const depKey of task.dependencies) {
    const depTask = allTasks.get(depKey);
    if (!depTask || depTask.status !== 'done') {
      return true;
    }
  }
  return false;
}

/**
 * Returns the highest-scoring todo task across all tracks,
 * applying dependency blocking first. Returns null if none available.
 */
export function getBestTask(
  tasks: Task[],
  trackStatuses: Map<string, string>,
): CandidateTask | null {
  const allTasks = new Map<string, Task>();
  for (const t of tasks) {
    allTasks.set(t.taskKey, t);
  }

  const eligible: CandidateTask[] = [];

  for (const task of tasks) {
    if (trackStatuses.get(task.trackId) === 'complete') {
      continue;
    }
    if (task.status === 'done' || task.status === 'in_progress') {
      continue;
    }

    const blocked = isTaskBlockedByDependencies(task, allTasks);
    if (blocked && task.status !== 'blocked') {
      continue;
    }
    if (!blocked && task.status === 'blocked') {
      // Task is marked blocked but dependencies are satisfied.
      // If it has dependencies, it was likely dependency-blocked and can be unblocked.
      // If it has no dependencies, it was manually blocked — preserve that state.
      if (task.dependencies.length === 0) {
        continue; // Manually blocked, skip
      }
      // Was dependency-blocked, now safe to score as todo
      const score = scoreTask({ ...task, status: 'backlog' as const });
      if (score <= 0) {
        continue;
      }
      const rationale = 'was blocked, dependencies now satisfied';
      eligible.push({ task, trackId: task.trackId, score, rationale });
      continue;
    }

    const score = scoreTask(task);
    if (score <= 0) {
      continue;
    }

    const rationale = blocked
      ? 'dependencies incomplete'
      : score === 2
        ? 'high priority'
        : 'normal priority';

    eligible.push({ task, trackId: task.trackId, score, rationale });
  }

  if (eligible.length === 0) {
    return null;
  }

  // Sort by score descending, then by taskKey for deterministic tie-breaking
  eligible.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.task.taskKey.localeCompare(b.task.taskKey);
  });

  return eligible[0];
}

/**
 * Builds a task status map from an array of tasks.
 */
export function buildTaskMap(tasks: Task[]): Map<string, Task> {
  const map = new Map<string, Task>();
  for (const t of tasks) {
    map.set(t.taskKey, t);
  }
  return map;
}
