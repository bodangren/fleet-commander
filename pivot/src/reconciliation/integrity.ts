import { runReconciliationSweep } from './sweep';
import { proposePatches } from './engine';
import type { ReconciliationRules } from './rules';
import type { Divergence } from './engine';

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
