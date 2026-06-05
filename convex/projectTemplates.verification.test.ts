/**
 * Phase 4 verification tests for the projectTemplates flow (Project Template Marketplace).
 *
 * These tests convert the Phase 4 "manual verification" checklist into runnable
 * assertions. The Phase 4 plan items are:
 *
 *   - Manual test: create project from "Web App" template, verify tasks in backlog
 *   - Manual test: save existing project as template, verify content stripped
 *   - Verify built-in templates appear for new workspaces
 *
 * The tests below use the same `createMockCtx` fixture that Phase 2 used so the
 * assertions run against the real Convex handlers (and the underlying
 * `instantiateProjectFromTemplate` / `extractTemplateFromProject` /
 * `recommendBudget` pure functions) — no live deployment required.
 *
 * These are written first (Red phase) so the Phase 4 verification criteria
 * are encoded as executable tests. They will fail only if the
 * Phase 1/2/3 contract regresses (a true regression).
 *
 * Spec: measure/tracks/project_template_marketplace_20260530/spec.md
 * Test strategy: measure/tracks/project_template_marketplace_20260530/test-strategy.md
 */
import { describe, expect, it } from 'bun:test';

import {
  listProjectTemplatesHandler,
  getProjectTemplateHandler,
  createProjectTemplateHandler,
  instantiateProjectHandler,
  seedDefaultProjectTemplatesHandler,
} from './projectTemplates';
import {
  extractTemplateFromProject,
  type SourceAgent,
  type SourceProject,
  type SourceTask,
} from './lib/projectTemplates';
import { createMockCtx } from './__fixtures__/foundation';

function seedProjectTemplateFields() {
  return {
    name: 'Web App (Next.js)',
    description: 'A starter Next.js web application with auth, routing, and database',
    category: 'Web App',
    tasks: [
      { title: 'Set up Next.js project', storyPoints: 2, priority: 'high' as const, status: 'backlog' as const },
      { title: 'Configure database', storyPoints: 5, priority: 'high' as const, status: 'backlog' as const, dependencies: ['Set up Next.js project'] },
      { title: 'Add authentication', storyPoints: 8, priority: 'medium' as const, status: 'backlog' as const, dependencies: ['Configure database'] },
    ],
    defaultAgents: [
      { role: 'architect' as const, model: 'claude-opus' as const, skills: ['system-design', 'typescript'], costPerPoint: 4.2 },
      { role: 'executor' as const, model: 'claude-sonnet' as const, skills: ['typescript', 'next'], costPerPoint: 2.1 },
    ],
    estimatedBudget: 47.25,
  };
}

describe('Phase 4 — verification: create project from "Web App" template, tasks in backlog', () => {
  it('seeds the "Web App (Next.js)" template and instantiates a project with all 3 tasks in backlog', async () => {
    const ctx = createMockCtx();

    const [templateId] = await seedDefaultProjectTemplatesHandler(ctx);
    expect(templateId).toBeDefined();

    const listed = await listProjectTemplatesHandler(ctx);
    const webApp = listed.find((t) => t.name === 'Web App (Next.js)');
    expect(webApp).toBeDefined();

    const { projectId, taskIds } = await instantiateProjectHandler(ctx, {
      templateId: webApp!._id,
      projectName: 'Phase 4 Verify App',
    });

    expect(projectId).toBeDefined();
    expect(taskIds).toHaveLength(3);

    const persistedTasks: any[] = [];
    for (const id of taskIds) {
      persistedTasks.push(await ctx.db.get(id));
    }

    for (const task of persistedTasks) {
      expect(task).toBeDefined();
      expect(task.status).toBe('backlog');
      expect(task.projectId).toBe(projectId);
    }

    const titles = persistedTasks.map((t) => t.title).sort();
    expect(titles).toEqual([
      'Add authentication',
      'Configure database',
      'Set up Next.js project',
    ]);
  });

  it('persists the spec-required dependencies between Web App template tasks (Set up → Configure → Add auth)', async () => {
    const ctx = createMockCtx();
    const [templateId] = await seedDefaultProjectTemplatesHandler(ctx);

    const template = await getProjectTemplateHandler(ctx, { id: templateId });
    const { projectId, taskIds } = await instantiateProjectHandler(ctx, {
      templateId: template!._id,
      projectName: 'Dependency App',
    });

    const tasks: any[] = [];
    for (const id of taskIds) tasks.push(await ctx.db.get(id));

    const setup = tasks.find((t) => t.title === 'Set up Next.js project');
    const configure = tasks.find((t) => t.title === 'Configure database');
    const addAuth = tasks.find((t) => t.title === 'Add authentication');

    expect(setup).toBeDefined();
    expect(configure).toBeDefined();
    expect(addAuth).toBeDefined();

    expect(configure.dependencies).toEqual(['Set up Next.js project']);
    expect(addAuth.dependencies).toEqual(['Configure database']);

    // No spurious dependencies on the root task
    expect(setup.dependencies).toBeUndefined();
    expect(projectId).toBeDefined();
  });

  it('sets the estimatedBudget on the new project to the recommendBudget value for the Web App template', async () => {
    const ctx = createMockCtx();
    const [templateId] = await seedDefaultProjectTemplatesHandler(ctx);
    const template = await getProjectTemplateHandler(ctx, { id: templateId });

    const { projectId } = await instantiateProjectHandler(ctx, {
      templateId: template!._id,
      projectName: 'Budget Verify App',
    });

    const project: any = await ctx.db.get(projectId);
    expect(project).toBeDefined();
    // 2 + 5 + 8 = 15 story points; avg(costPerPoint) = (4.2 + 2.1) / 2 = 3.15
    // 15 × 3.15 = 47.25
    expect(project.estimatedBudget).toBeCloseTo(47.25, 2);
  });
});

