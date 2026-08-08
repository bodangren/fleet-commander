/**
 * Runtime contracts for the project template gallery and project instantiation.
 *
 * The assertions use registered Convex APIs with the production schema. They
 * cover the template indexes and project/task persistence that mock-context
 * tests could not exercise.
 */

import { describe, expect, it } from 'vitest';
import { api } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import {
  createConvexTest,
  createUnauthenticatedConvexTest,
} from '../test/convexTest';
import {
  extractTemplateFromProject,
  type SourceAgent,
  type SourceProject,
  type SourceTask,
} from './lib/projectTemplates';

type ConvexTest = ReturnType<typeof createConvexTest>;

type TemplateArgs = {
  name: string;
  description: string;
  category: string;
  tasks: Array<{
    title: string;
    storyPoints: number;
    priority: 'low' | 'medium' | 'high';
    status: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked';
    dependencies?: string[];
  }>;
  defaultAgents: Array<{
    role: 'architect' | 'executor' | 'reviewer' | 'merger';
    model: string;
    skills: string[];
    costPerPoint: number;
  }>;
  estimatedBudget: number;
};

/**
 * Supplies a schema-valid custom template that the production API can persist.
 *
 * @param name - Unique name for the isolated test backend.
 * @returns Template mutation arguments.
 */
function customTemplate(name: string): TemplateArgs {
  return {
    name,
    description: 'A schema-valid runtime template',
    category: 'Runtime',
    tasks: [
      {
        title: 'Design runtime contract',
        storyPoints: 3,
        priority: 'high',
        status: 'backlog',
      },
      {
        title: 'Implement runtime contract',
        storyPoints: 5,
        priority: 'medium',
        status: 'backlog',
        dependencies: ['Design runtime contract'],
      },
    ],
    defaultAgents: [
      {
        role: 'architect',
        model: 'claude-opus',
        skills: ['system-design', 'typescript'],
        costPerPoint: 4.2,
      },
      {
        role: 'executor',
        model: 'claude-sonnet',
        skills: ['typescript'],
        costPerPoint: 2.1,
      },
    ],
    estimatedBudget: 25.2,
  };
}

/**
 * Fetches a persisted project template through its production unique-name index.
 *
 * @param t - Isolated Convex runtime backend.
 * @param name - Template name to resolve.
 * @returns The matching template, if present.
 */
async function getTemplateByName(
  t: ConvexTest,
  name: string,
): Promise<Doc<'projectTemplates'> | null> {
  return t.run((ctx) =>
    ctx.db
      .query('projectTemplates')
      .withIndex('by_name', (q) => q.eq('name', name))
      .unique(),
  );
}

/**
 * Reads every task and agent associated with an instantiated project.
 *
 * Agents have no project ID in the current schema, so their deterministic
 * production names identify the rows created for this project.
 *
 * @param t - Isolated Convex runtime backend.
 * @param projectId - Persisted project identifier.
 * @param projectName - Name supplied to the instantiation mutation.
 * @returns The persisted project, tasks, and generated agents.
 */
async function readInstantiation(
  t: ConvexTest,
  projectId: Id<'projects'>,
  projectName: string,
) {
  return t.run(async (ctx) => {
    const [project, tasks, agents] = await Promise.all([
      ctx.db.get(projectId),
      ctx.db
        .query('tasks')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect(),
      ctx.db.query('agents').collect(),
    ]);

    return {
      project,
      tasks,
      agents: agents.filter((agent) => agent.name.endsWith(`-${projectName}`)),
    };
  });
}

