/**
 * Evidence gates for track completion.
 *
 * The existing gates check that a reviewer agent reported "pass", that a file
 * exists, or that a markdown section was updated. All three are proxies. The
 * June 2026 audit found 9 of 15 "complete" tracks were false positives, which
 * is the failure mode a proxy gate cannot catch.
 *
 * An acceptance command is not a proxy. It is a command a human wrote *before*
 * the work started, run on a clean checkout of the resulting commit. This
 * module validates the command and grades the result. Running it lives in
 * `pivot/src/git/cleanCheckout.ts`, because only that part needs a filesystem.
 *
 * Three properties do the work:
 *
 *   1. **Declared first.** The declaring commit must be an ancestor of the
 *      first implementation commit. A command written after the code is a
 *      justification, not a test.
 *   2. **Non-trivial.** `true`, `exit 0`, and bare `echo` are rejected. A gate
 *      that cannot fail proves nothing.
 *   3. **Non-mutating.** The command may not commit, push, reset, or delete.
 *      A gate that changes the tree it is grading is not measuring the tree.
 */

/** A command declared up front to decide whether a track is actually done. */
export interface AcceptanceCommand {
  /** Shell command, run via `bash -lc` in a clean checkout. */
  command: string;
  /** Exit code that counts as success. Usually 0. */
  expectExitCode: number;
  /** Hard timeout. A hung gate is a failed gate. */
  timeoutMs: number;
  /** Wall-clock time the command was declared. */
  declaredAt: number;
  /** Commit that was HEAD when the command was declared. */
  declaredAtCommit: string;
}

export type AcceptanceRejectionCode =
  | 'missing'
  | 'malformed'
  | 'trivial'
  | 'mutating'
  | 'declared_too_late';

export type AcceptanceValidation =
  | { ok: true; command: AcceptanceCommand }
  | { ok: false; code: AcceptanceRejectionCode; reason: string };

/**
 * Commands that pass no matter what the code does. Anchored so that a real
 * command merely *containing* the word (`echo-server --check`) still passes
 * validation.
 */
const TRIVIAL_COMMANDS: readonly RegExp[] = Object.freeze([
  /^\s*true\s*$/,
  /^\s*:\s*$/,
  /^\s*exit\s+0\s*$/,
  /^\s*echo\b[^|&;]*$/,
  /^\s*printf\b[^|&;]*$/,
  /^\s*#/,
]);

/** Operations that would change the tree the gate is supposed to grade. */
const MUTATING_PATTERNS: readonly RegExp[] = Object.freeze([
  /\bgit\s+(commit|push|reset|checkout|merge|rebase|tag|cherry-pick)\b/,
  /\brm\s+-[a-z]*[rf]/,
  /\b(shutdown|reboot|mkfs|dd\s+if=)\b/,
  /\bnpm\s+publish\b/,
  /\bconvex\s+deploy\b/,
  />\s*\/dev\/sd/,
]);

/** Shape check for an untrusted stored contract field. */
function isWellFormed(value: unknown): value is AcceptanceCommand {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.command === 'string' &&
    c.command.trim().length > 0 &&
    typeof c.expectExitCode === 'number' &&
    Number.isInteger(c.expectExitCode) &&
    typeof c.timeoutMs === 'number' &&
    c.timeoutMs > 0 &&
    typeof c.declaredAt === 'number' &&
    typeof c.declaredAtCommit === 'string' &&
    c.declaredAtCommit.trim().length > 0
  );
}

/** Context needed to judge declaration ordering. */
export interface AcceptanceValidationContext {
  /**
   * First commit that implemented the track. When absent, ordering cannot be
   * checked and is skipped — validation still enforces the other rules.
   */
  firstImplementationCommit?: string | undefined;
  /**
   * Returns true when `ancestor` is reachable from `descendant`.
   * Injected so this module stays pure and testable.
   */
  isAncestor?: ((ancestor: string, descendant: string) => boolean) | undefined;
}

/**
 * Validate a stored acceptance command before trusting it as a gate.
 * @param value - Raw `acceptanceCommand` field from the run contract
 * @param ctx - Commit ordering context
 * @returns A verdict carrying the parsed command or a rejection reason
 */
export function validateAcceptanceCommand(
  value: unknown,
  ctx: AcceptanceValidationContext = {},
): AcceptanceValidation {
  if (value === undefined || value === null) {
    return {
      ok: false,
      code: 'missing',
      reason: 'No acceptance command was declared for this track.',
    };
  }

  if (!isWellFormed(value)) {
    return {
      ok: false,
      code: 'malformed',
      reason:
        'Acceptance command is missing required fields (command, expectExitCode, timeoutMs, declaredAt, declaredAtCommit).',
    };
  }

  const command = value;

  for (const pattern of TRIVIAL_COMMANDS) {
    if (pattern.test(command.command)) {
      return {
        ok: false,
        code: 'trivial',
        reason: `Acceptance command "${command.command}" cannot fail, so it proves nothing.`,
      };
    }
  }

  for (const pattern of MUTATING_PATTERNS) {
    if (pattern.test(command.command)) {
      return {
        ok: false,
        code: 'mutating',
        reason: `Acceptance command "${command.command}" mutates the tree it is grading.`,
      };
    }
  }

  if (ctx.firstImplementationCommit && ctx.isAncestor) {
    const declaredFirst = ctx.isAncestor(
      command.declaredAtCommit,
      ctx.firstImplementationCommit,
    );
    if (!declaredFirst) {
      return {
        ok: false,
        code: 'declared_too_late',
        reason:
          `Acceptance command was declared at ${command.declaredAtCommit}, which is not an ancestor of the first ` +
          `implementation commit ${ctx.firstImplementationCommit}. A gate written after the code is a justification, not evidence.`,
      };
    }
  }

  return { ok: true, command };
}

/** Outcome of running an acceptance command in a clean checkout. */
export interface AcceptanceRunResult {
  exitCode: number;
  timedOut: boolean;
  durationMs: number;
  /** Commit the clean checkout was made from. */
  commit: string;
  stdout: string;
  stderr: string;
}

export interface AcceptanceVerdict {
  passed: boolean;
  reason: string;
  /** Durable evidence, suitable for storing on the run contract. */
  evidence: {
    command: string;
    expectedExitCode: number;
    actualExitCode: number;
    timedOut: boolean;
    durationMs: number;
    commit: string;
    declaredAtCommit: string;
  };
}

/**
 * Grade an acceptance run against the command that was declared.
 * @param command - The validated acceptance command
 * @param result - What happened when it ran
 * @returns A pass/fail verdict plus the evidence to persist
 */
export function gradeAcceptanceRun(
  command: AcceptanceCommand,
  result: AcceptanceRunResult,
): AcceptanceVerdict {
  const evidence = {
    command: command.command,
    expectedExitCode: command.expectExitCode,
    actualExitCode: result.exitCode,
    timedOut: result.timedOut,
    durationMs: result.durationMs,
    commit: result.commit,
    declaredAtCommit: command.declaredAtCommit,
  };

  if (result.timedOut) {
    return {
      passed: false,
      reason: `Acceptance command exceeded ${command.timeoutMs}ms and was killed.`,
      evidence,
    };
  }

  if (result.exitCode !== command.expectExitCode) {
    return {
      passed: false,
      reason: `Acceptance command exited ${result.exitCode}, expected ${command.expectExitCode}.`,
      evidence,
    };
  }

  return {
    passed: true,
    reason: `Acceptance command passed on a clean checkout of ${result.commit}.`,
    evidence,
  };
}
