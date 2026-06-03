import { z } from 'zod';
import { ConvexHttpClient } from 'convex/browser';
import { Router, json, notFound, badRequest, routeBody } from './router';
import { GitClient, generateBranchName, generateCommitMessage, type GitStatus } from '../git/client';
import { validateBranchName, sanitizeForShell } from '../git/validation';
import { api } from '../../../convex/_generated/api';

/**
 * Registers git routes including GET /api/git/status, POST /api/git/commit, and GET /api/git/diff.
 * @param router - Express Router instance
 * @param client - ConvexHttpClient instance
 */
export function registerGitRoutes(router: Router, client: ConvexHttpClient): void {
  async function getProjectPath(slug: string): Promise<string | undefined> {
    try {
      const project = await client.query(api.projects.getProjectByNameHandler, { name: slug });
      return project?.path ?? project?.name;
    } catch {
      return undefined;
    }
  }

  router.get('/api/git/status', async (_request, params) => {
    const projectSlug = new URL(_request.url).searchParams.get('project');
    if (!projectSlug) {
      return badRequest('project query param required');
    }
    const projectPath = await getProjectPath(projectSlug);
    if (!projectPath) {
      return notFound('project not found');
    }
    const gitClient = new GitClient({ cwd: projectPath });
    try {
      const status = await gitClient.status();
      return json(status);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get git status';
      return json({ error: message }, 500);
    }
  });

  router.post('/api/git/branch', async (request) => {
    const parsed = await routeBody(
      z.object({
        taskId: z.string().min(1),
        taskTitle: z.string().min(1),
        projectSlug: z.string().min(1),
        baseBranch: z.string().optional(),
      }),
      request,
    );
    if (!parsed.ok) return parsed.response;
    const { taskId, taskTitle, projectSlug, baseBranch: rawBaseBranch } = parsed.data;
    const baseBranch = rawBaseBranch ? sanitizeForShell(rawBaseBranch) : 'HEAD';
    if (rawBaseBranch) {
      const validation = validateBranchName(baseBranch);
      if (!validation.valid) {
        return badRequest(`Invalid baseBranch: ${validation.reason}`);
      }
    }
    const projectPath = await getProjectPath(projectSlug);
    if (!projectPath) {
      return notFound('project not found');
    }
    const gitClient = new GitClient({ cwd: projectPath });
    try {
      // Pre-flight: verify clean worktree
      const { clean, dirtyFiles } = await gitClient.verifyCleanWorktree();
      if (!clean) {
        return json(
          { error: 'Worktree has uncommitted changes', dirtyFiles },
          409,
        );
      }
      const branchName = generateBranchName(taskId, taskTitle);
      const validation = validateBranchName(branchName);
      if (!validation.valid) {
        return badRequest(`Invalid branch name: ${validation.reason}`);
      }
      await gitClient.branch(branchName, baseBranch);
      return json({ branchName });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create branch';
      return json({ error: message }, 500);
    }
  });

  router.post('/api/git/commit', async (request) => {
    const parsed = await routeBody(
      z.object({
        taskId: z.string().min(1),
        summary: z.string().min(1),
        projectSlug: z.string().min(1),
      }),
      request,
    );
    if (!parsed.ok) return parsed.response;
    const { taskId, summary, projectSlug } = parsed.data;
    const projectPath = await getProjectPath(projectSlug);
    if (!projectPath) {
      return notFound('project not found');
    }
    const gitClient = new GitClient({ cwd: projectPath });
    try {
      const hasChanges = await gitClient.hasChanges();
      if (!hasChanges) {
        return json({ message: 'No changes to commit' });
      }
      await gitClient.stageAll();
      const message = generateCommitMessage(taskId, summary);
      await gitClient.commit(message);
      return json({ message: 'Committed successfully', commitMessage: message });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to commit';
      return json({ error: message }, 500);
    }
  });

  router.post('/api/git/push', async (request) => {
    const parsed = await routeBody(
      z.object({
        projectSlug: z.string().min(1),
        branch: z.string().optional(),
        remote: z.string().optional(),
      }),
      request,
    );
    if (!parsed.ok) return parsed.response;
    const { projectSlug, branch: rawBranch, remote } = parsed.data;
    const branchName = rawBranch ? sanitizeForShell(rawBranch) : undefined;
    if (branchName) {
      const validation = validateBranchName(branchName);
      if (!validation.valid) {
        return badRequest(`Invalid branch name: ${validation.reason}`);
      }
    }
    const projectPath = await getProjectPath(projectSlug);
    if (!projectPath) {
      return notFound('project not found');
    }
    const gitClient = new GitClient({ cwd: projectPath });
    try {
      await gitClient.push(remote || 'origin', branchName);
      return json({ message: 'Pushed successfully' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to push';
      return json({ error: message }, 500);
    }
  });

  router.post('/api/git/delete-branch', async (request) => {
    const parsed = await routeBody(
      z.object({
        branchName: z.string().min(1),
        projectSlug: z.string().min(1),
        force: z.boolean().optional(),
      }),
      request,
    );
    if (!parsed.ok) return parsed.response;
    const { branchName: rawBranchName, projectSlug, force } = parsed.data;
    const branchName = sanitizeForShell(rawBranchName);
    const validation = validateBranchName(branchName);
    if (!validation.valid) {
      return badRequest(`Invalid branch name: ${validation.reason}`);
    }
    const projectPath = await getProjectPath(projectSlug);
    if (!projectPath) {
      return notFound('project not found');
    }
    const gitClient = new GitClient({ cwd: projectPath });
    try {
      await gitClient.deleteBranch(branchName, force || false);
      return json({ message: 'Branch deleted locally' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete branch';
      return json({ error: message }, 500);
    }
  });

  router.post('/api/git/delete-remote-branch', async (request) => {
    const parsed = await routeBody(
      z.object({
        branchName: z.string().min(1),
        projectSlug: z.string().min(1),
        remote: z.string().optional(),
      }),
      request,
    );
    if (!parsed.ok) return parsed.response;
    const { branchName: rawBranchName, projectSlug, remote } = parsed.data;
    const branchName = sanitizeForShell(rawBranchName);
    const validation = validateBranchName(branchName);
    if (!validation.valid) {
      return badRequest(`Invalid branch name: ${validation.reason}`);
    }
    const projectPath = await getProjectPath(projectSlug);
    if (!projectPath) {
      return notFound('project not found');
    }
    const gitClient = new GitClient({ cwd: projectPath });
    try {
      await gitClient.deleteRemoteBranch(remote || 'origin', branchName);
      return json({ message: 'Remote branch deleted' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete remote branch';
      return json({ error: message }, 500);
    }
  });

  router.get('/api/git/log', async (_request) => {
    const projectSlug = new URL(_request.url).searchParams.get('project');
    const maxCount = parseInt(new URL(_request.url).searchParams.get('maxCount') || '10', 10);
    if (!projectSlug) {
      return badRequest('project query param required');
    }
    const projectPath = await getProjectPath(projectSlug);
    if (!projectPath) {
      return notFound('project not found');
    }
    const gitClient = new GitClient({ cwd: projectPath });
    try {
      const log = await gitClient.getLog(maxCount);
      return json({ log });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get log';
      return json({ error: message }, 500);
    }
  });
}
