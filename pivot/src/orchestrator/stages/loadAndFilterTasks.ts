import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import { loadTasks, loadTrackStatuses, loadProject } from '../candidates';
import { filterEligibleTasks, type ConstraintContext, type DispatchRejection } from '../constraints';
import {
  createRunContractIfNeeded,
  appendDispatchRejections,
} from '../runContract';
import { logAndCaptureError } from '../logger';
import type { Task, Project } from '../types';

/**
 * Cached track-context payload (title + spec markdown + plan markdown) loaded
 * by the orchestrator before dispatching.
 */
export interface TrackContextPayload {
  title: string;
  specMarkdown: string;
  planMarkdown: string;
}

/**
 * Result of the load-and-filter stage.
 */
export interface LoadFilterResult {
  projectSlug: string;
  project: Project | null;
  rootPath: string | undefined;
  tasks: Task[];
  trackStatuses: Map<string, string>;
  eligible: ReturnType<typeof filterEligibleTasks>['eligible'];
  allTasks: Map<string, Task>;
  trackContexts: Map<string, TrackContextPayload>;
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
  const resolvedProjectSlug = project?.slug ?? projectSlug;
  const rootPath = project?.path;

  const tasks = await loadTasks(client, resolvedProjectSlug);
  const trackStatuses = await loadTrackStatuses(client, resolvedProjectSlug);

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
    await persistRejections(client, resolvedProjectSlug, allTasks, rejections);
  }

  // Load track context payloads for every distinct trackId in eligible tasks.
  // This is best-effort: missing tracks are simply omitted from the map.
  const trackContexts = await loadTrackContexts(
    client,
    resolvedProjectSlug,
    new Set(eligible.map((c) => c.task.trackId)),
  );

  return {
    projectSlug: resolvedProjectSlug,
    project,
    rootPath,
    tasks,
    trackStatuses,
    eligible,
    allTasks,
    trackContexts,
  };
}

/**
 * Loads the track-context payload (spec + plan markdown) for each track in
 * `trackIds`. Missing tracks are silently omitted. Failures are logged at
 * debug level so a Convex outage does not block dispatching.
 */
async function loadTrackContexts(
  client: ConvexHttpClient,
  projectSlug: string,
  trackIds: Set<string>,
): Promise<Map<string, TrackContextPayload>> {
  const out = new Map<string, TrackContextPayload>();
  for (const trackId of trackIds) {
    try {
      const payload = await client.query(api.tracks.getTrackContext, {
        projectSlug,
        trackId,
      });
      if (payload) {
        out.set(trackId, payload);
      }
    } catch (err) {
      await logAndCaptureError(
        client,
        'debug',
        'Track context lookup failed',
        { projectSlug, taskKey: trackId, operation: 'getTrackContext' },
        err,
      );
    }
  }
  return out;
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
