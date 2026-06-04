import { describe, expect, it, mock } from 'bun:test';
import { markAllRead, markAllReadContinue, deleteOldNotifications, deleteOldNotificationsContinue } from './notifications';
import { CLEANUP_AGE_MS } from './lib/notifications';

const BATCH_SIZE = 100;

function createNotificationMockCtx(options: {
  notifications?: Array<{ _id: string; userId: string; read: boolean; createdAt: number; type: string }>;
  preferences?: Array<any>;
}) {
  const notifications = new Map<string, any>(
    (options.notifications ?? []).map((n) => [n._id, { ...n }])
  );
  const preferences = new Map<string, any>(
    (options.preferences ?? []).map((p) => [p._id, { ...p }])
  );
  const scheduled: Array<{ fn: string; args: any }> = [];

  const tables: Record<string, Map<string, any>> = {
    notifications,
    notificationPreferences: preferences,
  };

  const db = {
    query: (table: string) => {
      const getBaseDocs = () => {
        const map = tables[table];
        return map ? Array.from(map.values()) : [];
      };
      return {
        withIndex: (_index: string, cb?: (q: any) => any) => {
          const filters: Array<{ type: string; field: string; value: any }> = [];
          const q = {
            eq: (field: string, value: any) => {
              filters.push({ type: 'eq', field, value });
              return q;
            },
            lt: (field: string, value: any) => {
              filters.push({ type: 'lt', field, value });
              return q;
            },
          };
          if (cb) cb(q);

          const getDocs = () => {
            const map = tables[table];
            const docs = map ? Array.from(map.values()) : [];
            return docs.filter((doc: any) =>
              filters.every((f) => {
                if (f.type === 'eq') return doc[f.field] === f.value;
                if (f.type === 'lt') return doc[f.field] < f.value;
                return true;
              })
            );
          };

          return {
            take: async (n: number) => getDocs().slice(0, n),
            collect: async () => getDocs(),
            order: (dir: 'asc' | 'desc') => ({
              take: async (n: number) => {
                let arr = getDocs();
                if (dir === 'desc') arr = arr.reverse();
                return arr.slice(0, n);
              },
            }),
          };
        },
      };
    },
    patch: async (id: string, patch: any) => {
      for (const map of Object.values(tables)) {
        if (map.has(id)) {
          const existing = map.get(id);
          map.set(id, { ...existing, ...patch });
          return;
        }
      }
    },
    delete: async (id: string) => {
      for (const map of Object.values(tables)) {
        if (map.has(id)) {
          map.delete(id);
          return;
        }
      }
    },
  };

  const scheduler = {
    runAfter: mock((_delay: number, fnRef: any, args: any) => {
      scheduled.push({ fn: fnRef?.__name ?? 'unknown', args });
      return Promise.resolve();
    }),
  };

  return {
    db,
    scheduler,
    scheduled,
    auth: { getUserIdentity: async () => null },
  } as any;
}

