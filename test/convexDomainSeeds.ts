import type { Doc, Id } from '../convex/_generated/dataModel';
import { createConvexTest } from './convexTest';

export type ConvexTest = ReturnType<typeof createConvexTest>;
export type TaskStatus = Doc<'tasks'>['status'];

/**
 * Inserts a schema-valid project for an isolated runtime scenario.
 *
 * @param t - Isolated convex-test runtime.
 * @param slug - Stable project slug.
 * @returns The persisted project ID.
 */
export async function seedProject(t: ConvexTest, slug: string): Promise<Id<'projects'>> {
  return t.run((ctx) =>
    ctx.db.insert('projects', {
      name: slug,
      slug,
      description: `Runtime project for ${slug}`,
      createdAt: 1_000,
      updatedAt: 1_000,
    }),
  );
}

/**
 * Inserts a schema-valid agent used by assignment and planning scenarios.
 *
 * @param t - Isolated convex-test runtime.
 * @param name - Stable agent name.
 * @param workload - Initial assigned workload.
 * @param maxWorkload - Maximum allowed workload.
 * @param costPerPoint - Cost multiplier used by assignment calculations.
 * @returns The persisted agent ID.
 */
export async function seedAgent(
  t: ConvexTest,
  name: string,
  workload = 0,
  maxWorkload = 5,
  costPerPoint = 2,
): Promise<Id<'agents'>> {
  return t.run((ctx) =>
    ctx.db.insert('agents', {
      name,
      role: 'executor',
      skills: ['typescript'],
      model: 'claude-sonnet',
      costPerPoint,
      reliability: 0.9,
      status: 'active',
      workload,
      maxWorkload,
      createdAt: 1_000,
    }),
  );
}

export type TaskSeed = {
  projectId: Id<'projects'>;
  title: string;
  status?: TaskStatus;
  sprintId?: Id<'sprints'>;
  assigneeId?: Id<'agents'>;
  taskKey?: string;
  dependencies?: string[];
  actualCost?: number;
  storyPoints?: number;
  costEstimate?: number;
  projectSlug?: string;
  trackId?: string;
  createdAt?: number;
  updatedAt?: number;
};

/**
 * Inserts a schema-valid task so registered reads and mutations use a real ID.
 *
 * @param t - Isolated convex-test runtime.
 * @param seed - Required project/title plus scenario-specific task fields.
 * @returns The persisted task ID.
 */
export async function seedTask(t: ConvexTest, seed: TaskSeed): Promise<Id<'tasks'>> {
  return t.run((ctx) =>
    ctx.db.insert('tasks', {
      projectId: seed.projectId,
      ...(seed.sprintId === undefined ? {} : { sprintId: seed.sprintId }),
      title: seed.title,
      description: `Runtime task for ${seed.title}`,
      storyPoints: seed.storyPoints ?? 4,
      status: seed.status ?? 'backlog',
      priority: 'medium',
      costEstimate: seed.costEstimate ?? 0,
      ...(seed.actualCost === undefined ? {} : { actualCost: seed.actualCost }),
      ...(seed.assigneeId === undefined ? {} : { assigneeId: seed.assigneeId }),
      ...(seed.projectSlug === undefined ? {} : { projectSlug: seed.projectSlug }),
      ...(seed.trackId === undefined ? {} : { trackId: seed.trackId }),
      ...(seed.taskKey === undefined ? {} : { taskKey: seed.taskKey }),
      ...(seed.dependencies === undefined ? {} : { dependencies: seed.dependencies }),
      createdAt: seed.createdAt ?? 3_000,
      updatedAt: seed.updatedAt ?? 3_000,
    }),
  );
}

/**
 * Inserts a schema-valid sprint for planning and task-domain scenarios.
 *
 * @param t - Isolated convex-test runtime.
 * @param projectId - Owning project ID.
 * @param status - Canonical sprint status.
 * @param name - Stable sprint name.
 * @returns The persisted sprint ID.
 */
export async function seedSprint(
  t: ConvexTest,
  projectId: Id<'projects'>,
  status: 'planned' | 'active' | 'closed',
  name: string,
): Promise<Id<'sprints'>> {
  return t.run((ctx) =>
    ctx.db.insert('sprints', {
      projectId,
      name,
      status,
      budget: 100,
      actualCost: 0,
      pointsDelivered: 0,
      taskCount: 0,
      completedCount: 0,
      createdAt: 2_000,
      ...(status === 'planned' ? {} : { startedAt: 2_100 }),
      ...(status === 'closed' ? { closedAt: 2_500 } : {}),
    }),
  );
}
