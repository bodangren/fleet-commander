/**
 * Risk-derived stage selection.
 *
 * The workflow used to run the same eight stages for every track. A typo fix
 * paid the same tax as an auth change, which is where most of the
 * bookkeeping-to-code ratio came from.
 *
 * This module binds the stage set to the track's risk instead. Two rules make
 * it hard to game:
 *
 *   1. A declared risk class can be raised by derivation, never lowered. If the
 *      spec or scope shows a money, auth, or data-loss signal, the track is
 *      escalated whatever `metadata.json` claims.
 *   2. An absent declaration is not an error. It resolves to `normal` and is
 *      then subject to the same escalation.
 *
 * This file is intentionally free of Convex, orchestrator, and quality-profile
 * imports. It is pure data in, data out, so it survives the executor collapse.
 */

/** Risk classes, ordered from least to most severe. */
export const RISK_CLASSES = ['normal', 'elevated', 'critical'] as const;

export type RiskClass = (typeof RISK_CLASSES)[number];

/** Stage kinds, mirroring `QualityStageKindSchema` without importing it. */
export type StageKind =
  | 'strategy'
  | 'red'
  | 'green'
  | 'phase_acceptance'
  | 'adversarial'
  | 'ux'
  | 'acceptance'
  | 'closeout';

/**
 * Stages that must run for each risk class.
 *
 * `normal` keeps the loop that actually catches defects: write a failing test,
 * make it pass, have one reviewer check it. The other five stages are the ones
 * a low-risk change does not earn.
 */
export const REQUIRED_STAGES: Readonly<Record<RiskClass, readonly StageKind[]>> =
  Object.freeze({
    normal: Object.freeze(['red', 'green', 'phase_acceptance'] as const),
    elevated: Object.freeze([
      'strategy',
      'red',
      'green',
      'phase_acceptance',
      'acceptance',
    ] as const),
    critical: Object.freeze([
      'strategy',
      'red',
      'green',
      'phase_acceptance',
      'adversarial',
      'ux',
      'acceptance',
      'closeout',
    ] as const),
  });

/**
 * Signals that force `critical`: irreversible data or money movement.
 * Matched case-insensitively against the spec text and the declared scope.
 */
const CRITICAL_SIGNALS: readonly RegExp[] = Object.freeze([
  /\bdrop\s+table\b/i,
  /\bdelete\s+from\b/i,
  /\btruncate\b/i,
  /\brm\s+-rf\b/i,
  // "Migration" alone over-escalates: a CSS or router migration moves no data.
  // Require a data noun in the same clause, in either order, or a real
  // migrations path.
  /\bmigrat(e|ed|es|ing|ion|ions)\b[^.\n]{0,60}?\b(data|schema|db|database|table|column|index|row)s?\b/i,
  /\b(data|schema|db|database|table|column|index|row)s?\b[^.\n]{0,60}?\bmigrat(e|ed|es|ing|ion|ions)\b/i,
  /(^|\/)migrations?\//i,
  /\bbackfill\b/i,
  /\bstripe\b/i,
  /\b(charge|refund|payout|invoice|billing)\b/i,
  /\bschema\.ts\b/i,
]);

/**
 * Signals that force at least `elevated`: the security and spend boundary.
 */
const ELEVATED_SIGNALS: readonly RegExp[] = Object.freeze([
  /\bauth(entication|orization)?\b/i,
  /\b(password|secret|credential|api[_-]?key)\b/i,
  /\b(token|session|cookie)\b/i,
  /\b(permission|role|acl|rbac)\b/i,
  /\b(budget|cost|quota|spend)\b/i,
  /\b\.env\b/i,
]);

/** Rank a risk class so classes can be compared and maxed. */
export function riskRank(riskClass: RiskClass): number {
  return RISK_CLASSES.indexOf(riskClass);
}

/** Return whichever of the two classes is more severe. */
export function maxRiskClass(a: RiskClass, b: RiskClass): RiskClass {
  return riskRank(a) >= riskRank(b) ? a : b;
}

/**
 * Coerce an untrusted `metadata.json` value into a risk class.
 * Unknown and absent values resolve to `normal` rather than throwing, because
 * a malformed declaration must not be able to skip the gate by crashing it.
 */
export function parseRiskClass(value: unknown): RiskClass {
  if (typeof value !== 'string') return 'normal';
  const normalized = value.trim().toLowerCase();
  return (RISK_CLASSES as readonly string[]).includes(normalized)
    ? (normalized as RiskClass)
    : 'normal';
}

/** Inputs used to derive a track's effective risk class. */
export interface TrackRiskInput {
  /** `risk_class` from the track's `metadata.json`, if present. */
  declared?: unknown;
  /** Spec or description text for the track. */
  spec?: string | undefined;
  /** Declared file scope for the track. */
  scope?: readonly string[] | undefined;
}

/** The derivation result, including why the class was chosen. */
export interface RiskDerivation {
  riskClass: RiskClass;
  declared: RiskClass;
  /** Patterns that forced an escalation above the declared class. */
  escalatedBy: string[];
}

/**
 * Derive the effective risk class from the declaration plus evidence.
 * Escalation is one-way: evidence can raise the class, never lower it.
 */
export function deriveRiskClass(input: TrackRiskInput): RiskDerivation {
  const declared = parseRiskClass(input.declared);
  const haystack = [input.spec ?? '', ...(input.scope ?? [])].join('\n');

  const escalatedBy: string[] = [];
  let derived: RiskClass = declared;

  for (const pattern of CRITICAL_SIGNALS) {
    if (pattern.test(haystack)) {
      derived = maxRiskClass(derived, 'critical');
      escalatedBy.push(pattern.source);
    }
  }

  if (derived !== 'critical') {
    for (const pattern of ELEVATED_SIGNALS) {
      if (pattern.test(haystack)) {
        derived = maxRiskClass(derived, 'elevated');
        escalatedBy.push(pattern.source);
      }
    }
  }

  return {
    riskClass: derived,
    declared,
    // Only report escalation when the class actually rose.
    escalatedBy: riskRank(derived) > riskRank(declared) ? escalatedBy : [],
  };
}

/** Stages required for a risk class. */
export function requiredStagesFor(riskClass: RiskClass): readonly StageKind[] {
  return REQUIRED_STAGES[riskClass];
}

/**
 * Name of the built-in quality profile that covers a risk class.
 * `normal` and `elevated` both fit inside `standard`; only `critical` needs the
 * full `strict` stage list.
 */
export function profileNameForRiskClass(
  riskClass: RiskClass,
): 'standard' | 'strict' {
  return riskClass === 'critical' ? 'strict' : 'standard';
}

/**
 * Decide whether a stage must run for a given risk class.
 * Stages outside the required set are skipped, not failed.
 */
export function stageIsRequired(
  stage: StageKind,
  riskClass: RiskClass,
): boolean {
  return REQUIRED_STAGES[riskClass].includes(stage);
}
