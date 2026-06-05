import { ConvexHttpClient } from 'convex/browser';
import { loadTasks, loadTrackStatuses, loadProject } from '../candidates';
import { filterEligibleTasks, type ConstraintContext, type DispatchRejection } from '../constraints';
import {
  createRunContractIfNeeded,
  appendDispatchRejections,
} from '../runContract';
import { logAndCaptureError } from '../logger';
import type { Task, Project } from '../types';

/**
 * Result of the load-and-filter stage.
 */
export interface LoadFilterResult {
  project: Project | null;
  rootPath: string | undefined;
  tasks: Task[];
  trackStatuses: Map<string, string>;
  eligible: ReturnType<typeof filterEligibleTasks>['eligible'];
  allTasks: Map<string, Task>;
}

/**
 * Loads project, tasks, and track statuses; filters eligible tasks; persists
 * dispatch rejections to run contracts. Returns everything the downstream
 * stages need.
 *
 * @param client - Convex HTTP client
 * @param projectSlug - project identifier
 */
export async function loadAndFilterTasks(
  client: ConvexHttpClient,
  projectSlug: string,
): Promise<LoadFilterResult> {
  const project = await loadProject(client, projectSlug);
  const rootPath = project?.rootPath;

  const tasks = await loadTasks(client, projectSlug);
  const trackStatuses = await loadTrackStatuses(client, projectSlug);

  const allTasks = new Map<string, Task>();
  for (const t of tasks) {
    allTasks.set(t.taskKey, t);
  }

  const constraintContext: ConstraintContext = { allTasks };

  const { eligible, rejections } = filterEligibleTasks(
    tasks,
    constraintContext,
    trackStatuses,
  );

  if (rejections.length > 0) {
    await persistRejections(client, projectSlug, allTasks, rejections);
  }

  return { project, rootPath, tasks, trackStatuses, eligible, allTasks };
}

/**
 * Groups rejections by taskKey and persists them to run contracts.
 */
async function persistRejections(
  client: ConvexHttpClient,
  projectSlug: string,
  allTasks: Map<string, Task>,
  rejections: DispatchRejection[],
): Promise<void> {
  const grouped = new Map<string, DispatchRejection[]>();
  for (const r of rejections) {
    const list = grouped.get(r.taskKey) ?? [];
    list.push(r);
    grouped.set(r.taskKey, list);
  }
  for (const [taskKey, taskRejections] of grouped) {
    const task = allTasks.get(taskKey);
    if (task) {
      try {
        await createRunContractIfNeeded(
          client,
          taskKey,
          projectSlug,
          task.title,
          [task.trackId],
          [],
        );
        await appendDispatchRejections(client, taskKey, taskRejections);
      } catch (err) {
        await logAndCaptureError(
          client,
          'warning',
          'Failed to persist dispatch rejections',
          { projectSlug, taskKey, operation: 'persistRejections' },
          err,
        );
      }
    }
  }
}
