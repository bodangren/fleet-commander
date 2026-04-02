import {
  type Pipeline,
  type Stage,
  type Step,
  type PipelineExecution,
  type StageResult,
  type StepResult,
  PipelineExecutionStatus,
} from './types.js';

export interface StepExecutor {
  execute(
    command: string,
    env: Record<string, string>,
    timeout: number,
    signal: AbortSignal,
  ): Promise<{ output: string; exitCode: number }>;
}

export class BunStepExecutor implements StepExecutor {
  async execute(
    command: string,
    env: Record<string, string>,
    timeout: number,
    signal: AbortSignal,
  ): Promise<{ output: string; exitCode: number }> {
    const controller = new AbortController();
    const abortHandler = () => controller.abort();
    signal.addEventListener('abort', abortHandler, { once: true });

    const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

    try {
      const proc = Bun.spawn({
        cmd: ['sh', '-c', command],
        env,
        signal: controller.signal,
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const [stdout, stderr] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);

      const exitCode = await proc.exited;

      return {
        output: exitCode === 0 ? stdout : stderr,
        exitCode,
      };
    } finally {
      clearTimeout(timeoutId);
      signal.removeEventListener('abort', abortHandler);
    }
  }
}

function evaluateCondition(
  condition: { when: string; equals?: string; exists?: string } | undefined,
  env: Record<string, string>,
): boolean {
  if (!condition) return true;

  if (condition.exists) {
    return condition.exists in env;
  }

  if (condition.equals) {
    const value = env[condition.when] ?? '';
    return value === condition.equals;
  }

  return true;
}

function resolveStepOrder(steps: Step[]): Step[] {
  const ordered: Step[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(step: Step): void {
    if (visited.has(step.name)) return;
    if (visiting.has(step.name)) {
      throw new Error(`Circular dependency detected: ${step.name}`);
    }
    visiting.add(step.name);

    if (step.depends_on) {
      for (const depName of step.depends_on) {
        const dep = steps.find((s) => s.name === depName);
        if (dep) visit(dep);
      }
    }

    visiting.delete(step.name);
    visited.add(step.name);
    ordered.push(step);
  }

  for (const step of steps) {
    visit(step);
  }

  return ordered;
}

async function executeStep(
  step: Step,
  env: Record<string, string>,
  executor: StepExecutor,
  signal: AbortSignal,
): Promise<StepResult> {
  const startedAt = new Date().toISOString();

  try {
    const { output, exitCode } = await executor.execute(
      step.command,
      env,
      step.timeout ?? 300,
      signal,
    );

    const completedAt = new Date().toISOString();
    const status = exitCode === 0 ? 'succeeded' : 'failed';

    return {
      stepName: step.name,
      status,
      output,
      error: exitCode !== 0 ? output : undefined,
      startedAt,
      completedAt,
    };
  } catch (err) {
    const completedAt = new Date().toISOString();
    return {
      stepName: step.name,
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
      startedAt,
      completedAt,
    };
  }
}

async function executeStage(
  stage: Stage,
  env: Record<string, string>,
  executor: StepExecutor,
  signal: AbortSignal,
): Promise<StageResult> {
  const startedAt = new Date().toISOString();
  const orderedSteps = resolveStepOrder(stage.steps);
  const stepResults: StepResult[] = [];

  for (let i = 0; i < orderedSteps.length; i++) {
    const step = orderedSteps[i];
    const parallelGroup: Step[] = [step];

    while (
      i + 1 < orderedSteps.length &&
      orderedSteps[i + 1].parallel === true &&
      step.parallel === true
    ) {
      i++;
      parallelGroup.push(orderedSteps[i]);
    }

    if (parallelGroup.length > 1) {
      const results = await Promise.all(
        parallelGroup.map((s) => executeStep(s, env, executor, signal)),
      );
      stepResults.push(...results);
    } else {
      stepResults.push(await executeStep(step, env, executor, signal));
    }

    const anyFailed = stepResults.some((r) => r.status === 'failed');
    if (anyFailed) {
      return {
        stageName: stage.name,
        status: 'failed',
        steps: stepResults,
        startedAt,
        completedAt: new Date().toISOString(),
      };
    }
  }

  return {
    stageName: stage.name,
    status: 'succeeded',
    steps: stepResults,
    startedAt,
    completedAt: new Date().toISOString(),
  };
}

export interface RunPipelineOptions {
  pipeline: Pipeline;
  executor?: StepExecutor;
  envOverride?: Record<string, string>;
  projectId?: string;
  triggeredBy?: 'manual' | 'task-complete';
  triggeredByTaskId?: string;
  signal?: AbortSignal;
}

export async function runPipeline(
  options: RunPipelineOptions,
): Promise<PipelineExecution> {
  const {
    pipeline,
    executor = new BunStepExecutor(),
    envOverride = {},
    projectId,
    triggeredBy = 'manual',
    triggeredByTaskId,
    signal = new AbortController().signal,
  } = options;

  const executionId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const stageResults: StageResult[] = [];

  const baseEnv: Record<string, string> = {
    ...process.env as Record<string, string>,
    ...envOverride,
  };

  for (const stage of pipeline.stages) {
    if (!evaluateCondition(stage.condition, baseEnv)) {
      stageResults.push({
        stageName: stage.name,
        status: 'succeeded',
        steps: [],
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
      continue;
    }

    const result = await executeStage(stage, baseEnv, executor, signal);
    stageResults.push(result);

    if (result.status === 'failed') {
      return {
        id: executionId,
        pipelineName: pipeline.name,
        projectId,
        status: 'failed',
        stages: stageResults,
        triggeredBy,
        triggeredByTaskId,
        envOverride,
        startedAt,
        completedAt: new Date().toISOString(),
      };
    }
  }

  return {
    id: executionId,
    pipelineName: pipeline.name,
    projectId,
    status: 'succeeded',
    stages: stageResults,
    triggeredBy,
    triggeredByTaskId,
    envOverride,
    startedAt,
    completedAt: new Date().toISOString(),
  };
}
