import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';
import type { BudgetEntry } from './lib/budget';
import { BudgetPolicy } from './lib/budget';

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
  policy: v.union(v.literal('strict'), v.literal('soft'), v.literal('advisory')),
  updatedAt: v.number(),
});

const governanceEventEntry = v.object({
  scope: v.string(),
  eventType: v.union(
    v.literal('budget_breach'),
    v.literal('budget_warning'),
    v.literal('retry_escalation'),
    v.literal('harness_selection'),
    v.literal('review_depth'),
  ),
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
    policy: v.union(v.literal('strict'), v.literal('soft'), v.literal('advisory')),
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
    let docs = await ctx.db.query('governanceEvents').take(args.limit ?? 100);

    if (args.scope) {
      docs = docs.filter((d) => d.scope === args.scope);
    }

    if (args.eventType) {
      docs = docs.filter((d) => d.eventType === args.eventType);
    }

    return docs;
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
    let docs = await ctx.db
      .query('governanceEvents')
      .withIndex('by_created_at', (q) => q.gte('createdAt', args.since))
      .take(1000);

    if (args.scope) {
      docs = docs.filter((d) => d.scope === args.scope);
    }

    return docs;
  },
});

export {
  isBudgetBreached,
  computeRemainingBudget,
  computeSpendRate,
  isWithinPeriod,
  validateBudgetScope,
} from './lib/budget';