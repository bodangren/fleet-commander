import { describe, expect, it } from 'bun:test';
import * as projects from './projects';
import { createMockCtx, sampleProject } from './__fixtures__/foundation';

describe('listProjectsHandler', () => {
  it('returns all projects ordered by createdAt desc', async () => {
    expect(projects.listProjectsHandler).toBeDefined();
    const ctx = createMockCtx();
    await ctx.db.insert('projects', { ...sampleProject, name: 'Alpha', createdAt: 1000 });
    await ctx.db.insert('projects', { ...sampleProject, name: 'Beta', createdAt: 2000 });

    const result = await projects.listProjectsHandler(ctx);

    expect(result.length).toBe(2);
    expect(result[0].name).toBe('Beta');
    expect(result[1].name).toBe('Alpha');
  });

  it('returns empty array when no projects exist', async () => {
    expect(projects.listProjectsHandler).toBeDefined();
    const ctx = createMockCtx();
    const result = await projects.listProjectsHandler(ctx);
    expect(result).toEqual([]);
  });

  it('strips _creationTime from results', async () => {
    expect(projects.listProjectsHandler).toBeDefined();
    const ctx = createMockCtx();
    await ctx.db.insert('projects', sampleProject);
    const result = await projects.listProjectsHandler(ctx);
    expect(result[0]._creationTime).toBeUndefined();
    expect(result[0]._id).toBeDefined();
  });
});

describe('getProjectHandler', () => {
  it('returns project by id', async () => {
    expect(projects.getProjectHandler).toBeDefined();
    const ctx = createMockCtx();
    const id = await ctx.db.insert('projects', sampleProject);
    const result = await projects.getProjectHandler(ctx, { id });
    expect(result).toBeDefined();
    expect(result!.name).toBe(sampleProject.name);
    expect(result!.description).toBe(sampleProject.description);
  });

  it('returns null when project not found', async () => {
    expect(projects.getProjectHandler).toBeDefined();
    const ctx = createMockCtx();
    const result = await projects.getProjectHandler(ctx, { id: 'project-999' });
    expect(result).toBeNull();
  });

  it('strips _creationTime from result', async () => {
    expect(projects.getProjectHandler).toBeDefined();
    const ctx = createMockCtx();
    const id = await ctx.db.insert('projects', sampleProject);
    const result = await projects.getProjectHandler(ctx, { id });
    expect(result!._creationTime).toBeUndefined();
  });
});

describe('createProjectHandler', () => {
  it('inserts a new project with timestamps', async () => {
    expect(projects.createProjectHandler).toBeDefined();
    const ctx = createMockCtx();
    const id = await projects.createProjectHandler(ctx, {
      name: 'New Project',
      description: 'A test project',
    });

    const created = await ctx.db.get(id);
    expect(created).toBeDefined();
    expect(created.name).toBe('New Project');
    expect(created.description).toBe('A test project');
    expect(created.createdAt).toBeGreaterThan(0);
    expect(created.updatedAt).toBeGreaterThan(0);
  });
});

describe('updateProjectHandler', () => {
  it('updates project name and description', async () => {
    expect(projects.updateProjectHandler).toBeDefined();
    const ctx = createMockCtx();
    const id = await ctx.db.insert('projects', sampleProject);
    await projects.updateProjectHandler(ctx, {
      id,
      name: 'Updated Name',
      description: 'Updated description',
    });

    const updated = await ctx.db.get(id);
    expect(updated.name).toBe('Updated Name');
    expect(updated.description).toBe('Updated description');
    expect(updated.createdAt).toBe(sampleProject.createdAt);
  });
});
