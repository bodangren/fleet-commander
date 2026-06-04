import type { PRClient, PRCreateOptions, PRInfo } from './types';
import { runCommandOrThrow } from '../shared/commandRunner';

/**
 * Parse MR info from glab JSON output.
 * @param raw - Raw JSON string from glab
 * @returns {PRInfo} Parsed MR info
 */
function parseMrJson(raw: string): PRInfo {
  const data = JSON.parse(raw);
  return {
    url: data.web_url ?? data.url,
    number: data.iid ?? data.id,
    status: data.state === 'merged' ? 'merged' : data.state === 'closed' ? 'closed' : 'open',
    branch: data.source_branch ?? '',
    baseBranch: data.target_branch ?? 'main',
  };
}

/**
 * Create a GitLab MR client.
 * @param cwd - Working directory for glab commands
 * @returns {PRClient} A GitLab MR client
 */
export function createGitLabClient(cwd: string): PRClient {
  return {
    async create(options: PRCreateOptions): Promise<PRInfo> {
      const args = [
        'mr', 'create',
        '--title', options.title,
        '--description', options.body,
        '--source-branch', options.branch,
      ];
      if (options.baseBranch) args.push('--target-branch', options.baseBranch);
      if (options.draft) args.push('--draft');

      const url = await runCommandOrThrow('glab', args, cwd);
      // Fetch MR details
      const raw = await runCommandOrThrow('glab', ['mr', 'view', url, '--output', 'json'], cwd);
      return parseMrJson(raw);
    },

    async getStatus(prNumber: number): Promise<PRInfo> {
      const raw = await runCommandOrThrow('glab', ['mr', 'view', String(prNumber), '--output', 'json'], cwd);
      return parseMrJson(raw);
    },

    async merge(prNumber: number): Promise<void> {
      await runCommandOrThrow('glab', ['mr', 'merge', String(prNumber)], cwd);
    },
  };
}
