import { mutation } from './_generated/server';
import { v } from 'convex/values';

export const seedMvpData = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();

    // Seed employees
    const employees = [
      { name: 'Alice Chen', role: 'Senior Developer', skills: ['typescript', 'react', 'node.js'], model: 'gpt-4', status: 'active' as const, createdAt: now },
      { name: 'Bob Martinez', role: 'Full Stack Engineer', skills: ['python', 'django', 'react'], model: 'gpt-4', status: 'active' as const, createdAt: now },
      { name: 'Carol Wu', role: 'DevOps Engineer', skills: ['kubernetes', 'terraform', 'aws'], model: 'gpt-4', status: 'away' as const, createdAt: now },
      { name: 'David Kim', role: 'Backend Developer', skills: ['golang', 'postgresql', 'redis'], model: 'gpt-4', status: 'active' as const, createdAt: now },
    ];
    for (const emp of employees) {
      await ctx.db.insert('employees', emp);
    }

    // Seed tracks (hardcoded since filesystem access requires actions)
    const tracks = [
      {
        projectSlug: 'fleet-commander',
        trackId: 'virtual_software_house_mvp_20260516',
        title: 'virtual software house mvp',
        status: 'active' as const,
        specMarkdown: '',
        planMarkdown: '',
        version: 1,
        updatedAt: now,
      },
      {
        projectSlug: 'fleet-commander',
        trackId: 'employee_performance_analytics_20260517',
        title: 'employee performance analytics',
        status: 'new' as const,
        specMarkdown: '',
        planMarkdown: '',
        version: 1,
        updatedAt: now,
      },
      {
        projectSlug: 'fleet-commander',
        trackId: 'sprint_retrospective_reports_20260517',
        title: 'sprint retrospective reports',
        status: 'new' as const,
        specMarkdown: '',
        planMarkdown: '',
        version: 1,
        updatedAt: now,
      },
      {
        projectSlug: 'fleet-commander',
        trackId: 'task_dependency_graph_20260517',
        title: 'task dependency graph',
        status: 'new' as const,
        specMarkdown: '',
        planMarkdown: '',
        version: 1,
        updatedAt: now,
      },
    ];
    for (const track of tracks) {
      await ctx.db.insert('tracks', track);
    }

    return null;
  },
});
