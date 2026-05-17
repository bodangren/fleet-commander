/**
 * Shared test fixtures for employee performance analytics.
 */

export interface FakeRun {
  employeeId: string;
  taskKind: string;
  startedAt: number;
  completedAt?: number;
  status: 'completed' | 'failed' | 'cancelled';
  projectSlug: string;
}

export function makeFakeRun(overrides: Partial<FakeRun> = {}): FakeRun {
  return {
    employeeId: 'emp-1',
    taskKind: 'feature',
    startedAt: Date.now() - 86400000,
    status: 'completed',
    projectSlug: 'demo-project',
    ...overrides,
  };
}

export function makeWindow(days: number): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  return { start, end };
}
