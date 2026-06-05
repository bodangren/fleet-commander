import { describe, expect, it } from 'bun:test';
import { resolvePostExecutionStatus, type TransitionInput } from './resolveTransition';

describe('resolvePostExecutionStatus', () => {
  it('returns done on success', () => {
    const result = resolvePostExecutionStatus({ succeeded: true, retriesExhausted: false });
    expect(result.nextStatus).toBe('done');
    expect(result.reason).toContain('succeeded');
  });

  it('returns blocked when retries are exhausted', () => {
    const result = resolvePostExecutionStatus({ succeeded: false, retriesExhausted: true });
    expect(result.nextStatus).toBe('blocked');
    expect(result.reason).toContain('exhausted');
  });

  it('returns null (no change) when retries remain', () => {
    const result = resolvePostExecutionStatus({ succeeded: false, retriesExhausted: false });
    expect(result.nextStatus).toBeNull();
    expect(result.reason).toBe('Retrying');
  });

  it('returns blocked on coverage violation regardless of other flags', () => {
    const result = resolvePostExecutionStatus({
      succeeded: true,
      retriesExhausted: false,
      coverageViolated: true,
    });
    expect(result.nextStatus).toBe('blocked');
    expect(result.reason).toContain('Coverage');
  });

  it('coverage violation takes precedence over exhausted retries', () => {
    const result = resolvePostExecutionStatus({
      succeeded: false,
      retriesExhausted: true,
      coverageViolated: true,
    });
    expect(result.nextStatus).toBe('blocked');
    expect(result.reason).toContain('Coverage');
  });

  it('treats explicit coverageViolated=false the same as omitted', () => {
    const withOmitted = resolvePostExecutionStatus({
      succeeded: false,
      retriesExhausted: false,
    });
    const withFalse = resolvePostExecutionStatus({
      succeeded: false,
      retriesExhausted: false,
      coverageViolated: false,
    });
    expect(withFalse.nextStatus).toBe(withOmitted.nextStatus);
    expect(withFalse.reason).toBe(withOmitted.reason);
  });

  it('succeeded=true with retriesExhausted=true still resolves to done', () => {
    const result = resolvePostExecutionStatus({
      succeeded: true,
      retriesExhausted: true,
    });
    expect(result.nextStatus).toBe('done');
    expect(result.reason).toContain('succeeded');
  });

  it('always provides a non-empty reason string across all input shapes', () => {
    const inputs: TransitionInput[] = [
      { succeeded: true, retriesExhausted: false },
      { succeeded: false, retriesExhausted: true },
      { succeeded: false, retriesExhausted: false },
      { succeeded: true, retriesExhausted: false, coverageViolated: true },
      { succeeded: false, retriesExhausted: true, coverageViolated: true },
      { succeeded: true, retriesExhausted: true },
      { succeeded: false, retriesExhausted: false, coverageViolated: false },
    ];
    for (const input of inputs) {
      const result = resolvePostExecutionStatus(input);
      expect(typeof result.reason).toBe('string');
      expect(result.reason.length).toBeGreaterThan(0);
    }
  });

  it('is pure: repeated calls with the same input return structurally equal results', () => {
    const input: TransitionInput = { succeeded: false, retriesExhausted: true };
    const a = resolvePostExecutionStatus(input);
    const b = resolvePostExecutionStatus(input);
    expect(a).toEqual(b);
  });

  it('returns for_review (not done) for success with reviewRequired (Red for missing feature)', () => {
    const result = resolvePostExecutionStatus({
      succeeded: true,
      retriesExhausted: false,
      reviewRequired: true,
    });
    expect(result.nextStatus).toBe('for_review');
  });
});
