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
        role: 'executor' as const,
        skills: ['TypeScript', 'React'],
        model: 'gpt-4',
        costPerPoint: 1.0,
        reliability: 0.8,
        status: 'active' as const,
        workload: 0,
        maxWorkload: 5,
        createdAt: now,
      },
      {
        name: 'bob',
        role: 'executor' as const,
        skills: ['Python', 'React'],
        model: 'gpt-4',
        costPerPoint: 1.0,
        reliability: 0.8,
        status: 'active' as const,
        workload: 0,
        maxWorkload: 5,
        createdAt: now,
      },
      {
        name: 'carol',
        role: 'executor' as const,
        skills: ['Kubernetes', 'AWS'],
        model: 'gpt-4',
        costPerPoint: 1.0,
        reliability: 0.8,
        status: 'active' as const,
        workload: 0,
        maxWorkload: 5,
        createdAt: now,
      },
      {
        name: 'david',
        role: 'executor' as const,
        skills: ['Go', 'PostgreSQL'],
        model: 'gpt-4',
        costPerPoint: 1.0,
        reliability: 0.8,
        status: 'active' as const,
        workload: 0,
        maxWorkload: 5,
        createdAt: now,
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
