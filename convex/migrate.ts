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

export function migrateProject(_old: OldProject) {
  // TODO: implement
  return null as any;
}

export function migrateTask(_old: OldTask, _newProjectId: string) {
  // TODO: implement
  return null as any;
}

export const migrateSimplifiedSchema = mutation({
  args: {},
  returns: v.null(),
  handler: async (_ctx) => {
    // TODO: implement
    return null;
  },
});
