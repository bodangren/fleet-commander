import { describe, test, expect } from 'bun:test';
import { runCommand, runCommandOrThrow } from './commandRunner';

describe('runCommand', () => {
  test('captures stdout from a successful command', async () => {
    const result = await runCommand('echo', ['hello world'], process.cwd());
    expect(result.stdout.trim()).toBe('hello world');
    expect(result.exitCode).toBe(0);
  });

  test('captures stderr on failure', async () => {
    const result = await runCommand('ls', ['/nonexistent-path-xyz'], process.cwd());
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.length).toBeGreaterThan(0);
  });

  test('captures exit code for failing command', async () => {
    const result = await runCommand('false', [], process.cwd());
    expect(result.exitCode).toBe(1);
  });
});

describe('runCommandOrThrow', () => {
  test('returns trimmed stdout on success', async () => {
    const stdout = await runCommandOrThrow('echo', ['  hello  '], process.cwd());
    expect(stdout).toBe('hello');
  });

  test('throws on non-zero exit code', async () => {
    await expect(runCommandOrThrow('false', [], process.cwd())).rejects.toThrow();
  });
});
