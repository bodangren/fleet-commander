import type { BlockedTask, OpenIssue, BlockersData } from '@/lib/useFleetApi'

/**
 * Build a `BlockedTask` (the shape returned by `useBlockers`) with sensible
 * defaults for blockers-dashboard tests. Mirrors the pivot `makeTask`
 * fixture so scenario names (`linearChain3`, `diamond`, …) line up across
 * packages.
 *
 * @param input - field overrides
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
 * Build an `OpenIssue` (the second shape inside `BlockersData`) with
 * sensible defaults.
 *
 * @param input - field overrides
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

/**
 * Canned blockers payload: a single project with one blocked task and one
 * open issue. Mirrors `pivot/.../dependencyFixtures.linearChain3` in shape.
 */
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

/**
 * Canned blockers payload: a linear chain of three blocked tasks across
 * one project, used to exercise chain / breadcrumb rendering.
 */
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

/**
 * Canned blockers payload: tasks spread across two projects so the project
 * filter (and the per-row project column) can be exercised.
 */
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
