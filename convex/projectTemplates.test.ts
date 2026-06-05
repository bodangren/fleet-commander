/**
 * Convex handler tests for the projectTemplates table (Phase 2 of the Project Template Marketplace track).
 *
 * These tests assert the contract for the Convex mutations and queries that back the
 * template gallery. They follow the same shape as `convex/agentTemplates.test.ts` and
 * rely on `createMockCtx` (extended to support the projectTemplates table) per the
 * test strategy.
 *
 * They are written first (Red phase) so the implementation has a clear contract to satisfy.
 *
 * Spec: measure/tracks/project_template_marketplace_20260530/spec.md
 * Test strategy: measure/tracks/project_template_marketplace_20260530/test-strategy.md
 */
import { describe, expect, it } from 'bun:test';
import {
  listProjectTemplatesHandler,
  getProjectTemplateHandler,
  createProjectTemplateHandler,
  deleteProjectTemplateHandler,
  instantiateProjectHandler,
  seedDefaultProjectTemplatesHandler,
} from './projectTemplates';
import { createMockCtx, sampleProjectTemplate } from './__fixtures__/foundation';
import {
  instantiateProjectFromTemplate,
  recommendBudget,
} from './lib/projectTemplates';

function seedProjectTemplateFields() {
  return {
    name: sampleProjectTemplate.name,
    description: sampleProjectTemplate.description,
    category: sampleProjectTemplate.category,
    tasks: sampleProjectTemplate.tasks,
    defaultAgents: sampleProjectTemplate.defaultAgents,
    estimatedBudget: sampleProjectTemplate.estimatedBudget,
  };
}