describe('project template runtime contracts', () => {
  it('rejects template reads and writes without an authenticated identity', async () => {
    const t = createUnauthenticatedConvexTest();

    await expect(
      t.query(api.projectTemplates.listProjectTemplatesHandler, {}),
    ).rejects.toThrow('Authentication required');
    await expect(
      t.mutation(
        api.projectTemplates.createProjectTemplateHandler,
        customTemplate('Unauthenticated template'),
      ),
    ).rejects.toThrow('Authentication required');

    expect(await t.run((ctx) => ctx.db.query('projectTemplates').collect())).toEqual([]);
  });

  it('creates, reads, lists, and rejects duplicate templates through registered APIs', async () => {
    const t = createConvexTest();
    const identity = await t.run((ctx) => ctx.auth.getUserIdentity());
    expect(identity).toMatchObject({
      tokenIdentifier: 'test-user',
      subject: 'test-user',
    });

    const first = customTemplate('Runtime Template A');
    const second = customTemplate('Runtime Template B');
    const firstId = await t.mutation(
      api.projectTemplates.createProjectTemplateHandler,
      first,
    );
    await t.mutation(api.projectTemplates.createProjectTemplateHandler, second);

    await expect(
      t.mutation(api.projectTemplates.createProjectTemplateHandler, first),
    ).rejects.toThrow('Template with name "Runtime Template A" already exists');

    await expect(
      t.query(api.projectTemplates.getProjectTemplateHandler, { id: firstId }),
    ).resolves.toMatchObject({
      _id: firstId,
      name: first.name,
      tasks: first.tasks,
      defaultAgents: first.defaultAgents,
    });
    const listed = await t.query(api.projectTemplates.listProjectTemplatesHandler, {});
    expect(listed.map((template) => template.name)).toEqual([
      'Runtime Template B',
      'Runtime Template A',
    ]);
    expect(listed[0]).not.toHaveProperty('_creationTime');
    expect(await getTemplateByName(t, first.name)).toMatchObject({ _id: firstId });
  });

  it('allows deleting unused templates but protects instantiated-template history', async () => {
    const t = createConvexTest();
    const disposableId = await t.mutation(
      api.projectTemplates.createProjectTemplateHandler,
      customTemplate('Disposable runtime template'),
    );
    await expect(
      t.mutation(api.projectTemplates.deleteProjectTemplateHandler, { id: disposableId }),
    ).resolves.toBeNull();
    await expect(
      t.query(api.projectTemplates.getProjectTemplateHandler, { id: disposableId }),
    ).resolves.toBeNull();

    const usedId = await t.mutation(
      api.projectTemplates.createProjectTemplateHandler,
      customTemplate('Used runtime template'),
    );
    await t.mutation(api.projectTemplates.instantiateProjectHandler, {
      templateId: usedId,
      projectName: 'History is preserved',
    });

    await expect(
      t.mutation(api.projectTemplates.deleteProjectTemplateHandler, { id: usedId }),
    ).rejects.toThrow(
      'Cannot delete template: it has been used to instantiate one or more projects',
    );
    expect(await getTemplateByName(t, 'Used runtime template')).toMatchObject({
      _id: usedId,
    });
  });

  it('seeds the complete built-in gallery, uses real category indexes, and remains idempotent', async () => {
    const t = createConvexTest();

    const firstSeed = await t.mutation(
      api.projectTemplates.seedDefaultProjectTemplatesHandler,
      {},
    );
    expect(firstSeed).toHaveLength(4);
    const templatesByCategory = await t.run(async (ctx) => {
      const [web, apiService, cli, documentation] = await Promise.all([
        ctx.db
          .query('projectTemplates')
          .withIndex('by_category', (q) => q.eq('category', 'Web App'))
          .collect(),
        ctx.db
          .query('projectTemplates')
          .withIndex('by_category', (q) => q.eq('category', 'API Service'))
          .collect(),
        ctx.db
          .query('projectTemplates')
          .withIndex('by_category', (q) => q.eq('category', 'CLI'))
          .collect(),
        ctx.db
          .query('projectTemplates')
          .withIndex('by_category', (q) => q.eq('category', 'Documentation'))
          .collect(),
      ]);
      return { web, apiService, cli, documentation };
    });
    expect(templatesByCategory.web.map((template) => template.name)).toEqual([
      'Web App (Next.js)',
    ]);
    expect(templatesByCategory.apiService.map((template) => template.name)).toEqual([
      'API Service (Bun/Hono)',
    ]);
    expect(templatesByCategory.cli.map((template) => template.name)).toEqual(['Python CLI']);
    expect(templatesByCategory.documentation.map((template) => template.name)).toEqual([
      'Documentation Site',
    ]);

    await expect(
      t.mutation(api.projectTemplates.seedDefaultProjectTemplatesHandler, {}),
    ).resolves.toEqual([]);
  });

  it('fills only missing built-in templates when a workspace was partially seeded', async () => {
    const t = createConvexTest();
    await t.mutation(
      api.projectTemplates.createProjectTemplateHandler,
      {
        ...customTemplate('Web App (Next.js)'),
        category: 'Web App',
      },
    );

    await expect(
      t.mutation(api.projectTemplates.seedDefaultProjectTemplatesHandler, {}),
    ).resolves.toHaveLength(3);
    expect(
      await t.run((ctx) => ctx.db.query('projectTemplates').collect()),
    ).toHaveLength(4);
  });

  it('instantiates the Web App template with its backlog graph, budget, slug, and agents', async () => {
    const t = createConvexTest();
    await t.mutation(api.projectTemplates.seedDefaultProjectTemplatesHandler, {});
    const webTemplate = await getTemplateByName(t, 'Web App (Next.js)');
    expect(webTemplate).not.toBeNull();

    const projectName = 'Web Workspace 2.0!';
    const { projectId, taskIds } = await t.mutation(
      api.projectTemplates.instantiateProjectHandler,
      { templateId: webTemplate!._id, projectName },
    );
    expect(taskIds).toHaveLength(3);
    const persisted = await readInstantiation(t, projectId, projectName);

    expect(persisted.project).toMatchObject({
      name: projectName,
      slug: 'web-workspace-2-0',
      templateId: webTemplate!._id,
      estimatedBudget: 47.25,
    });
    expect(
      persisted.tasks.map((task) => ({
        title: task.title,
        status: task.status,
        dependencies: task.dependencies,
      })),
    ).toEqual([
      {
        title: 'Set up Next.js project',
        status: 'backlog',
        dependencies: undefined,
      },
      {
        title: 'Configure database',
        status: 'backlog',
        dependencies: ['Set up Next.js project'],
      },
      {
        title: 'Add authentication',
        status: 'backlog',
        dependencies: ['Configure database'],
      },
    ]);
    expect(persisted.agents).toEqual([
      expect.objectContaining({
        name: `architect-${projectName}`,
        role: 'architect',
        model: 'claude-opus',
        costPerPoint: 4.2,
      }),
      expect.objectContaining({
        name: `executor-${projectName}`,
        role: 'executor',
        model: 'claude-sonnet',
        costPerPoint: 2.1,
      }),
    ]);
  });

  it('instantiates empty templates and rejects a real deleted template ID', async () => {
    const t = createConvexTest();
    const emptyTemplateId = await t.mutation(
      api.projectTemplates.createProjectTemplateHandler,
      {
        name: 'Empty runtime template',
        description: '',
        category: 'Runtime',
        tasks: [],
        defaultAgents: [],
        estimatedBudget: 0,
      },
    );
    const { projectId, taskIds } = await t.mutation(
      api.projectTemplates.instantiateProjectHandler,
      { templateId: emptyTemplateId, projectName: 'Blank slate' },
    );
    expect(taskIds).toEqual([]);
    expect(await readInstantiation(t, projectId, 'Blank slate')).toMatchObject({
      project: { name: 'Blank slate' },
      tasks: [],
      agents: [],
    });

    const deletedTemplateId = await t.mutation(
      api.projectTemplates.createProjectTemplateHandler,
      customTemplate('Deleted runtime template'),
    );
    await t.mutation(api.projectTemplates.deleteProjectTemplateHandler, {
      id: deletedTemplateId,
    });
    await expect(
      t.mutation(api.projectTemplates.instantiateProjectHandler, {
        templateId: deletedTemplateId,
        projectName: 'Missing template project',
      }),
    ).rejects.toThrow('Project template not found');
  });

  it('persists extracted templates without source PII and keeps their dependency graph', async () => {
    const t = createConvexTest();
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
        status: 'backlog',
        costEstimate: 12,
        actualCost: 14.3,
        assigneeId: 'agents-1',
        sessionId: 'sess-pii',
      },
      {
        title: 'Configure access',
        description: 'Internal note for customer-x',
        storyPoints: 3,
        priority: 'medium',
        status: 'backlog',
        dependencies: ['Authenticate customer'],
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

    const templateId = await t.mutation(
      api.projectTemplates.createProjectTemplateHandler,
      extracted,
    );
    const { projectId } = await t.mutation(
      api.projectTemplates.instantiateProjectHandler,
      { templateId, projectName: 'PII-safe project' },
    );
    const persisted = await readInstantiation(t, projectId, 'PII-safe project');

    expect(JSON.stringify(persisted)).not.toContain('customer-x');
    expect(JSON.stringify(persisted)).not.toContain('alice-the-architect');
    expect(JSON.stringify(persisted)).not.toContain('sess-pii');
    expect(
      persisted.tasks.find((task) => task.title === 'Configure access')?.dependencies,
    ).toEqual(['Authenticate customer']);
    expect(persisted.tasks.every((task) => task.status === 'backlog')).toBe(true);
  });
});
