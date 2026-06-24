import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { pipelineRunStatus, pipelineStage, priority, runStatus, taskStatus } from '../lib/validators';

export default {
  tasks: defineTable({
    projectId: v.id('projects'),
    sprintId: v.optional(v.id('sprints')),
    title: v.string(),
    description: v.string(),
    storyPoints: v.number(),
    status: taskStatus,
    priority: priority,
    costEstimate: v.number(),
    actualCost: v.optional(v.number()),
    assigneeId: v.optional(v.id('agents')),
    reviewerId: v.optional(v.id('agents')),
    mergerId: v.optional(v.id('agents')),
    projectSlug: v.optional(v.string()),
    trackId: v.optional(v.string()),
    taskKey: v.optional(v.string()),
    dependencies: v.optional(v.array(v.string())),
    sessionId: v.optional(v.string()),
    assigneeName: v.optional(v.string()),
    blockerReason: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    claimedAt: v.optional(v.number()),
    claimedByRunId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_project', ['projectId'])
    .index('by_status', ['status'])
    .index('by_sprint', ['sprintId'])
    .index('by_status_and_updated_at', ['status', 'updatedAt'])
    .index('by_updated_at', ['updatedAt'])
    .index('by_task_key', ['taskKey']),

  runs: defineTable({
    taskId: v.id('tasks'),
    employeeId: v.id('employees'),
    status: runStatus,
    output: v.optional(v.string()),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
  })
    .index('by_task', ['taskId'])
    .index('by_employee', ['employeeId'])
    .index('by_employee_and_startedAt', ['employeeId', 'startedAt'])
    .index('by_status', ['status']),

  pipelineRuns: defineTable({
    taskId: v.optional(v.id('tasks')),
    executionId: v.optional(v.string()),
    pipelineName: v.optional(v.string()),
    stage: pipelineStage,
    agentId: v.optional(v.id('agents')),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    cost: v.optional(v.number()),
    status: pipelineRunStatus,
    createdAt: v.number(),
  })
    .index('by_task', ['taskId'])
    .index('by_task_and_status', ['taskId', 'status'])
    .index('by_execution', ['executionId']),

  workRuns: defineTable({
    projectSlug: v.string(),
    runId: v.string(),
    status: runStatus,
    selectedTaskKey: v.optional(v.string()),
    runnerHost: v.optional(v.string()),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    loadMs: v.optional(v.number()),
    scoreMs: v.optional(v.number()),
    executeMs: v.optional(v.number()),
    persistMs: v.optional(v.number()),
    hookBeforeMs: v.optional(v.number()),
    hookAfterMs: v.optional(v.number()),
    totalMs: v.optional(v.number()),
  })
    .index('by_project', ['projectSlug'])
    .index('by_project_and_status', ['projectSlug', 'status'])
    .index('by_run_id', ['runId'])
    .index('by_started_at', ['startedAt'])
    .index('by_status_and_started_at', ['status', 'startedAt'])
    .index('by_runnerHost_and_started_at', ['runnerHost', 'startedAt']),

  executionLogs: defineTable({
    projectSlug: v.string(),
    runId: v.string(),
    trackId: v.optional(v.string()),
    status: runStatus,
    summary: v.string(),
    rawOutput: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_project', ['projectSlug'])
    .index('by_project_and_run', ['projectSlug', 'runId'])
    .index('by_created_at', ['createdAt'])
    .index('by_status_and_created_at', ['status', 'createdAt']),
};
