import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';
import type { BudgetEntry } from './lib/budget';
import { BudgetPolicy, resetBudgetPeriod as resetBudgetPeriodFn } from './lib/budget';
import { api } from './_generated/api';
import { budgetPeriodType, budgetPolicy, governanceEventType } from './lib/validators';

type GovernanceEventType =
  | 'budget_breach'
  | 'budget_warning'
  | 'retry_escalation'
  | 'harness_selection'
  | 'review_depth';

const budgetEntry = v.object({
  scope: v.string(),
  periodStart: v.number(),
  periodEnd: v.number(),
  cap: v.number(),
  spent: v.number(),
  policy: budgetPolicy,
  updatedAt: v.number(),
});

const governanceEventEntry = v.object({
  scope: v.string(),
  eventType: governanceEventType,
  payloadJson: v.string(),
  createdAt: v.number(),
});

type GovernanceEventEntry = {
  scope: string;
  eventType: GovernanceEventType;
  payloadJson: string;
  createdAt: number;
};

export const upsertBudget = mutation({
  args: {
    scope: v.string(),
    periodStart: v.number(),
    periodEnd: v.number(),
    cap: v.number(),
    spent: v.optional(v.number()),
    policy: budgetPolicy,
  },
  returns: budgetEntry,
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query('budgets')
      .withIndex('by_scope', (q) => q.eq('scope', args.scope))
      .first();

    const entry = {
      scope: args.scope,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      cap: args.cap,
      spent: args.spent ?? 0,
      policy: args.policy,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, entry);
      return { ...existing, ...entry };
    } else {
      await ctx.db.insert('budgets', entry);
      return entry;
    }
  },
});

export const getBudget = query({
  args: { scope: v.string() },
  returns: v.union(budgetEntry, v.null()),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const doc = await ctx.db
      .query('budgets')
      .withIndex('by_scope', (q) => q.eq('scope', args.scope))
      .first();
    return doc;
  },
});

export const listBudgets = query({
  args: {},
  returns: v.array(budgetEntry),
  handler: async (ctx) => {
    await resolveActor(ctx);
    const docs = await ctx.db.query('budgets').take(100);
    return docs;
  },
});

export const recordSpend = mutation({
  args: {
    scope: v.string(),
    amount: v.number(),
  },
  returns: v.union(budgetEntry, v.null()),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const existing = await ctx.db
      .query('budgets')
      .withIndex('by_scope', (q) => q.eq('scope', args.scope))
      .first();

    if (!existing) {
      return null;
    }

    const updated = {
      ...existing,
      spent: existing.spent + args.amount,
      updatedAt: Date.now(),
    };
    await ctx.db.patch(existing._id, updated);

    // Notify if budget threshold breached
    if (updated.spent >= updated.cap) {
      try {
        await ctx.runMutation(api.notifications.notifyBudgetAlert, {
          userId: `admin:${args.scope}`,
          scope: args.scope,
          spent: updated.spent,
          cap: updated.cap,
        });
      } catch {
        // Non-critical: notification failure should not block budget recording
      }
    }

    return updated;
  },
});

export const deleteBudget = mutation({
  args: { scope: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const existing = await ctx.db
      .query('budgets')
      .withIndex('by_scope', (q) => q.eq('scope', args.scope))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});

export const logGovernanceEvent = mutation({
  args: {
    scope: v.string(),
    eventType: v.union(
      v.literal('budget_breach'),
      v.literal('budget_warning'),
      v.literal('retry_escalation'),
      v.literal('harness_selection'),
      v.literal('review_depth'),
    ),
    payload: v.record(v.string(), v.union(v.string(), v.number(), v.boolean())),
  },
  returns: governanceEventEntry,
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const now = Date.now();

    const entry = {
      scope: args.scope,
      eventType: args.eventType,
      payloadJson: JSON.stringify(args.payload),
      createdAt: now,
    };

    await ctx.db.insert('governanceEvents', entry);
    return entry;
  },
});

