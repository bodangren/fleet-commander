import { describe, expect, it } from 'bun:test';
import { withExecutionGuard } from './executionGuard';

describe('withExecutionGuard', () => {
  it('executes the wrapped function normally', async () => {
    let callCount = 0;
    const fn = async (x: number) => {
      callCount++;
      return x * 2;
    };
    const guarded = withExecutionGuard(fn);

    const result = await guarded(5);
    expect(result).toBe(10);
    expect(callCount).toBe(1);
  });

  it('skips overlapping calls while the first is running', async () => {
    let callCount = 0;
    const fn = async (x: number) => {
      callCount++;
      await new Promise((resolve) => setTimeout(resolve, 100));
      return x * 2;
    };
    const guarded = withExecutionGuard(fn);

    const [r1, r2, r3] = await Promise.all([guarded(1), guarded(2), guarded(3)]);
    expect(r1).toBe(2);
    expect(r2).toBeNull();
    expect(r3).toBeNull();
    expect(callCount).toBe(1);
  });

  it('allows execution after the previous call completes', async () => {
    let callCount = 0;
    const fn = async (x: number) => {
      callCount++;
      return x * 2;
    };
    const guarded = withExecutionGuard(fn);

    const r1 = await guarded(5);
    const r2 = await guarded(10);
    expect(r1).toBe(10);
    expect(r2).toBe(20);
    expect(callCount).toBe(2);
  });

  it('releases guard even if the wrapped function throws', async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      if (callCount === 1) throw new Error('fail');
      return 'ok';
    };
    const guarded = withExecutionGuard(fn);

    await expect(guarded()).rejects.toThrow('fail');
    const result = await guarded();
    expect(result).toBe('ok');
    expect(callCount).toBe(2);
  });

  it('invokes onSkipped callback when a call is skipped', async () => {
    let skippedCount = 0;
    const fn = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return 'done';
    };
    const guarded = withExecutionGuard(fn, () => {
      skippedCount++;
    });

    const [r1, r2] = await Promise.all([guarded(), guarded()]);
    expect(r1).toBe('done');
    expect(r2).toBeNull();
    expect(skippedCount).toBe(1);
  });
});
