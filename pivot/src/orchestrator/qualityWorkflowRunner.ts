/**
 * Canonical quality-workflow runner for the orchestrator.
 *
 * Implements the stage sequencing, gate evaluation, applicability checks,
 * and closeout eligibility logic that drives quality workflows in the
 * integrated pipeline. This module does NOT invoke the Python supervisor
 * or create a second scheduler — it is injected as an orchestrator
 * dependency that the parent executor dispatch calls after atomic claim
 * and before handleSuccess.
 *
 * @module qualityWorkflowRunner
 */

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────

/** All supported quality stage kinds, matching QualityStageKindSchema. */
export type StageKind =
  | 'strategy'
  | 'red'
  | 'green'
  | 'phase_acceptance'
  | 'adversarial'
  | 'ux'
  | 'acceptance'
  | 'closeout';

/** Dispatch role that executes a stage. */
export type StageRole = 'executor' | 'reviewer' | 'merger' | 'architect';

/**
 * Applicability predicates. Multiple predicates OR together:
 * the stage is applicable if ANY predicate matches the context.
 */
export interface QualityApplicability {
  always?: boolean;
  trackIsSetup?: boolean;
  hasFrontendChanges?: boolean;
  isFinalAcceptance?: boolean;
  isFinalCloseout?: boolean;
}

/** Specification for a single quality stage. */
export interface QualityStageSpec {
  kind: StageKind;
  required: boolean;
  applicability: QualityApplicability;
  role: StageRole;
  attempts: number;
  timeoutMs: number;
}

/** Context values evaluated against applicability predicates. */
export interface StageContext {
  trackIsSetup: boolean;
  hasFrontendChanges: boolean;
  isFinalAcceptance: boolean;
  isFinalCloseout: boolean;
}

/** Structured feedback attached to a stage result. */
export interface StageFeedback {
  reason: string;
  attempt: number;
  gateEvidence?: Record<string, unknown>;
}

/** Result of executing a single stage. */
export interface StageResult {
  stageKind: StageKind;
  status: 'passed' | 'failed' | 'skipped' | 'gate_feedback';
  attempt: number;
  feedback?: StageFeedback;
  reason?: string;
}

/** Input for the Red-stage gate evaluator. */
export interface RedStageGateInput {
  expectedFailingTests: number;
  requireFailingTestCommitted: boolean;
  rejectNonTestSourceChanges: boolean;
  failingTestCountObserved: number;
  changedFiles: string[];
}

/** Decision from the Red-stage gate. */
export interface RedStageGateDecision {
  accepted: boolean;
  reason?: string;
}

/** Decision from the applicability evaluator. */
export interface ApplicabilityDecision {
  applicable: boolean;
  reason?: string;
}

/** Context for closeout eligibility evaluation. */
export interface CloseoutEligibilityContext {
  isFinalCloseout: boolean;
  verifyPassed: boolean;
  orphansPassed: boolean;
}

/** Decision from the closeout eligibility evaluator. */
export interface CloseoutDecision {
  eligible: boolean;
  reason?: string;
}

/** Stage executor function type. */
export type StageExecutor = (stage: QualityStageSpec) => Promise<StageResult>;

/** Runner interface injected into the quality workflow. */
export interface QualityWorkflowRunner {
  runStage: (stage: QualityStageSpec) => Promise<StageResult>;
}

/** Result of a complete quality workflow run. */
export type QualityRunResult =
  | {
      outcome: 'passed';
      stageLog: StageResult[];
    }
  | {
      outcome: 'failed';
      stageLog: StageResult[];
      failedStageKind?: StageKind;
      reason?: string;
    };

/** Sequencing result returned by sequenceQualityStages. */
export type SequenceResult =
  | {
      outcome: 'passed';
      stageLog: StageResult[];
    }
  | {
      outcome: 'failed';
      stageLog: StageResult[];
      failedStageKind?: StageKind;
      reason?: string;
    };

// ──────────────────────────────────────────────────────────────────────
// Red-stage gate
// ──────────────────────────────────────────────────────────────────────