export const getGovernanceEvents = query({
  args: {
    scope: v.optional(v.string()),
    eventType: v.optional(v.union(
      v.literal('budget_breach'),
      v.literal('budget_warning'),
      v.literal('retry_escalation'),
      v.literal('harness_selection'),
      v.literal('review_depth'),
    )),
    limit: v.optional(v.number()),
  },
  returns: v.array(governanceEventEntry),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const limit = args.limit ?? 100;

    if (args.scope && args.eventType) {
      return await ctx.db
        .query('governanceEvents')
        .withIndex('by_scope_and_eventType_and_createdAt', (q) =>
          q.eq('scope', args.scope!).eq('eventType', args.eventType!),
        )
        .order('desc')
        .take(limit);
    }

    if (args.scope) {
      return await ctx.db
        .query('governanceEvents')
        .withIndex('by_scope_and_eventType_and_createdAt', (q) => q.eq('scope', args.scope!))
        .order('desc')
        .take(limit);
    }

    if (args.eventType) {
      return await ctx.db
        .query('governanceEvents')
        .withIndex('by_eventType_and_createdAt', (q) => q.eq('eventType', args.eventType!))
        .order('desc')
        .take(limit);
    }

    return await ctx.db.query('governanceEvents').order('desc').take(limit);
  },
});

export const getRecentGovernanceEvents = query({
  args: {
    since: v.number(),
    scope: v.optional(v.string()),
  },
  returns: v.array(governanceEventEntry),
  handler: async (ctx, args) => {
    await resolveActor(ctx);

    if (args.scope) {
      return await ctx.db
        .query('governanceEvents')
        .withIndex('by_scope_and_createdAt', (q) =>
          q.eq('scope', args.scope!).gte('createdAt', args.since),
        )
        .take(1000);
    }

    return await ctx.db
      .query('governanceEvents')
      .withIndex('by_created_at', (q) => q.gte('createdAt', args.since))
      .take(1000);
  },
});

export {
  isBudgetBreached,
  computeRemainingBudget,
  computeSpendRate,
  isWithinPeriod,
  validateBudgetScope,
  checkBudgetAllowance,
  checkBudgetThreshold,
  computeMaxRetryCostExposure,
  resetBudgetPeriod,
} from './lib/budget';

