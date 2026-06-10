import { describe, expect, it } from 'bun:test';
import { reconcileBudgetReservation } from './budgets';

// ─── focused mock ctx for reconcileBudgetReservation ───────────────────────
// Supports the handful of db ops the handler touches: withIndex().first(),
// patch, delete, and insert, plus an anonymous (unauthenticated) actor.

function createReconcileCtx(tables: Record<string, Map<string, any>>) {
  const db = {
    query: (table: string) => ({
      withIndex: (_index: string, cb?: (q: any) => any) => {
        const filters: Array<[string, unknown]> = [];
        const q = {
          eq: (field: string, value: unknown) => {
            filters.push([field, value]);
            return q;
          },
        };
        if (cb) cb(q);
        const match = () =>
          Array.from(tables[table]?.values() ?? []).filter((doc) =>
            filters.every(([field, value]) => doc[field] === value),
          );
        return { first: async () => match()[0] ?? null };
      },
    }),
    patch: async (id: string, patch: Record<string, unknown>) => {
      for (const map of Object.values(tables)) {
        if (map.has(id)) map.set(id, { ...map.get(id), ...patch });
      }
    },
    delete: async (id: string) => {
      for (const map of Object.values(tables)) {
        if (map.has(id)) map.delete(id);
      }
    },
    insert: async (table: string, doc: Record<string, unknown>) => {
      tables[table] = tables[table] ?? new Map();
      const id = `${table}-${tables[table].size + 1}`;
      tables[table].set(id, { _id: id, ...doc });
      return id;
    },
  };
  return { db, auth: { getUserIdentity: async () => null } } as any;
}

function makeTables(budget: Record<string, unknown>, reservation: Record<string, unknown>) {
  return {
    budgets: new Map([['b1', { _id: 'b1', ...budget }]]),
    budgetReservations: new Map([['r1', { _id: 'r1', ...reservation }]]),
    governanceEvents: new Map<string, any>(),
  };
}

describe('reconcileBudgetReservation governance', () => {
  it('settles spent to the actual cost and removes the reservation', async () => {
    // spent (incl. reservation) = 90; reserved 20, actual 15 → newSpent 85.
    const tables = makeTables(
      { scope: 'project:proj', cap: 100, spent: 90, policy: 'flexible' },
      { scope: 'project:proj', correlationId: 'c1', amount: 20 },
    );
    const ctx = createReconcileCtx(tables);

    await reconcileBudgetReservation(ctx, {
      scope: 'project:proj',
      correlationId: 'c1',
      actualCost: 15,
    });

    expect(tables.budgets.get('b1')!.spent).toBe(85);
    expect(tables.budgetReservations.size).toBe(0);
  });

  it('emits a single budget_warning when a task crosses 80% utilization', async () => {
    // prevSpent 70 (util .70) → newSpent 85 (util .85): crosses 0.8.
    const tables = makeTables(
      { scope: 'project:proj', cap: 100, spent: 90, policy: 'flexible' },
      { scope: 'project:proj', correlationId: 'c1', amount: 20 },
    );
    const ctx = createReconcileCtx(tables);

    await reconcileBudgetReservation(ctx, {
      scope: 'project:proj',
      correlationId: 'c1',
      actualCost: 15,
    });

    const events = Array.from(tables.governanceEvents.values());
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe('budget_warning');
    expect(events[0].scope).toBe('project:proj');
  });

  it('emits budget_breach (not warning) when a task crosses the cap', async () => {
    // prevSpent 95 (util .95) → newSpent 105 (util 1.05): crosses 1.0.
    const tables = makeTables(
      { scope: 'project:proj', cap: 100, spent: 105, policy: 'flexible' },
      { scope: 'project:proj', correlationId: 'c1', amount: 10 },
    );
    const ctx = createReconcileCtx(tables);

    await reconcileBudgetReservation(ctx, {
      scope: 'project:proj',
      correlationId: 'c1',
      actualCost: 10,
    });

    const events = Array.from(tables.governanceEvents.values());
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe('budget_breach');
  });

  it('does not emit a duplicate event when utilization was already in-band', async () => {
    // prevSpent 85 (util .85) → newSpent 93 (util .93): no threshold crossed.
    const tables = makeTables(
      { scope: 'project:proj', cap: 100, spent: 95, policy: 'flexible' },
      { scope: 'project:proj', correlationId: 'c1', amount: 10 },
    );
    const ctx = createReconcileCtx(tables);

    await reconcileBudgetReservation(ctx, {
      scope: 'project:proj',
      correlationId: 'c1',
      actualCost: 8,
    });

    expect(tables.governanceEvents.size).toBe(0);
  });
});
