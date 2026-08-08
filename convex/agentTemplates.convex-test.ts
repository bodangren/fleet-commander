/**
 * Runtime contracts for agent-template lifecycle behavior.
 *
 * These tests exercise registered Convex APIs, the production `by_name` and
 * `by_templateId` indexes, and the schema-backed template/agent relationship.
 */

import { describe, expect, it } from 'vitest';
import { api } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import {
  createConvexTest,
  createUnauthenticatedConvexTest,
} from '../test/convexTest';

type ConvexTest = ReturnType<typeof createConvexTest>;

type TemplateArgs = {
  name: string;
  role: 'architect' | 'executor' | 'reviewer' | 'merger';
  model:
    | 'claude-opus'
    | 'claude-sonnet'
    | 'gpt-4o'
    | 'gpt-4o-mini'
    | 'gemini-pro'
    | 'gemini-2.5-pro';
  temperature: number;
  systemPrompt: string;
  skills: string[];
  estimatedCostPer1kTokens: number;
};

/**
 * Supplies a schema-valid agent-template mutation payload.
 *
 * @param name - Unique template name for an isolated backend.
 * @returns Template creation arguments.
 */
function templateArgs(name: string): TemplateArgs {
  return {
    name,
    role: 'architect',
    model: 'claude-opus',
    temperature: 0.3,
    systemPrompt: `System prompt for ${name}`,
    skills: ['react', 'typescript', 'system-design'],
    estimatedCostPer1kTokens: 0.015,
  };
}

/**
 * Persists an agent that references a template through the production index.
 *
 * @param t - Isolated Convex runtime backend.
 * @param templateId - Referenced template identifier.
 * @returns The persisted agent ID.
 */
async function seedTemplateAgent(
  t: ConvexTest,
  templateId: Id<'agentTemplates'>,
): Promise<Id<'agents'>> {
  return t.run((ctx) =>
    ctx.db.insert('agents', {
      name: 'template-assigned-agent',
      role: 'architect',
      skills: ['react'],
      model: 'claude-opus',
      costPerPoint: 4.2,
      reliability: 0.95,
      status: 'active',
      workload: 0,
      maxWorkload: 5,
      templateId,
      createdAt: 1_000,
    }),
  );
}

/**
 * Looks up a template through the real unique template-name index.
 *
 * @param t - Isolated Convex runtime backend.
 * @param name - Template name to resolve.
 * @returns The matching persisted template, if it exists.
 */
async function getTemplateByName(
  t: ConvexTest,
  name: string,
): Promise<Doc<'agentTemplates'> | null> {
  return t.run((ctx) =>
    ctx.db
      .query('agentTemplates')
      .withIndex('by_name', (q) => q.eq('name', name))
      .unique(),
  );
}

describe('agent template runtime access contract', () => {
  it('rejects template reads and writes without an authenticated identity', async () => {
    const t = createUnauthenticatedConvexTest();

    await expect(t.query(api.agentTemplates.listTemplatesHandler, {})).rejects.toThrow(
      'Authentication required',
    );
    await expect(
      t.mutation(api.agentTemplates.createTemplateHandler, templateArgs('unauthenticated')),
    ).rejects.toThrow('Authentication required');
    expect(await t.run((ctx) => ctx.db.query('agentTemplates').collect())).toEqual([]);
  });
});

