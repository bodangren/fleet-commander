import { mutation } from './_generated/server';
import { v } from 'convex/values';

export interface OldProject {
  slug: string;
  name: string;
  rootPath: string;
  status: string;
  source: string;
  createdAt: number;
  updatedAt: number;
  lastSyncedAt?: number;
}

export interface OldTask {
  projectSlug: string;
  trackId: string;
  taskKey: string;
  title: string;
  status: string;
  assignee?: string;
  dependencies: string[];
  updatedAt: number;
}

const oldToNewStatus: Record<string, string> = {
  todo: 'backlog',
  ready: 'ready',
  in_progress: 'in_progress',
  blocked: 'blocked',
  done: 'done',
};

export function migrateProject(old: OldProject) {
  return {
    name: old.name,
    description: old.rootPath,
    status: old.status === 'active' || old.status === 'paused' || old.status === 'archived'
      ? old.status
      : 'active',
    createdAt: old.createdAt,
    updatedAt: old.updatedAt,
  };
}

export function migrateTask(old: OldTask, _newProjectId: string) {
  return {
    title: old.title,
    description: '',
    status: oldToNewStatus[old.status] ?? 'backlog',
    priority: 'medium',
    assignee: old.assignee,
    projectId: old.projectSlug,
    createdAt: old.updatedAt,
    updatedAt: old.updatedAt,
  };
}

export const migrateSimplifiedSchema = mutation({
  args: {},
  returns: v.null(),
  handler: async (_ctx) => {
    return null;
  },
});