import { v } from 'convex/values';

export const projectStatus = v.union(
  v.literal('active'),
  v.literal('paused'),
  v.literal('archived'),
);

export const sourceKind = v.union(
  v.literal('manual'),
  v.literal('scanner'),
  v.literal('import'),
);

export const trackStatus = v.union(
  v.literal('new'),
  v.literal('active'),
  v.literal('blocked'),
  v.literal('complete'),
  v.literal('archived'),
);

export const taskStatus = v.union(
  v.literal('backlog'),
  v.literal('ready'),
  v.literal('in_progress'),
  v.literal('review'),
  v.literal('done'),
  v.literal('blocked'),
);

export const priority = v.union(
  v.literal('low'),
  v.literal('medium'),
  v.literal('high'),
);

export const boardStatus = v.union(
  v.literal('active'),
  v.literal('archived'),
);

export const issueStatus = v.union(
  v.literal('open'),
  v.literal('triaged'),
  v.literal('resolved'),
  v.literal('closed'),
);

export const runStatus = v.union(
  v.literal('queued'),
  v.literal('running'),
  v.literal('succeeded'),
  v.literal('failed'),
  v.literal('cancelled'),
);

export const retrospectiveStatus = v.union(
  v.literal('pending'),
  v.literal('running'),
  v.literal('completed'),
  v.literal('failed'),
);

export const notificationType = v.union(
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

export const agentRole = v.union(
  v.literal('architect'),
  v.literal('executor'),
  v.literal('reviewer'),
  v.literal('merger'),
);

export const agentStatus = v.union(
  v.literal('active'),
  v.literal('idle'),
  v.literal('blocked'),
  v.literal('offline'),
);

export const sprintStatus = v.union(
  v.literal('planned'),
  v.literal('active'),
  v.literal('closed'),
);

export const pipelineStage = v.union(
  v.literal('dispatch'),
  v.literal('architect'),
  v.literal('executor'),
  v.literal('reviewer'),
  v.literal('merger'),
);

export const providerStatus = v.union(
  v.literal('active'),
  v.literal('rate_limited'),
  v.literal('idle'),
);

export const abTestStatus = v.union(
  v.literal('running'),
  v.literal('completed'),
);
