import { stat } from 'node:fs/promises'
import { z } from 'zod'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'
import { runProject, type RunPreflight } from '../orchestrator/orchestrator'
import type { ExecuteFn } from '../orchestrator/types'
import { GitClient } from '../git/client'
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
}

async function verifyProjectWorktree(rootPath: string): Promise<ProjectWorktreeStatus> {
  return new GitClient({ cwd: rootPath }).verifyCleanWorktree()
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

    try {
      const run = await withProcessExecutionGuard(
        () => runProject(
          client,
          project.slug,
          undefined,
          undefined,
          dependencies?.executeFn,
          undefined,
          undefined,
          undefined,
          dependencies?.preflight,
          { requiredTaskKey: parsed.data.taskKey },
        ),
        () => undefined,
      )
      if (!run) {
        return json(
          {
            ok: false,
            error: 'project_run_in_progress',
            message: 'Another project run is already in progress.',
          },
          409,
        )
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
        run,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Project run failed.'
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
