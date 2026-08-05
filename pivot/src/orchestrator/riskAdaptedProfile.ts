import {
  deriveRiskClass,
  profileNameForRiskClass,
  requiredStagesFor,
  type RiskClass,
  type StageKind,
} from '../shared/riskClass';
import {
  BUILTIN_PROFILES,
  type QualityProfileType,
} from '../shared/qualityProfile';
import type { Task } from './types';

/**
 * Adapts a configured quality profile to the track's actual risk.
 *
 * This is the thin seam between the durable risk rules in
 * `shared/riskClass.ts` and the profile machinery. It exists so the rules
 * themselves carry no dependency on quality profiles, which are scheduled for
 * removal when execution moves to the harness.
 *
 * Two adjustments happen here:
 *
 *   1. **Escalation.** A track whose evidence says `critical` is promoted to
 *      the `strict` profile even if the project selected something weaker. A
 *      project-level setting cannot opt a dangerous change out of review.
 *   2. **Trimming.** Stages outside the risk class's required set are dropped.
 *      This is what stops a typo fix from paying the eight-stage tax.
 */

export interface RiskAdaptedProfile {
  profile: QualityProfileType;
  riskClass: RiskClass;
  declaredRiskClass: RiskClass;
  escalatedBy: string[];
  /** Stage kinds dropped because the risk class does not require them. */
  trimmedStages: StageKind[];
  /** True when the profile was promoted above the configured one. */
  promoted: boolean;
}

/** Build the text the risk signals are matched against. */
function riskEvidenceFor(task: Task): { spec?: string; scope?: string[] } {
  const spec = [task.title, task.spec].filter(Boolean).join('\n');
  return { spec, scope: undefined };
}

/**
 * Resolve the profile a task should actually run under.
 * @param configured - Profile selected for the project or task
 * @param task - Task being dispatched
 * @param declaredRiskClass - `risk_class` from the track's metadata.json
 * @returns The adapted profile plus the reasoning behind it
 */
export function adaptProfileToRisk(
  configured: QualityProfileType,
  task: Task,
  declaredRiskClass?: unknown,
): RiskAdaptedProfile {
  const evidence = riskEvidenceFor(task);
  const derivation = deriveRiskClass({
    declared: declaredRiskClass,
    spec: evidence.spec,
    scope: evidence.scope,
  });
  const riskClass = derivation.riskClass;

  // The 'none' profile stays none. Turning quality on for a project that
  // deliberately disabled it belongs to the operator, not to this function.
  if (configured.kind === 'none') {
    return {
      profile: configured,
      riskClass,
      declaredRiskClass: derivation.declared,
      escalatedBy: derivation.escalatedBy,
      trimmedStages: [],
      promoted: false,
    };
  }

  const requiredName = profileNameForRiskClass(riskClass);
  const promoted = requiredName === 'strict' && configured.kind !== 'strict';
  const base = promoted
    ? (BUILTIN_PROFILES[requiredName] ?? configured)
    : configured;

  const required = requiredStagesFor(riskClass);

  // Trim only *mandatory* stages the risk class does not call for. Optional
  // stages (`required: false`) already gate themselves on applicability — a
  // setup track still gets its strategy stage, a frontend change still gets UX
  // — and dropping them here would remove behavior the risk class never
  // intended to govern.
  const shouldKeep = (stage: (typeof base.stages)[number]): boolean =>
    required.includes(stage.kind as StageKind) || stage.policy.required === false;

  const kept = base.stages.filter(shouldKeep);
  const trimmedStages = base.stages
    .filter((stage) => !shouldKeep(stage))
    .map((stage) => stage.kind as StageKind);

  return {
    profile: { ...base, stages: kept },
    riskClass,
    declaredRiskClass: derivation.declared,
    escalatedBy: derivation.escalatedBy,
    trimmedStages,
    promoted,
  };
}

/** One-line summary suitable for a run log. */
export function describeRiskAdaptation(adapted: RiskAdaptedProfile): string {
  const parts = [`risk=${adapted.riskClass}`];
  if (adapted.riskClass !== adapted.declaredRiskClass) {
    parts.push(`escalated from ${adapted.declaredRiskClass}`);
  }
  if (adapted.promoted) parts.push(`profile promoted to ${adapted.profile.name}`);
  if (adapted.trimmedStages.length > 0) {
    parts.push(`skipped ${adapted.trimmedStages.join(', ')}`);
  }
  return parts.join('; ');
}
