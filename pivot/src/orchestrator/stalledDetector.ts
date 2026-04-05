import type { Task } from './types';

export interface TaskWithStartedAt extends Task {
  startedAt?: number;
}

export class StalledTaskDetector {
  private timeoutMs: number;

  constructor(timeoutMs = 600_000) {
    this.timeoutMs = timeoutMs;
  }

  getTimeoutMs(): number {
    return this.timeoutMs;
  }

  detectStalled(tasks: TaskWithStartedAt[], now: number): TaskWithStartedAt[] {
    return tasks.filter((task) => {
      if (task.status !== 'in_progress') return false;
      if (!task.startedAt) return false;
      return now - task.startedAt > this.timeoutMs;
    });
  }
}
