import type { Task, CandidateTask } from './types';
import type { HarnessProfile } from '../shared/harnessProfile';
import { deriveTrackType } from './coverageEnforcement';
import { canAdmit, type AllocationPolicy, type TaskDescriptor } from '../policy/allocator';

export interface DispatchRejection {
  taskKey: string;
  filter: string;
  reason: string;
}

export interface ConstraintContext {
  allTasks: Map<string, Task>;
  budgetRemaining?: number;
  activeWorktreeTasks?: Set<string>;
  agentHarnessMap?: Map<string, HarnessProfile>;
  reviewDebtByAgent?: Map<string, number>;
  reviewDebtThreshold?: number;
  coveragePercentage?: number;
  coverageThreshold?: number;
  allocationPolicy?: AllocationPolicy;
  runningTasks?: TaskDescriptor[];
}

export function dependencyReady(
  task: Task,
  allTasks: Map<string, Task>,
): DispatchRejection | null {
  for (const depKey of task.dependencies) {
    const dep = allTasks.get(depKey);
    if (!dep || dep.status !== 'done') {
      return {
        taskKey: task.taskKey,
        filter: 'dependencyReady',
        reason: `Dependency ${depKey} not done`,
      };
    }
  }
  return null;
}

export function notManuallyBlocked(task: Task): DispatchRejection | null {
  if (task.status === 'blocked' && task.dependencies.length === 0) {
    return {
      taskKey: task.taskKey,
      filter: 'notManuallyBlocked',
      reason: 'Task is manually blocked',
    };
  }
  return null;
}

export function withinBudget(
  task: Task,
  budgetRemaining: number | undefined,
): DispatchRejection | null {
  if (budgetRemaining !== undefined && budgetRemaining <= 0) {
    return {
      taskKey: task.taskKey,
      filter: 'withinBudget',
      reason: 'Budget exceeded',
    };
  }
  return null;
}

export function worktreeAvailable(
  task: Task,
  activeWorktreeTasks: Set<string> | undefined,
): DispatchRejection | null {
  if (activeWorktreeTasks && activeWorktreeTasks.has(task.taskKey)) {
    return {
      taskKey: task.taskKey,
      filter: 'worktreeAvailable',
      reason: 'Worktree unavailable (task already has active worktree)',
    };
  }
  return null;
}

export function harnessAvailableForClass(
  task: Task,
  agentHarnessMap: Map<string, HarnessProfile> | undefined,
): DispatchRejection | null {
  if (!task.assignee || !agentHarnessMap) {
    return null;
  }
  const profile = agentHarnessMap.get(task.assignee);
  if (!profile) {
    return {
      taskKey: task.taskKey,
      filter: 'harnessAvailableForClass',
      reason: `No harness profile for agent ${task.assignee}`,
    };
  }

  const taskClass = deriveTrackType(task.trackId) as
    | 'feature'
    | 'bug'
    | 'chore'
    | 'review';

  const supported = profile.capabilities?.supportedTaskClasses ?? ['feature'];
  if (!supported.includes(taskClass)) {
    return {
      taskKey: task.taskKey,
      filter: 'harnessAvailableForClass',
      reason: `Harness does not support task class ${taskClass}`,
    };
  }

  const allowed = profile.policy?.allowed_task_classes ?? [];
  if (allowed.length > 0 && !allowed.includes(taskClass)) {
    return {
      taskKey: task.taskKey,
      filter: 'harnessAvailableForClass',
      reason: `Policy forbids task class ${taskClass}`,
    };
  }

  return null;
}

export function reviewDebtUnderThreshold(
  task: Task,
  reviewDebtByAgent: Map<string, number> | undefined,
  threshold: number | undefined,
): DispatchRejection | null {
  if (!task.assignee || threshold === undefined || !reviewDebtByAgent) {
    return null;
  }
  const debt = reviewDebtByAgent.get(task.assignee) ?? 0;
  if (debt > threshold) {
    return {
      taskKey: task.taskKey,
      filter: 'reviewDebtUnderThreshold',
      reason: `Review debt ${debt} exceeds threshold ${threshold}`,
    };
  }
  return null;
}

export function coverageGateSatisfied(
  task: Task,
  coveragePercentage: number | undefined,
  coverageThreshold: number | undefined,
): DispatchRejection | null {
  if (
    coverageThreshold === undefined ||
    coveragePercentage === undefined
  ) {
    return null;
  }
  if (coveragePercentage < coverageThreshold) {
    return {
      taskKey: task.taskKey,
      filter: 'coverageGateSatisfied',
      reason: `Coverage ${coveragePercentage}% below threshold ${coverageThreshold}%`,
    };
  }
  return null;
}

export function antiAffinityFilter(
  task: Task,
  allocationPolicy: AllocationPolicy | undefined,
  runningTasks: TaskDescriptor[] | undefined,
): DispatchRejection | null {
  if (!allocationPolicy || !runningTasks) {
    return null;
  }

  const taskClass = deriveTrackType(task.trackId) as 'feature' | 'bug' | 'chore' | 'review';
  const harnessName = task.assignee ?? 'opencode';

  const taskDescriptor: TaskDescriptor = {
    id: task.taskKey,
    taskClass,
    repoId: task.projectSlug,
    harnessName,
    createdAt: task.updatedAt,
  };

  const admission = canAdmit(taskDescriptor, allocationPolicy, {
    runningTasks,
    worktrees: {},
  });

  if (!admission.admit && admission.reason?.includes('anti-affinity')) {
    return {
      taskKey: task.taskKey,
      filter: 'antiAffinity',
      reason: admission.reason,
    };
  }

  return null;
}

export function filterEligibleTasks(
  tasks: Task[],
  context: ConstraintContext,
  trackStatuses?: Map<string, string>,
): { eligible: CandidateTask[]; rejections: DispatchRejection[] } {
  const eligible: CandidateTask[] = [];
  const rejections: DispatchRejection[] = [];

  for (const task of tasks) {
    if (trackStatuses?.get(task.trackId) === 'complete') {
      continue;
    }
    if (task.status === 'done' || task.status === 'in_progress') {
      continue;
    }

    const checks: (DispatchRejection | null)[] = [
      dependencyReady(task, context.allTasks),
      notManuallyBlocked(task),
      withinBudget(task, context.budgetRemaining),
      worktreeAvailable(task, context.activeWorktreeTasks),
      harnessAvailableForClass(task, context.agentHarnessMap),
      reviewDebtUnderThreshold(
        task,
        context.reviewDebtByAgent,
        context.reviewDebtThreshold,
      ),
      coverageGateSatisfied(
        task,
        context.coveragePercentage,
        context.coverageThreshold,
      ),
      antiAffinityFilter(task, context.allocationPolicy, context.runningTasks),
    ];

    const failed = checks.filter(
      (c): c is DispatchRejection => c !== null,
    );
    if (failed.length > 0) {
      rejections.push(...failed);
      continue;
    }

    eligible.push({
      task,
      trackId: task.trackId,
      score: 1,
      rationale: 'passed all hard constraints',
    });
  }

  return { eligible, rejections };
}
