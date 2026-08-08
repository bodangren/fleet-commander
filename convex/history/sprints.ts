import { v } from 'convex/values';
import { query } from '../_generated/server';
import { resolveActor } from '../lib/auth';

const sprintHistoryResponse = v.object({
  _id: v.id('sprints'),
  projectId: v.id('projects'),
  name: v.string(),
  status: v.string(),
  budget: v.number(),
  actualCost: v.number(),
  pointsDelivered: v.number(),
  taskCount: v.number(),
  completedCount: v.number(),
  velocity: v.number(),
  pointsEstimated: v.number(),
  createdAt: v.number(),
  startedAt: v.optional(v.number()),
  closedAt: v.optional(v.number()),
});

export const listSprintHistoryHandler = query({
  args: {
    projectId: v.id('projects'),
    limit: v.optional(v.number()),
  },
  returns: v.array(sprintHistoryResponse),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found');

    let docs = await ctx.db
      .query('sprints')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .collect();

    if (args.limit != null) {
      docs = docs.slice(0, args.limit);
    }

    const tasks = await ctx.db
      .query('tasks')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();

    return docs.map((doc) => {
      const sprintTasks = tasks.filter((t: any) => t.sprintId === doc._id);
      const pointsEstimated = sprintTasks.reduce(
        (sum: number, t: any) => sum + (t.storyPoints ?? 0),
        0
      );
      const velocity = doc.taskCount > 0 ? doc.pointsDelivered / doc.taskCount : 0;
      const { _creationTime, ...rest } = doc as any;
      return {
        ...rest,
        velocity,
        pointsEstimated,
      };
    });
  },
});

export const getSprintHistoryHandler = query({
  args: { id: v.id('sprints') },
  returns: v.union(v.null(), sprintHistoryResponse),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;

    const sprintTasks = await ctx.db
      .query('tasks')
      .withIndex('by_project', (q) => q.eq('projectId', doc.projectId))
      .collect()
      .then((tasks) => tasks.filter((t: any) => t.sprintId === doc._id));

    const pointsEstimated = sprintTasks.reduce(
      (sum: number, t: any) => sum + (t.storyPoints ?? 0),
      0
    );
    const velocity = doc.taskCount > 0 ? doc.pointsDelivered / doc.taskCount : 0;
    const { _creationTime, ...rest } = doc as any;
    return {
      ...rest,
      velocity,
      pointsEstimated,
    };
  },
});
