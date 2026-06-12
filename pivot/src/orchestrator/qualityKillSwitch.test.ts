/**
 * Phase S2 Red tests for the kill-switch + fail-closed configuration behavior.
 *
 * The kill switch + fail-closed configuration contract (per
 * `measure/tracks/measure_quality_workflow_integration_20260611/test-strategy.md`
 * §3 "Cross-phase edge cases & dependencies"):
 *
 *   "Kill switch / invalid profile pauses only affected project; unrelated
 *    no-profile projects keep running (S2 ↔ S5)."
 *
 * These tests pin the canonical contract for the S2 [~] task
 * "Add a kill switch and fail-closed configuration behavior so invalid
 * quality configuration pauses/blocks affected work without disabling
 * unrelated no-profile projects." The corresponding `[~]` task in
 * `plan.md` references this file by name per the test-strategy §7
 * "Intentionally-red tests & exclusion" rule.
 *
 * The companion live-behavior test
 * (`pivot/src/orchestrator/qualityKillSwitch.runProject.test.ts`) that
 * exercises the kill switch through the real `runProject` import surface
 * is owned by S2's dispatch-wiring phase and will be added at Green/closeout
 * when the orchestrator dispatches the kill switch.
 *
 * The module under test (`./qualityKillSwitch`) does not exist yet. These
 * tests are intentionally Red and committed under the `*.red.test.ts` suffix.
 * The Green sibling lands when `pivot/src/orchestrator/qualityKillSwitch.ts`
 * is implemented and these tests pass without the import error.
 *
 * Test scenarios (live-behavior, not file-existence):
 *
 *   1. Module surface — the kill-switch module exports the expected types
 *      and functions used by the orchestrator.
 *   2. Validation — `validateQualityConfig` accepts valid built-in profiles
 *      and rejects profiles with invalid configuration (fail-closed).
 *   3. Kill-switch decision — invalid configuration pauses the affected
 *      project; valid configuration does not pause; no-profile projects
 *      are NEVER paused (unaffected).
 *   4. Fail-closed semantics — any validation error triggers the kill
 *      switch; the decision carries a structured reason.
 *   5. Blast-radius isolation — when project A is paused for invalid
 *      config, project B (with valid or no profile) is unaffected.
 */

import { describe, expect, it } from 'bun:test';
import {
  // Kill-switch contract
  evaluateQualityKillSwitch,
  // Validation contract
  validateQualityConfig,
  // Types
  type ProjectQualityState,
  type QualityKillSwitchDecision,
  type QualityConfigValidation,
} from './qualityKillSwitch';
import {
  BUILTIN_NONE_PROFILE,
  BUILTIN_STANDARD_PROFILE,
  BUILTIN_STRICT_PROFILE,
  type QualityProfileType,
} from '../shared/qualityProfile';

// ──────────────────────────────────────────────────────────────────────
// 1. Module surface
// ──────────────────────────────────────────────────────────────────────

describe('qualityKillSwitch module surface', () => {
  it('exports evaluateQualityKillSwitch and validateQualityConfig as functions', () => {
    expect(typeof evaluateQualityKillSwitch).toBe('function');
    expect(typeof validateQualityConfig).toBe('function');
  });
});

// ──────────────────────────────────────────────────────────────────────
// 2. Validation
// ──────────────────────────────────────────────────────────────────────