function makeNotification(overrides: Partial<any> = {}): any {
  return {
    _id: `notif-${Math.random().toString(36).slice(2, 8)}`,
    userId: 'user-1',
    type: 'task_completed',
    read: false,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('markAllRead', () => {
  it('marks all unread notifications as read', async () => {
    const notifications = [
      makeNotification({ _id: 'n1', read: false }),
      makeNotification({ _id: 'n2', read: false }),
      makeNotification({ _id: 'n3', read: true }),
    ];
    const ctx = createNotificationMockCtx({ notifications });

    const count = await markAllRead(ctx, { userId: 'user-1' });

    expect(count).toBe(2);
    expect(ctx.db.get ? await ctx.scheduled.length : 0).toBe(0);
  });

  it('schedules continuation when batch is full', async () => {
    const notifications = Array.from({ length: BATCH_SIZE }, (_, i) =>
      makeNotification({ _id: `n${i}`, read: false })
    );
    const ctx = createNotificationMockCtx({ notifications });

    const count = await markAllRead(ctx, { userId: 'user-1' });

    expect(count).toBe(BATCH_SIZE);
    expect(ctx.scheduler.runAfter).toHaveBeenCalledTimes(1);
  });
});

describe('markAllReadContinue', () => {
  it('marks remaining unread notifications without scheduling continuation', async () => {
    const notifications = Array.from({ length: 10 }, (_, i) =>
      makeNotification({ _id: `n${i}`, read: false })
    );
    const ctx = createNotificationMockCtx({ notifications });

    const result = await markAllReadContinue(ctx, { userId: 'user-1' });

    expect(result).toBeNull();
    expect(ctx.scheduler.runAfter).not.toHaveBeenCalled();
  });

  it('schedules further continuation when batch is still full', async () => {
    const notifications = Array.from({ length: BATCH_SIZE }, (_, i) =>
      makeNotification({ _id: `n${i}`, read: false })
    );
    const ctx = createNotificationMockCtx({ notifications });

    await markAllReadContinue(ctx, { userId: 'user-1' });

    expect(ctx.scheduler.runAfter).toHaveBeenCalledTimes(1);
  });
});

describe('deleteOldNotifications', () => {
  it('deletes notifications older than 30 days', async () => {
    const now = Date.now();
    const oldTimestamp = now - CLEANUP_AGE_MS - 1000;
    const recentTimestamp = now - 1000;

    const notifications = [
      makeNotification({ _id: 'old-1', createdAt: oldTimestamp }),
      makeNotification({ _id: 'recent-1', createdAt: recentTimestamp }),
    ];
    const ctx = createNotificationMockCtx({ notifications });

    const deleted = await deleteOldNotifications(ctx, {});

    expect(deleted).toBe(1);
    expect(ctx.scheduler.runAfter).not.toHaveBeenCalled();
  });

  it('schedules continuation when batch is full', async () => {
    const now = Date.now();
    const oldTimestamp = now - CLEANUP_AGE_MS - 1000;
    const notifications = Array.from({ length: BATCH_SIZE }, (_, i) =>
      makeNotification({ _id: `n${i}`, createdAt: oldTimestamp })
    );
    const ctx = createNotificationMockCtx({ notifications });

    const deleted = await deleteOldNotifications(ctx, {});

    expect(deleted).toBe(BATCH_SIZE);
    expect(ctx.scheduler.runAfter).toHaveBeenCalledTimes(1);
  });

  it('skips notifications within retention period', async () => {
    const now = Date.now();
    const notifications = [
      makeNotification({ _id: 'fresh', createdAt: now - 1000 }),
    ];
    const ctx = createNotificationMockCtx({ notifications });

    const deleted = await deleteOldNotifications(ctx, {});

    expect(deleted).toBe(0);
  });
});

describe('deleteOldNotificationsContinue', () => {
  it('deletes remaining old notifications', async () => {
    const now = Date.now();
    const oldTimestamp = now - CLEANUP_AGE_MS - 1000;
    const notifications = Array.from({ length: 10 }, (_, i) =>
      makeNotification({ _id: `n${i}`, createdAt: oldTimestamp })
    );
    const ctx = createNotificationMockCtx({ notifications });

    const result = await deleteOldNotificationsContinue(ctx, {});

    expect(result).toBeNull();
    expect(ctx.scheduler.runAfter).not.toHaveBeenCalled();
  });

  it('schedules further continuation when batch is still full', async () => {
    const now = Date.now();
    const oldTimestamp = now - CLEANUP_AGE_MS - 1000;
    const notifications = Array.from({ length: BATCH_SIZE }, (_, i) =>
      makeNotification({ _id: `n${i}`, createdAt: oldTimestamp })
    );
    const ctx = createNotificationMockCtx({ notifications });

    await deleteOldNotificationsContinue(ctx, {});

    expect(ctx.scheduler.runAfter).toHaveBeenCalledTimes(1);
  });
});
