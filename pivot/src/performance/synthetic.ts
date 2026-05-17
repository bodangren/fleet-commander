/**
 * Synthetic dataset generator for performance benchmarking.
 */

export interface SyntheticRun {
  employeeId: string;
  taskKind: string;
  startedAt: number;
  completedAt?: number;
  status: 'completed' | 'failed' | 'cancelled';
  projectSlug: string;
}

export interface SyntheticDataset {
  runs: SyntheticRun[];
  employees: string[];
  taskKinds: string[];
  projects: string[];
}

export interface SyntheticOptions {
  days: number;
  employees: number;
  taskKinds: string[];
  projects: string[];
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateSyntheticDataset(options: SyntheticOptions): SyntheticDataset {
  const { days, employees, taskKinds, projects } = options;
  const now = Date.now();
  const msPerDay = 86400000;

  const employeeIds = Array.from({ length: employees }, (_, i) => `emp-${i + 1}`);

  const runs: SyntheticRun[] = [];
  let runId = 0;

  for (const employeeId of employeeIds) {
    for (const projectSlug of projects) {
      for (const taskKind of taskKinds) {
        const runsPerCombo = Math.max(200, Math.floor(1200 / (employees * taskKinds.length * projects.length)));

        for (let i = 0; i < runsPerCombo; i++) {
          const startOffset = randomBetween(0, days * msPerDay);
          const startedAt = now - startOffset;

          const durationMs = randomBetween(5000, 120000);
          const isCompleted = Math.random() > 0.15;

          const run: SyntheticRun = {
            employeeId,
            taskKind,
            startedAt,
            projectSlug,
            status: isCompleted ? 'completed' : (Math.random() > 0.5 ? 'failed' : 'cancelled'),
          };

          if (isCompleted) {
            run.completedAt = startedAt + durationMs;
          }

          runs.push(run);
          runId++;
        }
      }
    }
  }

  return {
    runs,
    employees: employeeIds,
    taskKinds,
    projects,
  };
}