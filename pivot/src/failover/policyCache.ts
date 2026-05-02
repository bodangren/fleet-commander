const DEFAULT_STALENESS_MS = 15 * 60 * 1000; // 15 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class StalenessCache<T> {
  private entry: CacheEntry<T> | null = null;
  private readonly stalenessMs: number;

  constructor(stalenessMs: number = DEFAULT_STALENESS_MS) {
    this.stalenessMs = stalenessMs;
  }

  set(data: T): void {
    this.entry = { data, timestamp: Date.now() };
  }

  get(): { data: T; stale: boolean } | null {
    if (!this.entry) return null;
    const age = Date.now() - this.entry.timestamp;
    return { data: this.entry.data, stale: age > this.stalenessMs };
  }

  isFresh(): boolean {
    if (!this.entry) return false;
    return Date.now() - this.entry.timestamp <= this.stalenessMs;
  }

  clear(): void {
    this.entry = null;
  }

  getStalenessMs(): number {
    return this.stalenessMs;
  }
}