const TEST_FILE_RE = /\.(test|spec|red\.test)\.[jt]sx?$/;
const FIXTURE_RE = /[/\\]__fixtures__[/\\]/;

/**
 * Evaluates the Red-stage gate contract:
 * - REJECTS when requireFailingTestCommitted=true and no failing test was observed.
 * - REJECTS when observed failing-test count does not match expectedFailingTests.
 * - REJECTS when rejectNonTestSourceChanges=true and non-test source files were changed.
 * - ACCEPTS otherwise.
 *
 * @param input - Red-stage gate input
 */
export function evaluateRedStageGate(input: RedStageGateInput): RedStageGateDecision {
  if (input.requireFailingTestCommitted && input.failingTestCountObserved === 0) {
    return {
      accepted: false,
      reason: 'No failing test was committed — expected at least one failing test',
    };
  }

  if (input.failingTestCountObserved !== input.expectedFailingTests) {
    return {
      accepted: false,
      reason: `Expected ${input.expectedFailingTests} failing test(s), observed ${input.failingTestCountObserved}`,
    };
  }

  if (input.rejectNonTestSourceChanges && input.expectedFailingTests > 0) {
    const hasNonTest = input.changedFiles.some(
      (f) => !TEST_FILE_RE.test(f) || FIXTURE_RE.test(f),
    );
    if (hasNonTest) {
      return {
        accepted: false,
        reason: 'non-test source files were changed in the Red stage',
      };
    }
  }

  return { accepted: true };
}

// ──────────────────────────────────────────────────────────────────────
// Stage applicability
// ──────────────────────────────────────────────────────────────────────

/**
 * Evaluates whether a stage spec is applicable given the current context.
 * Multiple predicates OR together: the stage is applicable if ANY
 * predicate matches the context.
 *
 * @param spec - The quality stage specification
 * @param context - Current context values
 */
export function evaluateStageApplicability(
  spec: QualityStageSpec,
  context: StageContext,
): ApplicabilityDecision {
  const a = spec.applicability;

  if (a.always === true) {
    return { applicable: true };
  }

  if (a.trackIsSetup === true && context.trackIsSetup) {
    return { applicable: true };
  }

  if (a.hasFrontendChanges === true && context.hasFrontendChanges) {
    return { applicable: true };
  }

  if (a.isFinalAcceptance === true && context.isFinalAcceptance) {
    return { applicable: true };
  }

  if (a.isFinalCloseout === true && context.isFinalCloseout) {
    return { applicable: true };
  }

  // Build a reason from the predicates that didn't match
  const predicates: string[] = [];
  if (a.trackIsSetup) predicates.push('trackIsSetup');
  if (a.hasFrontendChanges) predicates.push('hasFrontendChanges');
  if (a.isFinalAcceptance) predicates.push('isFinalAcceptance');
  if (a.isFinalCloseout) predicates.push('isFinalCloseout');

  return {
    applicable: false,
    reason: predicates.length > 0
      ? `Stage not applicable: none of [${predicates.join(', ')}] matched context`
      : 'Stage not applicable: no matching predicate',
  };
}

// ──────────────────────────────────────────────────────────────────────
// Closeout eligibility
// ──────────────────────────────────────────────────────────────────────

/**
 * Evaluates closeout eligibility: closeout runs only for the final
 * eligible track work and cannot archive before real verify and orphans
 * pass.
 *
 * @param ctx - Closeout eligibility context
 */
export function evaluateCloseoutEligibility(ctx: CloseoutEligibilityContext): CloseoutDecision {
  if (!ctx.isFinalCloseout) {
    return {
      eligible: false,
      reason: 'Not the final closeout — closeout is only eligible for final track work',
    };
  }

  if (!ctx.verifyPassed) {
    return {
      eligible: false,
      reason: 'Verify has not passed — closeout requires real verify to pass first',
    };
  }

  if (!ctx.orphansPassed) {
    return {
      eligible: false,
      reason: 'Orphans check has not passed — closeout requires orphans to pass first',
    };
  }

  return { eligible: true };
}

