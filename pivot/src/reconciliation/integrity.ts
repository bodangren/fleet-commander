import { runReconciliationSweep } from './sweep';
import { proposePatches } from './engine';
import type { ReconciliationRules } from './rules';
import type { Divergence } from './engine';

/**
 * Run an integrity check by sweeping for divergences and proposing patches.
 * @param projectSlug - The project identifier
 * @param projectPath - Path to the project
 * @param rules - Reconciliation rules
 * @param sweepFn - Optional custom sweep function
 * @returns {Promise<ReconciliationProposal[]>} Array of proposed patches
 */
export async function runIntegrityCheck(
  projectSlug: string,
  projectPath: string,
  rules: ReconciliationRules,
  sweepFn?: (projectSlug: string, projectPath: string) => Promise<Divergence[]>,
) {
  const divergences = await (sweepFn ?? runReconciliationSweep)(projectSlug, projectPath);
  const proposals = proposePatches(divergences, rules);
  return proposals;
}
