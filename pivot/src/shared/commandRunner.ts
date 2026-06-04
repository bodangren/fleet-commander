/**
 * Result of a command execution.
 */
export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Spawn a subprocess and capture its stdout, stderr, and exit code.
 * @param command - The executable to run
 * @param args - Arguments to pass to the command
 * @param cwd - Working directory for the command
 * @returns {Promise<CommandResult>} The command output and exit code
 */
export async function runCommand(
  command: string,
  args: string[],
  cwd: string,
): Promise<CommandResult> {
  const proc = Bun.spawn({
    cmd: [command, ...args],
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const [stdoutBuffer, stderrBuffer] = await Promise.all([
    new Response(proc.stdout).blob(),
    new Response(proc.stderr).blob(),
  ]);

  const exitCode = await proc.exited;
  const decoder = new TextDecoder();

  return {
    stdout: decoder.decode(await stdoutBuffer.arrayBuffer()),
    stderr: decoder.decode(await stderrBuffer.arrayBuffer()),
    exitCode,
  };
}

/**
 * Spawn a subprocess, capture stdout, and throw on non-zero exit.
 * @param command - The executable to run
 * @param args - Arguments to pass to the command
 * @param cwd - Working directory for the command
 * @returns {Promise<string>} Trimmed stdout
 * @throws {Error} If the command exits with non-zero status
 */
export async function runCommandOrThrow(
  command: string,
  args: string[],
  cwd: string,
): Promise<string> {
  const { stdout, stderr, exitCode } = await runCommand(command, args, cwd);
  if (exitCode !== 0) {
    throw new Error(`${command} ${args[0]} failed: ${stderr}`);
  }
  return stdout.trim();
}
