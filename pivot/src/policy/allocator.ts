import { z } from 'zod';
import { readFileSync, watchFile, unwatchFile } from 'fs';
import yaml from 'js-yaml';

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

export type WorktreeStatus = {
  repoId: string;
  status: 'available' | 'in_use' | 'stale';
};

export type WorktreeLease = {
  branch: string;
  repoId: string;
  taskId: string;
  acquiredAt: number;
  lastHeartbeat: number;
};

export type AllocationContext = {
  runningTasks: TaskDescriptor[];
  worktrees: Record<string, WorktreeStatus>;
};

export type AdmissionResult = {
  admit: boolean;
  reason?: string;
};

function taskMatchesPattern(taskClass: string, pattern: string): boolean {
  const [typePattern, ...rest] = pattern.split(':');
  const matchesType = typePattern === '*' || typePattern === taskClass;
  return matchesType;
}

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

const watchers = new Map<string, boolean>();

export function loadAllocationPolicy(filePath: string): AllocationPolicy | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const data = yaml.load(content, { schema: yaml.DEFAULT_SCHEMA }) as Record<string, unknown>;
    return AllocationPolicySchema.parse(data);
  } catch (err) {
    console.error(`Failed to load allocation policy from ${filePath}:`, err);
    return null;
  }
}

export function watchAllocationPolicy(
  filePath: string,
  onChange: (policy: AllocationPolicy | null) => void,
): void {
  if (watchers.has(filePath)) {
    return;
  }

  try {
    watchFile(filePath, { interval: 1000 }, () => {
      const policy = loadAllocationPolicy(filePath);
      onChange(policy);
    });
    watchers.set(filePath, true);
  } catch (err) {
    console.error(`Failed to watch allocation policy ${filePath}:`, err);
  }
}

export function unwatchAllocationPolicy(): void {
  for (const filePath of watchers.keys()) {
    unwatchFile(filePath);
  }
  watchers.clear();
}

export class WorktreeManager {
  private leases: Map<string, WorktreeLease> = new Map();
  private leakTimeoutMs: number;

  constructor(leakTimeoutMs: number = 5 * 60 * 1000) {
    this.leakTimeoutMs = leakTimeoutMs;
  }

  private key(branch: string, repoId: string): string {
    return `${repoId}:${branch}`;
  }

  allocate(branch: string, repoId: string, taskId: string): WorktreeLease | null {
    const k = this.key(branch, repoId);
    if (this.leases.has(k)) {
      return null;
    }

    const now = Date.now();
    const lease: WorktreeLease = {
      branch,
      repoId,
      taskId,
      acquiredAt: now,
      lastHeartbeat: now,
    };

    this.leases.set(k, lease);
    return lease;
  }

  release(branch: string, taskId: string): boolean {
    for (const [k, lease] of this.leases) {
      if (lease.branch === branch && lease.taskId === taskId) {
        this.leases.delete(k);
        return true;
      }
    }
    return false;
  }

  heartbeat(branch: string, taskId: string): boolean {
    for (const lease of this.leases.values()) {
      if (lease.branch === branch && lease.taskId === taskId) {
        lease.lastHeartbeat = Date.now();
        return true;
      }
    }
    return false;
  }

  getLease(branch: string): WorktreeLease | undefined {
    for (const lease of this.leases.values()) {
      if (lease.branch === branch) {
        return lease;
      }
    }
    return undefined;
  }

  getAllLeases(): WorktreeLease[] {
    return Array.from(this.leases.values());
  }

  reclaimStale(onReclaim: (branch: string, taskId: string) => void): void {
    const now = Date.now();
    const staleKeys: string[] = [];

    for (const [k, lease] of this.leases) {
      if (now - lease.lastHeartbeat > this.leakTimeoutMs) {
        staleKeys.push(k);
      }
    }

    for (const k of staleKeys) {
      const lease = this.leases.get(k)!;
      onReclaim(lease.branch, lease.taskId);
      this.leases.delete(k);
    }
  }
}

export class DispatchPacer {
  private tokens: number;
  private tokensPerHour: number;
  private lastRefill: number;

  constructor(tokensPerHour: number) {
    this.tokensPerHour = tokensPerHour;
    this.tokens = tokensPerHour;
    this.lastRefill = Date.now();
  }

  canDispatch(): boolean {
    if (this.tokensPerHour === 0) {
      return true;
    }

    this.refill(0);
    return this.tokens >= 1;
  }

  recordDispatch(): void {
    if (this.tokens >= 1) {
      this.tokens -= 1;
    }
  }

  refill(elapsedMs: number = Date.now() - this.lastRefill): void {
    if (this.tokensPerHour === 0) {
      return;
    }

    const msPerToken = (1000 * 60 * 60) / this.tokensPerHour;
    const tokensToAdd = elapsedMs / msPerToken;

    this.tokens = Math.min(this.tokensPerHour, this.tokens + tokensToAdd);
    this.lastRefill = Date.now();
  }

  getAvailableTokens(): number {
    this.refill(0);
    return Math.floor(this.tokens);
  }
}