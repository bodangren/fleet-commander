import { describe, expect, it } from 'bun:test';
import {
  listTemplatesHandler,
  getTemplateHandler,
  getTemplateByNameHandler,
  createTemplateHandler,
  updateTemplateHandler,
  deleteTemplateHandler,
  cloneTemplateHandler,
  seedDefaultTemplatesHandler,
} from './agentTemplates';
import { createMockCtx } from './__fixtures__/foundation';

const sampleTemplate = {
  name: 'alice',
  role: 'architect' as const,
  model: 'claude-opus' as const,
  temperature: 0.3,
  systemPrompt: 'You are a senior architect.',
  skills: ['react', 'typescript', 'ui-design'],
  estimatedCostPer1kTokens: 0.015,
};

const sampleTemplate2 = {
  name: 'bob',
  role: 'executor' as const,
  model: 'claude-sonnet' as const,
  temperature: 0.2,
  systemPrompt: 'You are a backend engineer.',
  skills: ['node', 'postgresql'],
  estimatedCostPer1kTokens: 0.003,
};

function createTemplateTables() {
  return new Map<string, any>();
}

describe('listTemplatesHandler', () => {
  it('returns all templates ordered by createdAt desc', async () => {
    const ctx = createMockCtx();
    const now = Date.now();
    await ctx.db.insert('agentTemplates', { ...sampleTemplate, createdAt: now, updatedAt: now });
    await ctx.db.insert('agentTemplates', { ...sampleTemplate2, createdAt: now + 1000, updatedAt: now + 1000 });

    const result = await listTemplatesHandler(ctx);

    expect(result.length).toBe(2);
    expect(result[0].name).toBe('bob');
    expect(result[1].name).toBe('alice');
  });

  it('returns empty array when no templates exist', async () => {
    const ctx = createMockCtx();
    const result = await listTemplatesHandler(ctx);
    expect(result).toEqual([]);
  });

  it('strips _creationTime from results', async () => {
    const ctx = createMockCtx();
    const now = Date.now();
    await ctx.db.insert('agentTemplates', { ...sampleTemplate, createdAt: now, updatedAt: now });
    const result = await listTemplatesHandler(ctx);
    expect(result[0]._creationTime).toBeUndefined();
    expect(result[0]._id).toBeDefined();
  });
});

describe('getTemplateHandler', () => {
  it('returns template by id', async () => {
    const ctx = createMockCtx();
    const now = Date.now();
    const id = await ctx.db.insert('agentTemplates', { ...sampleTemplate, createdAt: now, updatedAt: now });
    const result = await getTemplateHandler(ctx, { id });
    expect(result).toBeDefined();
    expect(result!.name).toBe('alice');
    expect(result!.role).toBe('architect');
    expect(result!.model).toBe('claude-opus');
  });

  it('returns null when template not found', async () => {
    const ctx = createMockCtx();
    const result = await getTemplateHandler(ctx, { id: 'nonexistent-id' });
    expect(result).toBeNull();
  });
});

describe('getTemplateByNameHandler', () => {
  it('returns template by name', async () => {
    const ctx = createMockCtx();
    const now = Date.now();
    await ctx.db.insert('agentTemplates', { ...sampleTemplate, createdAt: now, updatedAt: now });
    const result = await getTemplateByNameHandler(ctx, { name: 'alice' });
    expect(result).toBeDefined();
    expect(result!.name).toBe('alice');
  });

  it('returns null when template name not found', async () => {
    const ctx = createMockCtx();
    const result = await getTemplateByNameHandler(ctx, { name: 'nonexistent' });
    expect(result).toBeNull();
  });
});

describe('createTemplateHandler', () => {
  it('inserts a new template with all fields', async () => {
    const ctx = createMockCtx();
    const id = await createTemplateHandler(ctx, sampleTemplate);
    const created = await ctx.db.get(id);
    expect(created).toBeDefined();
    expect(created.name).toBe('alice');
    expect(created.role).toBe('architect');
    expect(created.model).toBe('claude-opus');
    expect(created.temperature).toBe(0.3);
    expect(created.systemPrompt).toBe('You are a senior architect.');
    expect(created.skills).toEqual(['react', 'typescript', 'ui-design']);
    expect(created.estimatedCostPer1kTokens).toBe(0.015);
    expect(created.createdAt).toBeGreaterThan(0);
    expect(created.updatedAt).toBeGreaterThan(0);
  });

  it('throws on duplicate name', async () => {
    const ctx = createMockCtx();
    await createTemplateHandler(ctx, sampleTemplate);
    expect(() => createTemplateHandler(ctx, sampleTemplate)).toThrow(
      'Template with name "alice" already exists',
    );
  });
});

