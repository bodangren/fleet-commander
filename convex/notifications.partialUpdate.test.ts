import { describe, expect, it } from 'bun:test';
import * as notificationsModule from './notifications';

const exported = notificationsModule as unknown as Record<string, unknown>;

interface PrefDoc {
  _id: string;
  userId: string;
  [k: string]: unknown;
}

function createPrefMockCtx(options: { preferences?: PrefDoc[] } = {}) {
  const preferences = new Map<string, PrefDoc>(
    (options.preferences ?? []).map((p) => [p._id, { ...p }]),
  );
  let idCounter = 1;

  const db = {
    query: (table: string) => {
      const map = table === 'notificationPreferences' ? preferences : new Map<string, PrefDoc>();
      return {
        withIndex: (_index: string, cb?: (q: any) => any) => {
          const filters: Array<{ field: string; value: any }> = [];
          const q = {
            eq: (field: string, value: any) => {
              filters.push({ field, value });
              return q;
            },
          };
          if (cb) cb(q);

          const matches = Array.from(map.values()).filter((doc) =>
            filters.every((f) => (doc as any)[f.field] === f.value),
          );

          return {
            unique: async () => matches[0] ?? null,
          };
        },
      };
    },
    patch: async (id: string, patch: Partial<PrefDoc>) => {
      const existing = preferences.get(id);
      if (existing) preferences.set(id, { ...existing, ...patch });
    },
    insert: async (table: string, doc: Omit<PrefDoc, '_id'>) => {
      if (table !== 'notificationPreferences') throw new Error('unexpected table');
      const id = `pref-${idCounter++}`;
      preferences.set(id, { ...doc, _id: id } as PrefDoc);
      return id;
    },
  };

  return {
    db,
    auth: { getUserIdentity: async () => null },
    preferences,
  } as any;
}

function getUpdateNotificationPreference(): ((ctx: any, args: any) => Promise<unknown>) | undefined {
  const fn = exported.updateNotificationPreference;
  return typeof fn === 'function' ? (fn as (ctx: any, args: any) => Promise<unknown>) : undefined;
}

describe('updateNotificationPreference (Phase 2 SoT)', () => {
  it('is exported from convex/notifications.ts', () => {
    expect(getUpdateNotificationPreference()).toBeDefined();
  });

  it('rejects budgetThresholdPercent below 0 (out-of-range boundary)', async () => {
    const fn = getUpdateNotificationPreference();
    expect(fn).toBeDefined();
    const ctx = createPrefMockCtx();
    await expect(
      fn!(ctx, { userId: 'user-1', key: 'budgetThresholdPercent', value: -1 }),
    ).rejects.toThrow();
  });

  it('rejects budgetThresholdPercent above 100 (out-of-range boundary)', async () => {
    const fn = getUpdateNotificationPreference();
    expect(fn).toBeDefined();
    const ctx = createPrefMockCtx();
    await expect(
      fn!(ctx, { userId: 'user-1', key: 'budgetThresholdPercent', value: 101 }),
    ).rejects.toThrow();
  });

  it('accepts budgetThresholdPercent boundary value 0', async () => {
    const fn = getUpdateNotificationPreference();
    expect(fn).toBeDefined();
    const ctx = createPrefMockCtx();
    await expect(
      fn!(ctx, { userId: 'user-1', key: 'budgetThresholdPercent', value: 0 }),
    ).resolves.toBeDefined();
  });

  it('accepts budgetThresholdPercent boundary value 100', async () => {
    const fn = getUpdateNotificationPreference();
    expect(fn).toBeDefined();
    const ctx = createPrefMockCtx();
    await expect(
      fn!(ctx, { userId: 'user-1', key: 'budgetThresholdPercent', value: 100 }),
    ).resolves.toBeDefined();
  });

  it('performs a partial update: only the named key is changed, siblings preserved', async () => {
    const fn = getUpdateNotificationPreference();
    expect(fn).toBeDefined();
    const ctx = createPrefMockCtx({
      preferences: [
        {
          _id: 'pref-existing',
          userId: 'user-1',
          emailSprints: false,
          emailBudget: false,
          inAppAlerts: true,
          budgetThresholdPercent: 50,
          updatedAt: 1000,
        },
      ],
    });

    const result = await fn!(ctx, {
      userId: 'user-1',
      key: 'emailSprints',
      value: true,
    });

    expect((result as PrefDoc).emailSprints).toBe(true);
    expect((result as PrefDoc).emailBudget).toBe(false);
    expect((result as PrefDoc).inAppAlerts).toBe(true);
    expect((result as PrefDoc).budgetThresholdPercent).toBe(50);
  });

  it('inserts a new preference row when none exists (upsert semantics)', async () => {
    const fn = getUpdateNotificationPreference();
    expect(fn).toBeDefined();
    const ctx = createPrefMockCtx();
    const before = ctx.preferences.size;

    const result = await fn!(ctx, {
      userId: 'user-new',
      key: 'emailSprints',
      value: true,
    });

    expect(ctx.preferences.size).toBe(before + 1);
    expect((result as PrefDoc).emailSprints).toBe(true);
    expect((result as PrefDoc).userId).toBe('user-new');
  });
});