export const reserveBudget = mutation({
  args: {
    scope: v.string(),
    amount: v.number(),
    correlationId: v.string(),
  },
  returns: v.union(
    v.object({ reserved: v.boolean(), reservationId: v.string(), reason: v.optional(v.string()) }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const budget = await ctx.db
      .query('budgets')
      .withIndex('by_scope', (q) => q.eq('scope', args.scope))
      .first();

    if (!budget) return null;

    const now = Date.now();
    if (now < budget.periodStart || now > budget.periodEnd) {
      return { reserved: true, reservationId: args.correlationId, reason: 'Outside budget period' };
    }

    const utilization = budget.cap > 0 ? (budget.spent + args.amount) / budget.cap : 0;

    if (budget.policy === 'strict' && utilization >= 1) {
      return { reserved: false, reservationId: args.correlationId, reason: `Strict budget cap would be exceeded: $${(budget.spent + args.amount).toFixed(2)} / $${budget.cap.toFixed(2)}` };
    }

    const updated = {
      spent: budget.spent + args.amount,
      updatedAt: now,
    };
    await ctx.db.patch(budget._id, updated);

    await ctx.db.insert('budgetReservations', {
      scope: args.scope,
      correlationId: args.correlationId,
      amount: args.amount,
      createdAt: now,
    } as any);

    return { reserved: true, reservationId: args.correlationId };
  },
});

export const reconcileBudgetReservation = mutation({
  args: {
    scope: v.string(),
    correlationId: v.string(),
    actualCost: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);

    const budget = await ctx.db
      .query('budgets')
      .withIndex('by_scope', (q) => q.eq('scope', args.scope))
      .first();

    if (budget) {
      const reservation = await ctx.db
        .query('budgetReservations')
        .withIndex('by_correlationId', (q) => q.eq('correlationId', args.correlationId))
        .first();

      if (reservation) {
        const reservedAmount = reservation.amount;
        const adjustment = reservedAmount - args.actualCost;
        // `budget.spent` currently includes this task's reservation estimate.
        // `prevSpent` is the cumulative spend before this task; `newSpent`
        // settles it to the actual cost. This mutation is the single source of
        // truth for `spent`, so budget governance is evaluated here against the
        // persisted value rather than off an estimate in `costs.recordCost`.
        const prevSpent = Math.max(0, budget.spent - reservedAmount);
        const newSpent = Math.max(0, budget.spent - adjustment);
        await ctx.db.patch(budget._id, { spent: newSpent, updatedAt: Date.now() });
        await ctx.db.delete(reservation._id);

        // Edge-triggered: emit a single governance event only when this task
        // pushes utilization across a threshold, avoiding the per-cost-record
        // duplicate warnings the previous implementation produced. A jump
        // straight past the cap emits only the breach.
        if (budget.cap > 0) {
          const prevUtil = prevSpent / budget.cap;
          const newUtil = newSpent / budget.cap;
          const crossed =
            newUtil >= 1 && prevUtil < 1
              ? 'budget_breach'
              : newUtil >= 0.8 && prevUtil < 0.8
                ? 'budget_warning'
                : null;
          if (crossed) {
            await ctx.db.insert('governanceEvents', {
              scope: args.scope,
              eventType: crossed,
              payloadJson: JSON.stringify({
                utilization: newUtil,
                spent: newSpent,
                cap: budget.cap,
                correlationId: args.correlationId,
              }),
              createdAt: Date.now(),
            });
          }
        }
      }
    }

    return null;
  },
});

export const checkDispatchBudget = query({
  args: { scope: v.string() },
  returns: v.union(
    v.object({
      allowed: v.boolean(),
      reason: v.string(),
      policy: budgetPolicy,
      spent: v.number(),
      cap: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const budget = await ctx.db
      .query('budgets')
      .withIndex('by_scope', (q) => q.eq('scope', args.scope))
      .first();

    if (!budget) return null;

    const now = Date.now();
    if (now < budget.periodStart || now > budget.periodEnd) {
      return { allowed: true, reason: 'Outside budget period', policy: budget.policy, spent: budget.spent, cap: budget.cap };
    }

    const utilization = budget.cap > 0 ? budget.spent / budget.cap : 0;

    if (budget.policy === 'strict' && utilization >= 1) {
      return { allowed: false, reason: `Hard budget cap exceeded: $${budget.spent.toFixed(2)} / $${budget.cap.toFixed(2)}`, policy: budget.policy, spent: budget.spent, cap: budget.cap };
    }

    if (budget.policy === 'soft' && utilization >= 1) {
      return { allowed: false, reason: `Soft budget limit reached: $${budget.spent.toFixed(2)} / $${budget.cap.toFixed(2)}`, policy: budget.policy, spent: budget.spent, cap: budget.cap };
    }

    return { allowed: true, reason: 'Within budget', policy: budget.policy, spent: budget.spent, cap: budget.cap };
  },
});

export const resetBudgetsCron = mutation({
  args: {
    periodType: budgetPeriodType,
  },
  returns: v.object({
    reset: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const now = Date.now();
    const budgets = await ctx.db.query('budgets').collect();

    let reset = 0;
    let skipped = 0;

    for (const budget of budgets) {
      if (now > budget.periodEnd) {
        const { periodStart, periodEnd, spent } = resetBudgetPeriodFn(budget, args.periodType, now);
        await ctx.db.patch(budget._id, { periodStart, periodEnd, spent, updatedAt: now });
        reset++;
      } else {
        skipped++;
      }
    }

    return { reset, skipped };
  },
});