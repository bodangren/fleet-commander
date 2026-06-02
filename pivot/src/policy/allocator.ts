import { z } from 'zod';

export const AffinityRuleSchema = z.object({
  ifTask: z.string().describe('Task pattern to match (glob-like syntax)'),
  preferHarness: z.string().describe('Harness name to prefer'),
});

export type AffinityRule = z.infer<typeof AffinityRuleSchema>;

export const AntiAffinityRuleSchema = z.object({
  ifTask: z.string().describe('Task pattern to match (glob-like syntax)'),
  avoidHarness: z.string().describe('Harness name to avoid'),
});

export type AntiAffinityRule = z.infer<typeof AntiAffinityRuleSchema>;

export const AllocationPolicySchema = z.object({
  perRepoConcurrency: z.record(z.string(), z.number().int().min(1)).default({}),
  globalConcurrency: z.number().int().min(1).default(5),
  budgetPacing: z.number().int().min(0).default(0).describe('Tokens-per-hour cap for dispatch throttling'),
  affinity: z.array(AffinityRuleSchema).default([]),
  antiAffinity: z.array(AntiAffinityRuleSchema).default([]),
});

export type AllocationPolicy = z.infer<typeof AllocationPolicySchema>;

export type TaskDescriptor = {
  id: string;
  taskClass: 'feature' | 'bug' | 'chore' | 'review';
  repoId: string;
  harnessName: string;
  createdAt: number;
  worktreeBranch?: string;
};

export type AllocationContext = {
  runningTasks: TaskDescriptor[];
  worktrees: Record<string, { repoId: string; status: 'available' | 'in_use' | 'stale' }>;
};

export type AdmissionResult = {
  admit: boolean;
  reason?: string;
};

/**
 * Matches task class against glob pattern.
 * @param taskClass - Task class to match
 * @param pattern - Glob pattern (e.g., "feature:*")
 * @returns Whether the task matches the pattern
 */
function taskMatchesPattern(taskClass: string, pattern: string): boolean {
  const [typePattern] = pattern.split(':');
  return typePattern === '*' || typePattern === taskClass;
}

/**
 * Determines whether a task can be admitted based on concurrency limits and affinity rules.
 * @param task - Task descriptor
 * @param policy - Allocation policy
 * @param context - Current allocation context
 * @returns Admission result with admit flag and reason if rejected
 */
export function canAdmit(task: TaskDescriptor, policy: AllocationPolicy, context: AllocationContext): AdmissionResult {
  const repoCap = policy.perRepoConcurrency[task.repoId];
  if (repoCap !== undefined) {
    const runningOnRepo = context.runningTasks.filter((t) => t.repoId === task.repoId).length;
    if (runningOnRepo >= repoCap) {
      return { admit: false, reason: `per-repo concurrency limit reached for ${task.repoId}` };
    }
  }

  if (context.runningTasks.length >= policy.globalConcurrency) {
    return { admit: false, reason: `global concurrency limit of ${policy.globalConcurrency} reached` };
  }

  if (task.worktreeBranch) {
    const worktree = context.worktrees[task.worktreeBranch];
    if (worktree && worktree.status === 'in_use') {
      return { admit: false, reason: `worktree ${task.worktreeBranch} is in use` };
    }
  }

  for (const rule of policy.antiAffinity) {
    if (taskMatchesPattern(task.taskClass, rule.ifTask) && task.harnessName === rule.avoidHarness) {
      return { admit: false, reason: `anti-affinity rule violated: ${rule.ifTask} avoids ${rule.avoidHarness}` };
    }
  }

  return { admit: true };
}