// ──────────────────────────────────────────────────────────────────────
// Stage sequencer
// ──────────────────────────────────────────────────────────────────────

/**
 * Sequences quality stages in profile order, respecting applicability,
 * required/optional semantics, gate feedback retries, and short-circuit
 * on required-stage failure.
 *
 * @param stages - Ordered stage specs from the profile
 * @param context - Current context for applicability evaluation
 * @param executor - Stage executor function
 */
export async function sequenceQualityStages(
  stages: QualityStageSpec[],
  context: StageContext,
  executor: StageExecutor,
): Promise<SequenceResult> {
  const stageLog: StageResult[] = [];

  for (const stage of stages) {
    const applicability = evaluateStageApplicability(stage, context);

    if (!applicability.applicable) {
      const skipReason = applicability.reason ?? 'Stage not applicable';
      if (!stage.required) {
        stageLog.push({
          stageKind: stage.kind,
          status: 'skipped',
          attempt: 0,
          reason: skipReason,
          feedback: {
            reason: skipReason,
            attempt: 0,
          },
        });
        continue;
      }
      // Required stage that is not applicable — this shouldn't happen
      // in well-formed profiles, but treat as a skip.
      stageLog.push({
        stageKind: stage.kind,
        status: 'skipped',
        attempt: 0,
        reason: skipReason,
        feedback: {
          reason: skipReason,
          attempt: 0,
        },
      });
      continue;
    }

    // Execute with retry on gate_feedback
    let lastResult: StageResult | undefined;
    let attempt = 0;
    const maxAttempts = Math.max(stage.attempts, 1);

    while (attempt < maxAttempts) {
      attempt += 1;
      lastResult = await executor(stage);

      if (lastResult.status !== 'gate_feedback') {
        break;
      }

      // Gate feedback — retry if attempts remain
      if (attempt >= maxAttempts) {
        // Exhausted attempts — mark as failed
        lastResult = {
          stageKind: stage.kind,
          status: 'failed',
          attempt,
          feedback: lastResult.feedback,
        };
        break;
      }
    }

    // Record the result (use the last attempt's result)
    const finalResult: StageResult = {
      stageKind: stage.kind,
      status: lastResult!.status === 'gate_feedback' ? 'failed' : lastResult!.status,
      attempt: lastResult!.attempt,
      feedback: lastResult!.feedback,
    };
    stageLog.push(finalResult);

    // Short-circuit on required failure
    if (stage.required && finalResult.status === 'failed') {
      return {
        outcome: 'failed',
        stageLog,
        failedStageKind: stage.kind,
        reason: finalResult.feedback?.reason ?? `Required stage "${stage.kind}" failed`,
      };
    }
  }

  return { outcome: 'passed', stageLog };
}

// ──────────────────────────────────────────────────────────────────────
// runQualityWorkflow entry point
// ──────────────────────────────────────────────────────────────────────

/**
 * Runs the quality workflow: evaluates closeout eligibility (if applicable),
 * then sequences all stages through the injected runner.
 *
 * @param stages - Ordered stage specs from the profile
 * @param context - Current context for applicability evaluation
 * @param runner - Injected quality workflow runner
 * @param closeoutCtx - Closeout eligibility context
 */
export async function runQualityWorkflow(
  stages: QualityStageSpec[],
  context: StageContext,
  runner: QualityWorkflowRunner,
  closeoutCtx: CloseoutEligibilityContext,
): Promise<QualityRunResult> {
  // If this is a closeout context, verify eligibility before running stages
  const hasCloseoutStage = stages.some(
    (s) => s.applicability.isFinalCloseout === true || s.kind === 'closeout',
  );

  if (hasCloseoutStage || closeoutCtx.isFinalCloseout) {
    const eligibility = evaluateCloseoutEligibility(closeoutCtx);
    if (!eligibility.eligible) {
      return {
        outcome: 'failed',
        stageLog: [],
        reason: eligibility.reason,
      };
    }
  }

  // Sequence stages through the runner
  const executor: StageExecutor = (stage) => runner.runStage(stage);
  const result = await sequenceQualityStages(stages, context, executor);

  return result;
}
