import type { Task, TaskStatus } from '../types';

export interface MakeTaskInput {
  taskKey: string;
  dependencies?: string[];
  storyPoints?: number;
  status?: TaskStatus;
  title?: string;
  projectSlug?: string;
  trackId?: string;
  updatedAt?: number;
}

/**
 * Build a Task with sensible defaults for dependency-graph tests.
 *
 * NOTE: The `Task` type in `../types` does not yet declare `storyPoints`
 * (see test-strategy §4.2 — removal of the `(task as any)?.storyPoints` cast
 * is deferred to a follow-up that also extends the Task type). For now we
 * widen the return to `Task` so the fixture can carry the field, mirroring
 * the existing local helper in `dependencyUtils.test.ts`.
 */
export function makeTask(input: MakeTaskInput): Task {
  const {
    taskKey,
    dependencies = [],
    storyPoints = 3,
    status = 'ready',
    title = `Task ${taskKey}`,
    projectSlug = 'test-project',
    trackId = 'test-track',
    updatedAt = 0,
  } = input;
  return {
    projectSlug,
    trackId,
    taskKey,
    title,
    status,
    dependencies,
    updatedAt,
    storyPoints,
  } as unknown as Task;
}

export const linearChain3: Task[] = [
  makeTask({ taskKey: 'A' }),
  makeTask({ taskKey: 'B', dependencies: ['A'] }),
  makeTask({ taskKey: 'C', dependencies: ['B'] }),
];

export const diamond: Task[] = [
  makeTask({ taskKey: 'A', storyPoints: 2 }),
  makeTask({ taskKey: 'B', dependencies: ['A'], storyPoints: 8 }),
  makeTask({ taskKey: 'C', dependencies: ['A'], storyPoints: 3 }),
  makeTask({ taskKey: 'D', dependencies: ['B', 'C'], storyPoints: 1 }),
];

export const parallelBranches: Task[] = [
  makeTask({ taskKey: 'A', storyPoints: 5 }),
  makeTask({ taskKey: 'B', storyPoints: 3 }),
  makeTask({ taskKey: 'C', dependencies: ['A'], storyPoints: 2 }),
  makeTask({ taskKey: 'D', dependencies: ['B'], storyPoints: 10 }),
];

export const disconnected: Task[] = [
  makeTask({ taskKey: 'A', storyPoints: 5 }),
  makeTask({ taskKey: 'B', dependencies: ['A'], storyPoints: 3 }),
  makeTask({ taskKey: 'C', storyPoints: 1 }),
  makeTask({ taskKey: 'D', dependencies: ['C'], storyPoints: 7 }),
];

export const selfLoop: Task[] = [
  makeTask({ taskKey: 'A', dependencies: ['A'] }),
];

export const twoCycle: Task[] = [
  makeTask({ taskKey: 'A', dependencies: ['B'] }),
  makeTask({ taskKey: 'B', dependencies: ['A'] }),
];

export const threeCycle: Task[] = [
  makeTask({ taskKey: 'A', dependencies: ['C'] }),
  makeTask({ taskKey: 'B', dependencies: ['A'] }),
  makeTask({ taskKey: 'C', dependencies: ['B'] }),
];

export const missingDependencyGraph: Task[] = [
  makeTask({ taskKey: 'A' }),
  makeTask({ taskKey: 'B', dependencies: ['A', 'NONEXISTENT'] }),
];
