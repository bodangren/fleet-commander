import { mutation } from './_generated/server';
import { v } from 'convex/values';

export const seedAgents = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();

    const agents = [
      {
        name: 'alice',
        displayName: 'Alice Chen - Senior Developer',
        mode: 'code',
        model: 'gpt-4',
        temperature: 0.7,
        prompt: 'You are a senior TypeScript/React developer.',
        toolsJson: '{"edit":true,"bash":true,"glob":true,"grep":true,"read":true,"write":true}',
        source: 'manual' as const,
        updatedAt: now,
      },
      {
        name: 'bob',
        displayName: 'Bob Martinez - Full Stack Engineer',
        mode: 'code',
        model: 'gpt-4',
        temperature: 0.7,
        prompt: 'You are a full stack Python/React engineer.',
        toolsJson: '{"edit":true,"bash":true,"glob":true,"grep":true,"read":true,"write":true}',
        source: 'manual' as const,
        updatedAt: now,
      },
      {
        name: 'carol',
        displayName: 'Carol Wu - DevOps Engineer',
        mode: 'code',
        model: 'gpt-4',
        temperature: 0.7,
        prompt: 'You are a DevOps engineer specializing in Kubernetes and AWS.',
        toolsJson: '{"edit":true,"bash":true,"glob":true,"grep":true,"read":true,"write":true}',
        source: 'manual' as const,
        updatedAt: now,
      },
      {
        name: 'david',
        displayName: 'David Kim - Backend Developer',
        mode: 'code',
        model: 'gpt-4',
        temperature: 0.7,
        prompt: 'You are a backend developer specializing in Go and PostgreSQL.',
        toolsJson: '{"edit":true,"bash":true,"glob":true,"grep":true,"read":true,"write":true}',
        source: 'manual' as const,
        updatedAt: now,
      },
    ];

    for (const agent of agents) {
      const existing = await ctx.db
        .query('agents')
        .withIndex('by_name', (q) => q.eq('name', agent.name))
        .unique();
      if (!existing) {
        await ctx.db.insert('agents', agent);
      }
    }

    return null;
  },
});
