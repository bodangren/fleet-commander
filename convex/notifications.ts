import { v } from 'convex/values';
import { mutation, query, action, internalMutation } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import { internal } from './_generated/api';
import { resolveActor } from './lib/auth';
import {
  shouldDedupeNotification,
  shouldCleanupNotification,
} from './lib/notifications';

const BATCH_SIZE = 100;

const notificationType = v.union(
  v.literal('task_completed'),
  v.literal('task_failed'),
  v.literal('budget_alert'),
  v.literal('circuit_breaker_open'),
  v.literal('sprint_completed'),
  v.literal('retrospective_ready'),
  v.literal('hook_failure'),
  v.literal('session_resumed'),
  v.literal('backoff_exhausted'),
  v.literal('retry_cap_reached'),
);

const notificationEntry = v.object({
  _id: v.id('notifications'),
  userId: v.string(),
  type: notificationType,
  title: v.string(),
  body: v.string(),
  channel: v.union(v.literal('in_app'), v.literal('webhook'), v.literal('email')),
  read: v.boolean(),
  createdAt: v.number(),
  metadata: v.optional(v.string()),
});

const preferenceEntry = v.object({
  _id: v.id('notificationPreferences'),
  userId: v.string(),
  muteAll: v.boolean(),
  inAppEnabled: v.boolean(),
  webhookUrl: v.optional(v.string()),
  webhookEnabled: v.boolean(),
  email: v.optional(v.string()),
  emailEnabled: v.boolean(),
  typeFilters: v.optional(v.string()),
  updatedAt: v.number(),
});

interface TypeFilter {
  in_app?: boolean;
  webhook?: boolean;
  email?: boolean;
}

/**
 * Parses type filter strings for notification queries
 * @param typeFiltersJson - JSON string of type filters
 * @returns {Record<string, TypeFilter>} Parsed filter configuration
 */
function parseTypeFilters(typeFiltersJson?: string): Record<string, TypeFilter> {
  if (!typeFiltersJson) return {};
  try {
    return JSON.parse(typeFiltersJson) as Record<string, TypeFilter>;
  } catch {
    return {};
  }
}

/**
 * Checks if a notification channel is enabled
 * @param prefs - User notification preferences
 * @param type - Notification type string
 * @param channel - Channel to check ('in_app', 'webhook', 'email')
 * @returns {boolean} Whether the channel is enabled for this type
 */
function channelEnabled(
  prefs: { muteAll: boolean; inAppEnabled: boolean; webhookEnabled: boolean; emailEnabled: boolean; typeFilters?: string },
  type: string,
  channel: 'in_app' | 'webhook' | 'email',
): boolean {
  if (prefs.muteAll) return false;
  const filters = parseTypeFilters(prefs.typeFilters);
  const typeFilter = filters[type];
  if (typeFilter) {
    const explicit = typeFilter[channel];
    if (explicit !== undefined) return explicit;
  }
  if (channel === 'in_app') return prefs.inAppEnabled;
  if (channel === 'webhook') return prefs.webhookEnabled;
  return prefs.emailEnabled;
}

/**
 * Inserts a notification if deduplication allows
 * @param ctx - Convex mutation context
 * @param args - Notification data including userId, type, title, body, channel
 * @returns {Promise<Id<"notifications"> | null>} Inserted notification ID or null if deduplicated
 */
async function insertNotificationIfAllowed(
  ctx: MutationCtx,
  args: {
    userId: string;
    type: string;
    title: string;
    body: string;
    channel: 'in_app' | 'webhook' | 'email';
    metadata?: Record<string, string | number | boolean>;
  },
) {
  const now = Date.now();

  const prefs = await ctx.db
    .query('notificationPreferences')
    .withIndex('by_user', (q) => q.eq('userId', args.userId))
    .unique();

  if (prefs && !channelEnabled(prefs, args.type, args.channel)) {
    return null;
  }

  const recent = await ctx.db
    .query('notifications')
    .withIndex('by_user_and_type', (q) => q.eq('userId', args.userId).eq('type', args.type as any))
    .order('desc')
    .take(1);

  if (recent.length > 0 && shouldDedupeNotification(recent[0].createdAt, now)) {
    return null;
  }

  return ctx.db.insert('notifications', {
    userId: args.userId,
    type: args.type as any,
    title: args.title,
    body: args.body,
    channel: args.channel,
    read: false,
    createdAt: now,
    metadata: args.metadata ? JSON.stringify(args.metadata) : undefined,
  });
}

