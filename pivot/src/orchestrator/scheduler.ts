import type { Task, Employee, RetryConfig } from './types';
import { executeCommand } from './executor';

export interface AgentTemplate {
  _id: string;
  name: string;
  role: string;
  model: string;
  temperature: number;
  systemPrompt: string;
  skills: string[];
  estimatedCostPer1kTokens: number;
}

export interface SchedulerDeps {
  queryReadyTasks: () => Promise<Task[]>;
  queryActiveEmployees: () => Promise<Employee[]>;
  queryTemplates: () => Promise<AgentTemplate[]>;
  createRun: (taskId: string, employeeId: string) => Promise<string>;
  updateTaskStatus: (taskId: string, status: Task['status']) => Promise<void>;
  appendRunOutput: (runId: string, output: string) => Promise<void>;
  executeCommand: (
    command: string,
    args: string[],
    timeoutMs: number,
  ) => Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
    timedOut: boolean;
    tokensExceeded: boolean;
  }>;
}

export function matchTaskToEmployee(
  task: Task,
  employees: Employee[],
  templates?: AgentTemplate[],
): { employee: Employee; template?: AgentTemplate } | null {
  const ready = employees.filter((e) => e.status === 'active');
  if (ready.length === 0) return null;

  const taskSkills = task.skills as string[] | undefined;

  if (templates && templates.length > 0 && taskSkills && taskSkills.length > 0) {
    let bestTemplate: AgentTemplate | null = null;
    let bestOverlap = -1;

    for (const tmpl of templates) {
      const overlap = taskSkills.filter((s) => tmpl.skills.includes(s)).length;
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestTemplate = tmpl;
      }
    }

    if (bestTemplate && bestOverlap > 0) {
      const matchingEmployee = ready.find((e) => e.name === bestTemplate!.name);
      if (matchingEmployee) {
        return { employee: matchingEmployee, template: bestTemplate };
      }
    }
  }

  if (!taskSkills || taskSkills.length === 0) {
    return { employee: ready[0] };
  }

  let best: Employee | null = null;
  let bestOverlap = -1;

  for (const emp of ready) {
    const overlap = taskSkills.filter((s) => emp.skills.includes(s)).length;
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = emp;
    }
  }

  return bestOverlap > 0 ? { employee: best! } : null;
}

export async function executeTaskWithEmployee(
  task: Task,
  employee: Employee,
  deps: SchedulerDeps,
  template?: AgentTemplate,
): Promise<{ success: boolean; output: string }> {
  const args = [
    '--model',
    employee.model,
    '--task',
    task.title,
    ...(task.spec ? ['--spec', task.spec] : []),
    ...(template?.systemPrompt ? ['--system-prompt', template.systemPrompt] : []),
    ...(template?.temperature !== undefined
      ? ['--temperature', String(template.temperature)]
      : []),
  ];

  const result = await deps.executeCommand('opencode', args, 600_000);

  const output = result.stdout + (result.stderr ? '\n' + result.stderr : '');
  const success = result.exitCode === 0 && !result.timedOut && !result.tokensExceeded;

  return { success, output };
}

export async function runSchedulerTick(
  deps: SchedulerDeps,
  retryManager?: { shouldRetry: (attempt: number) => boolean },
): Promise<void> {
  const [tasks, employees, templates] = await Promise.all([
    deps.queryReadyTasks(),
    deps.queryActiveEmployees(),
    deps.queryTemplates(),
  ]);

  const readyTasks = tasks.filter((t) => t.status === 'ready');
  const activeEmployees = employees.filter((e) => e.status === 'active');

  if (readyTasks.length === 0 || activeEmployees.length === 0) return;

  for (const task of readyTasks) {
    const match = matchTaskToEmployee(task, activeEmployees, templates);
    if (!match) continue;

    const { employee } = match;
    const runId = await deps.createRun(task._id as string, employee._id as string);
    await deps.updateTaskStatus(task._id as string, 'in_progress');

    let attempt = 0;
    let success = false;
    let output = '';

    while (!success) {
      const result = await deps.executeCommand(
        'opencode',
        [
          '--model',
          employee.model,
          '--task',
          task.title,
          ...(task.spec ? ['--spec', task.spec] : []),
        ],
        600_000,
      );

      output = result.stdout + (result.stderr ? '\n' + result.stderr : '');
      success = result.exitCode === 0 && !result.timedOut && !result.tokensExceeded;

      if (!success && retryManager && retryManager.shouldRetry(attempt)) {
        attempt++;
      } else {
        break;
      }
    }

    await deps.appendRunOutput(runId, output);
    await deps.updateTaskStatus(
      task._id as string,
      success ? 'done' : 'blocked',
    );
  }
}