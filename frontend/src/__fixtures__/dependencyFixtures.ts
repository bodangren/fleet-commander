import type { BlockedTask, OpenIssue, BlockersData } from '@/lib/useFleetApi'

/**
 * Creates a BlockedTask with sensible defaults for testing.
 * @param input - partial task fields; taskKey is required
 */
export function makeBlockedTask(input: {
  taskKey: string
  projectSlug?: string
  trackId?: string
  title?: string
  status?: string
  assignee?: string
  updatedAt?: number
  projectName?: string
}): BlockedTask {
  return {
    projectSlug: input.projectSlug ?? 'test-project',
    trackId: input.trackId ?? 'test-track',
    taskKey: input.taskKey,
    title: input.title ?? `Task ${input.taskKey}`,
    status: input.status ?? 'blocked',
    assignee: input.assignee,
    updatedAt: input.updatedAt ?? Date.now() - 3_600_000,
    projectName: input.projectName,
  }
}

/**
 * Creates an OpenIssue with sensible defaults for testing.
 * @param input - partial issue fields; issueId is required
 */
export function makeOpenIssue(input: {
  issueId: string
  projectSlug?: string
  trackId?: string
  title?: string
  status?: string
  assignedAgent?: string
  openedAt?: number
  projectName?: string
}): OpenIssue {
  return {
    projectSlug: input.projectSlug ?? 'test-project',
    trackId: input.trackId,
    issueId: input.issueId,
    title: input.title ?? `Issue ${input.issueId}`,
    status: input.status ?? 'open',
    assignedAgent: input.assignedAgent,
    openedAt: input.openedAt ?? Date.now() - 1_800_000,
    projectName: input.projectName,
  }
}

export const singleBlockedFixture: BlockersData = {
  blockedTasks: [
    makeBlockedTask({
      taskKey: 'TASK-A',
      title: 'Build API',
      status: 'blocked',
      assignee: 'agent-1',
    }),
  ],
  openIssues: [
    makeOpenIssue({
      issueId: 'ISS-1',
      title: 'Spec missing',
      status: 'open',
      assignedAgent: 'agent-1',
    }),
  ],
}

export const chain3BlockedFixture: BlockersData = {
  blockedTasks: [
    makeBlockedTask({ taskKey: 'TASK-A', title: 'Root', assignee: 'agent-1' }),
    makeBlockedTask({
      taskKey: 'TASK-B',
      title: 'Middle',
      assignee: 'agent-2',
      projectSlug: 'project-2',
    }),
    makeBlockedTask({
      taskKey: 'TASK-C',
      title: 'Leaf',
      assignee: 'agent-3',
      projectSlug: 'project-3',
    }),
  ],
  openIssues: [],
}

export const multiProjectFixture: BlockersData = {
  blockedTasks: [
    makeBlockedTask({
      taskKey: 'P1-T1',
      title: 'Auth backend',
      projectSlug: 'auth',
      projectName: 'Auth Service',
      assignee: 'agent-1',
    }),
    makeBlockedTask({
      taskKey: 'P2-T1',
      title: 'Billing flow',
      projectSlug: 'billing',
      projectName: 'Billing Service',
      assignee: 'agent-2',
    }),
  ],
  openIssues: [],
}
