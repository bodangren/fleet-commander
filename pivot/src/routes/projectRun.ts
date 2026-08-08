import { stat } from 'node:fs/promises'
import { z } from 'zod'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'
import { runProject, type RunPreflight } from '../orchestrator/orchestrator'
import { createProductionQualityWorkflowHooks } from '../orchestrator/productionQualityWorkflowHooks'
import { createDefaultGitHooks } from '../orchestrator/gitOrchestrator'
import type { ExecuteFn, GitHooks, OrchestratorConfig } from '../orchestrator/types'
import { generateBranchName, GitClient } from '../git/client'
import { withProcessExecutionGuard } from '../orchestrator/executionGuard'
import { resolveProject } from './projectCatalog'
import { Router, json, notFound, routeBody } from './router'

export interface ProjectWorktreeStatus {
  clean: boolean
  dirtyFiles: string[]
}

export interface ProjectRunDependencies {
  executeFn?: ExecuteFn
  preflight?: RunPreflight
  worktreeCheck?: (rootPath: string) => Promise<ProjectWorktreeStatus>
  gitLifecycle?: (rootPath: string, taskKey: string) => ProjectGitLifecycle
}

/**
 * Git state exposed with a manual run so callers can verify the exact target
 * branch, revision, and changed paths before and after Pi execution.
 */
export interface ProjectGitSnapshot {
  branch: string
  head: string
  clean: boolean
  changedPaths: string[]
  /** Paths observed before a local completion commit, when the final tree is clean. */
  observedChangedPaths?: string[]
}

/**
 * Manual task-branch lifecycle used by the project-scoped run route.
 */
export interface ProjectGitLifecycle {
  prepare: () => Promise<{ ok: true; branch: string } | { ok: false; error: string }>
  snapshot: () => Promise<ProjectGitSnapshot>
  hooks: GitHooks
}

/**
 * Manual runs deliberately use one bounded, no-retry orchestration cycle.
 * These values are independent of the continuous runner's retry policy.
 */
export const MANUAL_PROJECT_RUN_CONFIG: OrchestratorConfig = {
  maxRetries: 0,
  baseDelayMs: 0,
  maxDelayMs: 0,
  commandTimeoutMs: 600_000,
  maxTokens: 16_000,
}

async function verifyProjectWorktree(rootPath: string): Promise<ProjectWorktreeStatus> {
  return new GitClient({ cwd: rootPath }).verifyCleanWorktree()
}

async function captureGitSnapshot(rootPath: string): Promise<ProjectGitSnapshot> {
  const client = new GitClient({ cwd: rootPath })
  const [branch, head, worktree] = await Promise.all([
    client.getCurrentBranch(),
    client.getCurrentRef(),
    client.verifyCleanWorktree(),
  ])
  return {
    branch,
    head,
    clean: worktree.clean,
    changedPaths: worktree.dirtyFiles,
  }
}

function createManualGitLifecycle(rootPath: string, taskKey: string): ProjectGitLifecycle {
  const branchName = generateBranchName(taskKey, taskKey)
  const defaultHooks = createDefaultGitHooks()
  let observedChangedPaths: string[] = []
  const hooks: GitHooks = {
    ...defaultHooks,
    // The branch is prepared before runProject can claim the task. This hook
    // is intentionally a no-op because the orchestrator's normal start hook
    // would otherwise try to create the same branch a second time.
    onTaskStart: async () => ({ branchName, branchCreated: true }),
    onTaskComplete: async (
      projectSlug,
      taskRootPath,
      taskId,
      taskTitle,
      success,
      trackId,
      options,
    ) => {
      const beforeCommit = await new GitClient({ cwd: taskRootPath }).verifyCleanWorktree()
      if (beforeCommit.dirtyFiles.length > 0) observedChangedPaths = beforeCommit.dirtyFiles
      await defaultHooks.onTaskComplete?.(
        projectSlug,
        taskRootPath,
        taskId,
        taskTitle,
        success,
        trackId,
        options,
      )
    },
  }

  return {
    hooks,
    snapshot: async () => {
      const snapshot = await captureGitSnapshot(rootPath)
      return observedChangedPaths.length > 0
        ? { ...snapshot, observedChangedPaths: [...observedChangedPaths] }
        : snapshot
    },
    prepare: async () => {
      const client = new GitClient({ cwd: rootPath })
      try {
        const before = await client.verifyCleanWorktree()
        if (!before.clean) {
          return {
            ok: false,
            error: `Manual task branch requires a clean worktree: ${before.dirtyFiles.join(', ')}`,
          }
        }
        await client.branch(branchName, 'HEAD')
        return { ok: true, branch: branchName }
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Unable to prepare manual task branch.',
        }
      }
    },
  }
}

/**
 * Registers the manual project-run route, including path and scheduler guards.
 * @param router - Bun Router instance that receives the route
 * @param client - Convex client used to resolve projects and check continuous mode
 * @param dependencies - Optional executor and preflight seams for integration tests
 */