describe('updateTemplateHandler', () => {
  it('updates specified fields without touching others', async () => {
    const ctx = createMockCtx();
    const id = await createTemplateHandler(ctx, sampleTemplate);
    await updateTemplateHandler(ctx, { id, temperature: 0.5, systemPrompt: 'Updated prompt' });

    const updated = await ctx.db.get(id);
    expect(updated.temperature).toBe(0.5);
    expect(updated.systemPrompt).toBe('Updated prompt');
    expect(updated.name).toBe('alice');
    expect(updated.role).toBe('architect');
  });

  it('throws on name conflict with another template', async () => {
    const ctx = createMockCtx();
    const id1 = await createTemplateHandler(ctx, sampleTemplate);
    const id2 = await createTemplateHandler(ctx, sampleTemplate2);
    expect(() => updateTemplateHandler(ctx, { id: id2, name: 'alice' })).toThrow(
      'Template with name "alice" already exists',
    );
  });

  it('allows updating own name to the same value', async () => {
    const ctx = createMockCtx();
    const id = await createTemplateHandler(ctx, sampleTemplate);
    await updateTemplateHandler(ctx, { id, name: 'alice' });
    const updated = await ctx.db.get(id);
    expect(updated.name).toBe('alice');
  });
});

describe('deleteTemplateHandler', () => {
  it('deletes template when not in use', async () => {
    const ctx = createMockCtx();
    const id = await createTemplateHandler(ctx, sampleTemplate);
    await deleteTemplateHandler(ctx, { id });
    const deleted = await ctx.db.get(id);
    expect(deleted).toBeNull();
  });

  it('throws when template is assigned to an agent', async () => {
    const ctx = createMockCtx();
    const id = await createTemplateHandler(ctx, sampleTemplate);
    await ctx.db.insert('agents', {
      name: 'test-agent',
      role: 'executor',
      skills: [],
      model: 'gpt-4o',
      costPerPoint: 1,
      reliability: 0.8,
      status: 'active',
      workload: 0,
      maxWorkload: 5,
      createdAt: Date.now(),
      templateId: id,
    });
    expect(() => deleteTemplateHandler(ctx, { id })).toThrow(
      'Cannot delete template: it is assigned to one or more agents',
    );
  });
});

describe('cloneTemplateHandler', () => {
  it('creates a copy with a new name', async () => {
    const ctx = createMockCtx();
    const id = await createTemplateHandler(ctx, sampleTemplate);
    const cloneId = await cloneTemplateHandler(ctx, { id, newName: 'alice-clone' });

    const cloned = await ctx.db.get(cloneId);
    expect(cloned).toBeDefined();
    expect(cloned.name).toBe('alice-clone');
    expect(cloned.role).toBe('architect');
    expect(cloned.model).toBe('claude-opus');
    expect(cloned.temperature).toBe(0.3);
    expect(cloned.systemPrompt).toBe('You are a senior architect.');
    expect(cloned._id).not.toBe(id);
  });

  it('throws when source template not found', async () => {
    const ctx = createMockCtx();
    expect(() => cloneTemplateHandler(ctx, { id: 'nonexistent', newName: 'clone' })).toThrow(
      'Source template not found',
    );
  });

  it('throws on name conflict', async () => {
    const ctx = createMockCtx();
    const id = await createTemplateHandler(ctx, sampleTemplate);
    await createTemplateHandler(ctx, sampleTemplate2);
    expect(() => cloneTemplateHandler(ctx, { id, newName: 'bob' })).toThrow(
      'Template with name "bob" already exists',
    );
  });
});

describe('seedDefaultTemplatesHandler', () => {
  it('inserts exactly 4 default templates', async () => {
    const ctx = createMockCtx();
    const ids = await seedDefaultTemplatesHandler(ctx);
    expect(ids.length).toBe(4);

    const templates = await ctx.db.query('agentTemplates').collect();
    const names = templates.map((t: any) => t.name).sort();
    expect(names).toEqual(['alice', 'bob', 'carol', 'frank']);
  });

  it('does not duplicate existing templates', async () => {
    const ctx = createMockCtx();
    const now = Date.now();
    await ctx.db.insert('agentTemplates', { ...sampleTemplate, createdAt: now, updatedAt: now });

    const ids = await seedDefaultTemplatesHandler(ctx);
    expect(ids.length).toBe(3);

    const all = await ctx.db.query('agentTemplates').collect();
    expect(all.length).toBe(4);
  });

  it('returns empty array when all defaults already exist', async () => {
    const ctx = createMockCtx();
    const now = Date.now();
    await ctx.db.insert('agentTemplates', { ...sampleTemplate, createdAt: now, updatedAt: now });
    await ctx.db.insert('agentTemplates', { ...sampleTemplate2, createdAt: now, updatedAt: now });
    await ctx.db.insert('agentTemplates', {
      name: 'carol',
      role: 'reviewer',
      model: 'gpt-4o',
      temperature: 0.1,
      systemPrompt: 'reviewer',
      skills: ['testing'],
      estimatedCostPer1kTokens: 0.005,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('agentTemplates', {
      name: 'frank',
      role: 'executor',
      model: 'gemini-pro',
      temperature: 0.4,
      systemPrompt: 'writer',
      skills: ['documentation'],
      estimatedCostPer1kTokens: 0.001,
      createdAt: now,
      updatedAt: now,
    });

    const ids = await seedDefaultTemplatesHandler(ctx);
    expect(ids.length).toBe(0);
  });
});
