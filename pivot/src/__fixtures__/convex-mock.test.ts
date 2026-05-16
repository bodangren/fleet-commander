import { describe, expect, it } from 'bun:test';
import { createMockConvexClient } from './convex-mock';

describe('MockConvexClient', () => {
  it('resolves query by string path', async () => {
    const client = createMockConvexClient({
      'fleetCatalog:listAgents': async () => [{ name: 'alice' }],
    });

    const result = await client.query('fleetCatalog:listAgents', {});
    expect(result).toEqual([{ name: 'alice' }]);
  });

  it('resolves query by _name object', async () => {
    const client = createMockConvexClient({
      'fleetCatalog:listAgents': async () => [{ name: 'bob' }],
    });

    const result = await client.query({ _name: 'fleetCatalog:listAgents' }, {});
    expect(result).toEqual([{ name: 'bob' }]);
  });

  it('resolves mutation by path', async () => {
    const client = createMockConvexClient({
      'tasks:updateStatus': async (args) => ({ ok: true, id: args.taskId }),
    });

    const result = await client.mutation('tasks:updateStatus', { taskId: 't1' });
    expect(result).toEqual({ ok: true, id: 't1' });
  });

  it('throws on unregistered query', async () => {
    const client = createMockConvexClient({});

    try {
      await client.query('unknown:path', {});
      expect(true).toBe(false); // should not reach
    } catch (e) {
      expect((e as Error).message).toContain('No mock handler registered for query: unknown:path');
    }
  });

  it('throws on unregistered mutation', async () => {
    const client = createMockConvexClient({});

    try {
      await client.mutation('unknown:mutation', {});
      expect(true).toBe(false); // should not reach
    } catch (e) {
      expect((e as Error).message).toContain('No mock handler registered for mutation: unknown:mutation');
    }
  });

  it('onQuery registers handler dynamically', async () => {
    const client = createMockConvexClient({});
    client.onQuery('dynamic:query', async () => 42);

    const result = await client.query('dynamic:query', {});
    expect(result).toBe(42);
  });

  it('onMutation registers handler dynamically', async () => {
    const client = createMockConvexClient({});
    client.onMutation('dynamic:mutation', async (args) => args);

    const result = await client.mutation('dynamic:mutation', { x: 1 });
    expect(result).toEqual({ x: 1 });
  });

  it('clear removes all handlers', async () => {
    const client = createMockConvexClient({
      'test:query': async () => 'data',
    });

    client.clear();

    try {
      await client.query('test:query', {});
      expect(true).toBe(false); // should not reach
    } catch (e) {
      expect((e as Error).message).toContain('No mock handler registered');
    }
  });
});
