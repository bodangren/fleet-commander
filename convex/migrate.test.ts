import { describe, expect, it } from 'bun:test';
import { migrateProject, migrateTask } from './migrate';
import type { Project, Task } from '../pivot/src/__fixtures__/convex-mock';

describe('migrate to simplified schema', () => {
  it('migrateProject preserves name and maps status', () => {
    const old = {
      slug: 'test-project',
      name: 'Test Project',
      rootPath: '/tmp/test',
      status: 'active',
      source: 'manual',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const migrated = migrateProject(old) as Project;
    expect(migrated).toBeDefined();
    expect(migrated.name).toBe('Test Project');
    expect(migrated.status).toBe('active');
    expect(migrated.createdAt).toBe(old.createdAt);
  });

  it('migrateTask preserves title and maps status', () => {
    const old = {
      projectSlug: 'test-project',
      trackId: 'track-1',
      taskKey: 'task-1',
      title: 'Old Task Title',
      status: 'todo',
      assignee: 'agent-1',
      dependencies: [],
      updatedAt: Date.now(),
    };
    const migrated = migrateTask(old, 'test-project') as Task;
    expect(migrated).toBeDefined();
    expect(migrated.title).toBe('Old Task Title');
    expect(migrated.projectId).toBe('test-project');
    expect(migrated.status).toBeDefined();
    expect(migrated.assignee).toBe('agent-1');
  });
});
