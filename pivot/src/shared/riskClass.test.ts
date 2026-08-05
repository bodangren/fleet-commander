import { describe, expect, it } from 'bun:test';
import {
  deriveRiskClass,
  maxRiskClass,
  parseRiskClass,
  profileNameForRiskClass,
  requiredStagesFor,
  riskRank,
  stageIsRequired,
} from './riskClass';

describe('parseRiskClass', () => {
  it('accepts the three declared classes', () => {
    expect(parseRiskClass('normal')).toBe('normal');
    expect(parseRiskClass('elevated')).toBe('elevated');
    expect(parseRiskClass('critical')).toBe('critical');
  });

  it('normalizes case and surrounding whitespace', () => {
    expect(parseRiskClass('  CRITICAL ')).toBe('critical');
  });

  it('resolves an absent declaration to normal', () => {
    expect(parseRiskClass(undefined)).toBe('normal');
    expect(parseRiskClass(null)).toBe('normal');
  });

  it('resolves a malformed declaration to normal instead of throwing', () => {
    // A track must not be able to skip the gate by crashing the parser.
    expect(parseRiskClass({ risk: 'critical' })).toBe('normal');
    expect(parseRiskClass('catastrophic')).toBe('normal');
    expect(parseRiskClass(7)).toBe('normal');
  });
});

describe('riskRank / maxRiskClass', () => {
  it('orders the classes', () => {
    expect(riskRank('normal')).toBeLessThan(riskRank('elevated'));
    expect(riskRank('elevated')).toBeLessThan(riskRank('critical'));
  });

  it('returns the more severe of two classes', () => {
    expect(maxRiskClass('normal', 'elevated')).toBe('elevated');
    expect(maxRiskClass('critical', 'normal')).toBe('critical');
    expect(maxRiskClass('elevated', 'elevated')).toBe('elevated');
  });
});

describe('deriveRiskClass', () => {
  it('leaves a clean low-risk track at normal', () => {
    const result = deriveRiskClass({
      declared: 'normal',
      spec: 'Fix a typo in the dashboard header copy.',
      scope: ['frontend/src/pages/DashboardPage.tsx'],
    });
    expect(result.riskClass).toBe('normal');
    expect(result.escalatedBy).toEqual([]);
  });

  it('escalates to elevated on an auth signal in the spec', () => {
    const result = deriveRiskClass({
      declared: 'normal',
      spec: 'Rotate the session token when a user changes their password.',
    });
    expect(result.riskClass).toBe('elevated');
    expect(result.declared).toBe('normal');
    expect(result.escalatedBy.length).toBeGreaterThan(0);
  });

  it('escalates to elevated on a budget signal', () => {
    const result = deriveRiskClass({
      declared: 'normal',
      spec: 'Adjust the per-project spend quota used by the dispatcher.',
    });
    expect(result.riskClass).toBe('elevated');
  });

  it('escalates to critical on a data-loss signal', () => {
    const result = deriveRiskClass({
      declared: 'normal',
      spec: 'Backfill the tasks table, then DELETE FROM orphaned_rows.',
    });
    expect(result.riskClass).toBe('critical');
  });

  it('escalates to critical for a data migration, in either word order', () => {
    expect(
      deriveRiskClass({ spec: 'Run the schema migration for runContracts.' })
        .riskClass,
    ).toBe('critical');
    expect(
      deriveRiskClass({ spec: 'Migrate the tasks table to the new shape.' })
        .riskClass,
    ).toBe('critical');
    expect(
      deriveRiskClass({ scope: ['convex/migrations/001_add_column.ts'] })
        .riskClass,
    ).toBe('critical');
  });

  it('does not escalate a non-data migration', () => {
    // Found by applying the rule to a real track: "Tailwind CSS 4 migration"
    // moves no data and must not pay the eight-stage tax.
    expect(
      deriveRiskClass({
        spec: 'Tailwind CSS 4 migration across the monorepo. Upgrade tailwindcss from v3 to v4.',
      }).riskClass,
    ).toBe('normal');
    expect(
      deriveRiskClass({ spec: 'React Router 7 migration.' }).riskClass,
    ).toBe('normal');
  });

  it('escalates to critical when the scope touches the schema', () => {
    const result = deriveRiskClass({
      declared: 'normal',
      spec: 'Add a column.',
      scope: ['convex/schema.ts'],
    });
    expect(result.riskClass).toBe('critical');
  });

  it('never lowers a declared class below what was declared', () => {
    // This is the anti-gaming rule: derivation raises, it does not relax.
    const result = deriveRiskClass({
      declared: 'critical',
      spec: 'Fix a typo in a comment.',
      scope: ['README.md'],
    });
    expect(result.riskClass).toBe('critical');
    expect(result.escalatedBy).toEqual([]);
  });

  it('escalates a track that declared nothing at all', () => {
    const result = deriveRiskClass({
      spec: 'Wire the Stripe refund webhook.',
    });
    expect(result.declared).toBe('normal');
    expect(result.riskClass).toBe('critical');
  });

  it('reports no escalation reasons when the class did not rise', () => {
    const result = deriveRiskClass({
      declared: 'elevated',
      spec: 'Update the auth middleware comment.',
    });
    // The auth signal matches, but elevated was already declared.
    expect(result.riskClass).toBe('elevated');
    expect(result.escalatedBy).toEqual([]);
  });

  it('tolerates entirely absent inputs', () => {
    const result = deriveRiskClass({});
    expect(result.riskClass).toBe('normal');
  });
});

describe('requiredStagesFor', () => {
  it('runs three stages for a normal track', () => {
    expect(requiredStagesFor('normal')).toEqual([
      'red',
      'green',
      'phase_acceptance',
    ]);
  });

  it('adds strategy and acceptance for an elevated track', () => {
    expect(requiredStagesFor('elevated')).toContain('strategy');
    expect(requiredStagesFor('elevated')).toContain('acceptance');
    expect(requiredStagesFor('elevated')).not.toContain('adversarial');
  });

  it('runs all eight stages for a critical track', () => {
    expect(requiredStagesFor('critical')).toHaveLength(8);
  });

  it('grows monotonically with risk', () => {
    const normal = requiredStagesFor('normal');
    const elevated = requiredStagesFor('elevated');
    const critical = requiredStagesFor('critical');
    for (const stage of normal) expect(elevated).toContain(stage);
    for (const stage of elevated) expect(critical).toContain(stage);
  });
});

describe('profileNameForRiskClass', () => {
  it('covers normal and elevated with the standard profile', () => {
    expect(profileNameForRiskClass('normal')).toBe('standard');
    expect(profileNameForRiskClass('elevated')).toBe('standard');
  });

  it('requires the strict profile for critical', () => {
    expect(profileNameForRiskClass('critical')).toBe('strict');
  });
});

describe('stageIsRequired', () => {
  it('requires the red/green/review core at every risk class', () => {
    for (const rc of ['normal', 'elevated', 'critical'] as const) {
      expect(stageIsRequired('red', rc)).toBe(true);
      expect(stageIsRequired('green', rc)).toBe(true);
      expect(stageIsRequired('phase_acceptance', rc)).toBe(true);
    }
  });

  it('does not require adversarial or ux below critical', () => {
    expect(stageIsRequired('adversarial', 'normal')).toBe(false);
    expect(stageIsRequired('adversarial', 'elevated')).toBe(false);
    expect(stageIsRequired('ux', 'elevated')).toBe(false);
    expect(stageIsRequired('ux', 'critical')).toBe(true);
  });
});
