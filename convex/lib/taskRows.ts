import type { Infer } from 'convex/values';
import { taskStatus } from './validators';

type TaskStatusValue = Infer<typeof taskStatus>;

/**
 * The subset of a `tasks` document fields needed to build a list row.
 */
export interface TaskDocLike {
  projectSlug?: string;
  trackId?: string;
  taskKey?: string;
  title: string;
  status: TaskStatusValue;
  assigneeName?: string;
  reviewerId?: string;
  mergerId?: string;
  dependencies?: string[];
  updatedAt: number;
}

/**
 * The shape returned by `listTasksByProject` / `listAllTasks`.
 */
export interface TaskRow {
  projectSlug: string;
  trackId: string;
  taskKey: string;
  title: string;
  status: TaskStatusValue;
  assignee?: string;
  reviewerId?: string;
  mergerId?: string;
  dependencies: string[];
  updatedAt: number;
}

/**
 * Map a task document to the orchestrator-facing list row, filling defaults for
 * optional fields.
 * @param doc - The task document (or compatible subset)
 * @param fallbackProjectSlug - Slug to use when the doc has no projectSlug
 * @returns The normalized task row
 */
export function mapTaskDocToRow(doc: TaskDocLike, fallbackProjectSlug = ''): TaskRow {
  return {
    projectSlug: doc.projectSlug ?? fallbackProjectSlug,
    trackId: doc.trackId ?? '',
    taskKey: doc.taskKey ?? '',
    title: doc.title,
    status: doc.status,
    assignee: doc.assigneeName,
    reviewerId: doc.reviewerId,
    mergerId: doc.mergerId,
    dependencies: doc.dependencies ?? [],
    updatedAt: doc.updatedAt,
  };
}