describe('listProjectTemplatesHandler', () => {
  it('is exported', () => {
    expect(listProjectTemplatesHandler).toBeDefined();
  });

  it('returns all project templates ordered by createdAt desc', async () => {
    const ctx = createMockCtx();
    const now = Date.now();
    await ctx.db.insert('projectTemplates', {
      ...seedProjectTemplateFields(),
      name: 'Template A',
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('projectTemplates', {
      ...seedProjectTemplateFields(),
      name: 'Template B',
      createdAt: now + 1000,
      updatedAt: now + 1000,
    });

    const result = await listProjectTemplatesHandler(ctx);

    expect(result.length).toBe(2);
    expect(result[0].name).toBe('Template B');
    expect(result[1].name).toBe('Template A');
  });

  it('returns an empty array when no templates exist', async () => {
    const ctx = createMockCtx();
    const result = await listProjectTemplatesHandler(ctx);
    expect(result).toEqual([]);
  });

  it('strips _creationTime from results', async () => {
    const ctx = createMockCtx();
    const now = Date.now();
    await ctx.db.insert('projectTemplates', {
      ...seedProjectTemplateFields(),
      createdAt: now,
      updatedAt: now,
    });
    const result = await listProjectTemplatesHandler(ctx);
    expect(result[0]._creationTime).toBeUndefined();
    expect(result[0]._id).toBeDefined();
  });
});

describe('getProjectTemplateHandler', () => {
  it('is exported', () => {
    expect(getProjectTemplateHandler).toBeDefined();
  });

  it('returns a project template by id', async () => {
    const ctx = createMockCtx();
    const now = Date.now();
    const id = await ctx.db.insert('projectTemplates', {
      ...seedProjectTemplateFields(),
      createdAt: now,
      updatedAt: now,
    });
    const result = await getProjectTemplateHandler(ctx, { id });
    expect(result).toBeDefined();
    expect(result!.name).toBe(sampleProjectTemplate.name);
    expect(result!.category).toBe(sampleProjectTemplate.category);
    expect(result!.tasks).toHaveLength(sampleProjectTemplate.tasks.length);
  });

  it('returns null when the template does not exist', async () => {
    const ctx = createMockCtx();
    const result = await getProjectTemplateHandler(ctx, { id: 'projectTemplates-999' });
    expect(result).toBeNull();
  });
});

describe('createProjectTemplateHandler', () => {
  it('is exported', () => {
    expect(createProjectTemplateHandler).toBeDefined();
  });

  it('inserts a new project template with all required fields and timestamps', async () => {
    const ctx = createMockCtx();
    const id = await createProjectTemplateHandler(ctx, seedProjectTemplateFields());
    const created: any = await ctx.db.get(id);

    expect(created).toBeDefined();
    expect(created.name).toBe(sampleProjectTemplate.name);
    expect(created.description).toBe(sampleProjectTemplate.description);
    expect(created.category).toBe(sampleProjectTemplate.category);
    expect(created.tasks).toHaveLength(sampleProjectTemplate.tasks.length);
    expect(created.defaultAgents).toHaveLength(sampleProjectTemplate.defaultAgents.length);
    expect(created.estimatedBudget).toBe(sampleProjectTemplate.estimatedBudget);
    expect(created.createdAt).toBeGreaterThan(0);
    expect(created.updatedAt).toBeGreaterThan(0);
  });

  it('throws on duplicate template name (by_name uniqueness guard)', async () => {
    const ctx = createMockCtx();
    await createProjectTemplateHandler(ctx, seedProjectTemplateFields());
    expect(() => createProjectTemplateHandler(ctx, seedProjectTemplateFields())).toThrow(
      'Template with name "Web App (Next.js)" already exists',
    );
  });

  it('returns the inserted template id', async () => {
    const ctx = createMockCtx();
    const id = await createProjectTemplateHandler(ctx, seedProjectTemplateFields());
    expect(typeof id).toBe('string');
    expect(id).toMatch(/^projectTemplate/);
  });
});

describe('deleteProjectTemplateHandler', () => {
  it('is exported', () => {
    expect(deleteProjectTemplateHandler).toBeDefined();
  });

  it('deletes a template that has no dependent projects', async () => {
    const ctx = createMockCtx();
    const id = await createProjectTemplateHandler(ctx, seedProjectTemplateFields());
    await deleteProjectTemplateHandler(ctx, { id });
    const deleted = await ctx.db.get(id);
    expect(deleted).toBeNull();
  });

  it('throws when a project has been instantiated from the template', async () => {
    const ctx = createMockCtx();
    const id = await createProjectTemplateHandler(ctx, seedProjectTemplateFields());
    // simulate a project that was instantiated from this template
    await ctx.db.insert('projects', {
      name: 'Child Project',
      slug: 'child-project',
      description: 'instantiated from a template',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      templateId: id,
    });

    expect(() => deleteProjectTemplateHandler(ctx, { id })).toThrow(
      /Cannot delete template: it has been used to instantiate one or more projects/,
    );
  });

  it('does not throw when projects exist but none reference this template', async () => {
    const ctx = createMockCtx();
    const id = await createProjectTemplateHandler(ctx, seedProjectTemplateFields());
    await ctx.db.insert('projects', {
      name: 'Unrelated Project',
      slug: 'unrelated-project',
      description: 'not from this template',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await deleteProjectTemplateHandler(ctx, { id });
    const deleted = await ctx.db.get(id);
    expect(deleted).toBeNull();
  });
});

describe('instantiateProjectHandler', () => {
  it('is exported', () => {
    expect(instantiateProjectHandler).toBeDefined();
  });

  it('returns an id for the newly created project and a list of created task ids', async () => {
    const ctx = createMockCtx();
    const templateId = await createProjectTemplateHandler(ctx, seedProjectTemplateFields());

    const result = await instantiateProjectHandler(ctx, {
      templateId,
      projectName: 'My Next.js App',
    });

    expect(result).toBeDefined();
    expect(result.projectId).toBeDefined();
    expect(typeof result.projectId).toBe('string');
    expect(result.taskIds).toHaveLength(sampleProjectTemplate.tasks.length);
    for (const taskId of result.taskIds) {
      expect(typeof taskId).toBe('string');
    }
  });

  it('persists a project whose fields match instantiateProjectFromTemplate output', async () => {
    const ctx = createMockCtx();
    const templateId = await createProjectTemplateHandler(ctx, seedProjectTemplateFields());

    const { projectId } = await instantiateProjectHandler(ctx, {
      templateId,
      projectName: 'Persisted App',
    });
    const project: any = await ctx.db.get(projectId);

    const expected = instantiateProjectFromTemplate(sampleProjectTemplate, 'Persisted App');
    expect(project.name).toBe(expected.project.name);
    expect(project.description).toBe(expected.project.description);
  });

  it('persists every template task into the tasks table with backlog status and the correct projectId', async () => {
    const ctx = createMockCtx();
    const templateId = await createProjectTemplateHandler(ctx, seedProjectTemplateFields());

    const { projectId, taskIds } = await instantiateProjectHandler(ctx, {
      templateId,
      projectName: 'Backlog App',
    });

    expect(taskIds).toHaveLength(sampleProjectTemplate.tasks.length);
    for (let i = 0; i < taskIds.length; i++) {
      const task: any = await ctx.db.get(taskIds[i]);
      const source = sampleProjectTemplate.tasks[i];
      expect(task).toBeDefined();
      expect(task.projectId).toBe(projectId);
      expect(task.title).toBe(source.title);
      expect(task.storyPoints).toBe(source.storyPoints);
      expect(task.priority).toBe(source.priority);
      expect(task.status).toBe('backlog');
    }
  });

  it('persists default agents into the agents table for the new project', async () => {
    const ctx = createMockCtx();
    const templateId = await createProjectTemplateHandler(ctx, seedProjectTemplateFields());

    await instantiateProjectHandler(ctx, {
      templateId,
      projectName: 'Agented App',
    });

    const allAgents = await ctx.db.query('agents').collect();
    const freshAgents = allAgents.filter((a: any) => a.projectName === 'Agented App');
    expect(freshAgents.length).toBe(sampleProjectTemplate.defaultAgents.length);
    for (let i = 0; i < freshAgents.length; i++) {
      const source = sampleProjectTemplate.defaultAgents[i];
      const created = freshAgents[i];
      expect(created.role).toBe(source.role);
      expect(created.model).toBe(source.model);
      expect(created.costPerPoint).toBe(source.costPerPoint);
      expect(created.skills).toEqual(source.skills);
    }
  });

  it('throws when the template id is invalid (not found)', async () => {
    const ctx = createMockCtx();
    expect(() =>
      instantiateProjectHandler(ctx, {
        templateId: 'projectTemplates-does-not-exist',
        projectName: 'Ghost App',
      }),
    ).toThrow(/Project template not found/);
  });
});

describe('seedDefaultProjectTemplatesHandler', () => {
  it('is exported', () => {
    expect(seedDefaultProjectTemplatesHandler).toBeDefined();
  });

  it('inserts exactly the 4 spec-required built-in templates', async () => {
    const ctx = createMockCtx();
    const ids = await seedDefaultProjectTemplatesHandler(ctx);
    expect(ids.length).toBe(4);

    const all = await ctx.db.query('projectTemplates').collect();
    const names = all.map((t: any) => t.name).sort();
    expect(names).toEqual([
      'API Service (Bun/Hono)',
      'Documentation Site',
      'Python CLI',
      'Web App (Next.js)',
    ]);
  });

  it('sets the correct category for each built-in template', async () => {
    const ctx = createMockCtx();
    await seedDefaultProjectTemplatesHandler(ctx);
    const all = await ctx.db.query('projectTemplates').collect();
    const byName = Object.fromEntries(all.map((t: any) => [t.name, t.category]));
    expect(byName['Web App (Next.js)']).toBe('Web App');
    expect(byName['API Service (Bun/Hono)']).toBe('API Service');
    expect(byName['Python CLI']).toBe('CLI');
    expect(byName['Documentation Site']).toBe('Documentation');
  });

  it('populates estimatedBudget consistently with recommendBudget for each built-in', async () => {
    const ctx = createMockCtx();
    await seedDefaultProjectTemplatesHandler(ctx);
    const all = await ctx.db.query('projectTemplates').collect();
    for (const template of all) {
      const expected = recommendBudget({
        tasks: template.tasks,
        defaultAgents: template.defaultAgents,
      });
      expect(template.estimatedBudget).toBeCloseTo(expected, 2);
    }
  });

  it('does not duplicate templates that already exist (idempotent)', async () => {
    const ctx = createMockCtx();
    await seedDefaultProjectTemplatesHandler(ctx);
    const ids = await seedDefaultProjectTemplatesHandler(ctx);
    expect(ids.length).toBe(0);
    const all = await ctx.db.query('projectTemplates').collect();
    expect(all.length).toBe(4);
  });

  it('returns an empty array when all 4 defaults already exist', async () => {
    const ctx = createMockCtx();
    const now = Date.now();
    for (const name of [
      'Web App (Next.js)',
      'API Service (Bun/Hono)',
      'Python CLI',
      'Documentation Site',
    ]) {
      await ctx.db.insert('projectTemplates', {
        ...seedProjectTemplateFields(),
        name,
        createdAt: now,
        updatedAt: now,
      });
    }
    const ids = await seedDefaultProjectTemplatesHandler(ctx);
    expect(ids).toEqual([]);
  });

  it('returns the missing-template ids when only some defaults are present', async () => {
    const ctx = createMockCtx();
    const now = Date.now();
    await ctx.db.insert('projectTemplates', {
      ...seedProjectTemplateFields(),
      name: 'Web App (Next.js)',
      createdAt: now,
      updatedAt: now,
    });
    const ids = await seedDefaultProjectTemplatesHandler(ctx);
    expect(ids.length).toBe(3);
    const all = await ctx.db.query('projectTemplates').collect();
    expect(all.length).toBe(4);
  });
});