export const createNotification = mutation({
  args: {
    userId: v.string(),
    type: notificationType,
    title: v.string(),
    body: v.string(),
    channel: v.union(v.literal('in_app'), v.literal('webhook'), v.literal('email')),
    metadata: v.optional(v.record(v.string(), v.union(v.string(), v.number(), v.boolean()))),
  },
  returns: v.union(v.id('notifications'), v.null()),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    return insertNotificationIfAllowed(ctx, args);
  },
});

export const getUserNotifications = query({
  args: {
    userId: v.string(),
    type: v.optional(notificationType),
    read: v.optional(v.boolean()),
    since: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  returns: v.array(notificationEntry),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const limit = args.limit ?? 50;

    if (args.type && args.read !== undefined) {
      return ctx.db
        .query('notifications')
        .withIndex('by_user_and_read', (q) => q.eq('userId', args.userId).eq('read', args.read!))
        .filter((q) => q.eq(q.field('type'), args.type!))
        .order('desc')
        .take(limit);
    }

    if (args.read !== undefined) {
      return ctx.db
        .query('notifications')
        .withIndex('by_user_and_read', (q) => q.eq('userId', args.userId).eq('read', args.read!))
        .order('desc')
        .take(limit);
    }

    if (args.type) {
      return ctx.db
        .query('notifications')
        .withIndex('by_user_and_type', (q) => q.eq('userId', args.userId).eq('type', args.type!))
        .order('desc')
        .take(limit);
    }

    return ctx.db
      .query('notifications')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .take(limit);
  },
});

export const getUnreadCount = query({
  args: { userId: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const unread = await ctx.db
      .query('notifications')
      .withIndex('by_user_and_read', (q) => q.eq('userId', args.userId).eq('read', false))
      .collect();
    return unread.length;
  },
});

export const markRead = mutation({
  args: { id: v.id('notifications') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    await ctx.db.patch(args.id, { read: true });
    return null;
  },
});

export const markAllRead = mutation({
  args: { userId: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const unread = await ctx.db
      .query('notifications')
      .withIndex('by_user_and_read', (q) => q.eq('userId', args.userId).eq('read', false))
      .take(BATCH_SIZE);

    for (const n of unread) {
      await ctx.db.patch(n._id, { read: true });
    }

    if (unread.length === BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.notifications.markAllReadContinue, {
        userId: args.userId,
      });
    }

    return unread.length;
  },
});

export const markAllReadContinue = internalMutation({
  args: { userId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query('notifications')
      .withIndex('by_user_and_read', (q) => q.eq('userId', args.userId).eq('read', false))
      .take(BATCH_SIZE);

    for (const n of unread) {
      await ctx.db.patch(n._id, { read: true });
    }

    if (unread.length === BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.notifications.markAllReadContinue, {
        userId: args.userId,
      });
    }

    return null;
  },
});

export const deleteOldNotifications = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    await resolveActor(ctx);
    const now = Date.now();
    const batch = await ctx.db
      .query('notifications')
      .withIndex('by_created_at', (q) => q.lt('createdAt', now))
      .take(BATCH_SIZE);

    let deleted = 0;
    for (const n of batch) {
      if (shouldCleanupNotification(n.createdAt, now)) {
        await ctx.db.delete(n._id);
        deleted++;
      }
    }

    if (batch.length === BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.notifications.deleteOldNotificationsContinue, {});
    }

    return deleted;
  },
});

export const deleteOldNotificationsContinue = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const batch = await ctx.db
      .query('notifications')
      .withIndex('by_created_at', (q) => q.lt('createdAt', now))
      .take(BATCH_SIZE);

    for (const n of batch) {
      if (shouldCleanupNotification(n.createdAt, now)) {
        await ctx.db.delete(n._id);
      }
    }

    if (batch.length === BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.notifications.deleteOldNotificationsContinue, {});
    }

    return null;
  },
});

// ── Notification Preferences ──