export function registerProjectRunRoute(
  router: Router,
  client: ConvexHttpClient,
  dependencies?: ProjectRunDependencies,
): void {
  router.post('/api/projects/:id/run', async (request, params) => {
    const parsed = await routeBody(z.object({ taskKey: z.string().trim().min(1) }).strict(), request)
    if (!parsed.ok) return parsed.response

    const project = await resolveProject(client, params.id)
    if (!project) return notFound()
    if (!project.path) {
      return json(
        { ok: false, error: 'project_path_missing', message: 'Project path is not configured.' },
        409,
      )
    }

    let preparedBranch: string | undefined
    try {
      const projectStat = await stat(project.path)
      if (!projectStat.isDirectory()) {
        return json(
          { ok: false, error: 'project_path_invalid', message: 'Project path is not a directory.' },
          409,
        )
      }
    } catch {
      return json(
        { ok: false, error: 'project_path_unavailable', message: 'Project path is not accessible.' },
        409,
      )
    }

    try {
      const continuousMode = await client.query(api.continuousMode.getContinuousModeStatus, {})
      if (continuousMode.enabled) {
        return json(
          {
            ok: false,
            error: 'continuous_mode_enabled',
            message: 'Disable continuous mode before a manual run.',
          },
          409,
        )
      }
    } catch (error) {
      return json(
        {
          ok: false,
          error: 'continuous_mode_unknown',
          message: error instanceof Error ? error.message : 'Unable to verify continuous mode.',
        },
        503,
      )
    }

    let worktree: ProjectWorktreeStatus
    try {
      worktree = await (dependencies?.worktreeCheck ?? verifyProjectWorktree)(project.path)
    } catch (error) {
      return json(
        {
          ok: false,
          error: 'project_worktree_unavailable',
          message: error instanceof Error ? error.message : 'Unable to verify project worktree.',
        },
        409,
      )
    }
    if (!worktree.clean) {
      return json(
        {
          ok: false,
          error: 'project_worktree_dirty',
          message: 'Manual runs require a clean project worktree.',
          dirtyFiles: worktree.dirtyFiles,
        },
        409,
      )
    }

    const gitLifecycle = (dependencies?.gitLifecycle ?? createManualGitLifecycle)(
      project.path,
      parsed.data.taskKey,
    )
    let gitBefore: ProjectGitSnapshot
    try {
      gitBefore = await gitLifecycle.snapshot()
    } catch (error) {
      return json(
        {
          ok: false,
          error: 'project_git_unavailable',
          message: error instanceof Error ? error.message : 'Unable to read project Git state.',
        },
        409,
      )
    }
    if (!gitBefore.clean) {
      return json(
        {
          ok: false,
          error: 'project_worktree_dirty',
          message: 'Manual runs require a clean project Git snapshot.',
          dirtyFiles: gitBefore.changedPaths,
          git: { before: gitBefore, pushed: false },
        },
        409,
      )
    }

    try {
      const guarded = await withProcessExecutionGuard(
        async () => {
          const prepared = await gitLifecycle.prepare()
          if (!prepared.ok) return { prepared, run: null }
          preparedBranch = prepared.branch
          const run = await runProject(
            client,
            project.slug,
            MANUAL_PROJECT_RUN_CONFIG,
            undefined,
            dependencies?.executeFn,
            undefined,
            undefined,
            createProductionQualityWorkflowHooks(),
            dependencies?.preflight,
            {
              requiredTaskKey: parsed.data.taskKey,
              gitHooks: gitLifecycle.hooks,
              skipGitStart: true,
            },
          )
          return { prepared, run }
        },
        () => undefined,
      )
      if (!guarded) {
        return json(
          {
            ok: false,
            error: 'project_run_in_progress',
            message: 'Another project run is already in progress.',
            git: { before: gitBefore, pushed: false },
          },
          409,
        )
      }
      if (!guarded.prepared.ok) {
        let gitAfter: ProjectGitSnapshot | undefined
        try {
          gitAfter = await gitLifecycle.snapshot()
        } catch {
          // Preserve the preparation error when the failed preparation also
          // prevents a second Git read.
        }
        return json(
          {
            ok: false,
            error: 'project_branch_prepare_failed',
            message: guarded.prepared.error,
            git: { before: gitBefore, after: gitAfter, pushed: false },
          },
          409,
        )
      }
      const prepared = guarded.prepared
      const run = guarded.run
      if (!run) {
        return json(
          {
            ok: false,
            error: 'project_run_failed',
            message: 'Project runner returned no result.',
            git: { before: gitBefore, branch: prepared.branch, pushed: false },
          },
          500,
        )
      }
      let gitAfter: ProjectGitSnapshot | undefined
      try {
        gitAfter = await gitLifecycle.snapshot()
      } catch {
        // The run result remains useful even when the final Git read fails.
      }
      return json({
        ok: run.status !== 'failed',
        project: {
          id: project._id,
          slug: project.slug,
          name: project.name,
          path: project.path,
        },
        taskKey: run.taskKey,
        status: run.status,
        error: run.error,
        git: { before: gitBefore, branch: prepared.branch, after: gitAfter, pushed: false },
        run,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Project run failed.'
      let gitAfter: ProjectGitSnapshot | undefined
      try {
        gitAfter = await gitLifecycle.snapshot()
      } catch {
        // Preserve the runner error if the target became unreadable.
      }
      return json(
        {
          ok: false,
          project: {
            id: project._id,
            slug: project.slug,
            name: project.name,
            path: project.path,
          },
          taskKey: null,
          status: 'failed',
          error: 'project_run_failed',
          message,
          git: { before: gitBefore, branch: preparedBranch, after: gitAfter, pushed: false },
          run: {
            projectSlug: project.slug,
            taskKey: null,
            status: 'failed',
            error: message,
          },
        },
        500,
      )
    }
  })
}
