import type { ReconciliationRules, ConflictStrategy } from './rules';

export interface ReconciliationProposal {
  projectSlug: string;
  artifactType: 'track' | 'task' | 'issue';
  artifactId: string;
  divergenceType: 'added' | 'modified' | 'deleted';
  conductorHash: string;
  canonicalHash: string;
  patchJson: string;
  sourceSide: 'convex' | 'markdown';
  reason: string;
  autoApply: boolean;
}

export interface Divergence {
  projectSlug: string;
  artifactType: 'track' | 'task' | 'issue';
  artifactId: string;
  divergenceType: 'added' | 'modified' | 'deleted';
  conductorHash: string;
  canonicalHash: string;
  description: string;
}

interface Patch {
  action: 'keep_canonical' | 'keep_conductor' | 'manual_review';
  divergenceType: 'added' | 'modified' | 'deleted';
}

/**
 * Map artifact type string to its corresponding rule class name.
 * @param artifactType - The artifact type
 * @returns {string} The class name for the artifact type
 */
function mapArtifactTypeToClass(artifactType: string): string {
  if (artifactType === 'track') return 'trackMetadata';
  return artifactType;
}

/**
 * Determine which side (convex or markdown) should be considered the source based on conflict strategy.
 * @param rule - The reconciliation rule with canonicalSource
 * @param strategy - The conflict strategy
 * @returns {'convex' | 'markdown'} The source side
 */
function determineSourceSide(rule: { canonicalSource: 'convex' | 'markdown' }, strategy: ConflictStrategy): 'convex' | 'markdown' {
  if (strategy === 'prefer_canonical') return rule.canonicalSource;
  if (strategy === 'prefer_export') {
    return rule.canonicalSource === 'convex' ? 'markdown' : 'convex';
  }
  return rule.canonicalSource;
}

/**
 * Propose patches for a list of divergences based on reconciliation rules.
 * @param events - Array of divergences to process
 * @param rules - Reconciliation rules
 * @returns {ReconciliationProposal[]} Array of proposed patches
 */
export function proposePatches(events: Divergence[], rules: ReconciliationRules): ReconciliationProposal[] {
  const proposals: ReconciliationProposal[] = [];

  for (const event of events) {
    const artifactClass = mapArtifactTypeToClass(event.artifactType);
    const rule = rules.artifactClasses[artifactClass];
    if (!rule) continue;

    const strategy = rule.conflictStrategy;
    if (strategy === 'reject') continue;

    const sourceSide = determineSourceSide(rule, strategy);
    const autoApply = shouldAutoApplyStrategy(strategy);

    const patch: Patch = {
      action: strategy === 'prefer_canonical'
        ? 'keep_canonical'
        : strategy === 'prefer_export'
        ? 'keep_conductor'
        : 'manual_review',
      divergenceType: event.divergenceType,
    };

    proposals.push({
      projectSlug: event.projectSlug,
      artifactType: event.artifactType,
      artifactId: event.artifactId,
      divergenceType: event.divergenceType,
      conductorHash: event.conductorHash,
      canonicalHash: event.canonicalHash,
      patchJson: JSON.stringify(patch),
      sourceSide,
      reason: `Strategy ${strategy}: ${event.description}`,
      autoApply,
    });
  }

  return proposals;
}

/**
 * Determine if a conflict strategy should auto-apply.
 * @param strategy - The conflict strategy
 * @returns {boolean} True if the strategy auto-applies
 */
function shouldAutoApplyStrategy(strategy: ConflictStrategy): boolean {
  return strategy === 'prefer_canonical' || strategy === 'prefer_export';
}

/**
 * Determine if a proposal should auto-apply based on strategy.
 * @param proposal - The reconciliation proposal
 * @param strategy - The conflict strategy
 * @returns {boolean} True if the proposal should auto-apply
 */
export function shouldAutoApply(proposal: ReconciliationProposal, strategy: ConflictStrategy): boolean {
  return shouldAutoApplyStrategy(strategy);
}

export interface DecisionRecord {
  conductorHash: string;
  canonicalHash: string;
  decision?: 'apply' | 'reject';
}

/**
 * Filter out proposals that have been rejected by prior decisions.
 * @param proposals - Array of proposals to filter
 * @param decisions - Array of prior decisions
 * @returns {ReconciliationProposal[]} Filtered proposals
 */
export function filterRejectedProposals(
  proposals: ReconciliationProposal[],
  decisions: DecisionRecord[]
): ReconciliationProposal[] {
  const rejectedPairs = new Set(
    decisions
      .filter((d) => !d.decision || d.decision === 'reject')
      .map((d) => `${d.conductorHash}:${d.canonicalHash}`)
  );

  return proposals.filter((p) => !rejectedPairs.has(`${p.conductorHash}:${p.canonicalHash}`));
}