export const getNotificationPreferences = query({
  args: { userId: v.string() },
  returns: v.union(preferenceEntry, v.null()),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db
      .query('notificationPreferences')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .unique();
    return doc ?? null;
  },
});

export const upsertNotificationPreferences = mutation({
  args: {
    userId: v.string(),
    muteAll: v.optional(v.boolean()),
    inAppEnabled: v.optional(v.boolean()),
    webhookUrl: v.optional(v.string()),
    webhookEnabled: v.optional(v.boolean()),
    email: v.optional(v.string()),
    emailEnabled: v.optional(v.boolean()),
    typeFilters: v.optional(v.record(v.string(), v.object({
      in_app: v.optional(v.boolean()),
      webhook: v.optional(v.boolean()),
      email: v.optional(v.boolean()),
    }))),
  },
  returns: preferenceEntry,
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const now = Date.now();
    const existing = await ctx.db
      .query('notificationPreferences')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .unique();

    const defaults = {
      muteAll: false,
      inAppEnabled: true,
      webhookEnabled: false,
      emailEnabled: false,
      typeFilters: undefined,
    };

    const next = {
      userId: args.userId,
      muteAll: args.muteAll ?? existing?.muteAll ?? defaults.muteAll,
      inAppEnabled: args.inAppEnabled ?? existing?.inAppEnabled ?? defaults.inAppEnabled,
      webhookUrl: args.webhookUrl ?? existing?.webhookUrl,
      webhookEnabled: args.webhookEnabled ?? existing?.webhookEnabled ?? defaults.webhookEnabled,
      email: args.email ?? existing?.email,
      emailEnabled: args.emailEnabled ?? existing?.emailEnabled ?? defaults.emailEnabled,
      typeFilters: args.typeFilters ? JSON.stringify(args.typeFilters) : existing?.typeFilters,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, next);
      return { _id: existing._id, ...next };
    } else {
      const id = await ctx.db.insert('notificationPreferences', next);
      return { _id: id, ...next };
    }
  },
});

// ── Event Notification Wrappers ──

export const notifyTaskCompleted = mutation({
  args: {
    userId: v.string(),
    taskKey: v.string(),
    taskTitle: v.string(),
    projectSlug: v.string(),
  },
  returns: v.union(v.id('notifications'), v.null()),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    return insertNotificationIfAllowed(ctx, {
      userId: args.userId,
      type: 'task_completed',
      title: `Task completed: ${args.taskTitle}`,
      body: `Task ${args.taskKey} in project ${args.projectSlug} has been completed.`,
      channel: 'in_app',
      metadata: { taskKey: args.taskKey, projectSlug: args.projectSlug },
    });
  },
});

export const notifyTaskFailed = mutation({
  args: {
    userId: v.string(),
    taskKey: v.string(),
    taskTitle: v.string(),
    projectSlug: v.string(),
    error: v.optional(v.string()),
  },
  returns: v.union(v.id('notifications'), v.null()),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    return insertNotificationIfAllowed(ctx, {
      userId: args.userId,
      type: 'task_failed',
      title: `Task failed: ${args.taskTitle}`,
      body: args.error
        ? `Task ${args.taskKey} failed: ${args.error}`
        : `Task ${args.taskKey} in project ${args.projectSlug} has failed.`,
      channel: 'in_app',
      metadata: { taskKey: args.taskKey, projectSlug: args.projectSlug, error: args.error ?? '' },
    });
  },
});

export const notifyBudgetAlert = mutation({
  args: {
    userId: v.string(),
    scope: v.string(),
    spent: v.number(),
    cap: v.number(),
  },
  returns: v.union(v.id('notifications'), v.null()),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    return insertNotificationIfAllowed(ctx, {
      userId: args.userId,
      type: 'budget_alert',
      title: `Budget alert: ${args.scope}`,
      body: `Spent $${args.spent.toFixed(2)} / $${args.cap.toFixed(2)} for ${args.scope}.`,
      channel: 'in_app',
      metadata: { scope: args.scope, spent: args.spent, cap: args.cap },
    });
  },
});