describe('validateQualityConfig', () => {
  it('accepts the BUILTIN_NONE_PROFILE', () => {
    const result: QualityConfigValidation = validateQualityConfig(BUILTIN_NONE_PROFILE);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('accepts the BUILTIN_STANDARD_PROFILE', () => {
    const result = validateQualityConfig(BUILTIN_STANDARD_PROFILE);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('accepts the BUILTIN_STRICT_PROFILE', () => {
    const result = validateQualityConfig(BUILTIN_STRICT_PROFILE);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects a profile whose name does not match a known built-in kind (fail-closed)', () => {
    const bogus: QualityProfileType = {
      ...BUILTIN_STANDARD_PROFILE,
      name: 'enterprise-custom',
      kind: 'standard',
    };
    const result = validateQualityConfig(bogus);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects a profile whose name does not match its kind (fail-closed)', () => {
    const mismatched: QualityProfileType = {
      ...BUILTIN_STANDARD_PROFILE,
      name: 'standard',
      kind: 'strict',
    };
    const result = validateQualityConfig(mismatched);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ──────────────────────────────────────────────────────────────────────
// 3. Kill-switch decision
// ──────────────────────────────────────────────────────────────────────

function projectWith(
  overrides: Partial<ProjectQualityState> = {},
): ProjectQualityState {
  return {
    projectSlug: 'proj-a',
    hasProfile: true,
    profile: BUILTIN_STANDARD_PROFILE,
    paused: false,
    ...overrides,
  };
}

describe('evaluateQualityKillSwitch', () => {
  it('does NOT pause a project with a valid built-in profile', () => {
    const decision: QualityKillSwitchDecision = evaluateQualityKillSwitch(
      projectWith({ profile: BUILTIN_STANDARD_PROFILE }),
    );
    expect(decision.pause).toBe(false);
    expect(decision.configInvalid).toBe(false);
    expect(decision.projectSlug).toBe('proj-a');
  });

  it('does NOT pause a project that has no profile selected (backward-compat)', () => {
    const decision = evaluateQualityKillSwitch(
      projectWith({ projectSlug: 'proj-no-profile', hasProfile: false, profile: undefined }),
    );
    expect(decision.pause).toBe(false);
    expect(decision.configInvalid).toBe(false);
    expect(decision.projectSlug).toBe('proj-no-profile');
  });

  it('PAUSES a project with an invalid profile configuration (fail-closed)', () => {
    const invalid: QualityProfileType = {
      ...BUILTIN_STRICT_PROFILE,
      name: 'enterprise-custom',
      kind: 'strict',
    };
    const decision = evaluateQualityKillSwitch(
      projectWith({ profile: invalid }),
    );
    expect(decision.pause).toBe(true);
    expect(decision.configInvalid).toBe(true);
    expect(typeof decision.reason).toBe('string');
    expect((decision.reason ?? '').length).toBeGreaterThan(0);
  });

  it('returns a structured reason on pause', () => {
    const invalid: QualityProfileType = {
      ...BUILTIN_STANDARD_PROFILE,
      name: 'unknown-builtin',
      kind: 'standard',
    };
    const decision = evaluateQualityKillSwitch(
      projectWith({ profile: invalid }),
    );
    expect(decision.pause).toBe(true);
    expect(decision.reason).toMatch(/invalid|configuration|name|kind/i);
  });
});

// ──────────────────────────────────────────────────────────────────────
// 4. Blast-radius isolation
// ──────────────────────────────────────────────────────────────────────

describe('evaluateQualityKillSwitch — blast-radius isolation', () => {
  it('does NOT pause an unrelated no-profile project when another project is paused', () => {
    const invalid: QualityProfileType = {
      ...BUILTIN_STRICT_PROFILE,
      name: 'enterprise-custom',
      kind: 'strict',
    };
    const pausedDecision = evaluateQualityKillSwitch(
      projectWith({ projectSlug: 'proj-affected', profile: invalid }),
    );
    const unaffectedDecision = evaluateQualityKillSwitch(
      projectWith({ projectSlug: 'proj-no-profile', hasProfile: false, profile: undefined }),
    );
    expect(pausedDecision.pause).toBe(true);
    expect(unaffectedDecision.pause).toBe(false);
    expect(unaffectedDecision.projectSlug).toBe('proj-no-profile');
  });

  it('does NOT pause an unrelated valid-profile project when another project is paused', () => {
    const invalid: QualityProfileType = {
      ...BUILTIN_STANDARD_PROFILE,
      name: 'mystery-profile',
      kind: 'standard',
    };
    const pausedDecision = evaluateQualityKillSwitch(
      projectWith({ projectSlug: 'proj-affected', profile: invalid }),
    );
    const unaffectedDecision = evaluateQualityKillSwitch(
      projectWith({ projectSlug: 'proj-valid', profile: BUILTIN_STANDARD_PROFILE }),
    );
    expect(pausedDecision.pause).toBe(true);
    expect(unaffectedDecision.pause).toBe(false);
    expect(unaffectedDecision.projectSlug).toBe('proj-valid');
  });

  it('does NOT mutate the input project state (pure function)', () => {
    const original: ProjectQualityState = projectWith({ profile: BUILTIN_STRICT_PROFILE });
    const snapshot = JSON.stringify(original);
    evaluateQualityKillSwitch(original);
    expect(JSON.stringify(original)).toBe(snapshot);
  });
});
