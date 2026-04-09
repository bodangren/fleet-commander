import { GitClient, generateBranchName, generateCommitMessage } from '../git/client';
import type { GitHooks } from './types';

export function createDefaultGitHooks(): GitHooks {
  return {
    async onTaskStart(projectSlug, rootPath, taskId, taskTitle) {
      const client = new GitClient({ cwd: rootPath });
      const branchName = generateBranchName(taskId, taskTitle);
      try {
        await client.branch(branchName, 'HEAD');
        console.log(`Git: created branch ${branchName} for task ${taskId}`);
        return { branchName };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`Git: failed to create branch for task ${taskId}: ${msg}`);
        return { branchName };
      }
    },

    async onTaskComplete(projectSlug, rootPath, taskId, taskTitle, success) {
      if (!success) {
        console.log(`Git: task ${taskId} failed, skipping commit`);
        return;
      }
      const client = new GitClient({ cwd: rootPath });
      try {
        const hasChanges = await client.hasChanges();
        if (!hasChanges) {
          console.log(`Git: no changes to commit for task ${taskId}`);
          return;
        }
        await client.stageAll();
        const message = generateCommitMessage(taskId, taskTitle);
        await client.commit(message);
        console.log(`Git: committed task ${taskId}: ${message}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`Git: failed to commit for task ${taskId}: ${msg}`);
      }
    },

    async onTaskCommit(projectSlug, rootPath, taskId, summary) {
      const client = new GitClient({ cwd: rootPath });
      const hasChanges = await client.hasChanges();
      if (!hasChanges) {
        return { commitHash: '' };
      }
      await client.stageAll();
      const message = generateCommitMessage(taskId, summary);
      await client.commit(message);
      const log = await client.getLog(1);
      const commitHash = log.split(' ')[0] || '';
      return { commitHash };
    },
  };
}

export function createAutoPushGitHooks(autoPush: boolean = false): GitHooks {
  const defaultHooks = createDefaultGitHooks();

  return {
    async onTaskStart(...args) {
      return defaultHooks.onTaskStart!(...args);
    },

    async onTaskComplete(...args) {
      const result = await defaultHooks.onTaskComplete!(...args);
      if (autoPush && args[4]) {
        const [projectSlug, rootPath, taskId] = args;
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

    async onTaskCommit(...args) {
      return defaultHooks.onTaskCommit!(...args);
    },
  };
}