export const notifyCircuitBreakerOpen = mutation({
  args: {
    userId: v.string(),
    agentId: v.string(),
    failureCount: v.number(),
  },
  returns: v.union(v.id('notifications'), v.null()),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    return insertNotificationIfAllowed(ctx, {
      userId: args.userId,
      type: 'circuit_breaker_open',
      title: `Circuit breaker open: ${args.agentId}`,
      body: `Agent ${args.agentId} circuit breaker is open after ${args.failureCount} failures.`,
      channel: 'in_app',
      metadata: { agentId: args.agentId, failureCount: args.failureCount },
    });
  },
});

export const notifySprintCompleted = mutation({
  args: {
    userId: v.string(),
    sprintName: v.string(),
    projectSlug: v.string(),
  },
  returns: v.union(v.id('notifications'), v.null()),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    return insertNotificationIfAllowed(ctx, {
      userId: args.userId,
      type: 'sprint_completed',
      title: `Sprint completed: ${args.sprintName}`,
      body: `Sprint ${args.sprintName} in project ${args.projectSlug} has been completed.`,
      channel: 'in_app',
      metadata: { sprintName: args.sprintName, projectSlug: args.projectSlug },
    });
  },
});

export const notifyRetrospectiveReady = mutation({
  args: {
    userId: v.string(),
    retrospectiveName: v.string(),
    projectSlug: v.optional(v.string()),
  },
  returns: v.union(v.id('notifications'), v.null()),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    return insertNotificationIfAllowed(ctx, {
      userId: args.userId,
      type: 'retrospective_ready',
      title: `Retrospective ready: ${args.retrospectiveName}`,
      body: args.projectSlug
        ? `Retrospective ${args.retrospectiveName} for project ${args.projectSlug} is ready.`
        : `Retrospective ${args.retrospectiveName} is ready.`,
      channel: 'in_app',
      metadata: { retrospectiveName: args.retrospectiveName, projectSlug: args.projectSlug ?? '' },
    });
  },
});

export const notifyHookFailure = mutation({
  args: {
    userId: v.string(),
    hookName: v.string(),
    taskKey: v.string(),
    exitCode: v.number(),
    stderr: v.optional(v.string()),
  },
  returns: v.union(v.id('notifications'), v.null()),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    return insertNotificationIfAllowed(ctx, {
      userId: args.userId,
      type: 'hook_failure',
      title: `Hook failure: ${args.hookName}`,
      body: `Hook ${args.hookName} for task ${args.taskKey} failed with exit code ${args.exitCode}.`,
      channel: 'in_app',
      metadata: { hookName: args.hookName, taskKey: args.taskKey, exitCode: args.exitCode, stderr: args.stderr ?? '' },
    });
  },
});

export const notifyBackoffExhausted = mutation({
  args: {
    userId: v.string(),
    taskKey: v.string(),
    maxRetries: v.number(),
  },
  returns: v.union(v.id('notifications'), v.null()),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    return insertNotificationIfAllowed(ctx, {
      userId: args.userId,
      type: 'backoff_exhausted',
      title: `Backoff exhausted: ${args.taskKey}`,
      body: `Task ${args.taskKey} reached max retries (${args.maxRetries}). Backoff exhausted.`,
      channel: 'in_app',
      metadata: { taskKey: args.taskKey, maxRetries: args.maxRetries },
    });
  },
});

export const notifySessionResumed = mutation({
  args: {
    userId: v.string(),
    taskKey: v.string(),
    sessionId: v.string(),
  },
  returns: v.union(v.id('notifications'), v.null()),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    return insertNotificationIfAllowed(ctx, {
      userId: args.userId,
      type: 'session_resumed',
      title: `Session resumed: ${args.taskKey}`,
      body: `Task ${args.taskKey} resumed with session ${args.sessionId}.`,
      channel: 'in_app',
      metadata: { taskKey: args.taskKey, sessionId: args.sessionId },
    });
  },
});

// ── Delivery Channels ──

export const deliverWebhook = action({
  args: {
    url: v.string(),
    /** Webhook payload — values are JSON-serializable primitives */
    payload: v.record(v.string(), v.union(v.string(), v.number(), v.boolean(), v.null())),
  },
  returns: v.object({ success: v.boolean(), status: v.optional(v.number()), error: v.optional(v.string()) }),
  handler: async (_ctx, args) => {
    try {
      const response = await fetch(args.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args.payload),
      });
      return { success: response.ok, status: response.status };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  },
});
