import { describe, expect, it } from 'bun:test';
import {
  gradeAcceptanceRun,
  validateAcceptanceCommand,
  type AcceptanceCommand,
} from './acceptanceGate';

/** A well-formed command declared at commit `aaa`. */
function cmd(overrides: Partial<AcceptanceCommand> = {}): AcceptanceCommand {
  return {
    command: 'bun run --cwd pivot test',
    expectExitCode: 0,
    timeoutMs: 600_000,
    declaredAt: 1_754_000_000_000,
    declaredAtCommit: 'aaa',
    ...overrides,
  };
}

describe('validateAcceptanceCommand — presence and shape', () => {
  it('rejects an absent command', () => {
    const v = validateAcceptanceCommand(undefined);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.code).toBe('missing');
  });

  it('rejects null', () => {
    const v = validateAcceptanceCommand(null);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.code).toBe('missing');
  });

  it('rejects a command missing required fields', () => {
    const v = validateAcceptanceCommand({ command: 'bun test' });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.code).toBe('malformed');
  });

  it('rejects an empty command string', () => {
    const v = validateAcceptanceCommand(cmd({ command: '   ' }));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.code).toBe('malformed');
  });

  it('rejects a non-positive timeout', () => {
    const v = validateAcceptanceCommand(cmd({ timeoutMs: 0 }));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.code).toBe('malformed');
  });

  it('accepts a well-formed command', () => {
    const v = validateAcceptanceCommand(cmd());
    expect(v.ok).toBe(true);
  });
});

describe('validateAcceptanceCommand — trivially passing commands', () => {
  it.each([
    ['true'],
    [':'],
    ['exit 0'],
    ['echo done'],
    ['printf ok'],
    ['# nothing to check'],
  ])('rejects %p because it cannot fail', (command) => {
    const v = validateAcceptanceCommand(cmd({ command }));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.code).toBe('trivial');
  });

  it('allows a real command that merely contains a trivial word', () => {
    const v = validateAcceptanceCommand(
      cmd({ command: 'echo-server --selfcheck && bun run --cwd pivot test' }),
    );
    expect(v.ok).toBe(true);
  });
});

describe('validateAcceptanceCommand — mutating commands', () => {
  it.each([
    ['git commit -am wip'],
    ['git push origin HEAD'],
    ['git reset --hard origin/master'],
    ['rm -rf node_modules && bun test'],
    ['npm publish'],
    ['convex deploy'],
  ])('rejects %p because it changes the tree it grades', (command) => {
    const v = validateAcceptanceCommand(cmd({ command }));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.code).toBe('mutating');
  });

  it('allows read-only git usage', () => {
    const v = validateAcceptanceCommand(
      cmd({ command: 'git status --porcelain && bun run --cwd pivot test' }),
    );
    expect(v.ok).toBe(true);
  });
});

describe('validateAcceptanceCommand — declaration ordering', () => {
  const ancestry: Record<string, string[]> = {
    // key = descendant, value = its ancestors
    impl: ['aaa', 'root'],
    aaa: ['root'],
  };
  const isAncestor = (a: string, d: string) => (ancestry[d] ?? []).includes(a);

  it('accepts a command declared before the implementation commit', () => {
    const v = validateAcceptanceCommand(cmd({ declaredAtCommit: 'aaa' }), {
      firstImplementationCommit: 'impl',
      isAncestor,
    });
    expect(v.ok).toBe(true);
  });

  it('rejects a command declared after the implementation commit', () => {
    // This is the false-positive defense: a gate written to match code that
    // already exists is a justification, not evidence.
    const v = validateAcceptanceCommand(cmd({ declaredAtCommit: 'later' }), {
      firstImplementationCommit: 'impl',
      isAncestor,
    });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.code).toBe('declared_too_late');
  });

  it('skips the ordering check when no implementation commit is known', () => {
    const v = validateAcceptanceCommand(cmd({ declaredAtCommit: 'later' }), {
      isAncestor,
    });
    expect(v.ok).toBe(true);
  });

  it('skips the ordering check when no ancestry oracle is supplied', () => {
    const v = validateAcceptanceCommand(cmd({ declaredAtCommit: 'later' }), {
      firstImplementationCommit: 'impl',
    });
    expect(v.ok).toBe(true);
  });

  it('still enforces triviality when ordering is checkable', () => {
    const v = validateAcceptanceCommand(
      cmd({ command: 'true', declaredAtCommit: 'aaa' }),
      { firstImplementationCommit: 'impl', isAncestor },
    );
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.code).toBe('trivial');
  });
});

describe('gradeAcceptanceRun', () => {
  const base = {
    exitCode: 0,
    timedOut: false,
    durationMs: 1200,
    commit: 'impl',
    stdout: '',
    stderr: '',
  };

  it('passes when the exit code matches', () => {
    const verdict = gradeAcceptanceRun(cmd(), base);
    expect(verdict.passed).toBe(true);
    expect(verdict.evidence.commit).toBe('impl');
    expect(verdict.evidence.declaredAtCommit).toBe('aaa');
  });

  it('fails when the exit code differs', () => {
    const verdict = gradeAcceptanceRun(cmd(), { ...base, exitCode: 1 });
    expect(verdict.passed).toBe(false);
    expect(verdict.reason).toContain('exited 1');
    expect(verdict.evidence.actualExitCode).toBe(1);
  });

  it('fails on timeout even when the exit code would have matched', () => {
    const verdict = gradeAcceptanceRun(cmd(), { ...base, timedOut: true });
    expect(verdict.passed).toBe(false);
    expect(verdict.reason).toContain('exceeded');
    expect(verdict.evidence.timedOut).toBe(true);
  });

  it('honours a non-zero expected exit code', () => {
    const verdict = gradeAcceptanceRun(cmd({ expectExitCode: 2 }), {
      ...base,
      exitCode: 2,
    });
    expect(verdict.passed).toBe(true);
  });

  it('records evidence on failure, not only on success', () => {
    const verdict = gradeAcceptanceRun(cmd(), { ...base, exitCode: 7 });
    expect(verdict.evidence.expectedExitCode).toBe(0);
    expect(verdict.evidence.actualExitCode).toBe(7);
    expect(verdict.evidence.durationMs).toBe(1200);
  });
});