describe('agent template lifecycle runtime contracts', () => {
  it('creates, lists, gets, and uniquely resolves templates without leaking storage metadata', async () => {
    const t = createConvexTest();
    const first = templateArgs('runtime-template-a');
    const second = templateArgs('runtime-template-b');
    const firstId = await t.mutation(api.agentTemplates.createTemplateHandler, first);
    await t.mutation(api.agentTemplates.createTemplateHandler, second);

    await expect(
      t.mutation(api.agentTemplates.createTemplateHandler, first),
    ).rejects.toThrow('Template with name "runtime-template-a" already exists');
    await expect(
      t.query(api.agentTemplates.getTemplateHandler, { id: firstId }),
    ).resolves.toMatchObject({
      _id: firstId,
      name: first.name,
      role: 'architect',
      model: 'claude-opus',
    });
    await expect(
      t.query(api.agentTemplates.getTemplateByNameHandler, { name: first.name }),
    ).resolves.toMatchObject({ _id: firstId, name: first.name });

    const listed = await t.query(api.agentTemplates.listTemplatesHandler, {});
    expect(listed.map((template) => template.name)).toEqual([
      'runtime-template-b',
      'runtime-template-a',
    ]);
    expect(listed[0]).not.toHaveProperty('_creationTime');
    expect(await getTemplateByName(t, first.name)).toMatchObject({ _id: firstId });
  });

  it('updates template fields while preserving the remaining shape and rejects name conflicts', async () => {
    const t = createConvexTest();
    const firstId = await t.mutation(
      api.agentTemplates.createTemplateHandler,
      templateArgs('original-template'),
    );
    const secondId = await t.mutation(
      api.agentTemplates.createTemplateHandler,
      templateArgs('conflicting-template'),
    );

    await expect(
      t.mutation(api.agentTemplates.updateTemplateHandler, {
        id: firstId,
        temperature: 0.7,
        systemPrompt: 'Updated runtime prompt',
      }),
    ).resolves.toBeNull();
    await expect(
      t.mutation(api.agentTemplates.updateTemplateHandler, {
        id: secondId,
        name: 'original-template',
      }),
    ).rejects.toThrow('Template with name "original-template" already exists');
    await expect(
      t.mutation(api.agentTemplates.updateTemplateHandler, {
        id: firstId,
        name: 'original-template',
      }),
    ).resolves.toBeNull();

    await expect(
      t.query(api.agentTemplates.getTemplateHandler, { id: firstId }),
    ).resolves.toMatchObject({
      name: 'original-template',
      role: 'architect',
      model: 'claude-opus',
      temperature: 0.7,
      systemPrompt: 'Updated runtime prompt',
      skills: ['react', 'typescript', 'system-design'],
    });
  });

  it('clones template fields, rejects duplicate clone names, and reports deleted sources as missing', async () => {
    const t = createConvexTest();
    const source = templateArgs('clone-source');
    const sourceId = await t.mutation(api.agentTemplates.createTemplateHandler, source);
    const cloneId = await t.mutation(api.agentTemplates.cloneTemplateHandler, {
      id: sourceId,
      newName: 'clone-target',
    });

    await expect(
      t.query(api.agentTemplates.getTemplateHandler, { id: cloneId }),
    ).resolves.toMatchObject({
      name: 'clone-target',
      role: source.role,
      model: source.model,
      temperature: source.temperature,
      systemPrompt: source.systemPrompt,
      skills: source.skills,
    });
    await expect(
      t.mutation(api.agentTemplates.cloneTemplateHandler, {
        id: sourceId,
        newName: 'clone-target',
      }),
    ).rejects.toThrow('Template with name "clone-target" already exists');

    await t.mutation(api.agentTemplates.deleteTemplateHandler, { id: sourceId });
    await expect(
      t.mutation(api.agentTemplates.cloneTemplateHandler, {
        id: sourceId,
        newName: 'unreachable-clone',
      }),
    ).rejects.toThrow('Source template not found');
  });

  it('deletes unused templates but protects agents assigned through by_templateId', async () => {
    const t = createConvexTest();
    const disposableId = await t.mutation(
      api.agentTemplates.createTemplateHandler,
      templateArgs('disposable-template'),
    );
    await expect(
      t.mutation(api.agentTemplates.deleteTemplateHandler, { id: disposableId }),
    ).resolves.toBeNull();
    await expect(
      t.query(api.agentTemplates.getTemplateHandler, { id: disposableId }),
    ).resolves.toBeNull();

    const usedId = await t.mutation(
      api.agentTemplates.createTemplateHandler,
      templateArgs('assigned-template'),
    );
    await seedTemplateAgent(t, usedId);
    await expect(
      t.mutation(api.agentTemplates.deleteTemplateHandler, { id: usedId }),
    ).rejects.toThrow('Cannot delete template: it is assigned to one or more agents');
  });

  it('seeds the complete default catalog, fills partial catalogs, and is idempotent', async () => {
    const full = createConvexTest();
    await expect(
      full.mutation(api.agentTemplates.seedDefaultTemplatesHandler, {}),
    ).resolves.toHaveLength(4);
    expect(
      (await full.query(api.agentTemplates.listTemplatesHandler, {}))
        .map((template) => template.name)
        .sort(),
    ).toEqual(['alice', 'bob', 'carol', 'frank']);
    await expect(
      full.mutation(api.agentTemplates.seedDefaultTemplatesHandler, {}),
    ).resolves.toEqual([]);

    const partial = createConvexTest();
    await partial.mutation(
      api.agentTemplates.createTemplateHandler,
      templateArgs('alice'),
    );
    await expect(
      partial.mutation(api.agentTemplates.seedDefaultTemplatesHandler, {}),
    ).resolves.toHaveLength(3);
  });

  it('rejects unsupported models through the registered argument validator', async () => {
    const t = createConvexTest();

    await expect(
      t.mutation(api.agentTemplates.createTemplateHandler, {
        ...templateArgs('invalid-model-template'),
        model: 'unsupported-model' as never,
      }),
    ).rejects.toThrow();
  });
});
