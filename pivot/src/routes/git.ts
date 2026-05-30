import { ConvexHttpClient } from 'convex/browser';
import { Router, json, notFound, badRequest } from './router';
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
    const body = await request.json().catch(() => null);
    if (!body || !body.taskId || !body.taskTitle || !body.projectSlug) {
      return badRequest('taskId, taskTitle, and projectSlug are required');
    }
    const baseBranch = body.baseBranch ? sanitizeForShell(body.baseBranch) : 'HEAD';
    if (body.baseBranch) {
      const validation = validateBranchName(baseBranch);
      if (!validation.valid) {
        return badRequest(`Invalid baseBranch: ${validation.reason}`);
      }
    }
    const projectPath = await getProjectPath(body.projectSlug);
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
      const branchName = generateBranchName(body.taskId, body.taskTitle);
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
    const body = await request.json().catch(() => null);
    if (!body || !body.taskId || !body.summary || !body.projectSlug) {
      return badRequest('taskId, summary, and projectSlug are required');
    }
    const projectPath = await getProjectPath(body.projectSlug);
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
      const message = generateCommitMessage(body.taskId, body.summary);
      await gitClient.commit(message);
      return json({ message: 'Committed successfully', commitMessage: message });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to commit';
      return json({ error: message }, 500);
    }
  });

  router.post('/api/git/push', async (request) => {
    const body = await request.json().catch(() => null);
    if (!body || !body.projectSlug) {
      return badRequest('projectSlug is required');
    }
    const branchName = body.branch ? sanitizeForShell(body.branch) : undefined;
    if (branchName) {
      const validation = validateBranchName(branchName);
      if (!validation.valid) {
        return badRequest(`Invalid branch name: ${validation.reason}`);
      }
    }
    const projectPath = await getProjectPath(body.projectSlug);
    if (!projectPath) {
      return notFound('project not found');
    }
    const gitClient = new GitClient({ cwd: projectPath });
    try {
      await gitClient.push(body.remote || 'origin', branchName);
      return json({ message: 'Pushed successfully' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to push';
      return json({ error: message }, 500);
    }
  });

  router.post('/api/git/delete-branch', async (request) => {
    const body = await request.json().catch(() => null);
    if (!body || !body.branchName || !body.projectSlug) {
      return badRequest('branchName and projectSlug are required');
    }
    const branchName = sanitizeForShell(body.branchName);
    const validation = validateBranchName(branchName);
    if (!validation.valid) {
      return badRequest(`Invalid branch name: ${validation.reason}`);
    }
    const projectPath = await getProjectPath(body.projectSlug);
    if (!projectPath) {
      return notFound('project not found');
    }
    const gitClient = new GitClient({ cwd: projectPath });
    try {
      await gitClient.deleteBranch(branchName, body.force || false);
      return json({ message: 'Branch deleted locally' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete branch';
      return json({ error: message }, 500);
    }
  });

  router.post('/api/git/delete-remote-branch', async (request) => {
    const body = await request.json().catch(() => null);
    if (!body || !body.branchName || !body.projectSlug) {
      return badRequest('branchName and projectSlug are required');
    }
    const branchName = sanitizeForShell(body.branchName);
    const validation = validateBranchName(branchName);
    if (!validation.valid) {
      return badRequest(`Invalid branch name: ${validation.reason}`);
    }
    const projectPath = await getProjectPath(body.projectSlug);
    if (!projectPath) {
      return notFound('project not found');
    }
    const gitClient = new GitClient({ cwd: projectPath });
    try {
      await gitClient.deleteRemoteBranch(body.remote || 'origin', branchName);
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
