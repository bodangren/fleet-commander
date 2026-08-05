import { describe, expect, it } from 'bun:test';
import { adaptProfileToRisk, describeRiskAdaptation } from './riskAdaptedProfile';
import {
  BUILTIN_NONE_PROFILE,
  BUILTIN_STANDARD_PROFILE,
  BUILTIN_STRICT_PROFILE,
} from '../shared/qualityProfile';
import type { Task } from './types';

function task(overrides: Partial<Task> = {}): Task {
  return {
    taskKey: 't1',
    trackId: 'track-1',
    title: 'Adjust dashboard copy',
    status: 'todo',
    assignee: 'executor',
    dependencies: [],
    ...overrides,
  } as Task;
}

describe('adaptProfileToRisk — trimming', () => {
  it('drops the mandatory stages a normal track does not need', () => {
    const adapted = adaptProfileToRisk(BUILTIN_STRICT_PROFILE, task(), 'normal');
    expect(adapted.riskClass).toBe('normal');
    // adversarial is `required: true` in the strict profile and is not in the
    // normal risk class's stage set, so it goes.
    expect(adapted.trimmedStages).toEqual(['adversarial']);
    expect(adapted.profile.stages.map((s) => s.kind)).not.toContain('adversarial');
  });

  it('keeps optional stages so their own applicability still decides', () => {
    // strategy, ux, acceptance and closeout are `required: false`. They gate
    // themselves on setup/frontend/closeout context. Trimming them here would
    // remove behavior the risk class was never meant to govern — a setup track
    // at normal risk must still get its strategy stage.
    const adapted = adaptProfileToRisk(BUILTIN_STRICT_PROFILE, task(), 'normal');
    const kinds = adapted.profile.stages.map((s) => s.kind);
    expect(kinds).toContain('strategy');
    expect(kinds).toContain('ux');
    expect(kinds).toContain('acceptance');
    expect(kinds).toContain('closeout');
  });

  it('never trims a mandatory stage the risk class requires', () => {
    const adapted = adaptProfileToRisk(BUILTIN_STRICT_PROFILE, task(), 'normal');
    for (const kind of ['red', 'green', 'phase_acceptance']) {
      expect(adapted.trimmedStages).not.toContain(kind as never);
    }
  });

  it('leaves the standard profile intact for a normal track', () => {
    // Every mandatory stage in `standard` is already in the normal set.
    const adapted = adaptProfileToRisk(BUILTIN_STANDARD_PROFILE, task(), 'normal');
    expect(adapted.trimmedStages).toEqual([]);
    expect(adapted.profile.stages).toHaveLength(
      BUILTIN_STANDARD_PROFILE.stages.length,
    );
  });

  it('keeps every stage for a critical track', () => {
    const adapted = adaptProfileToRisk(
      BUILTIN_STRICT_PROFILE,
      task({ title: 'Migrate the tasks table' }),
      'normal',
    );
    expect(adapted.riskClass).toBe('critical');
    expect(adapted.trimmedStages).toEqual([]);
    expect(adapted.profile.stages).toHaveLength(
      BUILTIN_STRICT_PROFILE.stages.length,
    );
  });

  it('leaves the none profile alone', () => {
    const adapted = adaptProfileToRisk(BUILTIN_NONE_PROFILE, task(), 'critical');
    expect(adapted.profile.kind).toBe('none');
    expect(adapted.profile.stages).toEqual([]);
    expect(adapted.promoted).toBe(false);
  });
});

describe('adaptProfileToRisk — escalation', () => {
  it('promotes a standard profile to strict on a critical signal', () => {
    const adapted = adaptProfileToRisk(
      BUILTIN_STANDARD_PROFILE,
      task({ title: 'Wire the Stripe refund webhook' }),
      'normal',
    );
    expect(adapted.riskClass).toBe('critical');
    expect(adapted.promoted).toBe(true);
    expect(adapted.profile.name).toBe('strict');
    // The strict-only stages must actually be present after promotion.
    expect(adapted.profile.stages.map((s) => s.kind)).toContain('adversarial');
  });

  it('does not promote for an elevated signal', () => {
    const adapted = adaptProfileToRisk(
      BUILTIN_STANDARD_PROFILE,
      task({ title: 'Refresh the session token on login' }),
      'normal',
    );
    expect(adapted.riskClass).toBe('elevated');
    expect(adapted.promoted).toBe(false);
    expect(adapted.profile.name).toBe('standard');
  });

  it('honours a declared critical class with no matching signal', () => {
    const adapted = adaptProfileToRisk(
      BUILTIN_STANDARD_PROFILE,
      task({ title: 'Rename a variable' }),
      'critical',
    );
    expect(adapted.riskClass).toBe('critical');
    expect(adapted.promoted).toBe(true);
  });

  it('records why a track was escalated', () => {
    const adapted = adaptProfileToRisk(
      BUILTIN_STANDARD_PROFILE,
      task({ title: 'Update auth middleware' }),
      'normal',
    );
    expect(adapted.declaredRiskClass).toBe('normal');
    expect(adapted.escalatedBy.length).toBeGreaterThan(0);
  });

  it('treats an absent declaration as normal', () => {
    const adapted = adaptProfileToRisk(BUILTIN_STANDARD_PROFILE, task());
    expect(adapted.declaredRiskClass).toBe('normal');
    expect(adapted.riskClass).toBe('normal');
  });
});

describe('adaptProfileToRisk — invariants', () => {
  it('never produces a profile without the red/green core', () => {
    for (const declared of ['normal', 'elevated', 'critical'] as const) {
      const adapted = adaptProfileToRisk(
        BUILTIN_STRICT_PROFILE,
        task(),
        declared,
      );
      const kinds = adapted.profile.stages.map((s) => s.kind);
      expect(kinds).toContain('red');
      expect(kinds).toContain('green');
      expect(kinds).toContain('phase_acceptance');
    }
  });

  it('does not mutate the frozen builtin profile', () => {
    const before = BUILTIN_STRICT_PROFILE.stages.length;
    adaptProfileToRisk(BUILTIN_STRICT_PROFILE, task(), 'normal');
    expect(BUILTIN_STRICT_PROFILE.stages).toHaveLength(before);
  });
});

describe('describeRiskAdaptation', () => {
  it('summarises a trimmed normal track', () => {
    const summary = describeRiskAdaptation(
      adaptProfileToRisk(BUILTIN_STRICT_PROFILE, task(), 'normal'),
    );
    expect(summary).toContain('risk=normal');
    expect(summary).toContain('skipped adversarial');
  });

  it('summarises an escalation', () => {
    const summary = describeRiskAdaptation(
      adaptProfileToRisk(
        BUILTIN_STANDARD_PROFILE,
        task({ title: 'Backfill the costs table' }),
        'normal',
      ),
    );
    expect(summary).toContain('risk=critical');
    expect(summary).toContain('escalated from normal');
  });
});
