import { describe, expect, it } from 'bun:test';
import {
  listProvidersHandler,
  getProviderHandler,
  createProviderHandler,
  updateProviderHandler,
  updateProviderStatusHandler,
} from './providers';
import { createMockCtx, sampleProviders } from './__fixtures__/foundation';

describe('listProvidersHandler', () => {
  it('is defined', () => {
    expect(listProvidersHandler).toBeDefined();
  });

  it('returns all providers ordered by createdAt desc', async () => {
    const ctx = createMockCtx();
    for (const provider of sampleProviders) {
      await ctx.db.insert('providers', provider);
    }

    const result = await listProvidersHandler(ctx);

    expect(result.length).toBe(3);
    expect(result[0].name).toBe('google');
    expect(result[1].name).toBe('anthropic');
    expect(result[2].name).toBe('openai');
  });

  it('returns empty array when no providers exist', async () => {
    const ctx = createMockCtx();
    const result = await listProvidersHandler(ctx);
    expect(result).toEqual([]);
  });

  it('strips _creationTime from results', async () => {
    const ctx = createMockCtx();
    await ctx.db.insert('providers', sampleProviders[0]);
    const result = await listProvidersHandler(ctx);
    expect(result[0]._creationTime).toBeUndefined();
    expect(result[0]._id).toBeDefined();
  });

  it('returns models array for each provider', async () => {
    const ctx = createMockCtx();
    await ctx.db.insert('providers', sampleProviders[0]);
    const result = await listProvidersHandler(ctx);
    expect(result[0].models).toEqual(['gpt-4o', 'gpt-4o-mini', 'gpt-4o-realtime']);
  });
});

describe('getProviderHandler', () => {
  it('is defined', () => {
    expect(getProviderHandler).toBeDefined();
  });

  it('returns provider by id', async () => {
    const ctx = createMockCtx();
    const id = await ctx.db.insert('providers', sampleProviders[0]);
    const result = await getProviderHandler(ctx, { id });
    expect(result).toBeDefined();
    expect(result!.name).toBe('openai');
    expect(result!.models).toEqual(['gpt-4o', 'gpt-4o-mini', 'gpt-4o-realtime']);
  });

  it('returns null when provider not found', async () => {
    const ctx = createMockCtx();
    const result = await getProviderHandler(ctx, { id: 'provider-999' });
    expect(result).toBeNull();
  });

  it('strips _creationTime from result', async () => {
    const ctx = createMockCtx();
    const id = await ctx.db.insert('providers', sampleProviders[0]);
    const result = await getProviderHandler(ctx, { id });
    expect(result!._creationTime).toBeUndefined();
  });
});

describe('createProviderHandler', () => {
  it('is defined', () => {
    expect(createProviderHandler).toBeDefined();
  });

  it('inserts a new provider with provided fields and defaults', async () => {
    const ctx = createMockCtx();
    const id = await createProviderHandler(ctx, {
      name: 'mistral',
      models: ['mistral-large', 'mistral-medium'],
    });

    const created = await ctx.db.get(id);
    expect(created).toBeDefined();
    expect(created.name).toBe('mistral');
    expect(created.models).toEqual(['mistral-large', 'mistral-medium']);
    expect(created.status).toBe('active');
    expect(created.createdAt).toBeGreaterThan(0);
  });

  it('accepts optional latency field', async () => {
    const ctx = createMockCtx();
    const id = await createProviderHandler(ctx, {
      name: 'cohere',
      models: ['command-r'],
      latency: 180,
    });

    const created = await ctx.db.get(id);
    expect(created.latency).toBe(180);
  });
});

describe('updateProviderHandler', () => {
  it('is defined', () => {
    expect(updateProviderHandler).toBeDefined();
  });

  it('updates provider fields without touching others', async () => {
    const ctx = createMockCtx();
    const id = await ctx.db.insert('providers', sampleProviders[0]);
    await updateProviderHandler(ctx, {
      id,
      models: ['gpt-4o', 'gpt-4o-mini'],
    });

    const updated = await ctx.db.get(id);
    expect(updated.models).toEqual(['gpt-4o', 'gpt-4o-mini']);
    expect(updated.name).toBe('openai');
    expect(updated.status).toBe('active');
  });

  it('updates latency field', async () => {
    const ctx = createMockCtx();
    const id = await ctx.db.insert('providers', sampleProviders[0]);
    await updateProviderHandler(ctx, {
      id,
      latency: 250,
    });

    const updated = await ctx.db.get(id);
    expect(updated.latency).toBe(250);
  });
});

describe('updateProviderStatusHandler', () => {
  it('is defined', () => {
    expect(updateProviderStatusHandler).toBeDefined();
  });

  it('transitions active to rate_limited', async () => {
    const ctx = createMockCtx();
    const id = await ctx.db.insert('providers', {
      ...sampleProviders[0],
      status: 'active',
    });
    await updateProviderStatusHandler(ctx, { id, status: 'rate_limited' });
    const updated = await ctx.db.get(id);
    expect(updated.status).toBe('rate_limited');
  });

  it('transitions rate_limited to idle', async () => {
    const ctx = createMockCtx();
    const id = await ctx.db.insert('providers', {
      ...sampleProviders[0],
      status: 'rate_limited',
    });
    await updateProviderStatusHandler(ctx, { id, status: 'idle' });
    const updated = await ctx.db.get(id);
    expect(updated.status).toBe('idle');
  });

  it('transitions idle to active', async () => {
    const ctx = createMockCtx();
    const id = await ctx.db.insert('providers', {
      ...sampleProviders[0],
      status: 'idle',
    });
    await updateProviderStatusHandler(ctx, { id, status: 'active' });
    const updated = await ctx.db.get(id);
    expect(updated.status).toBe('active');
  });
});
