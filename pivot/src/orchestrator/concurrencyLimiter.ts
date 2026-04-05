export class ConcurrencyLimiter {
  private limit: number;
  private active = 0;

  constructor(limit: number) {
    this.limit = limit;
  }

  canExecute(): boolean {
    return this.active < this.limit;
  }

  acquire(): void {
    if (!this.canExecute()) {
      throw new Error(`Concurrency limit reached (${this.limit})`);
    }
    this.active++;
  }

  release(): void {
    if (this.active <= 0) {
      throw new Error('No active slots to release');
    }
    this.active--;
  }

  reset(): void {
    this.active = 0;
  }

  setLimit(limit: number): void {
    this.limit = limit;
  }

  get activeCount(): number {
    return this.active;
  }

  get maxLimit(): number {
    return this.limit;
  }
}
