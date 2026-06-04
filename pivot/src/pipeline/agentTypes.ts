/**
 * Types for the 5-stage agent pipeline execution engine.
 * Distinct from the legacy CI/CD pipeline types in types.ts
 */

export type PipelineStage =
  | 'dispatch'
  | 'architect'
  | 'executor'
  | 'reviewer'
  | 'merger';

export type TaskStatus =
  | 'backlog'
  | 'ready'
  | 'in_progress'
  | 'review'
  | 'done'
  | 'blocked';

export type AgentRole = 'architect' | 'executor' | 'reviewer' | 'merger';

export type AgentStatus = 'active' | 'idle' | 'blocked' | 'offline';

export interface Agent {
  _id: string;
  name: string;
  role: AgentRole;
  skills: string[];
  model: string;
  costPerPoint: number;
  reliability: number;
  status: AgentStatus;
  workload: number;
  maxWorkload: number;
  createdAt: number;
}

export interface Task {
  _id: string;
  taskKey?: string;
  projectId: string;
  sprintId?: string;
  title: string;
  description: string;
  storyPoints: number;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  costEstimate: number;
  actualCost?: number;
  assigneeId?: string;
  reviewerId?: string;
  mergerId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PipelineRun {
  _id: string;
  taskId: string;
  stage: PipelineStage;
  agentId?: string;
  startTime: number;
  endTime?: number;
  cost?: number;
  status: 'running' | 'completed' | 'failed';
  createdAt: number;
}

export interface Sprint {
  _id: string;
  projectId: string;
  name: string;
  status: 'planned' | 'active' | 'closed';
  budget: number;
  actualCost: number;
  pointsDelivered: number;
  taskCount: number;
  completedCount: number;
  createdAt: number;
  startedAt?: number;
  closedAt?: number;
}

export interface StageResult {
  stage: PipelineStage;
  status: 'completed' | 'failed' | 'skipped';
  agentId?: string;
  cost: number;
  output?: string;
  error?: string;
  startedAt: number;
  completedAt: number;
}

export interface PipelineExecution {
  taskId: string;
  stages: StageResult[];
  totalCost: number;
  finalStatus: TaskStatus;
  startedAt: number;
  completedAt?: number;
}

export interface StageExecutor {
  execute(
    task: Task,
    agent: Agent,
    context: ExecutionContext,
  ): Promise<StageResult>;
}

export interface ExecutionContext {
  convexClient: unknown;
  previousStages: StageResult[];
  retryCount: number;
}

export const STAGE_MULTIPLIERS: Record<Exclude<PipelineStage, 'dispatch'>, number> = {
  architect: 0.3,
  executor: 1.0,
  reviewer: 0.3,
  merger: 0.1,
};

export const MAX_RETRIES = 3;

export const STAGE_ORDER: PipelineStage[] = [
  'dispatch',
  'architect',
  'executor',
  'reviewer',
  'merger',
];
