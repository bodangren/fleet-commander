import { describe, expect, it } from 'bun:test';
import { getNotificationPreferences, upsertNotificationPreferences } from './notifications';

interface PrefDoc {
  _id: string;
  userId: string;
  muteAll: boolean;
  inAppEnabled: boolean;
  webhookEnabled: boolean;
  webhookUrl?: string;
  emailEnabled: boolean;
  email?: string;
  typeFilters?: string;
  updatedAt: number;
}

function createPrefMockCtx(options: { preferences?: PrefDoc[] } = {}) {
  const preferences = new Map<string, PrefDoc>(
    (options.preferences ?? []).map((p) => [p._id, { ...p }]),
  );
  let idCounter = 1;

  const db = {
    query: (table: string) => {
      const map = table === 'notificationPreferences' ? preferences : new Map();
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

describe('getNotificationPreferences', () => {
  it('returns null when no preferences exist for the user', async () => {
    const ctx = createPrefMockCtx();
    const result = await getNotificationPreferences(ctx, { userId: 'user-missing' });
    expect(result).toBeNull();
  });

  it('returns the existing preference document for the user', async () => {
    const ctx = createPrefMockCtx({
      preferences: [
        {
          _id: 'pref-existing',
          userId: 'user-1',
          muteAll: true,
          inAppEnabled: false,
          webhookEnabled: false,
          emailEnabled: false,
          updatedAt: 1000,
        },
      ],
    });
    const result = await getNotificationPreferences(ctx, { userId: 'user-1' });
    expect(result?._id).toBe('pref-existing');
    expect(result?.muteAll).toBe(true);
    expect(result?.inAppEnabled).toBe(false);
  });
});

describe('upsertNotificationPreferences', () => {
  it('inserts a new preference row when none exists, applying defaults', async () => {
    const ctx = createPrefMockCtx();
    const result = await upsertNotificationPreferences(ctx, {
      userId: 'user-new',
      muteAll: true,
    });

    expect(result.userId).toBe('user-new');
    expect(result.muteAll).toBe(true);
    expect(result.inAppEnabled).toBe(true); // default
    expect(result.webhookEnabled).toBe(false); // default
    expect(result.emailEnabled).toBe(false); // default
    expect(ctx.preferences.size).toBe(1);
  });

  it('patches the existing row when one exists, preserving unspecified fields', async () => {
    const ctx = createPrefMockCtx({
      preferences: [
        {
          _id: 'pref-existing',
          userId: 'user-1',
          muteAll: false,
          inAppEnabled: true,
          webhookEnabled: true,
          webhookUrl: 'https://hook.example/old',
          emailEnabled: false,
          updatedAt: 1000,
        },
      ],
    });

    const result = await upsertNotificationPreferences(ctx, {
      userId: 'user-1',
      muteAll: true,
    });

    expect(result._id).toBe('pref-existing');
    expect(result.muteAll).toBe(true);
    expect(result.inAppEnabled).toBe(true); // preserved
    expect(result.webhookEnabled).toBe(true); // preserved
    expect(result.webhookUrl).toBe('https://hook.example/old'); // preserved
    expect(ctx.preferences.size).toBe(1);
  });

  it('writes the updatedAt timestamp on every upsert', async () => {
    const ctx = createPrefMockCtx();
    const before = Date.now();
    const result = await upsertNotificationPreferences(ctx, { userId: 'user-x' });
    expect(result.updatedAt).toBeGreaterThanOrEqual(before);
  });
});