describe('Phase 4 — verification: save existing project as template, content stripped', () => {
  it('extracting a project that contains a "customer credentials" description strips PII from the resulting template', async () => {
    const ctx = createMockCtx();

    const sourceProject: SourceProject = {
      name: 'Customer Onboarding',
      description: 'Onboards enterprise customers',
    };
    const sourceTasks: SourceTask[] = [
      {
        title: 'Authenticate customer',
        description: 'OAuth handshake with customer-x credentials',
        storyPoints: 5,
        priority: 'high',
        status: 'done',
        costEstimate: 12,
        actualCost: 14.3,
        assigneeId: 'agents-1',
        sessionId: 'sess-pii',
        blockerReason: 'wait on infra',
        rejectionReason: 'edge case missed',
      },
    ];
    const sourceAgents: SourceAgent[] = [
      {
        name: 'alice-the-architect',
        role: 'architect',
        model: 'claude-opus',
        skills: ['system-design'],
        costPerPoint: 4.2,
      },
    ];

    const extracted = extractTemplateFromProject(
      sourceProject,
      sourceTasks,
      sourceAgents,
      { category: 'Web App' },
    );

    const serialized = JSON.stringify(extracted);
    expect(serialized).not.toContain('customer-x credentials');
    expect(serialized).not.toContain('alice-the-architect');
    expect(serialized).not.toContain('sess-pii');

    for (const task of extracted.tasks) {
      expect(task).not.toHaveProperty('description');
      expect(task).not.toHaveProperty('costEstimate');
      expect(task).not.toHaveProperty('actualCost');
      expect(task).not.toHaveProperty('assigneeId');
      expect(task).not.toHaveProperty('sessionId');
      expect(task).not.toHaveProperty('blockerReason');
      expect(task).not.toHaveProperty('rejectionReason');
    }
    for (const agent of extracted.defaultAgents) {
      expect(agent).not.toHaveProperty('name');
    }
  });

  it('persists an extracted template via createProjectTemplateHandler, and the saved doc has no PII fields', async () => {
    const ctx = createMockCtx();

    const extracted = extractTemplateFromProject(
      { name: 'Internal Reports', description: 'Weekly reports' },
      [
        {
          title: 'Pull data from warehouse',
          description: 'Reference to internal customer-x data',
          storyPoints: 3,
          priority: 'medium',
          status: 'backlog',
        },
      ],
      [
        {
          name: 'bob-the-executor',
          role: 'executor',
          model: 'claude-sonnet',
          skills: ['node'],
          costPerPoint: 2.1,
        },
      ],
      { category: 'API Service' },
    );

    const createdId = await createProjectTemplateHandler(ctx, {
      name: extracted.name,
      description: extracted.description,
      category: extracted.category,
      tasks: extracted.tasks,
      defaultAgents: extracted.defaultAgents,
      estimatedBudget: extracted.estimatedBudget,
    });

    const persisted: any = await ctx.db.get(createdId);
    const serialized = JSON.stringify(persisted);

    expect(serialized).not.toContain('customer-x data');
    expect(serialized).not.toContain('bob-the-executor');
    expect(persisted.category).toBe('API Service');
    expect(persisted.tasks).toHaveLength(1);
    for (const t of persisted.tasks) {
      expect(t).not.toHaveProperty('description');
    }
    for (const a of persisted.defaultAgents) {
      expect(a).not.toHaveProperty('name');
    }
  });

  it('round-trip: extract a project → create a template → instantiate it → tasks have no PII and live in backlog', async () => {
    const ctx = createMockCtx();

    const extracted = extractTemplateFromProject(
      { name: 'Phase 4 Round Trip', description: 'Round-trip source' },
      [
        {
          title: 'Step 1',
          storyPoints: 3,
          priority: 'medium',
          status: 'backlog',
          description: 'internal notes referencing customer-x',
        },
        {
          title: 'Step 2',
          storyPoints: 5,
          priority: 'high',
          status: 'backlog',
          dependencies: ['Step 1'],
        },
      ],
      [
        {
          name: 'carol',
          role: 'reviewer',
          model: 'gpt-4o',
          skills: ['testing'],
          costPerPoint: 1.8,
        },
      ],
      { category: 'CLI' },
    );

    const createdId = await createProjectTemplateHandler(ctx, {
      name: extracted.name,
      description: extracted.description,
      category: extracted.category,
      tasks: extracted.tasks,
      defaultAgents: extracted.defaultAgents,
      estimatedBudget: extracted.estimatedBudget,
    });

    const { projectId, taskIds } = await instantiateProjectHandler(ctx, {
      templateId: createdId,
      projectName: 'Round Trip App',
    });

    const tasks: any[] = [];
    for (const id of taskIds) tasks.push(await ctx.db.get(id));
    const project: any = await ctx.db.get(projectId);

    const serialized = JSON.stringify({ project, tasks });
    expect(serialized).not.toContain('customer-x');
    expect(serialized).not.toContain('carol');

    for (const t of tasks) {
      expect(t.status).toBe('backlog');
      // Tasks table may store an empty description; what matters is that no
      // PII from the source project survives the round-trip.
      if (t.description !== undefined) {
        expect(t.description).not.toContain('customer-x');
      }
    }
    const step2 = tasks.find((t) => t.title === 'Step 2');
    expect(step2?.dependencies).toEqual(['Step 1']);
  });
});

