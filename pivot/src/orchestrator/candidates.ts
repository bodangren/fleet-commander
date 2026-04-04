import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import type { Task, Track, Project } from './types';

/**
 * Loads all tasks for a project from Convex.
 */
export async function loadTasks(
  client: ConvexHttpClient,
  projectSlug: string,
): Promise<Task[]> {
  const tasks = await client.query(
    api.fleetCatalog.listTasksByProject,
    { projectSlug },
  );
  return tasks as unknown as Task[];
}

/**
 * Loads all tracks for a project from Convex and returns a status map.
 */
export async function loadTrackStatuses(
  client: ConvexHttpClient,
  projectSlug: string,
): Promise<Map<string, string>> {
  const tracks = await client.query(
    api.fleetCatalog.listTracksByProject,
    { projectSlug },
  );
  const map = new Map<string, string>();
  for (const t of (tracks as unknown as Track[])) {
    map.set(t.trackId, t.status);
  }
  return map;
}

/**
 * Loads all active projects from Convex.
 */
export async function loadActiveProjects(
  client: ConvexHttpClient,
): Promise<Project[]> {
  const projects = await client.query(
    api.projects.listProjects,
    {},
  );
  return (projects as unknown as Project[]).filter(
    (p) => p.status === 'active',
  );
}
