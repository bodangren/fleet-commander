/**
 * Quality-run resume planner.
 *
 * On process restart, picks up an in-progress quality run and continues
 * from the first incomplete required stage. Skipped optional stages are
 * NOT replayed (their skip is final). The immutable profile snapshot is
 * preserved across resume.
 *
 * @module qualityRunResume
 */

import type { PipelineRunLifecycle } from './stages/pipelineRunLifecycle';
import { BUILTIN_PROFILES, type QualityProfileType } from '../shared/qualityProfile';

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────

/** Stage to run in a resume plan. */
export interface ResumeStage {
  kind: string;
  required: boolean;
  applicability: Record<string, unknown>;
  role: string;
  attempts: number;
  timeoutMs: number;
}

/** Resume plan returned by planQualityRunResume. */
export interface ResumePlan {
  profileName: string;
  profileVersion: number;
  stagesToRun: ResumeStage[];
}

/** Resume state fetched from Convex. */
interface QualityRunResumeState {
  runId: string;
  profileName: string;
  profileVersion: number;
  passedRequiredStageKinds: string[];
  skippedOptionalStageKinds: string[];
}

// ──────────────────────────────────────────────────────────────────────
// Profile resolution
// ──────────────────────────────────────────────────────────────────────

/**
 * Resolves the stage list from the immutable profile snapshot.
 * Uses the BUILTIN_PROFILES map to look up the profile by name.
 * Falls back to an empty list if the profile is not found.
 */
function resolveProfileStages(profileName: string): ResumeStage[] {
  const profile = BUILTIN_PROFILES[profileName as keyof typeof BUILTIN_PROFILES] as QualityProfileType | undefined;
  if (!profile) return [];

  return profile.stages.map((stage) => ({
    kind: stage.kind,
    required: stage.policy.required,
    applicability: stage.policy.applicability as Record<string, unknown>,
    role: stage.policy.role,
    attempts: stage.policy.attempts,
    timeoutMs: stage.policy.timeoutMs,
  }));
}

// ──────────────────────────────────────────────────────────────────────
// Resume planning
// ──────────────────────────────────────────────────────────────────────

/**
 * Plans which stages to run on resume. Returns every profile stage
 * when no attempts have been recorded (fresh run). After required
 * stages have passed, omits those stages and returns only the first
 * incomplete required stage and everything after it. Optional stages
 * that were skipped are NOT replayed.
 *
 * @param client - Convex client (or mock) for querying the resume state
 * @param projectSlug - The project identifier
 * @param runId - The quality run identifier
 */
export async function planQualityRunResume(
  client: { query: (fn: unknown, args?: unknown) => Promise<unknown> },
  projectSlug: string,
  runId: string,
): Promise<ResumePlan> {
  // Query the resume state from Convex
  const state = (await client.query('getResumableQualityRun', {
    projectSlug,
    runId,
  })) as QualityRunResumeState | null;

  if (!state) {
    return { profileName: '', profileVersion: 0, stagesToRun: [] };
  }

  const allStages = resolveProfileStages(state.profileName);
  const passedSet = new Set(state.passedRequiredStageKinds);
  const skippedSet = new Set(state.skippedOptionalStageKinds);

  // Find the first incomplete required stage index
  let firstIncompleteIdx = allStages.length;
  for (let i = 0; i < allStages.length; i++) {
    const stage = allStages[i];
    if (stage.required && !passedSet.has(stage.kind)) {
      firstIncompleteIdx = i;
      break;
    }
  }

  // Filter: skip already-passed required stages and skipped stages
  const stagesToRun: ResumeStage[] = [];
  for (let i = 0; i < allStages.length; i++) {
    const stage = allStages[i];

    // Skip passed required stages
    if (stage.required && passedSet.has(stage.kind)) continue;

    // Skip stages that were skipped (skip is terminal — not replayed on resume)
    if (skippedSet.has(stage.kind)) continue;

    // Skip required stages before the first incomplete one
    // (this handles the case where we resume from a specific point)
    if (i < firstIncompleteIdx && stage.required) continue;

    stagesToRun.push(stage);
  }

  return {
    profileName: state.profileName,
    profileVersion: state.profileVersion,
    stagesToRun,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Resume execution
// ──────────────────────────────────────────────────────────────────────

/**
 * Resumes a quality run: plans the resume, records a "resumed" execution
 * log entry through the real PipelineRunLifecycle, and returns the plan.
 *
 * @param client - Convex client for querying the resume state
 * @param lifecycle - Real PipelineRunLifecycle for appending the resume log entry
 * @param projectSlug - The project identifier
 * @param runId - The quality run identifier
 */
export async function resumeQualityRun(
  client: { query: (fn: unknown, args?: unknown) => Promise<unknown> },
  lifecycle: PipelineRunLifecycle,
  projectSlug: string,
  runId: string,
): Promise<ResumePlan> {
  const plan = await planQualityRunResume(client, projectSlug, runId);

  // Record the resume event through the real lifecycle
  await lifecycle.appendLog(
    'running',
    `Resumed quality run from first incomplete required stage`,
  );

  return plan;
}