describe('Phase 4 — verification: built-in templates appear for new workspaces', () => {
  it('after seedDefaultProjectTemplatesHandler, the gallery list contains exactly the 4 spec-required built-ins', async () => {
    const ctx = createMockCtx();

    // Empty workspace — list is empty before seeding.
    const before = await listProjectTemplatesHandler(ctx);
    expect(before).toEqual([]);

    // New-workspace bootstrap: call the seed mutation.
    const seededIds = await seedDefaultProjectTemplatesHandler(ctx);
    expect(seededIds).toHaveLength(4);

    // Gallery query returns the same 4 templates.
    const after = await listProjectTemplatesHandler(ctx);
    const names = after.map((t) => t.name).sort();
    expect(names).toEqual([
      'API Service (Bun/Hono)',
      'Documentation Site',
      'Python CLI',
      'Web App (Next.js)',
    ]);
  });

  it('all 4 built-in templates have the spec-required category mapping (Web App / API Service / CLI / Documentation)', async () => {
    const ctx = createMockCtx();
    await seedDefaultProjectTemplatesHandler(ctx);

    const all = await listProjectTemplatesHandler(ctx);
    const byName = Object.fromEntries(all.map((t) => [t.name, t.category]));

    expect(byName['Web App (Next.js)']).toBe('Web App');
    expect(byName['API Service (Bun/Hono)']).toBe('API Service');
    expect(byName['Python CLI']).toBe('CLI');
    expect(byName['Documentation Site']).toBe('Documentation');
  });

  it('the by_category index supports filtering the built-ins by category in the gallery', async () => {
    const ctx = createMockCtx();
    await seedDefaultProjectTemplatesHandler(ctx);

    // Gallery filters by category — assert the index makes this look-up deterministic.
    const all = await ctx.db.query('projectTemplates').collect();
    const webApp = all.filter((t: any) => t.category === 'Web App');
    const api = all.filter((t: any) => t.category === 'API Service');
    const cli = all.filter((t: any) => t.category === 'CLI');
    const docs = all.filter((t: any) => t.category === 'Documentation');

    expect(webApp.map((t: any) => t.name)).toEqual(['Web App (Next.js)']);
    expect(api.map((t: any) => t.name)).toEqual(['API Service (Bun/Hono)']);
    expect(cli.map((t: any) => t.name)).toEqual(['Python CLI']);
    expect(docs.map((t: any) => t.name)).toEqual(['Documentation Site']);
  });

  it('idempotency: seeding a new workspace that already has built-ins is a no-op (no duplicates)', async () => {
    const ctx = createMockCtx();
    const firstRun = await seedDefaultProjectTemplatesHandler(ctx);
    expect(firstRun).toHaveLength(4);

    const secondRun = await seedDefaultProjectTemplatesHandler(ctx);
    expect(secondRun).toEqual([]);

    const all = await listProjectTemplatesHandler(ctx);
    expect(all).toHaveLength(4);
  });

  it('partial-seed: when only some built-ins exist, the missing ones are inserted on the next seed call', async () => {
    const ctx = createMockCtx();

    // Pre-seed only the Web App template.
    const fields = seedProjectTemplateFields();
    await ctx.db.insert('projectTemplates', {
      ...fields,
      name: 'Web App (Next.js)',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const seededIds = await seedDefaultProjectTemplatesHandler(ctx);
    expect(seededIds).toHaveLength(3);

    const all = await listProjectTemplatesHandler(ctx);
    expect(all).toHaveLength(4);
  });
});
