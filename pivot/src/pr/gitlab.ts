import type { PRClient, PRCreateOptions, PRInfo } from './types';

async function runGlab(args: string[], cwd: string): Promise<string> {
  const proc = Bun.spawn({
    cmd: ['glab', ...args],
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
    throw new Error(`glab ${args[0]} failed: ${stderr}`);
  }
  return decoder.decode(await stdoutBuf.arrayBuffer()).trim();
}

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

      const url = await runGlab(args, cwd);
      // Fetch MR details
      const raw = await runGlab(['mr', 'view', url, '--output', 'json'], cwd);
      return parseMrJson(raw);
    },

    async getStatus(prNumber: number): Promise<PRInfo> {
      const raw = await runGlab(['mr', 'view', String(prNumber), '--output', 'json'], cwd);
      return parseMrJson(raw);
    },

    async merge(prNumber: number): Promise<void> {
      await runGlab(['mr', 'merge', String(prNumber)], cwd);
    },
  };
}
