import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { resolveActor } from './lib/auth';

const CURRENT_SCHEMA_VERSION = 1;

export const getSchemaVersion = query({
  args: {},
  returns: v.object({
    version: v.number(),
    updatedAt: v.number(),
  }),
  handler: async (ctx) => {
    await resolveActor(ctx);
    const doc = await ctx.db
      .query('systemMetadata')
      .withIndex('by_key', (q) => q.eq('key', 'schemaVersion'))
      .unique();

    if (!doc) {
      return { version: 0, updatedAt: 0 };
    }

    return {
      version: JSON.parse(doc.valueJson) as number,
      updatedAt: doc.updatedAt,
    };
  },
});

export const initSchemaVersion = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    await resolveActor(ctx);
    const existing = await ctx.db
      .query('systemMetadata')
      .withIndex('by_key', (q) => q.eq('key', 'schemaVersion'))
      .unique();

    if (existing) {
      return JSON.parse(existing.valueJson) as number;
    }

    await ctx.db.insert('systemMetadata', {
      key: 'schemaVersion',
      valueJson: JSON.stringify(CURRENT_SCHEMA_VERSION),
      updatedAt: Date.now(),
    });

    return CURRENT_SCHEMA_VERSION;
  },
});

export const bumpSchemaVersion = mutation({
  args: { newVersion: v.number() },
  returns: v.number(),
  handler: async (ctx, args) => {
    await resolveActor(ctx);
    const existing = await ctx.db
      .query('systemMetadata')
      .withIndex('by_key', (q) => q.eq('key', 'schemaVersion'))
      .unique();

    if (existing) {
      const current = JSON.parse(existing.valueJson) as number;
      if (args.newVersion <= current) {
        throw new Error(`Cannot downgrade schema from v${current} to v${args.newVersion}`);
      }
      await ctx.db.patch(existing._id, {
        valueJson: JSON.stringify(args.newVersion),
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert('systemMetadata', {
        key: 'schemaVersion',
        valueJson: JSON.stringify(args.newVersion),
        updatedAt: Date.now(),
      });
    }

    return args.newVersion;
  },
});
