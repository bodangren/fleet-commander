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
});
