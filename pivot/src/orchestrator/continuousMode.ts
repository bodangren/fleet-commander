import type { ContinuousModeState } from './types';

const MIN_INTERVAL_MS = 10_000;
const MAX_INTERVAL_MS = 3_600_000;

export class ContinuousModeManager {
  private state: ContinuousModeState;

  constructor() {
    this.state = {
      enabled: false,
      state: 'idle',
      intervalMs: 60_000,
      consecutiveFailures: 0,
      maxConcurrent: 1,
      maxConsecutiveFailures: 3,
    };
  }

  getState(): ContinuousModeState {
    return { ...this.state };
  }

  setEnabled(enabled: boolean): void {
    this.state.enabled = enabled;
  }

  setState(state: ContinuousModeState['state']): void {
    this.state.state = state;
  }

  setIntervalMs(ms: number): void {
    this.state.intervalMs = Math.max(MIN_INTERVAL_MS, Math.min(MAX_INTERVAL_MS, ms));
  }

  setMaxConcurrent(count: number): void {
    this.state.maxConcurrent = count;
  }

  setMaxConsecutiveFailures(count: number): void {
    this.state.maxConsecutiveFailures = count;
  }

  recordFailure(): void {
    this.state.consecutiveFailures++;
  }

  recordSuccess(): void {
    this.state.consecutiveFailures = 0;
  }

  shouldAutoPause(): boolean {
    return this.state.consecutiveFailures >= this.state.maxConsecutiveFailures;
  }

  autoPause(): void {
    this.state.state = 'paused';
  }

  pause(): void {
    this.state.state = 'paused';
  }

  resume(): void {
    this.state.state = 'running';
  }

  isIdle(): boolean {
    return this.state.state === 'idle';
  }

  isPaused(): boolean {
    return this.state.state === 'paused';
  }

  isRunning(): boolean {
    return this.state.enabled && this.state.state === 'running';
  }

  serialize(): string {
    return JSON.stringify(this.state);
  }

  deserialize(json: string): void {
    const parsed = JSON.parse(json) as ContinuousModeState;
    this.state = {
      enabled: parsed.enabled ?? false,
      state: parsed.state ?? 'idle',
      intervalMs: parsed.intervalMs ?? 60_000,
      consecutiveFailures: parsed.consecutiveFailures ?? 0,
      maxConcurrent: parsed.maxConcurrent ?? 1,
      maxConsecutiveFailures: parsed.maxConsecutiveFailures ?? 3,
    };
  }
}
