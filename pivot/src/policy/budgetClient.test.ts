import { describe, expect, it, mock, beforeEach } from 'bun:test';
import type { ConvexHttpClient } from 'convex/browser';
import {
  getGovernanceEvents,
  getRecentGovernanceEvents,
} from './budgetClient';

/**
 * Creates mock ConvexHttpClient for budgetClient tests.
 * @returns Mocked ConvexHttpClient with query and mutation
 */
function createMockClient() {
  return {
    query: mock(),
    mutation: mock(),
  } as unknown as ConvexHttpClient;
}

describe('budgetClient', () => {
  let client: ConvexHttpClient;

  beforeEach(() => {
    client = createMockClient();
  });

  describe('getGovernanceEvents', () => {
    it('forwards no-filter call with default limit', async () => {
      (client.query as ReturnType<typeof mock>).mockResolvedValue([]);

      await getGovernanceEvents(client);

      const calls = (client.query as ReturnType<typeof mock>).mock.calls;
      expect(calls[0][1]).toEqual({ limit: 100 });
    });

    it('forwards scope filter', async () => {
      (client.query as ReturnType<typeof mock>).mockResolvedValue([]);

      await getGovernanceEvents(client, 'project-1');

      const calls = (client.query as ReturnType<typeof mock>).mock.calls;
      expect(calls[0][1]).toEqual({ scope: 'project-1', limit: 100 });
    });

    it('forwards eventType filter', async () => {
      (client.query as ReturnType<typeof mock>).mockResolvedValue([]);

      await getGovernanceEvents(client, undefined, 'budget_breach');

      const calls = (client.query as ReturnType<typeof mock>).mock.calls;
      expect(calls[0][1]).toEqual({ eventType: 'budget_breach', limit: 100 });
    });

    it('forwards both filters and custom limit', async () => {
      (client.query as ReturnType<typeof mock>).mockResolvedValue([]);

      await getGovernanceEvents(client, 'project-1', 'budget_breach', 50);

      const calls = (client.query as ReturnType<typeof mock>).mock.calls;
      expect(calls[0][1]).toEqual({
        scope: 'project-1',
        eventType: 'budget_breach',
        limit: 50,
      });
    });
  });

  describe('getRecentGovernanceEvents', () => {
    it('forwards since without scope', async () => {
      (client.query as ReturnType<typeof mock>).mockResolvedValue([]);

      await getRecentGovernanceEvents(client, 12345);

      const calls = (client.query as ReturnType<typeof mock>).mock.calls;
      expect(calls[0][1]).toEqual({ since: 12345 });
    });

    it('forwards since with scope', async () => {
      (client.query as ReturnType<typeof mock>).mockResolvedValue([]);

      await getRecentGovernanceEvents(client, 12345, 'project-1');

      const calls = (client.query as ReturnType<typeof mock>).mock.calls;
      expect(calls[0][1]).toEqual({ since: 12345, scope: 'project-1' });
    });
  });
});
