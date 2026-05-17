/**
 * History-specific test fixtures for Phase 4+.
 * Extends foundation fixtures with realistic timestamps, cost fields,
 * and status transitions for history query tests.
 */

import {
  createMockCtx,
  sampleProject,
  sampleSprint,
  sampleTask,
  sampleAgents,
} from './foundation';

const BASE_TIME = Date.now();

export const sampleSprintHistory = {
  ...sampleSprint,
  status: 'closed' as const,
  budget: 1000,
  actualCost: 850,
  pointsDelivered: 25,
  taskCount: 10,
  completedCount: 8,
  startedAt: BASE_TIME - 1000 * 60 * 60 * 24 * 14,
  closedAt: BASE_TIME - 1000 * 60 * 60 * 24 * 1,
};

export const sampleTaskHistory = {
  ...sampleTask,
  status: 'done' as const,
  actualCost: 45.5,
  assigneeId: 'agent-1',
  sprintId: 'sprint-1',
  createdAt: BASE_TIME - 1000 * 60 * 60 * 24 * 10,
  updatedAt: BASE_TIME - 1000 * 60 * 60 * 24 * 2,
};

export const sampleAgentHistory = {
  ...sampleAgents[0],
  status: 'active' as const,
};

/**
 * Seeds a mock context with 10+ sprints and 50+ tasks for
 * performance-relevant history query tests.
 */
export async function createHistoryCtx() {
  const ctx = createMockCtx();

  const projectId = await ctx.db.insert('projects', sampleProject);

  // Seed 12 closed sprints with staggered dates
  for (let i = 0; i < 12; i++) {
    await ctx.db.insert('sprints', {
      ...sampleSprintHistory,
      projectId,
      name: `Sprint ${i + 1}`,
      startedAt: BASE_TIME - 1000 * 60 * 60 * 24 * (14 + i * 7),
      closedAt: BASE_TIME - 1000 * 60 * 60 * 24 * (7 + i * 7),
      budget: 500 + i * 50,
      actualCost: 400 + i * 40,
      pointsDelivered: 20 + i * 2,
      taskCount: 8 + i,
      completedCount: 6 + i,
    });
  }

  // Seed 55 tasks across the sprints
  for (let i = 0; i < 55; i++) {
    const sprintNum = (i % 12) + 1;
    const sprintId = `sprint-${sprintNum}`;
    await ctx.db.insert('tasks', {
      ...sampleTask,
      projectId,
      sprintId,
      title: `Task ${i + 1}`,
      status: i % 5 === 0 ? 'in_progress' : 'done',
      storyPoints: (i % 8) + 1,
      actualCost: (i % 10) * 5.5,
      assigneeId: `agent-${(i % 4) + 1}`,
      createdAt: BASE_TIME - 1000 * 60 * 60 * 24 * (i + 1),
      updatedAt: BASE_TIME - 1000 * 60 * 60 * 24 * (i % 7 + 1),
    });
  }

  // Seed 4 agents
  for (let i = 0; i < sampleAgents.length; i++) {
    await ctx.db.insert('agents', sampleAgents[i]);
  }

  return ctx;
}
