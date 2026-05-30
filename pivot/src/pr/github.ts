import type { PRClient, PRCreateOptions, PRInfo } from './types';

/**
 * Execute a gh CLI command.
 * @param args - Arguments to pass to gh
 * @param cwd - Working directory
 * @returns {Promise<string>} The stdout output from gh
 */
async function runGh(args: string[], cwd: string): Promise<string> {
  const proc = Bun.spawn({
    cmd: ['gh', ...args],
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdoutBuf, stderrBuf] = await Promise.all([
    new Response(proc.stdout).blob(),
    new Response(proc.stderr).blob(),
  ]);
  const exitCode = await proc.exited;
  const decoder = new TextDecoder();
  const stderr = decoder.decode(await stderrBuf.arrayBuffer());
  if (exitCode !== 0) {
    throw new Error(`gh ${args[0]} failed: ${stderr}`);
  }
  return decoder.decode(await stdoutBuf.arrayBuffer()).trim();
}

/**
 * Parse PR info from gh JSON output.
 * @param raw - Raw JSON string from gh
 * @returns {PRInfo} Parsed PR info
 */
function parsePrJson(raw: string): PRInfo {
  const data = JSON.parse(raw);
  return {
    url: data.url,
    number: data.number,
    status: data.state === 'MERGED' ? 'merged' : data.state === 'CLOSED' ? 'closed' : 'open',
    branch: data.headRefName ?? '',
    baseBranch: data.baseRefName ?? 'main',
  };
}

/**
 * Create a GitHub PR client.
 * @param cwd - Working directory for gh commands
 * @returns {PRClient} A GitHub PR client
 */
export function createGitHubClient(cwd: string): PRClient {
  return {
    async create(options: PRCreateOptions): Promise<PRInfo> {
      const args = [
        'pr', 'create',
        '--title', options.title,
        '--body', options.body,
        '--head', options.branch,
      ];
      if (options.baseBranch) args.push('--base', options.baseBranch);
      if (options.draft) args.push('--draft');

      const url = await runGh(args, cwd);
      // Fetch PR details to get number and status
      const raw = await runGh(['pr', 'view', url, '--json', 'number,url,state,headRefName,baseRefName'], cwd);
      return parsePrJson(raw);
    },

    async getStatus(prNumber: number): Promise<PRInfo> {
      const raw = await runGh(
        ['pr', 'view', String(prNumber), '--json', 'number,url,state,headRefName,baseRefName'],
        cwd,
      );
      return parsePrJson(raw);
    },

    async merge(prNumber: number): Promise<void> {
      await runGh(['pr', 'merge', String(prNumber), '--merge'], cwd);
    },
  };
}
