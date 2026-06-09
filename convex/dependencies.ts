import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';
import { taskStatus } from './lib/validators';

/**
 * Checks if completing a task unblocks any downstream tasks.
 * Returns the list of newly unblocked task keys.
 * Call this after a task status changes to 'done'.
 */
export const checkAndUnblockDownstream = mutation({
  args: {
    completedTaskKey: v.string(),
  },
  returns: v.object({
    unblocked: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    await resolveActor(ctx);

    const completedTask = await ctx.db
      .query('tasks')
      .withIndex('by_task_key', (q) => q.eq('taskKey', args.completedTaskKey))
      .unique();

    if (!completedTask || completedTask.status !== 'done') {
      return { unblocked: [] };
    }

    // Find all tasks in the same project that depend on this task (bounded)
    const projectTasks = await ctx.db
      .query('tasks')
      .withIndex('by_project', (q) => q.eq('projectId', completedTask.projectId))
      .take(500);

    const unblocked: string[] = [];

    for (const task of projectTasks) {
      if (task.status !== 'blocked') continue;
      const deps = (task.dependencies as string[]) ?? [];
      if (!deps.includes(args.completedTaskKey)) continue;

      // Check if all dependencies are now done
      const allDepsDone = deps.every((depKey) => {
        const depTask = projectTasks.find((t) => t.taskKey === depKey);
        return depTask && depTask.status === 'done';
      });

      if (allDepsDone) {
        await ctx.db.patch(task._id, {
          status: 'ready',
          blockerReason: undefined,
          updatedAt: Date.now(),
        });
        unblocked.push(task.taskKey as string);
      }
    }

    return { unblocked };
  },
});

/**
 * Adds a dependency from one task to another with cycle detection.
 * Rejects if either task doesn't exist or if adding the edge would create a cycle.
 */
export const addTaskDependency = mutation({
  args: {
    taskKey: v.string(),
    dependencyKey: v.string(),
  },
  returns: v.object({
    ok: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    await resolveActor(ctx);

    if (args.taskKey === args.dependencyKey) {
      return { ok: false, error: 'Cannot add self-dependency' };
    }

    const task = await ctx.db
      .query('tasks')
      .withIndex('by_task_key', (q) => q.eq('taskKey', args.taskKey))
      .unique();
    if (!task) return { ok: false, error: `Task ${args.taskKey} not found` };

    const depTask = await ctx.db
      .query('tasks')
      .withIndex('by_task_key', (q) => q.eq('taskKey', args.dependencyKey))
      .unique();
    if (!depTask) return { ok: false, error: `Dependency task ${args.dependencyKey} not found` };

    const currentDeps = (task.dependencies as string[]) ?? [];
    if (currentDeps.includes(args.dependencyKey)) {
      return { ok: false, error: 'Dependency already exists' };
    }

    // Cycle detection: check if adding this edge would create a cycle.
    // Build adjacency (task → dep) from existing edges in the same project.
    const allTasks = await ctx.db
      .query('tasks')
      .withIndex('by_project', (q) => q.eq('projectId', task.projectId))
      .take(500);

    const adjacency = new Map<string, string[]>();
    for (const t of allTasks) {
      const key = t.taskKey as string;
      const deps = (t.dependencies as string[]) ?? [];
      adjacency.set(key, deps);
    }
    // BFS from dependencyKey through existing task→dep edges.
    // If taskKey is reachable, adding this edge would close a cycle.
    const visited = new Set<string>();
    const queue = [args.dependencyKey];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === args.taskKey) {
        return { ok: false, error: 'Adding this dependency would create a cycle' };
      }
      if (visited.has(current)) continue;
      visited.add(current);
      for (const neighbor of adjacency.get(current) ?? []) {
        queue.push(neighbor);
      }
    }

    // No cycle - add the dependency
    const newDeps = [...currentDeps, args.dependencyKey];
    await ctx.db.patch(task._id, {
      dependencies: newDeps,
      updatedAt: Date.now(),
    });

    // If the dependency task is not done, block this task (or refresh blockerReason)
    if (depTask.status !== 'done') {
      await ctx.db.patch(task._id, {
        status: 'blocked',
        blockerReason: `Waiting on ${args.dependencyKey}`,
      });
    }

    return { ok: true };
  },
});

