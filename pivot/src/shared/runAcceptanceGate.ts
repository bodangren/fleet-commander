import {
  gradeAcceptanceRun,
  validateAcceptanceCommand,
  type AcceptanceVerdict,
} from './acceptanceGate';
import {
  isAncestor as gitIsAncestor,
  runInCleanCheckout,
} from '../git/cleanCheckout';

/**
 * Composes the acceptance gate: validate the declaration, run it against a
 * clean checkout, then grade the result.
 *
 * Kept separate from `acceptanceGate.ts` so that the rules stay pure and
 * unit-testable while the process and filesystem work lives here.
 */

export interface AcceptanceGateInput {
  /** Repository the track was implemented in. */
  repoRoot: string;
  /** Commit to grade — normally the executor's final commit. */
  commit: string;
  /** Raw `acceptanceCommand` field from the run contract. */
  declaration: unknown;
  /**
   * First commit that implemented the track. When supplied, the gate proves the
   * declaration predates it.
   */
  firstImplementationCommit?: string | undefined;
  /** Overrides the ancestry oracle. Defaults to real `git merge-base`. */
  isAncestor?: ((ancestor: string, descendant: string) => Promise<boolean>) | undefined;
}

export type AcceptanceGateOutcome =
  | { status: 'passed'; verdict: AcceptanceVerdict }
  | { status: 'failed'; verdict: AcceptanceVerdict }
  | { status: 'rejected'; code: string; reason: string };

/**
 * Run a track's acceptance gate.
 *
 * Returns `rejected` when the declaration itself is unusable — absent, trivial,
 * mutating, or written after the code. That is deliberately distinct from
 * `failed`: a missing gate is a process problem, a red gate is a code problem,
 * and collapsing the two is how false completions get through.
 *
 * @param input - Repository, commit, and the declared command
 * @returns The gate outcome, carrying evidence when the command actually ran
 */
export async function runAcceptanceGate(
  input: AcceptanceGateInput,
): Promise<AcceptanceGateOutcome> {
  // Resolve ancestry up front so validation stays synchronous and pure.
  let declaredFirst: boolean | undefined;
  const declaration = input.declaration as { declaredAtCommit?: unknown } | null;
  const declaredAtCommit =
    declaration && typeof declaration.declaredAtCommit === 'string'
      ? declaration.declaredAtCommit
      : undefined;

  if (input.firstImplementationCommit && declaredAtCommit) {
    const oracle =
      input.isAncestor ??
      ((a: string, d: string) => gitIsAncestor(input.repoRoot, a, d));
    try {
      declaredFirst = await oracle(declaredAtCommit, input.firstImplementationCommit);
    } catch {
      // An unresolvable commit must not silently pass the ordering check.
      declaredFirst = false;
    }
  }

  const validation = validateAcceptanceCommand(input.declaration, {
    firstImplementationCommit: input.firstImplementationCommit,
    isAncestor:
      declaredFirst === undefined ? undefined : () => declaredFirst as boolean,
  });

  if (!validation.ok) {
    return { status: 'rejected', code: validation.code, reason: validation.reason };
  }

  const command = validation.command;
  const result = await runInCleanCheckout({
    repoRoot: input.repoRoot,
    commit: input.commit,
    command: command.command,
    timeoutMs: command.timeoutMs,
  });

  const verdict = gradeAcceptanceRun(command, result);
  return verdict.passed
    ? { status: 'passed', verdict }
    : { status: 'failed', verdict };
}

/**
 * Shape the verdict for storage on the run contract.
 * @param verdict - Graded acceptance result
 * @returns Evidence record matching the `acceptanceEvidence` contract field
 */
export function toEvidenceRecord(verdict: AcceptanceVerdict): {
  command: string;
  expectedExitCode: number;
  actualExitCode: number;
  timedOut: boolean;
  durationMs: number;
  commit: string;
  declaredAtCommit: string;
  passed: boolean;
  reason: string;
  recordedAt: number;
} {
  return {
    ...verdict.evidence,
    passed: verdict.passed,
    reason: verdict.reason,
    recordedAt: Date.now(),
  };
}
