import type { ConvexHttpClient } from 'convex/browser';

import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

export type ProjectRecord = {
  _id: Id<'projects'>;
  name: string;
  slug: string;
  description: string;
  path?: string;
  modelRoutingPolicy?: string;
  createdAt: number;
  updatedAt: number;
};

export type CatalogTrack = {
  trackId: string;
  title: string;
  status: string;
  updatedAt: number;
};

export type CatalogTask = {
  trackId: string;
  taskKey: string;
  title: string;
  status: string;
  assignee?: string;
  updatedAt: number;
};

export type CatalogAgentRole = 'architect' | 'executor' | 'reviewer' | 'merger';

export type CatalogAgent = {
  _id: Id<'agents'>;
  name: string;
  role: CatalogAgentRole;
  skills: string[];
  model: string;
  costPerPoint: number;
};

/**
 * Resolves a user-facing slug or Convex project ID to one project record.
 * @param client - Convex client used for project lookups
 * @param reference - Project slug or Convex project ID from the HTTP route
 * @returns The resolved project, or null when the reference is unknown
 */
export async function resolveProject(
  client: ConvexHttpClient,
  reference: string,
): Promise<ProjectRecord | null> {
  const bySlug = await client.query(api.projects.getProjectBySlugHandler, { slug: reference });
  if (bySlug) return bySlug as ProjectRecord;

  try {
    const byId = await client.query(api.projects.getProjectHandler, {
      id: reference as Id<'projects'>,
    });
    return byId as ProjectRecord | null;
  } catch {
    return null;
  }
}

/**
 * Shapes imported catalog rows into the project view's track/phase model.
 * @param project - Resolved project identity and metadata
 * @param tracks - Imported track catalog rows
 * @param tasks - Imported task catalog rows
 * @param agents - Fleet agents available to the imported task assignments
 * @returns Project view payload with every imported task visible in one phase
 */
export function buildProjectDetail(
  project: ProjectRecord,
  tracks: CatalogTrack[],
  tasks: CatalogTask[],
  agents: CatalogAgent[] = [],
) {
  const tasksByTrack = new Map<string, CatalogTask[]>();
  for (const task of tasks) {
    const rows = tasksByTrack.get(task.trackId) ?? [];
    rows.push(task);
    tasksByTrack.set(task.trackId, rows);
  }

  const assignedAgentNames = new Set(
    tasks
      .map((task) => task.assignee)
      .filter((name): name is string => Boolean(name)),
  );
  const projectAgents = agents
    .filter((agent) => assignedAgentNames.has(agent.name))
    .map((agent) => ({
      _id: agent._id,
      name: agent.name,
      role: agent.role,
      skills: [...agent.skills],
      model: agent.model,
      costPerPoint: agent.costPerPoint,
    }));

  return {
    id: project._id,
    name: project.name,
    slug: project.slug,
    path: project.path ?? '',
    description: project.description,
    lastUpdated: project.updatedAt,
    agents: projectAgents,
    tracks: tracks.map((track) => {
      const trackTasks = tasksByTrack.get(track.trackId) ?? [];
      const phaseTasks = trackTasks.map((task) => ({
        id: task.taskKey,
        description: task.title,
        status: task.status === 'review' ? 'in_progress' : task.status,
        phase: 'Backlog',
        ...(task.assignee ? { agentTag: task.assignee } : {}),
      }));
      return {
        id: track.trackId,
        name: track.title,
        type: 'measure',
        description: '',
        status: track.status,
        planPath: '',
        phases: [
          {
            name: 'Backlog',
            taskCount: phaseTasks.length,
            doneCount: phaseTasks.filter((task) => task.status === 'done').length,
            tasks: phaseTasks,
          },
        ],
      };
    }),
  };
}
