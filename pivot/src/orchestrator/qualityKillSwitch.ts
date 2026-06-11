/**
 * Kill-switch and fail-closed configuration behavior for quality workflows.
 *
 * Evaluates whether a project's quality configuration is valid and, if not,
 * pauses the affected project without disabling unrelated no-profile projects.
 * This implements the contract from test-strategy.md §3:
 *
 *   "Kill switch / invalid profile pauses only affected project; unrelated
 *    no-profile projects keep running (S2 ↔ S5)."
 *
 * The kill switch is a pure function: it never mutates its input.
 *
 * @module qualityKillSwitch
 */

import {
  BUILTIN_PROFILES,
  type QualityProfileType,
} from '../shared/qualityProfile';

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────

/** State of a project's quality configuration as seen by the orchestrator. */
export interface ProjectQualityState {
  projectSlug: string;
  hasProfile: boolean;
  profile: QualityProfileType | undefined;
  paused: boolean;
}

/** Structured decision from the kill-switch evaluator. */
export interface QualityKillSwitchDecision {
  pause: boolean;
  configInvalid: boolean;
  projectSlug: string;
  reason?: string;
}

/** Result of validating a quality configuration. */
export interface QualityConfigValidation {
  valid: boolean;
  errors: string[];
}

// ──────────────────────────────────────────────────────────────────────
// Validation
// ──────────────────────────────────────────────────────────────────────

/**
 * Validates a quality profile configuration against the known built-in
 * profiles. Rejects profiles whose name does not match a known built-in
 * kind, or whose name does not match its kind (fail-closed).
 *
 * @param profile - The quality profile to validate
 */
export function validateQualityConfig(profile: QualityProfileType): QualityConfigValidation {
  const errors: string[] = [];

  // Check that the profile name is a known built-in
  if (!(profile.name in BUILTIN_PROFILES)) {
    errors.push(
      `Profile name "${profile.name}" does not match a known built-in profile`,
    );
  }

  // Check that the profile name matches its kind
  if (profile.name !== profile.kind) {
    errors.push(
      `Profile name "${profile.name}" does not match kind "${profile.kind}"`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Kill-switch decision
// ──────────────────────────────────────────────────────────────────────

/**
 * Evaluates whether a project should be paused based on its quality
 * configuration. Returns a structured decision with blast-radius isolation:
 * only the affected project is paused; unrelated projects are untouched.
 *
 * Rules:
 * - Projects with no profile selected are NEVER paused (backward-compat).
 * - Projects with a valid built-in profile are NOT paused.
 * - Projects with an invalid configuration ARE paused (fail-closed).
 *
 * This is a pure function — the input state is never mutated.
 *
 * @param state - The project's quality state
 */
export function evaluateQualityKillSwitch(
  state: ProjectQualityState,
): QualityKillSwitchDecision {
  // No profile selected — never paused (backward-compat)
  if (!state.hasProfile || !state.profile) {
    return {
      pause: false,
      configInvalid: false,
      projectSlug: state.projectSlug,
    };
  }

  // Validate the profile configuration
  const validation = validateQualityConfig(state.profile);

  if (!validation.valid) {
    return {
      pause: true,
      configInvalid: true,
      projectSlug: state.projectSlug,
      reason: `Invalid quality configuration: ${validation.errors.join('; ')}`,
    };
  }

  return {
    pause: false,
    configInvalid: false,
    projectSlug: state.projectSlug,
  };
}