/**
 * Removes a dependency from a task.
 */
export const removeTaskDependency = mutation({
  args: {
    taskKey: v.string(),
    dependencyKey: v.string(),
  },
  returns: v.object({
    ok: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    await resolveActor(ctx);

    const task = await ctx.db
      .query('tasks')
      .withIndex('by_task_key', (q) => q.eq('taskKey', args.taskKey))
      .unique();
    if (!task) return { ok: false, error: `Task ${args.taskKey} not found` };

    const currentDeps = (task.dependencies as string[]) ?? [];
    const idx = currentDeps.indexOf(args.dependencyKey);
    if (idx === -1) {
      return { ok: false, error: 'Dependency does not exist' };
    }

    const newDeps = currentDeps.filter((d) => d !== args.dependencyKey);
    const patch: Record<string, unknown> = {
      dependencies: newDeps,
      updatedAt: Date.now(),
    };

    // If no more blocking dependencies, unblock the task
    if (newDeps.length === 0 && task.status === 'blocked') {
      patch.status = 'ready';
      patch.blockerReason = undefined;
    } else if (newDeps.length > 0 && task.status === 'blocked') {
      // Check if remaining deps are all done
      const remainingDeps = await Promise.all(
        newDeps.map((depKey) =>
          ctx.db
            .query('tasks')
            .withIndex('by_task_key', (q) => q.eq('taskKey', depKey))
            .unique(),
        ),
      );
      const allDone = remainingDeps.every((d) => d && d.status === 'done');
      if (allDone) {
        patch.status = 'ready';
        patch.blockerReason = undefined;
      }
    }

    await ctx.db.patch(task._id, patch);
    return { ok: true };
  },
});

/**
 * Returns a task with its resolved dependency objects (not just keys).
 */
export const getTaskWithDependencies = query({
  args: { taskKey: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      taskKey: v.string(),
      title: v.string(),
      status: taskStatus,
      storyPoints: v.number(),
      dependencies: v.array(
        v.object({
          taskKey: v.string(),
          title: v.string(),
          status: taskStatus,
          storyPoints: v.number(),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const task = await ctx.db
      .query('tasks')
      .withIndex('by_task_key', (q) => q.eq('taskKey', args.taskKey))
      .unique();
    if (!task) return null;

    const depKeys = (task.dependencies as string[]) ?? [];
    const depTasks = await Promise.all(
      depKeys.map((depKey) =>
        ctx.db
          .query('tasks')
          .withIndex('by_task_key', (q) => q.eq('taskKey', depKey))
          .unique(),
      ),
    );

    return {
      taskKey: task.taskKey as string,
      title: task.title,
      status: task.status,
      storyPoints: task.storyPoints ?? 0,
      dependencies: depTasks
        .filter((d): d is NonNullable<typeof d> => d !== null)
        .map((d) => ({
          taskKey: d.taskKey as string,
          title: d.title,
          status: d.status,
          storyPoints: d.storyPoints ?? 0,
        })),
    };
  },
});

/**
 * Returns all blocked tasks for a project with their blocker chains.
 * Uses index and bounded collection.
 */
export const getBlockedTasks = query({
  args: {
    projectId: v.string(),
  },
  returns: v.array(
    v.object({
      taskKey: v.string(),
      title: v.string(),
      status: taskStatus,
      updatedAt: v.number(),
      blockerChain: v.array(
        v.object({
          taskKey: v.string(),
          title: v.string(),
          status: taskStatus,
          depth: v.number(),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const blockedTasks = await ctx.db
      .query('tasks')
      .withIndex('by_status', (q) => q.eq('status', 'blocked'))
      .take(200);

    const projectBlocked = blockedTasks.filter(
      (t) => (t.projectId as string) === args.projectId,
    );

    // Get tasks for the project to resolve chains (bounded)
    const allProjectTasks = await ctx.db
      .query('tasks')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId as any))
      .take(500);

    const taskMap = new Map<string, (typeof allProjectTasks)[0]>();
    for (const t of allProjectTasks) {
      taskMap.set(t.taskKey as string, t);
    }

    return projectBlocked.map((task) => {
      const depKeys = (task.dependencies as string[]) ?? [];
      const blockerChain: Array<{
        taskKey: string;
        title: string;
        status: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked';
        depth: number;
      }> = [];

      // BFS to build transitive blocker chain
      const visited = new Set<string>();
      const queue = depKeys.map((k) => ({ key: k, depth: 1 }));

      while (queue.length > 0) {
        const { key, depth } = queue.shift()!;
        if (visited.has(key)) continue;
        visited.add(key);

        const depTask = taskMap.get(key);
        if (!depTask) continue;

        blockerChain.push({
          taskKey: key,
          title: depTask.title,
          status: depTask.status,
          depth,
        });

        const transitiveDeps = (depTask.dependencies as string[]) ?? [];
        for (const td of transitiveDeps) {
          if (!visited.has(td)) {
            queue.push({ key: td, depth: depth + 1 });
          }
        }
      }

      return {
        taskKey: task.taskKey as string,
        title: task.title,
        status: task.status,
        updatedAt: task.updatedAt,
        blockerChain,
      };
    });
  },
});

/**
 * Returns the critical path for active tasks in a project.
 * Computes the longest weighted path through the dependency graph.
 */
export const getCriticalPath = query({
  args: { projectId: v.string() },
  returns: v.object({
    path: v.array(v.string()),
    totalStoryPoints: v.number(),
    length: v.number(),
  }),
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query('tasks')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId as any))
      .take(500);

    // Filter to non-done tasks for critical path
    const activeTasks = tasks.filter((t) => t.status !== 'done');

    const taskMap = new Map<string, (typeof tasks)[0]>();
    for (const t of activeTasks) {
      taskMap.set(t.taskKey as string, t);
    }

    // Topological sort using Kahn's algorithm
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    for (const t of activeTasks) {
      const key = t.taskKey as string;
      if (!inDegree.has(key)) inDegree.set(key, 0);
      if (!adjacency.has(key)) adjacency.set(key, []);

      const deps = (t.dependencies as string[]) ?? [];
      for (const dep of deps) {
        if (!taskMap.has(dep)) continue;
        if (!adjacency.has(dep)) adjacency.set(dep, []);
        adjacency.get(dep)!.push(key);
        inDegree.set(key, (inDegree.get(key) ?? 0) + 1);
      }
    }

    const queue: string[] = [];
    for (const [key, deg] of inDegree) {
      if (deg === 0) queue.push(key);
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);
      for (const neighbor of adjacency.get(current) ?? []) {
        const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDeg);
        if (newDeg === 0) queue.push(neighbor);
      }
    }

    if (sorted.length !== activeTasks.length) {
      return { path: [], totalStoryPoints: 0, length: 0 };
    }

    // DP for longest weighted path
    const dist = new Map<string, number>();
    const prev = new Map<string, string | null>();

    for (const key of sorted) {
      const task = taskMap.get(key);
      dist.set(key, task?.storyPoints ?? 1);
      prev.set(key, null);
    }

    for (const v of sorted) {
      const vTask = taskMap.get(v);
      if (!vTask) continue;
      const deps = (vTask.dependencies as string[]) ?? [];
      for (const u of deps) {
        if (!taskMap.has(u)) continue;
        const candidate = (dist.get(u) ?? 0) + (vTask.storyPoints ?? 1);
        if (candidate > (dist.get(v) ?? 0)) {
          dist.set(v, candidate);
          prev.set(v, u);
        }
      }
    }

    let maxDist = 0;
    let endKey: string | null = null;
    for (const [key, d] of dist) {
      if (d > maxDist) {
        maxDist = d;
        endKey = key;
      }
    }

    if (!endKey) return { path: [], totalStoryPoints: 0, length: 0 };

    const path: string[] = [];
    let current: string | null = endKey;
    while (current !== null) {
      path.unshift(current);
      current = prev.get(current) ?? null;
    }

    const totalStoryPoints = path.reduce((sum, key) => {
      const t = taskMap.get(key);
      return sum + (t?.storyPoints ?? 1);
    }, 0);

    return { path, totalStoryPoints, length: path.length };
  },
});
