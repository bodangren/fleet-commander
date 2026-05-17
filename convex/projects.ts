import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';
import { projectStatus, sourceKind } from './lib/validators';

function parsePhaseAssignments(
  planMarkdown: string,
  trackId: string,
): Map<string, string> {
  const taskPhaseMap = new Map<string, string>();
  const lines = planMarkdown.split('\n');
  let currentPhase = 'Unphased';
  let taskIndex = 0;

  for (const line of lines) {
    const phaseMatch = line.match(/^##\s+Phase\s+\d+\s*:\s*(.+)$/i);
    if (phaseMatch) {
      currentPhase = phaseMatch[1].trim();
      continue;
    }

    const taskMatch = line.match(/^(\s*)-\s*\[[ x~]\]\s/);
    if (taskMatch) {
      const indent = taskMatch[1].length;
      if (indent > 0) continue;
      taskIndex++;
      const taskKey = `${trackId}-task-${taskIndex}`;
      taskPhaseMap.set(taskKey, currentPhase);
    }
  }

  return taskPhaseMap;
}

function deriveTrackStatus(
  storedStatus: string,
  tasks: Array<{ status: string }>,
): string {
  if (storedStatus === 'complete' || storedStatus === 'archived') return storedStatus;
  if (tasks.length === 0) return storedStatus;

  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const blockedCount = tasks.filter((t) => t.status === 'blocked').length;

  if (doneCount === tasks.length) return 'complete';
  if (blockedCount > 0 && inProgressCount > 0) return 'blocked';
  if (inProgressCount > 0 || (doneCount > 0 && doneCount < tasks.length)) return 'active';
  if (blockedCount > 0) return 'blocked';
  return storedStatus;
}

const projectResponse = v.object({
  slug: v.string(),
  name: v.string(),
  description: v.string(),
  status: projectStatus,
  updatedAt: v.number(),
});

export const listProjects = query({
  args: {},
  returns: v.array(projectResponse),
  handler: async (ctx) => {
    await resolveActor(ctx);
    const docs = await ctx.db.query('projects').order('desc').collect();
    return docs.map((doc) => ({
      slug: doc.slug,
      name: doc.name,
      description: doc.description,
      status: doc.status,
      updatedAt: doc.updatedAt,
    }));
  },
});

export const getProjectBySlug = query({
  args: { slug: v.string() },
  returns: v.union(projectResponse, v.null()),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db
      .query('projects')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();

    if (!doc) {
      return null;
    }

    return {
      slug: doc.slug,
      name: doc.name,
      rootPath: doc.rootPath,
      status: doc.status,
      source: doc.source,
      updatedAt: doc.updatedAt,
      lastSyncedAt: doc.lastSyncedAt,
    };
  },
});

const taskResponse = v.object({
  id: v.string(),
  description: v.string(),
  status: v.string(),
  agentTag: v.optional(v.string()),
  phase: v.string(),
});

const phaseResponse = v.object({
  name: v.string(),
  taskCount: v.number(),
  doneCount: v.number(),
  tasks: v.array(taskResponse),
});

const trackResponse = v.object({
  id: v.string(),
  name: v.string(),
  type: v.string(),
  description: v.string(),
  status: v.string(),
  planPath: v.string(),
  phases: v.array(phaseResponse),
});

const projectDetailResponse = v.object({
  id: v.string(),
  name: v.string(),
  path: v.string(),
  tracks: v.array(trackResponse),
  lastUpdated: v.number(),
});

export const getProjectDetail = query({
  args: { slug: v.string() },
  returns: v.union(projectDetailResponse, v.null()),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const project = await ctx.db
      .query('projects')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();

    if (!project) {
      return null;
    }

    const tracks = await ctx.db
      .query('tracks')
      .withIndex('by_project', (q) => q.eq('projectSlug', args.slug))
      .collect();

    const tasks = await ctx.db
      .query('tasks')
      .withIndex('by_project', (q) => q.eq('projectSlug', args.slug))
      .collect();

    const tasksByTrack = new Map<string, typeof tasks>();
    for (const task of tasks) {
      const list = tasksByTrack.get(task.trackId) ?? [];
      list.push(task);
      tasksByTrack.set(task.trackId, list);
    }

    const trackResponses = tracks.map((track) => {
      const trackTasks = tasksByTrack.get(track.trackId) ?? [];
      const effectiveStatus = deriveTrackStatus(track.status, trackTasks);

      const taskPhaseMap = parsePhaseAssignments(track.planMarkdown, track.trackId);

      const phaseMap = new Map<string, Array<typeof trackTasks[0]>>();
      const phaseOrder: string[] = [];
      for (const task of trackTasks) {
        const phase = taskPhaseMap.get(task.taskKey) ?? 'Unphased';
        if (!phaseMap.has(phase)) {
          phaseMap.set(phase, []);
          phaseOrder.push(phase);
        }
        phaseMap.get(phase)!.push(task);
      }

      if (phaseMap.size === 0 && trackTasks.length > 0) {
        phaseMap.set('Implementation', trackTasks);
        phaseOrder.push('Implementation');
      }

      const phases = phaseOrder.map((phaseName) => {
        const phaseTasks = phaseMap.get(phaseName) ?? [];
        return {
          name: phaseName,
          taskCount: phaseTasks.length,
          doneCount: phaseTasks.filter((t) => t.status === 'done').length,
          tasks: phaseTasks.map((task) => ({
            id: task.taskKey,
            description: task.title,
            status: task.status,
            agentTag: task.assignee,
            phase: phaseName,
          })),
        };
      });

      return {
        id: track.trackId,
        name: track.title,
        type: 'feature',
        description: track.title,
        status: effectiveStatus,
        planPath: track.trackId,
        phases,
      };
    });

    return {
      id: project.slug,
      name: project.name,
      path: project.slug,
      tracks: trackResponses,
      lastUpdated: Math.floor(project.updatedAt / 1000),
    };
  },
});

export const listProjectsHandler = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('projects'),
      name: v.string(),
      description: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const docs = await ctx.db.query('projects').order('desc').collect();
    return docs.map((doc) => {
      const { _creationTime, ...rest } = doc as any;
      return rest;
    });
  },
});

export const getProjectHandler = query({
  args: { id: v.id('projects') },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('projects'),
      name: v.string(),
      description: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;
    const { _creationTime, ...rest } = doc as any;
    return rest;
  },
});

export const createProjectHandler = mutation({
  args: {
    name: v.string(),
    description: v.string(),
  },
  returns: v.id('projects'),
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert('projects', {
      name: args.name,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateProjectHandler = mutation({
  args: {
    id: v.id('projects'),
    name: v.string(),
    description: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return null;
    await ctx.db.patch(args.id, {
      name: args.name,
      description: args.description,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const deleteProject = mutation({
  args: { slug: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db
      .query('projects')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();
    if (!doc) return false;
    await ctx.db.delete(doc._id);
    return true;
  },
});

export const upsertProject = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.optional(projectStatus),
  },
  returns: projectResponse,
  handler: async (ctx, args) => {
    const actor = await resolveActor(ctx);
    void actor;
    const now = Date.now();

    const existing = await ctx.db
      .query('projects')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();

    const next = {
      slug: args.slug,
      name: args.name,
      description: args.description ?? '',
      status: args.status ?? 'active',
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, next);
    } else {
      await ctx.db.insert('projects', {
        ...next,
        createdAt: now,
      });
    }

    return next;
  },
});
