import { GitClient, generateBranchName, generateCommitMessage, MergeConflictError } from '../git/client';
import type { GitHooks } from './types';
import { config } from '../config';

/**
 * Creates GitHooks that create branches on task start and commit on completion.
 *
 * The returned hooks honor the `options.shouldCleanupBranch` flag passed by the
 * orchestrator. The executor stage passes `false` so the branch remains
 * available for the reviewer / merger stages; the merger stage passes `true`
 * (the default) so the feature branch is deleted only after a successful merge.
 */
export function createDefaultGitHooks(): GitHooks {
  const autoCleanup = config.git.autoCleanupBranches;
  const defaultBranch = config.git.defaultBranch;

  return {
    async onTaskStart(projectSlug, rootPath, taskId, taskTitle) {
      const client = new GitClient({ cwd: rootPath });
      const branchName = generateBranchName(taskId, taskTitle);
      try {
        const { clean, dirtyFiles } = await client.verifyCleanWorktree();
        if (!clean) {
          console.warn(`Git: worktree dirty for task ${taskId}, skipping branch creation`);
          return { branchName, branchCreated: false, error: `Dirty worktree: ${dirtyFiles.join(', ')}` };
        }
        await client.branch(branchName, 'HEAD');
        console.log(`Git: created branch ${branchName} for task ${taskId}`);
        return { branchName, branchCreated: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`Git: failed to create branch for task ${taskId}: ${msg}`);
        return { branchName, branchCreated: false, error: msg };
      }
    },

    async onTaskComplete(projectSlug, rootPath, taskId, taskTitle, success, trackId, options) {
      const client = new GitClient({ cwd: rootPath });
      if (!success) {
        console.log(`Git: task ${taskId} failed, skipping commit`);
        return;
      }
      try {
        const hasChanges = await client.hasChanges();
        if (!hasChanges) {
          console.log(`Git: no changes to commit for task ${taskId}`);
        } else {
          await client.stageAll();
          const message = generateCommitMessage(taskId, taskTitle, trackId);
          await client.commit(message);
          console.log(`Git: committed task ${taskId}: ${message}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`Git: failed to commit for task ${taskId}: ${msg}`);
      }

      // Branch cleanup is gated on the caller's `shouldCleanupBranch` flag
      // (default `true` for backward compat). The orchestrator's executor
      // stage passes `false` to preserve the branch for the reviewer/merger
      // pipeline; the merger stage passes `true` to finalise cleanup.
      const shouldCleanup = options?.shouldCleanupBranch ?? true;
      if (autoCleanup && shouldCleanup) {
        const branchName = generateBranchName(taskId, taskTitle);
        try {
          const currentBranch = await client.getCurrentBranch();
          if (currentBranch === branchName) {
            await client.checkout('HEAD');
          }
          await client.deleteBranch(branchName);
          console.log(`Git: cleaned up branch ${branchName} for task ${taskId}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`Git: branch cleanup failed for task ${taskId}: ${msg}`);
        }
      }
    },

    async onTaskCommit(projectSlug, rootPath, taskId, summary, trackId) {
      const client = new GitClient({ cwd: rootPath });
      const hasChanges = await client.hasChanges();
      if (!hasChanges) {
        return { commitHash: '' };
      }
      await client.stageAll();
      const message = generateCommitMessage(taskId, summary, trackId);
      await client.commit(message);
      const commitHash = await client.getCurrentRef();
      return { commitHash };
    },

    /**
     * Merger stage hook: checks out the configured default branch, squash-merges
     * the feature branch, commits the squash with a task-keyed message, and
     * returns the merge outcome. Branch cleanup is left to the caller (the
     * orchestrator will invoke `onTaskComplete` with `shouldCleanupBranch: true`
     * after a successful merge).
     */
    async onMerger(projectSlug, rootPath, taskId, taskTitle, branchName, trackId) {
      const client = new GitClient({ cwd: rootPath });
      try {
        await client.merge({
          sourceBranch: branchName,
          targetBranch: defaultBranch,
          strategy: 'squash',
        });
        const message = generateCommitMessage(taskId, `merge ${taskTitle}`, trackId);
        await client.commit(message);
        console.log(`Git: squash-merged ${branchName} into ${defaultBranch} for task ${taskId}`);
        return { merged: true, targetBranch: defaultBranch };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const isConflict = err instanceof MergeConflictError;
        console.warn(`Git: merger failed for task ${taskId}: ${msg}`);
        return { merged: false, targetBranch: defaultBranch, conflict: isConflict, error: msg };
      }
    },
  };
}

/**
 * Creates GitHooks with auto-push capability built on top of default hooks.
 */
export function createAutoPushGitHooks(autoPush: boolean = false): GitHooks {
  const defaultHooks = createDefaultGitHooks();

  return {
    async onTaskStart(projectSlug, rootPath, taskId, taskTitle) {
      return defaultHooks.onTaskStart!(projectSlug, rootPath, taskId, taskTitle);
    },

    async onTaskComplete(projectSlug, rootPath, taskId, taskTitle, success, trackId, options) {
      const result = await defaultHooks.onTaskComplete!(projectSlug, rootPath, taskId, taskTitle, success, trackId, options);
      if (autoPush && success) {
        const client = new GitClient({ cwd: rootPath });
        try {
          await client.push();
          console.log(`Git: pushed changes for task ${taskId}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`Git: failed to push for task ${taskId}: ${msg}`);
        }
      }
      return result;
    },

    async onTaskCommit(projectSlug, rootPath, taskId, summary) {
      return defaultHooks.onTaskCommit!(projectSlug, rootPath, taskId, summary);
    },

    async onMerger(projectSlug, rootPath, taskId, taskTitle, branchName, trackId) {
      return defaultHooks.onMerger!(projectSlug, rootPath, taskId, taskTitle, branchName, trackId);
    },
  };
}